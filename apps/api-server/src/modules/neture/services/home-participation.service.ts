import type { DataSource } from 'typeorm';
import { resolveSemiFranchiseBusinessAccess } from '../../neture-pharmacy/services/semi-franchise-community-access.js';

/** Read the caller's existing ledgers; never create membership or infer it from Demo/role names. */
export async function readHomeParticipation(db: Pick<DataSource, 'query'>, userId: string) {
  const [businesses, cooperatives] = await Promise.all([
    db.query(`SELECT key, name FROM semi_franchises WHERE status = 'active' ORDER BY name, key`)
      .then(async (rows: { key: string; name: string }[]) => Promise.all(rows.map(async business => ({
        ...business,
        canParticipate: (await resolveSemiFranchiseBusinessAccess(db, userId, business.key)).allowed,
      })))),
    db.query(
      `SELECT c.id, c.slug, c.name, m.status
         FROM cooperative_memberships m
         JOIN cooperatives c ON c.id = m.cooperative_id
         JOIN semi_franchises sf ON sf.id = c.semi_franchise_id
        WHERE m.user_id = $1 AND c.status = 'active' AND sf.status = 'active'
        ORDER BY c.name, c.id`, [userId],
    ),
  ]);
  return { businesses, cooperatives };
}
