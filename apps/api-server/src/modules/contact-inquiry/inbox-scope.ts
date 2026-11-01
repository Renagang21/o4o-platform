import { centralRequestAuthMethod } from '../../middleware/central-operation-menu.middleware.js';
import { assertCentralOperationRequest } from '../../services/admin/central-operation-menu-grants.js';
import type { RequestHandler } from "express";
import type { DataSource, EntityManager } from "typeorm";
import {
  requireNetureScope,
  requireNetureBusinessScope,
} from "../../middleware/neture-scope.middleware.js";
import { requireSupplierScope } from "../../middleware/supplier-service-scope.middleware.js";
import { requireFundingScope } from "../../middleware/funding-service-scope.middleware.js";
import { hasCommunityServiceOperator } from "../../services/community/community-service-operator-access.js";
import { requireLectureScope } from "../../middleware/lecture-scope.middleware.js";
import { SemiFranchiseService } from "../neture-pharmacy/services/semi-franchise.service.js";
import { CooperativeManagementService } from "../neture-pharmacy/services/cooperative-management.service.js";
import { BUSINESS_OPERATOR_PREDICATE } from "../neture-pharmacy/services/business-operator-access.js";
import { NeturePharmacyError } from "../neture-pharmacy/constants.js";

export interface InboxScope {
  kind: "service" | "business" | "cooperative";
  key: string;
  name: string;
  serviceKey: string;
  organizationId: string | null;
  businessId?: string;
  cooperativeId?: string;
  publicPath: string;
  managePath: string;
  taskPath: string;
}
const names: Record<string, string> = {
  neture: "O4O",
  supplier: "공급자",
  funding: "펀딩",
  community: "커뮤니티",
  lecture: "강의",
  store: "내 매장",
  pharmcoop: "협동조합 연합회",
};
export const INBOX_SERVICE_GUARDS: Record<string, RequestHandler> = {
  neture: requireNetureScope("neture:operator"),
  store: requireNetureScope("neture:operator"),
  supplier: requireSupplierScope("supplier:operator"),
  funding: requireFundingScope("funding:operator"),
  lecture: requireLectureScope("lecture:operator"),
};
export async function resolveInboxScope(
  ds: Pick<EntityManager, "query">,
  kind: string,
  key: string,
): Promise<InboxScope> {
  const missing = () =>
    new NeturePharmacyError(
      404,
      "INBOX_SCOPE_NOT_FOUND",
      "운영 중인 문의창구를 찾을 수 없습니다.",
    );
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(key)) throw missing();
  if (kind === "service") {
    if (!Object.hasOwn(names, key)) throw missing();
    const managePath =
      key === "lecture"
        ? "/operator/contact"
        : key === "pharmcoop" || key === "store"
          ? "/operator/inbox"
          : `/operator/inbox/${key}`;
    return {
      kind,
      key,
      name: names[key],
      serviceKey: key,
      organizationId: null,
      publicPath: "/contact",
      managePath,
      taskPath: key === "lecture" ? "/operator/inbox" : managePath,
    };
  }
  if (kind === "business") {
    // An affiliated cooperative has its own route/role boundary; it must never enter through a business alias.
    const [row] = await ds.query(
      `SELECT sf.id,sf.organization_id,sf.name FROM semi_franchises sf WHERE sf.key=$1 AND sf.status='active' AND NOT EXISTS(SELECT 1 FROM cooperatives c WHERE c.semi_franchise_id=sf.id)`,
      [key],
    );
    if (!row) throw missing();
    return {
      kind,
      key,
      name: row.name,
      serviceKey: "neture",
      organizationId: row.organization_id,
      businessId: row.id,
      publicPath: "/contact",
      managePath: `/operator/inbox/business/${key}`,
      taskPath: `/operator/inbox/business/${key}`,
    };
  }
  if (kind === "cooperative") {
    const [row] = await ds.query(
      `SELECT c.id,c.name,c.semi_franchise_id,sf.organization_id FROM cooperatives c JOIN semi_franchises sf ON sf.id=c.semi_franchise_id WHERE c.slug=$1 AND c.status='active' AND sf.status='active'`,
      [key],
    );
    if (!row) throw missing();
    return {
      kind,
      key,
      name: row.name,
      serviceKey: "neture",
      organizationId: row.organization_id,
      businessId: row.semi_franchise_id,
      cooperativeId: row.id,
      publicPath: `/${key}/contact`,
      managePath: `/${key}/operator/inbox`,
      taskPath: `/${key}/operator/inbox`,
    };
  }
  throw missing();
}

