import net from 'node:net';

/**
 * Minimal POP3 client (RFC 1939) for the Mailtrap capture inbox.
 *
 * Staging suppresses all real email (#133/#256) and delivers it to a single
 * Mailtrap sandbox inbox instead. That inbox is readable over plain POP3 at
 * `pop3.mailtrap.io:1100` with the SAME credentials the server uses for SMTP
 * (they live in AWS Secrets Manager as `pool-staging/mailtrap-{user,pass}`).
 *
 * ⚠️ NO ORDERING IS ASSUMED. A prior session shipped a wrong fix on the
 * assumption that Mailtrap's POP3 listing is newest-first (poolmobile #570's
 * retraction). This client only fetches messages; the CALLER matches by
 * recipient and Date header against the moment it triggered the send.
 *
 * Read-only: the client never issues DELE, so the inbox is left untouched.
 */

const CRLF = '\r\n';
const MULTILINE_TERMINATOR = `${CRLF}.${CRLF}`;
const COMMAND_TIMEOUT_MS = 15_000;
/**
 * ⚠️ Mailtrap's POP3 endpoint rate-limits ("-ERR too many commands per
 * second") and an un-throttled scan trips it immediately — so EVERY command,
 * USER/PASS/STAT included, waits out this spacing first.
 */
const COMMAND_SPACING_MS = 1_200;

export interface Pop3Credentials {
  host: string;
  port: number;
  user: string;
  pass: string;
}

export interface Pop3Message {
  /** 1-based POP3 message number (meaningless as an ordering — see above). */
  index: number;
  /** Raw RFC 822 payload (headers + body), dot-unstuffed. */
  raw: string;
}

class Pop3Connection {
  private socket: net.Socket;
  private buffer = '';
  private nextCommandAt = 0;
  private pending: {
    multiline: boolean;
    resolve: (value: string) => void;
    reject: (err: Error) => void;
    timer: NodeJS.Timeout;
  } | null = null;

  private constructor(socket: net.Socket) {
    this.socket = socket;
    socket.on('data', (chunk: Buffer) => {
      this.buffer += chunk.toString('utf8');
      this.tryResolve();
    });
    socket.on('error', (err: Error) => {
      this.failPending(err);
    });
    socket.on('close', () => {
      this.failPending(new Error('POP3 connection closed unexpectedly'));
    });
  }

  static async connect(creds: Pop3Credentials): Promise<Pop3Connection> {
    const socket = await new Promise<net.Socket>((resolve, reject) => {
      const s = net.createConnection({ host: creds.host, port: creds.port }, () => {
        s.off('error', reject);
        resolve(s);
      });
      s.once('error', reject);
      s.setTimeout(COMMAND_TIMEOUT_MS, () => {
        s.destroy(new Error(`POP3 connect to ${creds.host}:${creds.port} timed out`));
      });
    });
    // Every reply wait below carries its own bounded timer; a session-level
    // idle timer racing them is the exact double-timer bug poolmobile #335
    // documented, so it is disarmed once connected.
    socket.setTimeout(0);

    const conn = new Pop3Connection(socket);
    await conn.waitReply(false); // server greeting
    await conn.command(`USER ${creds.user}`);
    await conn.command(`PASS ${creds.pass}`);
    return conn;
  }

  private failPending(err: Error): void {
    if (!this.pending) return;
    clearTimeout(this.pending.timer);
    const { reject } = this.pending;
    this.pending = null;
    reject(err);
  }

  private tryResolve(): void {
    if (!this.pending) return;

    if (this.buffer.startsWith('-ERR')) {
      const lineEnd = this.buffer.indexOf(CRLF);
      if (lineEnd === -1) return; // wait for the full error line
      const line = this.buffer.slice(0, lineEnd);
      this.buffer = this.buffer.slice(lineEnd + CRLF.length);
      this.failPending(new Error(`POP3 error: ${line}`));
      return;
    }

    if (this.pending.multiline) {
      const end = this.buffer.indexOf(MULTILINE_TERMINATOR);
      if (end === -1) return;
      const payload = this.buffer.slice(0, end + CRLF.length);
      this.buffer = this.buffer.slice(end + MULTILINE_TERMINATOR.length);
      this.settle(payload);
      return;
    }

    const lineEnd = this.buffer.indexOf(CRLF);
    if (lineEnd === -1) return;
    const line = this.buffer.slice(0, lineEnd);
    this.buffer = this.buffer.slice(lineEnd + CRLF.length);
    this.settle(line);
  }

  private settle(value: string): void {
    if (!this.pending) return;
    clearTimeout(this.pending.timer);
    const { resolve } = this.pending;
    this.pending = null;
    resolve(value);
  }

  private waitReply(multiline: boolean): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.failPending(new Error('POP3 reply timed out'));
      }, COMMAND_TIMEOUT_MS);
      this.pending = { multiline, resolve, reject, timer };
      // A reply may already be buffered (e.g. the greeting raced us).
      this.tryResolve();
    });
  }

  private async throttle(): Promise<void> {
    const wait = this.nextCommandAt - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    this.nextCommandAt = Date.now() + COMMAND_SPACING_MS;
  }

  /** Send a command expecting a single `+OK ...` line. */
  async command(cmd: string): Promise<string> {
    await this.throttle();
    this.socket.write(`${cmd}${CRLF}`);
    return this.waitReply(false);
  }

  /** Send a command expecting a multi-line response (RETR / TOP / LIST). */
  async commandMultiline(cmd: string): Promise<string> {
    await this.throttle();
    this.socket.write(`${cmd}${CRLF}`);
    const payload = await this.waitReply(true);
    // Drop the `+OK ...` status line, then dot-unstuff (RFC 1939 §3).
    const firstLineEnd = payload.indexOf(CRLF);
    const body = firstLineEnd === -1 ? '' : payload.slice(firstLineEnd + CRLF.length);
    return body.replace(/^\.\./gm, '.');
  }

  async messageCount(): Promise<number> {
    const stat = await this.command('STAT');
    // "+OK <count> <size>"
    const match = /^\+OK\s+(\d+)/.exec(stat);
    if (!match) throw new Error(`Unparseable STAT reply: ${stat}`);
    return Number(match[1]);
  }

  /** Headers only when the server supports TOP; falls back to the full message. */
  async fetchHeaders(index: number): Promise<string> {
    try {
      return await this.commandMultiline(`TOP ${index} 0`);
    } catch {
      return this.fetchMessage(index);
    }
  }

  async fetchMessage(index: number): Promise<string> {
    return this.commandMultiline(`RETR ${index}`);
  }

  async quit(): Promise<void> {
    try {
      await this.command('QUIT');
    } catch {
      // Best-effort — the socket is closed either way.
    }
    this.socket.destroy();
  }
}

/**
 * Run `fn` against a fresh POP3 session, always closing it afterwards.
 */
export async function withPop3<T>(
  creds: Pop3Credentials,
  fn: (conn: Pop3Connection) => Promise<T>,
): Promise<T> {
  const conn = await Pop3Connection.connect(creds);
  try {
    return await fn(conn);
  } finally {
    await conn.quit();
  }
}

export type { Pop3Connection };
