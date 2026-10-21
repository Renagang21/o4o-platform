import type { DataSource, EntityManager } from "typeorm";
import { resolveNetureMainMembershipStatus } from "../../modules/neture/services/neture-main-membership.js";
import { resolveCanonicalServiceKey } from "@o4o/security-core";
import { invalidateRoles } from '../../modules/auth/utils/role-cache.js';
import { lockOperatorAssignments } from '../../modules/auth/services/operator-assignment-lock.js';
import { roleAssignmentService } from "../../modules/auth/services/role-assignment.service.js";
import { demoAccountService } from "../auth/demo-account.service.js";
import {
  OperationError,
  recordOperation,
} from "../operations/operation-audit.js";

/** Explicit delegation scopes. No client-supplied role, prefix, or membership key. */
export const OPERATOR_DELEGATION_SCOPES = {
  neture: "neture",
  supplier: "supplier",
  funding: "funding",
  community: "community",
  lecture: "lecture",
  "kpa-society": "kpa",
  pharmacy: "neture:pharmacy",
  carepharm: "neture:carepharm",
  megapharm: "neture:megapharm",
  pharmcoop: "neture:pharmcoop",
} as const;
export function delegationScope(key: string) {
  const prefix = Object.prototype.hasOwnProperty.call(
    OPERATOR_DELEGATION_SCOPES,
    key,
  )
    ? OPERATOR_DELEGATION_SCOPES[key as keyof typeof OPERATOR_DELEGATION_SCOPES]
    : undefined;
  if (!prefix)
    throw new OperationError(
      404,
      "OPERATOR_SCOPE_NOT_FOUND",
      "운영 범위를 찾을 수 없습니다.",
    );
  const business = prefix.includes(":");
  return {
    key,
    membershipKey: resolveCanonicalServiceKey(prefix.split(":")[0]),
    adminRole: `${prefix}${business ? "_" : ":"}admin`,
    operatorRole: `${prefix}${business ? "_" : ":"}operator`,
  };
}
type Scope = ReturnType<typeof delegationScope>;
const validRole = `(ra.valid_from IS NULL OR ra.valid_from<=CURRENT_TIMESTAMP)
  AND (ra.valid_until IS NULL OR ra.valid_until>=CURRENT_TIMESTAMP)`;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ServiceOperatorManagementService {
  constructor(private readonly db: DataSource) {}
  private async membershipActive(
    m: EntityManager,
    userId: string,
    scope: Scope,
  ) {
    const [sm] = await m.query(
      "SELECT status FROM service_memberships WHERE user_id=$1 AND service_key=$2 FOR SHARE",
      [userId, scope.membershipKey],
    );
    // All Neture-backed scopes use the canonical automatic main-account eligibility.
    return scope.membershipKey === "neture"
      ? resolveNetureMainMembershipStatus({
          account_status: "active",
          account_active: true,
          email_verified: true,
          membership_status: sm?.status,
        }) === "active"
      : sm?.status === "active";
  }
  private async authorize(m: EntityManager, actor: string, scope: Scope) {
    // Live DB authority, locked through commit. Platform-only actors use the unchanged central console.
    const rows = await m.query(
      `SELECT ra.id FROM role_assignments ra
      JOIN users u ON u.id=ra.user_id AND u.status IN ('active','approved')
        AND u."isActive"=true AND u."isEmailVerified"=true
      WHERE ra.user_id=$1 AND ra.role=$2 AND ra.is_active=true AND ${validRole}
      FOR SHARE OF ra,u`,
      [actor, scope.adminRole],
    );
    if (!rows.length || !(await this.membershipActive(m, actor, scope)))
      throw new OperationError(
        403,
        "SERVICE_ADMIN_REQUIRED",
        "해당 서비스의 활성 Admin 권한이 필요합니다.",
      );
    if (["pharmacy", "carepharm", "megapharm"].includes(scope.key)) {
      const business = await m.query(
        `SELECT sf.id FROM semi_franchises sf WHERE sf.key=$1 AND sf.status='active'
        AND NOT EXISTS(SELECT 1 FROM cooperatives c WHERE c.semi_franchise_id=sf.id) FOR SHARE OF sf`,
        [scope.key],
      );
      if (!business.length)
        throw new OperationError(
          409,
          "BUSINESS_OPERATOR_SCOPE_UNAVAILABLE",
          "활성 협력사업에서 지정하세요. 개별 조합은 조합 운영 화면에서 지정합니다.",
        );
    }
  }
  async list(actor: string, key: string, query = "") {
    const scope = delegationScope(key);
    return this.db.transaction(async (m) => {
      await this.authorize(m, actor, scope);
      const pattern = `%${query
        .trim()
        .slice(0, 100)
        .replace(/[\\%_]/g, "\\$&")}%`;
      const operators = await m.query(
        `SELECT u.id AS "userId",u.name,u.email,
        CASE WHEN (u.status IN ('active','approved') AND u."isActive" AND u."isEmailVerified") IS NOT TRUE THEN 'unavailable'
          WHEN $4 AND (sm.status IS NULL OR sm.status NOT IN ('suspended','withdrawn')) THEN 'active'
          ELSE sm.status END AS "membershipStatus",
        ra.assigned_at AS "assignedAt", (${validRole}) AS "effective"
        FROM role_assignments ra JOIN users u ON u.id=ra.user_id
        LEFT JOIN service_memberships sm ON sm.user_id=u.id AND sm.service_key=$2
        WHERE ra.role=$1 AND ra.is_active=true AND (u.name ILIKE $3 OR u.email ILIKE $3) ORDER BY u.email,u.id LIMIT 201`,
        [
          scope.operatorRole,
          scope.membershipKey,
          pattern,
          scope.membershipKey === "neture",
        ],
      );
      const q = query.trim();
      const candidates =
        q.length < 2
          ? []
          : await m.query(
              `SELECT u.id AS "userId",u.name,u.email,
        EXISTS(SELECT 1 FROM linked_accounts la WHERE la."userId"=u.id AND la.provider='google') AS "hasGoogleLink"
        FROM users u LEFT JOIN service_memberships sm ON sm.user_id=u.id AND sm.service_key=$1
        WHERE u.status IN ('active','approved') AND u."isActive"=true AND u."isEmailVerified"=true
        AND (sm.status='active' OR ($3 AND (sm.status IS NULL OR sm.status NOT IN ('suspended','withdrawn'))))
        AND (u.name ILIKE $2 OR u.email ILIKE $2) ORDER BY u.email,u.id LIMIT 30`,
              [scope.membershipKey, pattern, scope.membershipKey === "neture"],
            );
      return {
        scope: scope.key,
        role: scope.operatorRole,
        operators: operators.slice(0, 200),
        truncated: operators.length > 200,
        candidates,
      };
    });
  }
  async change(actor: string, key: string, userId: string, assign: boolean) {
    const scope = delegationScope(key);
    if (!uuid.test(userId))
      throw new OperationError(
        400,
        "INVALID_USER_ID",
        "대상 사용자를 선택해 주세요.",
      );
    userId = userId.toLowerCase();
    const result = await this.db.transaction(async (m) => {
      await this.authorize(m, actor, scope);
      if (actor === userId)
        throw new OperationError(
          409,
          "SELF_OPERATOR_CHANGE_FORBIDDEN",
          "자기 역할은 다른 Admin에게 요청하세요.",
        );
      // Same lock as every canonical operator writer; includes preflight and audit ownership.
      await lockOperatorAssignments(m, userId);
      await demoAccountService.assertNotDemoAccount(userId, m);
      let changed = false;
      if (assign) {
        const targets = await m.query(
          `SELECT u.id FROM users u WHERE u.id=$1 AND u.status IN ('active','approved')
          AND u."isActive"=true AND u."isEmailVerified"=true FOR SHARE OF u`,
          [userId],
        );
        if (!targets.length || !(await this.membershipActive(m, userId, scope)))
          throw new OperationError(
            409,
            "ACTIVE_SERVICE_MEMBER_REQUIRED",
            "승인된 활성 서비스 회원만 지정할 수 있습니다.",
          );
        const google = await m.query(
          `SELECT id FROM linked_accounts WHERE "userId"=$1 AND provider='google' FOR SHARE`,
          [userId],
        );
        if (!google.length)
          throw new OperationError(
            409,
            "GOOGLE_LINK_REQUIRED",
            "본인의 Google 계정 연결 후 지정할 수 있습니다.",
          );
        const [prior] = await m.query(
          `SELECT is_active,valid_from,valid_until FROM role_assignments
          WHERE user_id=$1 AND role=$2 ORDER BY is_active DESC,assigned_at DESC,id DESC LIMIT 1 FOR UPDATE`,
          [userId, scope.operatorRole],
        );
        if (
          prior &&
          ((prior.valid_until &&
            new Date(prior.valid_until).getTime() < Date.now()) ||
            (prior.valid_from &&
              new Date(prior.valid_from).getTime() > Date.now()))
        ) {
          throw new OperationError(
            409,
            "OPERATOR_ROLE_SCHEDULE_REVIEW_REQUIRED",
            "유효기간이 설정된 역할입니다. 전체 관리자에게 기간 검토를 요청하세요.",
          );
        }
        if (!prior?.is_active) {
          await roleAssignmentService.assignRole(
            {
              userId,
              role: scope.operatorRole,
              assignedBy: actor,
              ...(prior?.valid_until
                ? { validUntil: new Date(prior.valid_until) }
                : {}),
            },
            m,
          );
          changed = true;
        }
      } else {
        changed = await roleAssignmentService.removeRole(
          userId,
          scope.operatorRole,
          m,
        );
      }
      if (changed)
        await recordOperation(
          m,
          scope.membershipKey,
          actor,
          assign
            ? "admin.service_operator_assigned"
            : "admin.service_operator_revoked",
          { scope: scope.key, targetUserId: userId, role: scope.operatorRole },
        );
      return {
        userId,
        scope: scope.key,
        role: scope.operatorRole,
        assigned: assign,
        changed,
      };
    });
    invalidateRoles(userId);
    return result;
  }
}
