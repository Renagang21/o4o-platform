import { getCommunityDefinition } from '../../config/community-catalog.js';

type Exec = { query: (sql: string, params?: any[]) => Promise<any[]> };

/** Both creation paths lock the same key before checking the other ledger. */
export async function lockCommunityKey(exec: Exec, key: string): Promise<void> {
  await exec.query("SELECT pg_advisory_xact_lock(hashtext('community-key:' || $1))", [key]);
}

export async function independentCommunityKeyTaken(exec: Exec, key: string): Promise<boolean> {
  await lockCommunityKey(exec, key);
  const rows = await exec.query('SELECT 1 FROM semi_franchises WHERE community_key = $1', [key]);
  return rows.length > 0;
}

export async function businessCommunityKeyTaken(exec: Exec, key: string, ownId?: string): Promise<boolean> {
  await lockCommunityKey(exec, key);
  if (getCommunityDefinition(key)) return true;
  const rows = await exec.query(
    `SELECT 1 FROM communities WHERE slug = $1
     UNION ALL SELECT 1 FROM community_creation_requests WHERE desired_slug = $1 AND status = 'pending'
     UNION ALL SELECT 1 FROM semi_franchises WHERE community_key = $1 AND ($2::uuid IS NULL OR id <> $2::uuid)`, [key, ownId ?? null],
  );
  return rows.length > 0;
}
