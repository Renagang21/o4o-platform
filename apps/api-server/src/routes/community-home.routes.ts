import { Router, type Request, type RequestHandler } from "express";
import { AppDataSource } from "../database/connection.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { apiLimiter } from "../middleware/rateLimiter.js";
import type { AuthRequest } from "../types/auth.js";
import type { CommunityAccessUser } from "../utils/community-access.resolver.js";
import { CommunityManagementError } from "../services/community/community-management.service.js";
import { CommunityPublicReadError } from "../services/community/community-public-read.service.js";
import {
  communityHome,
  homeKind,
  listEditorial,
  getEditorial,
  managedHomeItems,
  saveEditorial,
  pinHomeForum,
  managedHomeForum,
} from "../services/community/community-home.service.js";

export function createCommunityHomeRoutes(
  optionalAuth: RequestHandler,
  authenticate: RequestHandler,
  resolveUser: (req: Request) => Promise<CommunityAccessUser | null>,
) {
  const router = Router();
  const pageOf = (page: unknown = "1") => {
    if (
      typeof page !== "string" ||
      !/^\d+$/.test(page) ||
      +page < 1 ||
      +page > 10000
    )
      throw new CommunityManagementError(
        400,
        "INVALID_PAGE",
        "페이지를 확인해 주세요.",
      );
    return +page;
  };
  const handle = (
    run: (req: AuthRequest) => Promise<unknown>,
  ): RequestHandler =>
    asyncHandler(async (req, res) => {
      res.set("Cache-Control", "no-store");
      try {
        res.json({ success: true, data: await run(req as AuthRequest) });
      } catch (error) {
        if (
          !(
            error instanceof CommunityManagementError ||
            error instanceof CommunityPublicReadError
          )
        )
          throw error;
        res
          .status(error.status)
          .json({ success: false, code: error.code, error: error.message });
      }
    });
  router.get(
    "/community/home",
    apiLimiter,
    optionalAuth,
    handle(async (req) => communityHome(AppDataSource, await resolveUser(req))),
  );
  router.get(
    "/community/editorial",
    apiLimiter,
    optionalAuth,
    handle(async (req) => {
      return listEditorial(
        AppDataSource,
        await resolveUser(req),
        homeKind(req.query.kind),
        pageOf(req.query.page),
      );
    }),
  );
  router.get(
    "/community/editorial/:id",
    apiLimiter,
    optionalAuth,
    handle(async (req) =>
      getEditorial(AppDataSource, await resolveUser(req), req.params.id),
    ),
  );
  router.get(
    "/community/management/home-items",
    apiLimiter,
    authenticate,
    handle((req) =>
      managedHomeItems(
        AppDataSource,
        req.user!.id,
        homeKind(req.query.kind),
        pageOf(req.query.page),
      ),
    ),
  );
  router.post(
    "/community/management/home-items",
    apiLimiter,
    authenticate,
    handle((req) =>
      AppDataSource.transaction((m) =>
        saveEditorial(m, req.user!.id, null, req.body ?? {}),
      ),
    ),
  );
  router.put(
    "/community/management/home-items/:id",
    apiLimiter,
    authenticate,
    handle((req) =>
      AppDataSource.transaction((m) =>
        saveEditorial(m, req.user!.id, req.params.id, req.body ?? {}),
      ),
    ),
  );
  router.get(
    "/community/management/home-forum",
    apiLimiter,
    authenticate,
    handle(async (req) => {
      return managedHomeForum(
        AppDataSource,
        req.user!.id,
        pageOf(req.query.page),
        req.query.q ?? "",
      );
    }),
  );
  router.patch(
    "/community/management/home-forum/:id",
    apiLimiter,
    authenticate,
    handle((req) =>
      AppDataSource.transaction((m) =>
        pinHomeForum(m, req.user!.id, req.params.id, req.body?.isPinned),
      ),
    ),
  );
  return router;
}
