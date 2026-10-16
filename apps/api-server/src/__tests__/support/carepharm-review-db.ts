import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';

/** Test-only schema; never run the application migrations or accept a remote database. */
export async function createCarePharmReviewDb() {
  const value = process.env.CAREPHARM_REVIEW_DATABASE_URL;
  if (!value) throw new Error('CAREPHARM_REVIEW_DATABASE_URL is required');
  const target = new URL(value);
  if (!['localhost', '127.0.0.1'].includes(target.hostname) || target.pathname !== '/carepharm_revision') {
    throw new Error('Use the isolated local carepharm_revision database only');
  }
  const schema = `carepharm_${randomUUID().replace(/-/g, '')}`;
  const ds = new DataSource({ type: 'postgres', url: value, extra: { options: `-c search_path=${schema},public` } });
  await ds.initialize();
  await ds.query(`CREATE SCHEMA ${schema}`);
  return { ds, async close() { await ds.query(`DROP SCHEMA ${schema} CASCADE`); await ds.destroy(); } };
}
