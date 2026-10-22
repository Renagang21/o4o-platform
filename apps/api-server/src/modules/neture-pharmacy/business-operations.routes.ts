import { Router, type RequestHandler } from "express";
import type { DataSource } from "typeorm";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { createAdminServiceLegalController } from "../service-legal/admin-service-legal.controller.js";
import { createPublicServiceLegalController } from "../service-legal/public-service-legal.controller.js";
import {
  businessDemandSummary,
  businessOperationsAccess,
} from "./services/business-operations.js";
import {
  businessPolicyScope,
  isBusinessPolicyScope,
} from "./services/business-policy-scope.js";
import { NeturePharmacyError } from "./constants.js";
import { NetureMainMembershipRequiredError } from "../neture/services/neture-main-membership.js";

function failed(
  error: unknown,
  res: Parameters<RequestHandler>[1],
  next: Parameters<RequestHandler>[2],
) {
  if (
    error instanceof NeturePharmacyError ||
    error instanceof NetureMainMembershipRequiredError
  ) {
    res
      .status(error.httpStatus)
      .json({ success: false, code: error.code, error: error.message });
  } else next(error);
}

/** Reuse legal controllers/lifecycle; this adapter fixes the business scope before they see a request. */
export function businessOperationsRoutes(db: DataSource) {
  const router = Router();
  let publicLegal: ReturnType<typeof Router> | undefined;
  const scopeGuard =
    (level: "admin" | "operator"): RequestHandler =>
    async (req, res, next) => {
      try {
        const access = await businessOperationsAccess(
          db,
          req.user!.id,
          res.locals.policyBusinessKey,
        );
        if (req.params.serviceKey !== businessPolicyScope(access.business.id))
          throw new NeturePharmacyError(
            404,
            "BUSINESS_NOT_FOUND",
            "사업 정보를 다시 확인해 주세요.",
          );
        if (level === "admin" && !access.canManagePolicies)
          throw new NeturePharmacyError(
            403,
            "BUSINESS_ADMIN_REQUIRED",
            "해당 사업 관리자의 권한이 필요합니다.",
          );
        next();
      } catch (error) {
        failed(error, res, next);
      }
    };
  let adminLegal: ReturnType<typeof Router> | undefined;
  const mountLegal =
    (management: boolean): RequestHandler =>
    async (req, res, next) => {
      try {
        const [sf] = await db.query(
          "SELECT id FROM semi_franchises WHERE key=$1 AND status='active'",
          [req.params.key],
        );
        if (!sf)
          throw new NeturePharmacyError(
            404,
            "BUSINESS_NOT_FOUND",
            "운영 중인 사업을 찾을 수 없습니다.",
          );
        const scope = businessPolicyScope(sf.id);
        res.locals.policyBusinessKey = req.params.key;
        if (
          management &&
          req.method === "POST" &&
          req.path.replace(/\/+$/, "") === "/policies" &&
          ["terms", "privacy"].includes(req.body?.documentType)
        )
          req.body.slug = `${scope}-service-${req.body.documentType}`;
        const original = req.url;
        req.url = `/${encodeURIComponent(scope)}${original === "/" ? "" : original}`;
        const controller = management
          ? (adminLegal ??= createAdminServiceLegalController(db, scopeGuard))
          : (publicLegal ??= createPublicServiceLegalController(
              db,
              isBusinessPolicyScope,
            ));
        res.setHeader("Cache-Control", "private, no-store");
        controller(req, res, (error) => {
          req.url = original;
          next(error);
        });
      } catch (error) {
        failed(error, res, next);
      }
    };
  router.use("/businesses/:key/legal", mountLegal(false));
  router.use(
    "/operator/semi-franchises/:key/legal",
    requireAuth,
    mountLegal(true),
  );
  router.get(
    "/operator/semi-franchises/:key/staff-demands",
    requireAuth,
    async (req, res, next) => {
      res.setHeader("Cache-Control", "private, no-store");
      try {
        res.json({
          success: true,
          data: await businessDemandSummary(
            db,
            req.user!.id,
            req.params.key,
            req.query.month,
          ),
        });
      } catch (error) {
        failed(error, res, next);
      }
    },
  );
  return router;
}