export function scopeGuard(ds: DataSource, scope: InboxScope): RequestHandler {
  if (scope.kind === "service" && scope.key === "community")
    return async (req, res, next) => {
      try {
        if (!(await hasCommunityServiceOperator(ds, req.user!.id))) {
          res
            .status(403)
            .json({
              success: false,
              error: "현재 커뮤니티 운영 권한이 필요합니다.",
            });
          return;
        }
        await assertCentralOperationRequest(ds,req.user!.id,'community',['community.inbox'],centralRequestAuthMethod(req));
        next();
      } catch (error) {
        next(error);
      }
    };

  if (scope.kind === "service" && scope.key !== "pharmcoop")
    return INBOX_SERVICE_GUARDS[scope.key];
  const management = new CooperativeManagementService(ds);
  const check: RequestHandler = async (req, _res, next) => {
    try {
      if (scope.kind === "cooperative")
        await management.requireLocal(ds, req.user!.id, scope.cooperativeId!);
      else if (scope.key === "pharmcoop" && scope.kind === "service")
        { await management.requireFederation(ds, req.user!.id, false, 'inbox');
          await assertCentralOperationRequest(ds,req.user!.id,'pharmcoop',['pharmcoop.inbox'],centralRequestAuthMethod(req)); }

      else
        await new SemiFranchiseService(ds).requireOperatorOf(
          req.user!.id,
          scope.key,
        );
      next();
    } catch (e) {
      next(e);
    }
  };
  if (scope.kind !== "business") return check;
  return (req, res, next) =>
    requireNetureBusinessScope(req, res, (error) =>
      error ? next(error) : check(req, res, next),
    );
}

/** Same current assignment, membership and account boundaries used by the operator routes. */
export async function inboxRecipients(
  ds: Pick<EntityManager, "query">,
  scope: InboxScope,
): Promise<{ userId: string }[]> {
  const usable = `u.status IN ('active','approved') AND u."isActive"=true AND u."isEmailVerified"=true`;
  if (scope.kind === "cooperative")
    return ds.query(
      `SELECT DISTINCT cr.user_id AS "userId" FROM cooperative_roles cr JOIN users u ON u.id=cr.user_id WHERE cr.cooperative_id=$1 AND cr.revoked_at IS NULL AND ${usable}`,
      [scope.cooperativeId],
    );
  if (scope.kind === "business")
    return ds.query(
      `SELECT DISTINCT u.id AS "userId" FROM users u CROSS JOIN semi_franchises sf WHERE sf.id=$2 AND ${usable} AND ${BUSINESS_OPERATOR_PREDICATE} AND NOT EXISTS(SELECT 1 FROM service_memberships sm WHERE sm.user_id=u.id AND sm.service_key='neture' AND sm.status IN ('suspended','withdrawn'))`
        .replaceAll("ra.user_id = $1", "ra.user_id = u.id")
        .replaceAll("op.user_id = $1", "op.user_id = u.id")
        .replaceAll("cr.user_id=$1", "cr.user_id=u.id")
        .replaceAll("$2", () => "$1"),
      [scope.businessId],
    );
  const prefix = scope.key === "store" ? "neture" : scope.key;
  const roles =
    scope.key === "pharmcoop"
      ? ["neture:pharmcoop_operator", "neture:pharmcoop_admin"]
      : [`${prefix}:operator`, `${prefix}:admin`];
  const membership =
    scope.key === "pharmcoop" || scope.key === "store" ? "neture" : scope.key;
  return ds.query(
    `SELECT DISTINCT ra.user_id AS "userId" FROM role_assignments ra JOIN users u ON u.id=ra.user_id LEFT JOIN service_memberships sm ON sm.user_id=u.id AND sm.service_key=$2
    WHERE ($2='neture' OR sm.status='active') AND ra.role=ANY($1::text[]) AND ra.is_active=true AND (ra.valid_from IS NULL OR ra.valid_from<=CURRENT_TIMESTAMP) AND (ra.valid_until IS NULL OR ra.valid_until>=CURRENT_TIMESTAMP) AND ${usable} AND ($2='community' OR NOT EXISTS(SELECT 1 FROM service_memberships main WHERE main.user_id=u.id AND main.service_key='neture' AND main.status IN ('suspended','withdrawn')))`,
    [roles, membership],
  );
}

