/**
 * GlycoPharm Resources Controller
 *
 * WO-O4O-GLYCOPHARM-RESOURCES-BACKEND-V1
 * WO-O4O-COMMUNITY-CONTENT-RESOURCE-BACKEND-CORE-COMMONIZATION-V1:
 *   557줄 자체 구현 → 공통 content-resource Core + GlycoPharm config.
 *   route · request/response 계약 · 권한 의미 전부 무변경이다.
 *
 * Public/Member:
 *   GET/POST   /api/v1/glycopharm/contents
 *   GET/PATCH/DELETE /api/v1/glycopharm/contents/:id
 *   POST       /api/v1/glycopharm/contents/:id/view
 *
 * Operator:
 *   GET    /api/v1/glycopharm/operator/resources
 *   POST   /api/v1/glycopharm/operator/resources
 *   PATCH  /api/v1/glycopharm/operator/resources/:id/status
 *   DELETE /api/v1/glycopharm/operator/resources/:id
 */

import { Router } from 'express';
import { DataSource } from 'typeorm';
import {
  createContentResourceCore,
  createMemberWriteHandlers,
  createOperatorResourceCreateHandler,
  type AuthMiddleware,
  type ContentResourceConfig,
} from '../../common/content-resource/content-resource-core.js';

type ScopeGuard = (scope: string) => AuthMiddleware;

/**
 * GlycoPharm 원장 config.
 *
 * `tableName` 은 Core 에 기본값이 없다 — 물리 테이블 분리가 서비스 경계이므로
 * 여기서 명시 주입하는 것이 유일한 공급 경로다.
 */
export const GLYCOPHARM_CONTENT_CONFIG: ContentResourceConfig = {
  tableName: 'glycopharm_contents',
  logPrefix: 'GlycoPharm',
  operatorRoles: ['glycopharm:operator', 'glycopharm:admin', 'platform:super_admin'],
  listColumns: `c.id, c.title, c.summary, c.tags, c.category, c.status,
                  c.sub_type, c.source_type, c.usage_type, c.source_url, c.source_file_name,
                  c.thumbnail_url, c.created_by, c.author_name,
                  c.like_count, c.view_count, c.reusable_policy, c.created_at, c.updated_at`,
  operatorListColumns: `c.id, c.title, c.summary, c.tags, c.category, c.status,
                    c.source_type, c.usage_type, c.source_url, c.source_file_name,
                    c.thumbnail_url, c.created_by, c.author_name,
                    c.like_count, c.view_count, c.reusable_policy, c.created_at, c.updated_at`,
  listFilters: [
    { param: 'sub_type', column: 'sub_type' },
    { param: 'usage_type', column: 'usage_type' },
    { param: 'source_type', column: 'source_type' },
  ],
  operatorListFilters: [
    { param: 'source_type', column: 'source_type' },
    { param: 'usage_type', column: 'usage_type' },
  ],
};

// ─── Public / Member 조회 + 회원 작성 라우터 ──────────────────────────────────

export function createGlycopharmContentsRouter(
  dataSource: DataSource,
  optionalAuth: AuthMiddleware,
  authenticate: AuthMiddleware,
): Router {
  const router = Router();
  const core = createContentResourceCore(dataSource, GLYCOPHARM_CONTENT_CONFIG);
  const write = createMemberWriteHandlers(dataSource, GLYCOPHARM_CONTENT_CONFIG);

  router.get('/', optionalAuth, core.list);
  router.post('/', authenticate, write.create);
  router.get('/:id', optionalAuth, core.detail);
  router.patch('/:id', authenticate, write.update);
  router.delete('/:id', authenticate, core.remove);
  router.post('/:id/view', optionalAuth, core.incrementView);

  return router;
}

// ─── Operator 관리 라우터 ─────────────────────────────────────────────────────

export function createGlycopharmOperatorResourcesRouter(
  dataSource: DataSource,
  authenticate: AuthMiddleware,
  requireGlycopharmScope: ScopeGuard,
): Router {
  const router = Router();
  const core = createContentResourceCore(dataSource, GLYCOPHARM_CONTENT_CONFIG);
  const operatorCreate = createOperatorResourceCreateHandler(dataSource, GLYCOPHARM_CONTENT_CONFIG);
  const guard = requireGlycopharmScope('glycopharm:operator');

  router.get('/', authenticate, guard, core.operatorList);
  router.post('/', authenticate, guard, operatorCreate);
  router.patch('/:id/status', authenticate, guard, core.operatorUpdateStatus);
  router.delete('/:id', authenticate, guard, core.operatorRemove);

  return router;
}
