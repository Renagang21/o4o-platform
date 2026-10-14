/** Read-only canonical Store Owner Demo census. Data repair uses the existing approved migration. */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { inspectDemoPharmacyAccess } from './lib/demo-pharmacy-access-audit.js';

async function run() {
  const { DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME } = process.env;
  if (!DB_HOST || !DB_USERNAME || !DB_PASSWORD || !DB_NAME) throw new Error('DB_CONFIGURATION_REQUIRED');
  if (process.argv.includes('--apply')) throw new Error('DEMO_AUDIT_IS_READ_ONLY');
  const db = new DataSource({ type: 'postgres', host: DB_HOST,
    ...(DB_HOST.startsWith('/cloudsql/') ? {} : { port: Number(DB_PORT || 5432) }),
    username: DB_USERNAME, password: DB_PASSWORD, database: DB_NAME,
    entities: [], migrations: [], synchronize: false, logging: false });
  try {
    await db.initialize();
    const summary = await db.transaction('SERIALIZABLE', async manager => {
      await manager.query('SET TRANSACTION READ ONLY');
      const plan = await inspectDemoPharmacyAccess(manager);
      return { pharmacy: plan.createPharmacy ? 'MISSING' : 'ACTIVE', role: plan.createRole ? 'MISSING' : 'ACTIVE', writes: 0 };
    });
    console.log(JSON.stringify({ mode: 'READ_ONLY', ...summary }));
  } finally {
    if (db.isInitialized) await db.destroy();
  }
}
run().catch((error: unknown) => {
  // Driver errors may contain account or connection values. Keep CLI output redacted.
  const code = error instanceof Error && /^(CANONICAL_DEMO_[A-Z_]+|DEMO_[A-Z_]+|DB_CONFIGURATION_REQUIRED)$/.test(error.message)
    ? error.message : 'REPAIR_FAILED';
  console.error(`${code}: no data written.`);
  process.exitCode = 1;
});
