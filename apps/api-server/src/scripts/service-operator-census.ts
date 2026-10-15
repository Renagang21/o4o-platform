/** Read-only service operator census; no role/identity/DB mutation. */
import { Client } from 'pg';
import { resolveCanonicalServiceKey } from '@o4o/security-core';
import { ASSIGNABLE_OPERATOR_ROLES } from '../config/operator-role-catalog.js';
import { requireDbUsername } from './require-db-username.mjs';
import { readPassword } from '../../../../scripts/deployment/pharmacy-hub-qr-probes.mjs';
import { collectOperatorCensus } from '../../../../scripts/deployment/service-operator-census.mjs';

async function main(): Promise<void> {
  let client: Client | undefined;
  let stage = 'config';
  try {
    const user = requireDbUsername();
    const database = (process.env.DB_NAME ?? '').trim();
    const fingerprint = process.env.OPERATOR_IDENTITY_SHA256 ?? '';
    if (!database || !/^[a-f0-9]{64}$/.test(fingerprint)) throw new Error('OPERATOR_CENSUS_CONFIG_INVALID');
    const serviceKeys = [...new Set(ASSIGNABLE_OPERATOR_ROLES.map(role => resolveCanonicalServiceKey(role.split(':')[0])))];
    stage = 'secret';
    const password = readPassword();
    client = new Client({ host: '127.0.0.1', port: 55432, user, database, password,
      connectionTimeoutMillis: 15000, options: '-c default_transaction_read_only=on' });
    stage = 'connect';
    await client.connect();
    stage = 'query';
    const report = await collectOperatorCensus(client, fingerprint, [...ASSIGNABLE_OPERATOR_ROLES], serviceKeys);
    // Whitelisted aggregate fields only: no email, user/provider ID, fingerprint or original errors.
    console.log(JSON.stringify(report));
  } catch (error) {
    const code = (error as { code?: unknown })?.code;
    const safeCode = typeof code === 'string' && (/^[0-9A-Z]{5}$/.test(code) || ['ECONNREFUSED','ETIMEDOUT','UNKNOWN'].includes(code)) ? code : 'UNKNOWN';
    console.error(`OPERATOR_CENSUS_FAILED stage=${stage} code=${safeCode}`);
    process.exitCode = 1;
  } finally {
    if (client) {
      try { await client.end(); } catch { console.error('OPERATOR_CENSUS_FAILED stage=disconnect'); process.exitCode = 1; }
    }
  }
}

void main();
