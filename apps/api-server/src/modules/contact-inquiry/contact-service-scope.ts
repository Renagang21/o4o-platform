import { CENTRAL_CONTACT_MENUS, assertCentralContactAccess } from './central-contact-access.js';
import { centralRequestAuthMethod } from '../../middleware/central-operation-menu.middleware.js';
import { OperationError } from '../../services/operations/operation-audit.js';
import { centralOperationRequest } from '../../middleware/central-operation-menu.middleware.js';
import type { RequestHandler } from "express";
import type { DataSource } from "typeorm";
import {
  requireServiceLegalScope,
  isSupportedLegalServiceKey,
} from "../service-legal/service-legal-scope.js";
import { requireKpaBranchScope } from "../../middleware/kpa-branch-scope.middleware.js";
import { requireNetureScope } from "../../middleware/neture-scope.middleware.js";

/** Contact ownership is explicit; a public source path never determines authorization. */
export const CONTACT_SERVICES: Record<
  string,
  { name: string; roles: string[]; membership: string }
> = {
  neture: {
    name: "O4O",
    roles: ["neture:operator", "neture:admin"],
    membership: "neture",
  },
  supplier: {
    name: "공급자",
    roles: ["supplier:operator", "supplier:admin"],
    membership: "supplier",
  },
  funding: {
    name: "유통참여형 펀딩",
    roles: ["funding:operator", "funding:admin"],
    membership: "funding",
  },
  community: {
    name: "커뮤니티",
    roles: ["community:operator", "community:admin"],
    membership: "community",
  },
  lecture: {
    name: "O4O 강의",
    roles: ["lecture:operator", "lecture:admin"],
    membership: "lecture",
  },
  "k-cosmetics": {
    name: "K-Cosmetics",
    roles: ["cosmetics:operator", "cosmetics:admin"],
    membership: "k-cosmetics",
  },
  "kpa-society": {
    name: "O4O 약국 경영지원",
    roles: [
      "kpa:operator",
      "kpa:admin",
      "neture:pharmacy_operator",
      "neture:pharmacy_admin",
    ],
    membership: "kpa-society",
  },
  carepharm: {
    name: "CarePharm · 만성질환관리",
    roles: ["neture:carepharm_operator", "neture:carepharm_admin"],
    membership: "neture",
  },
  drugstore: {
    name: "드럭스토어형 약국",
    roles: ["neture:drugstore_operator", "neture:drugstore_admin"],
    membership: "neture",
  },
  pharmcoop: {
    name: "약국·약사 협동조합 안내",
    roles: ["neture:pharmcoop_operator", "neture:pharmcoop_admin"],
    membership: "neture",
  },
  "kpa-branch": {
    name: "약사회 분회 서비스 안내",
    roles: ["kpa-branch:admin"],
    membership: "kpa-branch",
  },
  // These tools have no independent service-operator contract. O4O handles their general inquiries.
  store: {
    name: "내 매장",
    roles: ["neture:operator", "neture:admin"],
    membership: "neture",
  },
  hospital: {
    name: "원내 약품 파일 도구",
    roles: ["neture:operator", "neture:admin"],
    membership: "neture",
  },
};
export function contactService(key: string) {
  return Object.prototype.hasOwnProperty.call(CONTACT_SERVICES, key)
    ? CONTACT_SERVICES[key]
    : null;
}

/** Same live account/membership/role validity used for delivery and custom business inbox access.
 * Neture main eligibility mirrors getNetureMainMembershipStatus: verified usable
 * accounts are active without a legacy ledger row or manual pending/rejected approval.
 * Explicit suspension/withdrawal is still denied. Other services require active membership.
 */
