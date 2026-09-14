import 'server-only';

import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

/**
 * Server-only Firestore access for the marketing waitlist.
 *
 * Every read and write of the waitlist goes through the Firebase ADMIN SDK,
 * authenticated with a service account. The Admin SDK is not subject to
 * Firestore security rules, which is what lets the rules deny ALL client
 * access (`firestore.rules`) — no browser, and no request that merely holds
 * the project's public web config, can read or write the collection.
 *
 * The credential is ONE server-only env var holding the service-account JSON
 * exactly as Google issues it. It is never `NEXT_PUBLIC_*`, never logged, and
 * this module refuses to be imported into a client bundle (`server-only`).
 *
 * FAIL CLOSED: a missing or unparseable credential throws
 * `FirebaseAdminUnavailableError`, which the route handlers turn into a 503.
 * There is deliberately no fallback to the client SDK or to application
 * default credentials — a misconfigured deployment must stop, not quietly
 * reach Firestore some other way.
 */

export const SERVICE_ACCOUNT_ENV_VAR = 'FIREBASE_SERVICE_ACCOUNT_JSON';

/** The Firebase app name this module owns, so it can never collide with another. */
const APP_NAME = 'pool-waitlist-admin';

export class FirebaseAdminUnavailableError extends Error {
  constructor(reason: string) {
    super(`Firebase Admin is not configured: ${reason}`);
    this.name = 'FirebaseAdminUnavailableError';
  }
}

interface ServiceAccountFields {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

/**
 * Parse the service-account JSON. Exported for tests only.
 *
 * Error messages name the problem and NEVER echo any part of the value — the
 * value is a private key.
 */
export function parseServiceAccount(raw: string | undefined): ServiceAccountFields {
  if (!raw || !raw.trim()) {
    throw new FirebaseAdminUnavailableError(`${SERVICE_ACCOUNT_ENV_VAR} is not set`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new FirebaseAdminUnavailableError(`${SERVICE_ACCOUNT_ENV_VAR} is not valid JSON`);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new FirebaseAdminUnavailableError(`${SERVICE_ACCOUNT_ENV_VAR} is not a JSON object`);
  }

  const record = parsed as Record<string, unknown>;
  const projectId = record.project_id;
  const clientEmail = record.client_email;
  const privateKey = record.private_key;

  if (
    typeof projectId !== 'string' ||
    typeof clientEmail !== 'string' ||
    typeof privateKey !== 'string' ||
    !projectId ||
    !clientEmail ||
    !privateKey
  ) {
    throw new FirebaseAdminUnavailableError(
      `${SERVICE_ACCOUNT_ENV_VAR} is missing project_id, client_email or private_key`,
    );
  }

  return {
    projectId,
    clientEmail,
    // A key pasted through a dashboard sometimes arrives with its newlines
    // escaped as the two characters `\n`; PEM parsing needs real newlines.
    privateKey: privateKey.replace(/\\n/g, '\n'),
  };
}

let cachedDb: Firestore | null = null;

/**
 * The waitlist's Firestore, initialised on first use.
 *
 * @throws FirebaseAdminUnavailableError when the credential is absent/invalid.
 */
export function getAdminFirestore(): Firestore {
  if (cachedDb) return cachedDb;

  const account = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

  let app: App | undefined = getApps().find((a) => a.name === APP_NAME);
  if (!app) {
    try {
      app = initializeApp(
        {
          credential: cert({
            projectId: account.projectId,
            clientEmail: account.clientEmail,
            privateKey: account.privateKey,
          }),
          projectId: account.projectId,
        },
        APP_NAME,
      );
    } catch {
      // The SDK's own message can quote the malformed key; do not surface it.
      throw new FirebaseAdminUnavailableError('the service-account credential was rejected');
    }
  }

  cachedDb = getFirestore(app);
  return cachedDb;
}

/**
 * Log that the waitlist is unavailable because of configuration, without
 * leaking the credential. One line, greppable in the Vercel logs.
 */
export function logFirebaseAdminUnavailable(route: string, error: FirebaseAdminUnavailableError): void {
  console.error(`[waitlist] ${route}: ${error.message}`);
}
