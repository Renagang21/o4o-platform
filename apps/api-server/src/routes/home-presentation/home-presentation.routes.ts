import { requireSupplierScope } from "../../middleware/supplier-service-scope.middleware.js";
import { requireFundingScope } from "../../middleware/funding-service-scope.middleware.js";
import { requireCommunityServiceScope } from "../../middleware/community-service-scope.middleware.js";
import {
  Router,
  type Request,
  type Response,
  type RequestHandler,
} from "express";
import type { DataSource } from "typeorm";
import { HOME_SURFACES, type HomeSurface } from "@o4o/types";
import { KPA_SCOPE_CONFIG } from "@o4o/security-core";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireNetureScope } from "../../middleware/neture-scope.middleware.js";
import { requireLectureScope } from "../../middleware/lecture-scope.middleware.js";
import { createMembershipScopeGuard } from "../../common/middleware/membership-guard.middleware.js";
import { apiLimiter } from "../../middleware/rateLimiter.js";
import { SemiFranchiseService } from "../../modules/neture-pharmacy/services/semi-franchise.service.js";
import {
  HomePresentationService,
  PresentationConflict,
  type PresentationScope,
} from "./home-presentation.service.js";

/** Shared handlers also mount behind the existing branch service + branch membership guards. */
export function presentationHandlers(
  ds: DataSource,
  scope: (req: Request) => PresentationScope,
) {
  const service = new HomePresentationService(ds);
  const failure = (res: Response, error: unknown) => {
    if (error instanceof PresentationConflict)
      return res.status(409).json({ success: false, message: error.message });
    return res.status(500).json({
      success: false,
      message:
        "홈 화면 구성을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    });
  };
  return {
    publicRead: async (req: Request, res: Response) => {
      try {
        res.json({ success: true, data: await service.publicRead(scope(req)) });
      } catch (error) {
        failure(res, error);
      }
    },
    manageRead: async (req: Request, res: Response) => {
      try {
        res.json({ success: true, data: await service.read(scope(req)) });
      } catch (error) {
        failure(res, error);
      }
    },
    save: async (req: Request, res: Response) => {
      const { config, revision, publish } = req.body ?? {};
      if (
        !Number.isSafeInteger(revision) ||
        revision < 0 ||
        typeof publish !== "boolean"
      ) {
        res
          .status(400)
          .json({ success: false, message: "저장 요청을 확인해 주세요." });
        return;
      }
      // Validate before acquiring a transaction. No arbitrary fields reach storage.
      try {
        const { parseHomePresentation } = await import("@o4o/types");
        parseHomePresentation(config);
      } catch (error) {
        res.status(400).json({
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "입력 내용을 확인해 주세요.",
        });
        return;
      }
      try {
        res.json({
          success: true,
          data: await service.save(
            scope(req),
            config,
            revision,
            publish,
            (req as Request & { user: { id: string } }).user.id,
          ),
        });
      } catch (error) {
        failure(res, error);
      }
    },
  };
}

export function createHomePresentationRoutes(ds: DataSource) {
  const router = Router();
  const kpaScope = createMembershipScopeGuard(KPA_SCOPE_CONFIG);
  const ordinary = presentationHandlers(ds, (req) => ({
    surface: req.params.surface as HomeSurface,
    organizationId: null,
  }));
  const supported: RequestHandler = (req, res, next) => {
    if (
      !HOME_SURFACES.includes(req.params.surface as HomeSurface) ||
      req.params.surface === "branch"
    ) {
      res.status(404).json({ success: false });
      return;
    }
    next();
  };
  const authorize: RequestHandler = (req, res, next) => {
    if (req.params.surface === "supplier")
      return requireSupplierScope("supplier:operator")(req, res, next);
    if (req.params.surface === "funding")
      return requireFundingScope("funding:operator")(req, res, next);
    if (req.params.surface === "community")
      return requireCommunityServiceScope("community:operator")(req, res, next);
    if (req.params.surface === "pharmacy")
      return kpaScope("kpa:operator")(req, res, next);
    if (req.params.surface === "lecture")
      return requireLectureScope("lecture:operator")(req, res, next);
    return requireNetureScope("neture:operator")(req, res, next);
  };
  // Business-owned pharmacy homes use their existing assigned operator boundary, not KPA roles.
  const businesses = new SemiFranchiseService(ds);
  const business = presentationHandlers(ds, (req) => ({
    surface: "pharmacy",
    organizationId: (req as Request & { presentationOrg: string })
      .presentationOrg,
  }));
  const resolveBusiness: RequestHandler = async (req, res, next) => {
    try {
      const row = await businesses.getByKey(req.params.key);
      if (!row || row.status !== "active") {
        res.status(404).json({ success: false });
        return;
      }
      (req as Request & { presentationOrg: string }).presentationOrg =
        row.organization_id;
      next();
    } catch {
      res
        .status(500)
        .json({ success: false, message: "사업 정보를 불러오지 못했습니다." });
    }
  };
  const businessOperator: RequestHandler = async (req, res, next) => {
    try {
      await businesses.requireOperatorOf(
        (req as Request & { user: { id: string } }).user.id,
        req.params.key,
      );
      next();
    } catch (error) {
      res.status((error as { httpStatus?: number }).httpStatus ?? 500).json({
        success: false,
        message: "담당 사업의 운영 권한이 필요합니다.",
      });
    }
  };
  router.get("/pharmacy/business/:key", resolveBusiness, business.publicRead);
  router.get(
    "/pharmacy/business/:key/manage",
    requireAuth as RequestHandler,
    requireNetureScope("neture:operator"),
    resolveBusiness,
    businessOperator,
    business.manageRead,
  );
  router.put(
    "/pharmacy/business/:key/manage",
    apiLimiter,
    requireAuth as RequestHandler,
    requireNetureScope("neture:operator"),
    resolveBusiness,
    businessOperator,
    business.save,
  );
  router.get("/:surface", supported, ordinary.publicRead);
  router.get(
    "/:surface/manage",
    supported,
    requireAuth as RequestHandler,
    authorize,
    ordinary.manageRead,
  );
  router.put(
    "/:surface/manage",
    apiLimiter,
    supported,
    requireAuth as RequestHandler,
    authorize,
    ordinary.save,
  );
  return router;
}
