import { withPop3, type Pop3Credentials } from './pop3';

/**
 * Fetch the admin login OTP from the Mailtrap capture inbox.
 *
 * The staging API's login email carries the sentence
 * `Your Pool verification code is <6 digits>` in its text part (the subject is
 * deliberately neutral — poolmobile #471 — so the SUBJECT is useless for
 * matching and the code must come from the body).
 *
 * ⚠️ MATCHING, NOT ORDERING. Mailtrap's POP3 listing has no ordering contract
 * (poolmobile #570's retraction). A message is accepted only when:
 *   1. its To: header names the admin email, AND
 *   2. its Date: header is not older than the moment WE triggered the send
 *      (minus a small clock-skew allowance),
 * and among the acceptable candidates the LATEST Date wins. "The last message
 * in the listing" is never consulted.
 */

const OTP_SENTENCE = /verification code is[^0-9]{0,10}(\d{6})/i;
const CLOCK_SKEW_MS = 20_000;
const POLL_INTERVAL_MS = 5_000;
/** A rate-limit trip means the whole window is hot — wait it out, longer. */
const RATE_LIMIT_BACKOFF_MS = 15_000;
const POLL_TIMEOUT_MS = 180_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface OtpCandidate {
  code: string;
  dateMs: number;
}

function headerValue(rawHeaders: string, name: string): string | null {
  // Unfold continuation lines first (RFC 5322 §2.2.3).
  const unfolded = rawHeaders.replace(/\r\n[ \t]+/g, ' ');
  const re = new RegExp(`^${name}:\\s*(.+)$`, 'im');
  const match = re.exec(unfolded);
  return match ? match[1].trim() : null;
}

/** Minimal quoted-printable decode — enough to reassemble the OTP sentence. */
function decodeQuotedPrintable(body: string): string {
  return body
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16)),
    );
}

/**
 * Decode every BASE64 MIME part of the message.
 *
 * ⚠️ THIS IS WHY THE ADMIN LOGIN COULD NOT READ ITS OWN OTP. The API sends a
 * `multipart/alternative` whose text/plain AND text/html parts are both
 * `Content-Transfer-Encoding: base64`. The plain part contains the sentence
 * this file looks for, verbatim — but base64-encoded it is just a wall of
 * letters, so scanning the raw message (or quoted-printable-decoding it, which
 * is a no-op here) finds nothing and the login times out claiming no OTP
 * arrived. The mail was always there; it was unreadable to us.
 *
 * ⚠️ AND THE HTML PART IS NOT A FALLBACK. It renders the digits in their own
 * styled `<p>` with `letter-spacing`, so the words "verification code is" and
 * the number are in DIFFERENT elements and the sentence never appears. Only
 * the plain part can be matched — which is a reason to keep sending one.
 */
function decodeBase64Parts(rawMessage: string): string[] {
  const decoded: string[] = [];

  // Split on MIME boundaries; each chunk is headers, a blank line, then body.
  for (const part of rawMessage.split(/\r?\n--/)) {
    if (!/content-transfer-encoding:\s*base64/i.test(part)) continue;
    const separator = part.search(/\r?\n\r?\n/);
    if (separator === -1) continue;
    const body = part.slice(separator).replace(/\s+/g, '');
    if (!body) continue;
    try {
      decoded.push(Buffer.from(body, 'base64').toString('utf8'));
    } catch {
      // A part that will not decode simply has no code in it.
    }
  }

  return decoded;
}

function extractCode(rawMessage: string): string | null {
  // Cheapest first: a plaintext message, then quoted-printable, then the
  // base64 parts the API actually sends.
  for (const candidate of [
    rawMessage,
    decodeQuotedPrintable(rawMessage),
    ...decodeBase64Parts(rawMessage),
  ]) {
    const match = OTP_SENTENCE.exec(candidate);
    if (match) return match[1];
  }
  return null;
}

async function scanOnce(
  creds: Pop3Credentials,
  recipient: string,
  notBeforeMs: number,
): Promise<OtpCandidate | null> {
  return withPop3(creds, async (conn) => {
    const count = await conn.messageCount();
    let best: OtpCandidate | null = null;

    // Every message costs exactly ONE (connection-throttled) command — a RETR
    // carries the headers too; a TOP + RETR pair would double the spend
    // against Mailtrap's per-second command limit.
    for (let index = 1; index <= count; index += 1) {
      const raw = await conn.fetchMessage(index);
      const headerEnd = raw.indexOf('\r\n\r\n');
      const headers = headerEnd === -1 ? raw : raw.slice(0, headerEnd);

      const to = headerValue(headers, 'To');
      if (!to || !to.toLowerCase().includes(recipient.toLowerCase())) continue;

      const date = headerValue(headers, 'Date');
      const dateMs = date ? Date.parse(date) : Number.NaN;
      if (!Number.isFinite(dateMs) || dateMs < notBeforeMs) continue;

      const code = extractCode(raw);
      if (!code) continue;

      if (!best || dateMs > best.dateMs) best = { code, dateMs };
    }

    return best;
  });
}

/**
 * Poll the capture inbox until the OTP triggered at `sentAtMs` arrives.
 *
 * @param sentAtMs capture `Date.now()` IMMEDIATELY BEFORE triggering the send —
 *   it is the floor that keeps a previous session's code from being reused.
 */
export async function pollForOtp(
  creds: Pop3Credentials,
  recipient: string,
  sentAtMs: number,
): Promise<string> {
  const notBefore = sentAtMs - CLOCK_SKEW_MS;
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let lastError: unknown = null;

  while (Date.now() < deadline) {
    let backoff = POLL_INTERVAL_MS;
    try {
      const candidate = await scanOnce(creds, recipient, notBefore);
      if (candidate) return candidate.code;
    } catch (err) {
      // A transient POP3 failure is retried until the deadline.
      lastError = err;
      if (err instanceof Error && /too many commands/i.test(err.message)) {
        backoff = RATE_LIMIT_BACKOFF_MS;
      }
    }
    await sleep(backoff);
  }

  const detail = lastError instanceof Error ? ` Last POP3 error: ${lastError.message}` : '';
  throw new Error(
    `No OTP for ${recipient} arrived in the Mailtrap inbox within ${POLL_TIMEOUT_MS / 1000}s.` +
      ` The message is matched by recipient + Date >= the send moment, never by list position.${detail}`,
  );
}