export async function contactRecipients(
  db: Pick<DataSource, "query">,
  key: string,
  level: "operator" | "admin" = "operator",
): Promise<{ userId: string }[]> {
  const service = contactService(key);
  if (!service) return [];
  const roles = service.roles.filter(
    (role) =>
      level === "operator" ||
      role.endsWith(":admin") ||
      role.endsWith("_admin"),
  );
  const businessKey =
    key === "kpa-society"
      ? "pharmacy"
      : ["carepharm", "drugstore"].includes(key)
        ? key
        : null;
  const legacyRoles =
    level === "admin" ? ["neture:admin"] : ["neture:operator", "neture:admin"];
  return db.query(
    `SELECT DISTINCT ra.user_id AS "userId" FROM role_assignments ra
    JOIN users u ON u.id=ra.user_id
    LEFT JOIN service_memberships sm ON sm.user_id=u.id AND sm.service_key=
      CASE WHEN ra.role LIKE 'neture:%' THEN 'neture' ELSE $2 END
    WHERE (ra.role=ANY($1::text[]) OR ($3::text IS NOT NULL AND ra.role=ANY($4::text[])
      AND EXISTS (SELECT 1 FROM semi_franchises sf JOIN semi_franchise_operators op ON op.semi_franchise_id=sf.id
        WHERE sf.key=$3 AND op.user_id=ra.user_id AND op.revoked_at IS NULL))) AND ra.is_active=true
      AND (ra.valid_from IS NULL OR ra.valid_from<=CURRENT_TIMESTAMP)
      AND (ra.valid_until IS NULL OR ra.valid_until>=CURRENT_TIMESTAMP)
      AND u.status IN ('active','approved') AND u."isActive"=true AND u."isEmailVerified"=true
      AND NOT EXISTS (SELECT 1 FROM service_memberships main WHERE main.user_id=u.id
        AND main.service_key='neture' AND main.status IN ('suspended','withdrawn'))
      AND (sm.status='active' OR (ra.role LIKE 'neture:%' AND (sm.status IS NULL OR sm.status NOT IN ('suspended','withdrawn'))))`,
    [roles, service.membership, businessKey, legacyRoles],
  );
}

export function requireContactScope(
  db: Pick<DataSource, "query">,
  level: "operator" | "admin",
): RequestHandler {
  return async (req, res, next) => {
    const key = req.params.serviceKey;
    if (!contactService(key)) {
      res.status(404).json({
        success: false,
        error: {
          code: "UNKNOWN_SERVICE",
          message: "지원하지 않는 서비스입니다.",
        },
      });
      return;
    }
    if (level === 'operator' && CENTRAL_CONTACT_MENUS[key]) {
      try {
        await assertCentralContactAccess(db, req.user!.id, key, centralRequestAuthMethod(req));
        return next();
      } catch (error) {
        if (error instanceof OperationError) { res.status(error.status).json({success:false,code:error.code,error:error.message}); return; }
        return next(error);
      }
    }
    if (key === "kpa-branch")
      return requireKpaBranchScope("kpa-branch:admin")(req, res, next);
    if (isSupportedLegalServiceKey(key) && key !== "kpa-society")
      return requireServiceLegalScope(level)(req, res, next);
    if (key === "store" || key === "hospital")
      return requireNetureScope(`neture:${level}`)(req, res, error => {
        if (error) return next(error);
        return centralOperationRequest('neture', () => ['neture.inbox'], db)(req,res,next);
      });
    try {
      const recipients = await contactRecipients(db, key, level);
      if (recipients.some((row) => row.userId === req.user?.id)) {
        if (key === 'pharmcoop') return centralOperationRequest('pharmcoop', () => ['pharmcoop.inbox'], db)(req,res,next);
        return next();
      }
      // Keep the KPA legal guard's existing isolation/platform policy.
      if (key === "kpa-society")
        return requireServiceLegalScope(level)(req, res, next);
      res.status(403).json({
        success: false,
        error: {
          code: "CONTACT_SCOPE_REQUIRED",
          message: "해당 서비스 문의 처리 권한이 필요합니다.",
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
