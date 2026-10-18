import { BUSINESS_OPERATOR_PREDICATE } from './business-operator-access.js';
import type { DataSource } from "typeorm";
import { hasCooperativeOperatorAccess } from "./cooperative-operator-access.js";

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
    const operatorAccess = await hasCooperativeOperatorAccess(this.db, userId);
    const cooperativeOperators = operatorAccess
      ? await this.db.query(
          `SELECT c.id AS "cooperativeId", $1::uuid AS "userId"
      FROM cooperatives c JOIN semi_franchises sf ON sf.id = c.semi_franchise_id
      WHERE ${BUSINESS_OPERATOR_PREDICATE} AND c.status = 'active' AND sf.status = 'active'
      `,
          [userId],
        )
      : [];
    const federationRoles = operatorAccess ? await this.db.query(
      `SELECT 1 FROM role_assignments WHERE user_id=$1 AND role IN ('neture:pharmcoop_admin','neture:pharmcoop_operator') AND is_active=true AND (valid_from IS NULL OR valid_from<=CURRENT_TIMESTAMP) AND (valid_until IS NULL OR valid_until>=CURRENT_TIMESTAMP) LIMIT 1`, [userId],
    ) : [];
    return {
      userId,
      memberships,
      cooperativeOperators,
      federationOperators: federationRoles.length ? [{ userId }] : [],
    };
  }
}