/** Writes recheck live scope and account inside the transaction, after the HTTP guard. */
export async function assertInboxWriter(
  manager: EntityManager,
  scope: InboxScope,
  actor: string,
) {
  await manager.query("SELECT id FROM users WHERE id=$1 FOR SHARE", [actor]);
  if (scope.cooperativeId) {
    await manager.query("SELECT id FROM cooperatives WHERE id=$1 FOR UPDATE", [
      scope.cooperativeId,
    ]);
    await new CooperativeManagementService(manager.connection).requireLocal(
      manager,
      actor,
      scope.cooperativeId,
    );
  } else if (scope.kind === "service" && scope.key === "pharmcoop") {
    await new CooperativeManagementService(
      manager.connection,
    ).requireFederation(manager, actor, false, 'inbox');
  } else {
    const recipients = await inboxRecipients(manager, scope);
    if (!recipients.some((r) => r.userId === actor)) {
      // Preserve the ordinary service guard's existing platform bypass; never extend it to business/cooperative.
      const bypass =
        scope.kind === "service" &&
        scope.key !== "community" &&
        (
          await manager.query(
            `SELECT 1 FROM role_assignments WHERE user_id=$1 AND role='platform:super_admin' AND is_active=true AND (valid_from IS NULL OR valid_from<=now()) AND (valid_until IS NULL OR valid_until>=now())`,
            [actor],
          )
        ).length;
      if (!bypass)
        throw new NeturePharmacyError(
          403,
          "INBOX_FORBIDDEN",
          "현재 담당 운영 권한을 확인해 주세요.",
        );
    }
  }
  const live = await resolveInboxScope(manager, scope.kind, scope.key);
  if (
    live.organizationId !== scope.organizationId ||
    live.cooperativeId !== scope.cooperativeId
  )
    throw new NeturePharmacyError(
      409,
      "INBOX_SCOPE_CHANGED",
      "담당 공간이 변경되었습니다. 다시 조회해 주세요.",
    );
}

/** Controlled origins, never caller-provided URLs. A link is not a grant or an authentication bypass. */
export function inboxDestination(scope: InboxScope) {
  const origins: Record<string, string> = {
    neture: "https://neture.co.kr",
    supplier: "https://supplier.neture.co.kr",
    funding: "https://funding.neture.co.kr",
    community: "https://community.neture.co.kr",
    lecture: "https://study.neture.co.kr",
    store: "https://store.neture.co.kr",
    pharmcoop: "https://pharmcoop.neture.co.kr",
  };
  const origin =
    scope.kind === "cooperative"
      ? origins.pharmcoop
      : scope.kind === "business"
        ? ((
            {
              carepharm: "https://carepharm.neture.co.kr",
              drugstore: "https://drugstore.neture.co.kr",
            } as Record<string, string>
          )[scope.key] ?? "https://pharmacy.neture.co.kr")
        : origins[scope.key];
  return {
    origin,
    path:
      scope.kind === "service" && scope.key === "lecture"
        ? "/operator/inbox"
        : scope.managePath,
  };
}
/** Match the notification filters of the app that owns the destination route. */
export function inboxNotificationServiceKey(scope: InboxScope) {
  if (scope.kind === "cooperative") return "pharmcoop";
  if (scope.kind === "business") {
    return scope.key === "carepharm" || scope.key === "drugstore" ? scope.key : "kpa-society";
  }
  return ["store", "pharmcoop"].includes(scope.serviceKey) ? "neture" : scope.serviceKey;
}
export function inboxNotificationTarget(scope: InboxScope) {
  if (scope.kind === "business" || scope.kind === "cooperative") return scope.managePath;
  return `/operator/inbox/open/${scope.kind}/${encodeURIComponent(scope.key)}`;
}
