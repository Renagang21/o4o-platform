/**
 * AppStore Catalog Routes (read-only)
 *
 * WO-O4O-APPSTORE-DUAL-CONTRACT-CENSUS-AND-CANONICALIZATION-V1
 *
 * 남은 계약 (PUBLIC_READ 2개):
 * - GET /api/v1/appstore        - 정적 앱 카탈로그 목록 (검색·카테고리 필터)
 * - GET /api/v1/appstore/:appId - 정적 앱 카탈로그 상세
 *
 * canonical 판정 (§8 = ADMIN_APPS_CANONICAL):
 *   App 설치·활성 상태의 정본은 DB(`app_registry`)를 쓰는 `/api/v1/admin/apps`
 *   (authenticate + requireAdmin) 이며, 인증 사용자용 read 게이팅은
 *   `GET /api/v1/apps/availability` 가 담당한다.
 *   본 라우터는 **상태를 갖지 않는 정적 카탈로그 메타데이터**만 제공한다.
 *
 * 제거된 계약 (§9·§10 RETIRE_ENDPOINT — 소비처 0 + production 무효과):
 * - POST   /install, /activate, /deactivate, DELETE /uninstall
 *     → ModuleLoader 의 in-memory registry 만 변경했고 영속되지 않았다.
 *       DB 정본(`app_registry`)과 동기화되지 않는 중복 write 경로였으므로 제거한다.
 * - GET    /modules
 *     → ModuleLoader registry 디버그 read. production 이미지에는 `packages/**` 가
 *       포함되지 않아 registry 가 항상 비어 있었다(MODULE_LOADER_BROKEN_IN_PRODUCTION).
 *   제거 방식은 라우트 미등록(404)이다 — 소비처 0이므로 deprecated 응답보다 단순하다.
 *
 * 상태 필드 미노출 이유:
 *   이전 응답의 `installed` / `status` / `loadedAt` / `activatedAt` 는 항상 비어 있는
 *   ModuleLoader registry 에서 파생돼 production 에서 DB 정본과 모순됐다
 *   (예: `partnerops` 는 app_registry 에서 active 인데 본 API 는 not_installed 로 응답).
 *   중복 상태 계약을 없애기 위해 카탈로그 메타데이터만 반환한다.
 */

import { Router, Request, Response } from 'express';
import {
  APPS_CATALOG,
  getCatalogItem,
  searchCatalog,
  filterByCategory,
  getCategories,
} from '../app-manifests/appsCatalog.js';
import logger from '../utils/logger.js';

const router: Router = Router();

/**
 * GET /api/v1/appstore
 * 정적 카탈로그 목록 (상태 없음)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, category } = req.query;

    let catalogItems = APPS_CATALOG;

    if (search && typeof search === 'string') {
      catalogItems = searchCatalog(search);
    } else if (category && typeof category === 'string') {
      catalogItems = filterByCategory(category);
    }

    res.json({
      success: true,
      data: catalogItems,
      total: catalogItems.length,
      categories: getCategories(),
    });
  } catch (error) {
    logger.error('[AppStore Routes] List catalog error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list apps',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/appstore/:appId
 * 정적 카탈로그 상세 (상태 없음)
 */
router.get('/:appId', async (req: Request, res: Response) => {
  try {
    const { appId } = req.params;
    const catalogItem = getCatalogItem(appId);

    if (!catalogItem) {
      return res.status(404).json({
        success: false,
        error: 'App not found',
        appId,
      });
    }

    res.json({
      success: true,
      data: catalogItem,
    });
  } catch (error) {
    logger.error('[AppStore Routes] Get catalog item error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get app details',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
