import { centralOperationRequest } from '../middleware/central-operation-menu.middleware.js';
import {
  collectNews,
  getNewsCollection,
} from "../services/community/community-news-collection.service.js";
import {
  getNewsReview,
  reviewNews,
} from "../services/community/community-news-review.service.js";
import {
  generateNewsClusters,
  generateNewsSuggestions,
} from "../services/community/community-news-ai.service.js";
import {
  listNewsAutoRuns,
  runManualNewsWindow,
} from "../services/community/community-news-auto.service.js";
import { Router, type Request, type RequestHandler } from "express";
import { AppDataSource } from "../database/connection.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { apiLimiter, newsBeaconLimiter } from "../middleware/rateLimiter.js";
import type { AuthRequest } from "../types/auth.js";
import type { CommunityAccessUser } from "../utils/community-access.resolver.js";
import { CommunityManagementError } from "../services/community/community-management.service.js";
import { CommunityPublicReadError } from "../services/community/community-public-read.service.js";
import { resolveCommunityWorkspace } from "../services/community/community-workspace.service.js";
import {
  communityHome,
  homeKind,
  listEditorial,
  getEditorial,
  managedHomeItems,
  saveEditorial,
  recordNewsEngagement,
  pinHomeForum,
  managedHomeForum,
} from "../services/community/community-home.service.js";

export function createCommunityHomeRoutes(
  optionalAuth: RequestHandler,
  authenticate: RequestHandler,
  resolveUser: (req: Request) => Promise<CommunityAccessUser | null>,
) {
  const router = Router();
  // 2026-11-14 통합 담당 결정: O4O 는 사용자(로그인한 회원)만 이용한다 — 홈 · 편집 콘텐츠는 비로그인에게 열지 않는다.
  // 정지 · 탈퇴 등 이용할 수 없는 회원도 읽지 못한다.
  const member: RequestHandler = asyncHandler(async (req, res, next) => {
    const workspace = await resolveCommunityWorkspace(AppDataSource, await resolveUser(req), "community");
    if (!workspace?.allowed) {
      res.set("Cache-Control", "no-store").status(403).json({ success: false, code: "COMMUNITY_ACCESS_REQUIRED", error: "커뮤니티 이용 상태를 확인해 주시기 바랍니다." });
      return;
    }
    next();
  });
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
        "페이지를 확인해 주시기 바랍니다.",
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
    authenticate,
    member,
    handle(async (req) => communityHome(AppDataSource, await resolveUser(req))),
  );
  router.get(
    "/community/editorial",
    apiLimiter,
    authenticate,
    member,
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
    authenticate,
    member,
    handle(async (req) =>
      getEditorial(AppDataSource, await resolveUser(req), req.params.id),
    ),
  );
  // Anonymous aggregate beacon: the user only decides visibility and is never stored.
  router.post(
    "/community/news-engagement",
    newsBeaconLimiter,
    optionalAuth,
    handle(async (req) =>
      recordNewsEngagement(
        AppDataSource,
        await resolveUser(req),
        (req.body ?? {}) as Record<string, unknown>,
      ),
    ),
  );
  router.get(
    "/community/management/news-auto-runs",
    apiLimiter,
    authenticate,
    centralOperationRequest('community', () => ['community.editorial']),
    handle((req) => listNewsAutoRuns(AppDataSource, req.user!.id)),
  );
  router.post(
    "/community/management/news-auto-runs",
    apiLimiter,
    authenticate,
    centralOperationRequest('community', () => ['community.editorial']),
    handle((req) =>
      runManualNewsWindow(AppDataSource, req.user!.id, {
        generate: (input) => generateNewsClusters(input, req.user!.id),
      }),
    ),
  );
  router.get(
    "/community/management/home-items",
    apiLimiter,
    authenticate,
    centralOperationRequest('community', () => ['community.editorial']),
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
    centralOperationRequest('community', () => ['community.editorial']),
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
    centralOperationRequest('community', () => ['community.editorial']),
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
    centralOperationRequest('community', () => ['community.editorial']),
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
    centralOperationRequest('community', () => ['community.editorial']),
    handle((req) =>
      AppDataSource.transaction((m) =>
        pinHomeForum(m, req.user!.id, req.params.id, req.body?.isPinned),
      ),
    ),
  );
  router.get(
    "/community/management/news-review",
    apiLimiter,
    authenticate,
    centralOperationRequest('community', () => ['community.editorial']),
    handle((req) => getNewsReview(AppDataSource, req.user!.id)),
  );
  router.post(
    "/community/management/news-review",
    apiLimiter,
    authenticate,
    centralOperationRequest('community', () => ['community.editorial']),
    handle((req) =>
      reviewNews(AppDataSource, req.user!.id, generateNewsSuggestions),
    ),
  );
  router.get(
    "/community/management/news-collection",
    apiLimiter,
    authenticate,
    centralOperationRequest('community', () => ['community.editorial']),
    handle((req) => getNewsCollection(AppDataSource, req.user!.id)),
  );
  router.post(
    "/community/management/news-collection",
    apiLimiter,
    authenticate,
    centralOperationRequest('community', () => ['community.editorial']),
    handle((req) => collectNews(AppDataSource, req.user!.id)),
  );
  return router;
}
