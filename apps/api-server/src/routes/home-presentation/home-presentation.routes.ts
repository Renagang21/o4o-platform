import { NeturePharmacyError } from "../../modules/neture-pharmacy/constants.js";
import { CooperativeManagementService } from "../../modules/neture-pharmacy/services/cooperative-management.service.js";
import { requireSupplierScope } from "../../middleware/supplier-service-scope.middleware.js";
import { requireFundingScope } from "../../middleware/funding-service-scope.middleware.js";
import { requireCommunityServiceScope } from "../../middleware/community-service-scope.middleware.js";
import {
  Router,
  type Request,
  type Response,
  type RequestHandler,
} from "express";
import type { DataSource, EntityManager } from "typeorm";
import { HOME_SURFACES, type HomeSurface } from "@o4o/types";
import { KPA_SCOPE_CONFIG } from "@o4o/security-core";
import { requireAuth } from "../../middleware/auth.middleware.js";
import {
  requireNetureScope,
  requireNetureBusinessScope,
} from "../../middleware/neture-scope.middleware.js";
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
  authorizeSave?: (manager: EntityManager, req: Request) => Promise<void>,
) {
  const service = new HomePresentationService(ds);
  const failure = (res: Response, error: unknown) => {
    if (error instanceof NeturePharmacyError)
      return res
        .status(error.httpStatus)
        .json({ success: false, message: error.message });
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
            authorizeSave
              ? (manager) => authorizeSave(manager, req)
              : undefined,
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
  const cooperativeManagement = new CooperativeManagementService(ds);
  const ordinary = presentationHandlers(
    ds,
    (req) => ({
      surface: req.params.surface as HomeSurface,
      organizationId: null,
    }),
    async (manager, req) => {
      if (req.params.surface === "pharmcoop")
        await cooperativeManagement.requireFederation(manager, req.user!.id);
    },
  );
  const supported: RequestHandler = (req, res, next) => {
    if (
      !HOME_SURFACES.includes(req.params.surface as HomeSurface) ||
      ["branch", "cooperative"].includes(req.params.surface)
    ) {
      res.status(404).json({ success: false });
      return;
    }
    next();
  };
  const authorize: RequestHandler = (req, res, next) => {
    if (req.params.surface === "pharmcoop") {
      res.setHeader("Cache-Control", "private, no-store");
      void cooperativeManagement
        .requireFederation(ds, req.user!.id)
        .then(() => next())
        .catch(() =>
          res.status(403).json({
            success: false,
            message: "연합회 운영 권한이 필요합니다.",
          }),
        );
      return;
    }
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
    if (req.params.surface === "carepharm")
      return requireNetureBusinessScope(req, res, next);
    return requireNetureScope("neture:operator")(req, res, next);
  };
  // Business-owned pharmacy homes use their existing assigned operator boundary, not KPA roles.
  const businesses = new SemiFranchiseService(ds);
  // Keep the existing CarePharm presentation slot; never infer business ownership
  // from a Neture-wide role, a body parameter or another model's assignment.
  const carePharmOperator: RequestHandler = async (req, res, next) => {
    if (req.params.surface !== "carepharm") return next();
    try {
      const business = await businesses.requireOperatorOf(
        (req as Request & { user: { id: string } }).user.id,
        "carepharm",
      );
      if (business.status !== "active") {
        res.status(404).json({
          success: false,
          message: "운영 중인 사업을 찾을 수 없습니다.",
        });
        return;
      }
      next();
    } catch (error) {
      res.status((error as { httpStatus?: number }).httpStatus ?? 500).json({
        success: false,
        message: "CarePharm의 현재 운영 권한을 확인해 주세요.",
      });
    }
  };
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
    requireNetureBusinessScope,
    resolveBusiness,
    businessOperator,
    business.manageRead,
  );
  router.put(
    "/pharmacy/business/:key/manage",
    apiLimiter,
    requireAuth as RequestHandler,
    requireNetureBusinessScope,
    resolveBusiness,
    businessOperator,
    business.save,
  );
  type LocalRequest = Request & {
    heroCooperative: { id: string; organizationId: string };
  };
  const resolveCooperative: RequestHandler = async (req, res, next) => {
    const slug = req.params.slug;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 58) {
      res.status(404).json({ success: false });
      return;
    }
    try {
      const [row] = await ds.query(
        `SELECT c.id, sf.organization_id AS "organizationId"
        FROM cooperatives c JOIN semi_franchises sf ON sf.id=c.semi_franchise_id
        WHERE c.slug=$1 AND c.status='active' AND sf.status='active'`,
        [slug],
      );
      if (!row) {
        res.status(404).json({ success: false });
        return;
      }
      (req as LocalRequest).heroCooperative = row;
      next();
    } catch (error) {
      next(error);
    }
  };
  const localOperator: RequestHandler = (req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    void cooperativeManagement
      .requireLocal(ds, req.user!.id, (req as LocalRequest).heroCooperative.id)
      .then(() => next())
      .catch(() =>
        res.status(403).json({
          success: false,
          message: "해당 조합의 운영 권한이 필요합니다.",
        }),
      );
  };
  const local = presentationHandlers(
    ds,
    (req) => ({
      surface: "cooperative",
      organizationId: (req as LocalRequest).heroCooperative.organizationId,
    }),
    async (manager, req) => {
      const scope = (req as LocalRequest).heroCooperative;
      // Serialize with existing cooperative status/role mutations and check again inside the save transaction.
      const [row] = await manager.query(
        `SELECT c.id FROM cooperatives c JOIN semi_franchises sf ON sf.id=c.semi_franchise_id WHERE c.id=$1 AND sf.organization_id=$2 AND c.status='active' AND sf.status='active' FOR UPDATE OF c`,
        [scope.id, scope.organizationId],
      );
      if (!row)
        throw new NeturePharmacyError(
          404,
          "COOPERATIVE_NOT_FOUND",
          "운영 중인 조합을 찾을 수 없습니다.",
        );
      await cooperativeManagement.requireLocal(manager, req.user!.id, scope.id);
    },
  );
  router.get("/cooperative/:slug", resolveCooperative, local.publicRead);
  router.get(
    "/cooperative/:slug/manage",
    requireAuth as RequestHandler,
    resolveCooperative,
    localOperator,
    local.manageRead,
  );
  router.put(
    "/cooperative/:slug/manage",
    apiLimiter,
    requireAuth as RequestHandler,
    resolveCooperative,
    localOperator,
    local.save,
  );
  router.get("/:surface", supported, ordinary.publicRead);
  router.get(
    "/:surface/manage",
    supported,
    requireAuth as RequestHandler,
    authorize,
    carePharmOperator,
    ordinary.manageRead,
  );
  router.put(
    "/:surface/manage",
    apiLimiter,
    supported,
    requireAuth as RequestHandler,
    authorize,
    carePharmOperator,
    ordinary.save,
  );
  return router;
}
