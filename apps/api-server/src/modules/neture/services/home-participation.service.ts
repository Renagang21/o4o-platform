import type { DataSource } from 'typeorm';
import { resolveSemiFranchiseBusinessAccess } from '../../neture-pharmacy/services/semi-franchise-community-access.js';

/** Read the caller's existing ledgers; never create membership or infer it from Demo/role names. */
export async function readHomeParticipation(db: Pick<DataSource, 'query'>, userId: string) {
  const [businesses, cooperatives, memberships] = await Promise.all([
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
    db.query(
      `SELECT sf.key, m.status
         FROM semi_franchise_memberships m
         JOIN semi_franchises sf ON sf.id = m.semi_franchise_id
         JOIN organization_members om ON om.organization_id = m.organization_id
        WHERE om.user_id = $1 AND om.left_at IS NULL
          AND om.role IN ('owner','admin','manager') AND sf.status = 'active'`, [userId],
    ),
  ]);
  const rank: Record<string, number> = { active: 0, pending: 1, suspended: 2, rejected: 3, withdrawn: 4, terminated: 4 };
  const statuses = new Map<string, string>();
  for (const membership of memberships as { key: string; status: string }[]) {
    const previous = statuses.get(membership.key);
    if (!previous || (rank[membership.status] ?? 9) < (rank[previous] ?? 9)) statuses.set(membership.key, membership.status);
  }
  // Only expose accessible businesses or the caller's own applications, never the whole registry.
  return {
    businesses: businesses.filter(business => business.canParticipate || statuses.has(business.key))
      .map(business => ({ ...business, membershipStatus: statuses.get(business.key) ?? null })),
    cooperatives,
  };
}
