/**
 * Work Scope — read-only scope resolution route
 *
 * WO-O4O-WORK-SCOPE-STORE-RESOLUTION-V0
 *
 *   GET /api/v1/work-scope/store-resolution?serviceKey=<canonical>&workspace=store
 *
 * 프런트엔드 Work Scope 가 `organizationId` / `storeId` 를 **추측하지 않도록**
 * 서버가 기존 membership · resolver 로 확정해 돌려주는 유일한 경로다.
 *
 * 계약:
 *   - **조회 전용.** write 0. 새 조직·매장·membership·role 을 만들지 않는다.
 *   - **사용자 id 는 세션에서만 온다.** query/body 의 userId 는 받지 않는다.
 *   - **serviceKey 를 그대로 믿지 않는다.** 판정은 `resolveWorkScopeStore` 안에서
 *     membership → 매장 후보 순으로 이뤄지며, 후보 질의는 서비스로 스코프된다.
 *   - 응답은 최소 필드만 담는다(§15) — 사업자번호·주소·대표자·전화번호 등 조직 메타데이터 금지.
 *
 * 서비스별 membership 가드 미들웨어(`requireKpaScope` 등)를 쓰지 않는 이유:
 * 이 라우트는 **serviceKey 가 파라미터인 cross-service 표면**이라 특정 서비스 가드를
 * 걸 수 없다. 대신 핸들러가 요청 serviceKey 에 대해 membership 을 직접 확인한다
 * (동일 SSOT `getServiceMembershipStatusFromDb` 사용). membership 이 없으면
 * 403 이 아니라 `status:'none'` + `NO_SERVICE_MEMBERSHIP` 으로 응답한다 — 이 API 는
 * 접근 제어 게이트가 아니라 **scope 해석기**이며, 존재 여부를 흘리지 않기 위해
 * 모든 미해석 사유를 같은 200 형상으로 돌려준다.
 */

import { Router, type RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { asyncHandler } from '../middleware/error-handler.js';
import type { AuthRequest } from '../types/auth.js';
import { resolveWorkScopeStore } from '../utils/work-scope-store-resolution.js';

export function createWorkScopeRoutes(dataSource: DataSource, requireAuth: RequestHandler): Router {
  const router = Router();

  router.get(
    '/store-resolution',
    requireAuth,
    asyncHandler(async (req, res) => {
      const userId = (req as AuthRequest).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required', code: 'UNAUTHENTICATED' });
        return;
      }

      const serviceKey = typeof req.query.serviceKey === 'string' ? req.query.serviceKey : '';
      const workspace = typeof req.query.workspace === 'string' ? req.query.workspace : '';

      const data = await resolveWorkScopeStore(dataSource, { userId, serviceKey, workspace });

      res.json({ success: true, data });
    }),
  );

  return router;
}
