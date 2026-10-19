import { BUSINESS_OPERATOR_PREDICATE } from './business-operator-access.js';
import type { DataSource } from "typeorm";
import { NETURE_MAIN_SERVICE_KEY, resolveNetureMainMembershipStatus, type NetureMainMembershipRow } from "../../neture/services/neture-main-membership.js";
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
  /** Federation role settings only; individual cooperatives and members are not queried. */
  async federationForAdmin() {
    const roles = await this.db.query<Array<NetureMainMembershipRow & Record<string, unknown>>>(
      `SELECT ra.user_id AS "userId", ra.role, u.email,
        COALESCE(NULLIF(btrim(u.name), ''), NULLIF(btrim(concat_ws(' ', u."lastName", u."firstName")), ''), NULLIF(btrim(u.nickname), '')) AS name,
        u.status AS account_status, u."isActive" AS account_active, u."isEmailVerified" AS email_verified,
        sm.status AS membership_status
      FROM role_assignments ra JOIN users u ON u.id=ra.user_id
      LEFT JOIN service_memberships sm ON sm.user_id=u.id AND sm.service_key=$1
      WHERE ra.role IN ('neture:pharmcoop_admin','neture:pharmcoop_operator') AND ra.is_active=true
        AND (ra.valid_from IS NULL OR ra.valid_from<=CURRENT_TIMESTAMP)
        AND (ra.valid_until IS NULL OR ra.valid_until>=CURRENT_TIMESTAMP)
      ORDER BY ra.role, ra.user_id`, [NETURE_MAIN_SERVICE_KEY]);
    return {
      roleOperators: roles.map(({ account_status, account_active, email_verified, membership_status, ...role }) => ({
        ...role,
        membershipStatus: resolveNetureMainMembershipStatus({ account_status, account_active, email_verified, membership_status }),
      })),
    };
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
