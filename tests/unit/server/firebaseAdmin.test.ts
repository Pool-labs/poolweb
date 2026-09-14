import { afterEach, describe, expect, it } from 'vitest';

import {
  FirebaseAdminUnavailableError,
  getAdminFirestore,
  parseServiceAccount,
} from '@/lib/server/firebaseAdmin';

const FAKE_KEY = '-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBg\\n-----END PRIVATE KEY-----\\n';
const account = { project_id: 'demo-project', client_email: 'svc@demo-project.iam.gserviceaccount.com', private_key: FAKE_KEY };

describe('parseServiceAccount', () => {
  it('reads the three fields and restores escaped newlines in the key', () => {
    const parsed = parseServiceAccount(JSON.stringify(account));
    expect(parsed.projectId).toBe('demo-project');
    expect(parsed.clientEmail).toBe(account.client_email);
    expect(parsed.privateKey).toContain('\nMIIEvQIBADANBg\n');
  });

  it.each([
    ['unset', undefined],
    ['blank', '   '],
    ['not JSON', '{"private_key": "-----BEGIN'],
    ['not an object', '"a string"'],
    ['missing fields', JSON.stringify({ project_id: 'demo-project' })],
  ])('fails closed when %s', (_label, raw) => {
    expect(() => parseServiceAccount(raw)).toThrow(FirebaseAdminUnavailableError);
  });

  it('never echoes the credential in its error', () => {
    const secret = '{"private_key": "TOP-SECRET-KEY-MATERIAL", ';
    try {
      parseServiceAccount(secret);
      throw new Error('expected a throw');
    } catch (error) {
      expect(String((error as Error).message)).not.toContain('TOP-SECRET');
    }
  });
});

describe('getAdminFirestore', () => {
  const original = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  afterEach(() => {
    if (original === undefined) delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    else process.env.FIREBASE_SERVICE_ACCOUNT_JSON = original;
  });

  it('refuses to initialise without the credential', () => {
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    expect(() => getAdminFirestore()).toThrow(FirebaseAdminUnavailableError);
  });
});
