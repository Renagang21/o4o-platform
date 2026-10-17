import type { DataSource } from "typeorm";
import { hasCooperativeOperatorAccess } from "./cooperative-operator-access.js";

/** No pharmacy membership, store ownership or federation authority is inferred here. */
export class CooperativeService {
  constructor(private readonly db: DataSource) {}
  async directory() {
    return this.db.query(`SELECT c.id, c.slug, c.name, c.introduction,
      c.eligibility_description AS "eligibilityDescription", sf.key AS "businessKey"
      FROM cooperatives c JOIN semi_franchises sf ON sf.id = c.semi_franchise_id
      WHERE c.status = 'active' AND sf.status = 'active' ORDER BY c.name, c.slug`);
  }
  async session(userId: string) {
    const memberships = await this.db.query(
      `SELECT m.cooperative_id AS "cooperativeId", m.user_id AS "userId", m.status
      FROM cooperative_memberships m JOIN cooperatives c ON c.id = m.cooperative_id
      JOIN semi_franchises sf ON sf.id = c.semi_franchise_id
      WHERE m.user_id = $1 AND c.status = 'active' AND sf.status = 'active'`,
      [userId],
    );
    const cooperativeOperators = (await hasCooperativeOperatorAccess(
      this.db,
      userId,
    ))
      ? await this.db.query(
          `SELECT c.id AS "cooperativeId", op.user_id AS "userId"
      FROM cooperatives c JOIN semi_franchises sf ON sf.id = c.semi_franchise_id
      JOIN semi_franchise_operators op ON op.semi_franchise_id = sf.id AND op.revoked_at IS NULL
      WHERE op.user_id = $1 AND c.status = 'active' AND sf.status = 'active'
      `,
          [userId],
        )
      : [];
    return {
      userId,
      memberships,
      cooperativeOperators,
      federationOperators: [],
    };
  }
}
