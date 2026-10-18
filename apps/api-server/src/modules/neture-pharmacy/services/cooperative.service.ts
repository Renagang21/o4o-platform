import type { DataSource } from "typeorm";
import { federationRole } from "./cooperative-management.service.js";

/** No pharmacy membership, store ownership or federation authority is inferred here. */
export class CooperativeService {
  constructor(private readonly db: DataSource) {}
  directory() {
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
    const cooperativeOperators = await this.db.query(
      `SELECT cr.cooperative_id AS "cooperativeId", cr.user_id AS "userId", cr.role
       FROM cooperative_roles cr JOIN cooperatives c ON c.id=cr.cooperative_id
       JOIN semi_franchises sf ON sf.id=c.semi_franchise_id JOIN users u ON u.id=cr.user_id
       WHERE cr.user_id=$1 AND cr.revoked_at IS NULL AND c.status='active' AND sf.status='active'
       AND u.status IN ('active','approved') AND u."isActive"=true AND u."isEmailVerified"=true`, [userId]);
    const role = await federationRole(this.db,userId);
    return {
      userId,
      memberships,
      cooperativeOperators,
      federationOperators: role ? [{ userId, role }] : [],
    };
  }
}
