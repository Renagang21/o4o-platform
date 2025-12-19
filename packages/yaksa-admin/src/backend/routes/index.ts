/**
 * yaksa-admin Routes (Phase 0: Skeleton)
 *
 * Phase 0 정책:
 * - 라우트 존재만 확인
 * - 실제 기능 구현은 Phase 1+
 *
 * 라우트 구조:
 * /admin/yaksa
 * ├─ /members        (회원 승인/현황)
 * ├─ /reports        (신상신고 승인)
 * ├─ /officers       (임원 관리)
 * ├─ /education      (교육 이수 현황)
 * ├─ /fees           (회비 납부 현황)
 * └─ /forum          (forum-yaksa로 이동 링크)
 */

import type { Router } from 'express';

/**
 * Phase 0: 라우트 스켈레톤
 *
 * 실제 구현은 Phase 1에서 진행
 */
export function createRoutes(router: Router): Router {
  // Phase 0: 스켈레톤 라우트 (구현 없음)
  console.log('[yaksa-admin] Routes skeleton loaded');

  return router;
}

export default createRoutes;
