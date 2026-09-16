/**
 * Work Scope — read-only scope resolution route
 *
 * WO-O4O-WORK-SCOPE-STORE-RESOLUTION-V0
 *
 *   GET /api/v1/work-scope/store-resolution?serviceKey=<canonical>&workspace=store
 *   GET /api/v1/work-scope/store-services[?organizationId=<uuid>]   — WO-O4O-SERVICE-TENANT-FOUNDATION-V1
 *   GET /api/v1/work-scope/operator-services                        — WO-O4O-SERVICE-TENANT-FOUNDATION-V1
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
import { resolveOperatorServices, resolveStoreServices } from '../utils/service-tenant.resolver.js';

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

  /**
   * WO-O4O-SERVICE-TENANT-FOUNDATION-V1 — 현재 매장의 가입 서비스 목록 (1 Store : N Services).
   *
   * 미래 My Services · O4O Home 이 쓰는 서비스 중립 read contract. UI 는 만들지 않는다.
   *   - organizationId 는 **소유 검증 후에만** 쓴다(organization_members 활성 매장 역할). 남의 조직은 `NOT_STORE_MEMBER`.
   *   - 미지정 시 접근 가능한 매장이 정확히 1개일 때만 resolved. 2개 이상은 `ambiguous`(자동 선택 없음).
   *   - inactive enrollment 는 목록에 남되 `workspaceAvailable=false`. 별칭 코드는 canonical 로 합쳐진다.
   *   - 위 `store-resolution` 과 같은 이유로 모든 미해석 사유를 같은 200 형상으로 돌려준다.
   */
  router.get(
    '/store-services',
    requireAuth,
    asyncHandler(async (req, res) => {
      const userId = (req as AuthRequest).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required', code: 'UNAUTHENTICATED' });
        return;
      }
      const organizationId = typeof req.query.organizationId === 'string' && req.query.organizationId
        ? req.query.organizationId
        : null;

      const data = await resolveStoreServices(dataSource, { userId, organizationId });
      res.json({ success: true, data });
    }),
  );

  /**
   * WO-O4O-SERVICE-TENANT-FOUNDATION-V1 — 현재 운영자가 운영 가능한 서비스 목록 (1 Operator : N Services).
   *
   * role_assignments(`{prefix}:admin|operator`, is_active) + service_memberships(active) 결합.
   * 표시용 목록이며 권한 SSOT 가 아니다 — 실제 운영 API 접근은 각 서비스의 `require{Service}Scope` 가 판정한다.
   */
  router.get(
    '/operator-services',
    requireAuth,
    asyncHandler(async (req, res) => {
      const userId = (req as AuthRequest).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required', code: 'UNAUTHENTICATED' });
        return;
      }
      const services = await resolveOperatorServices(dataSource, userId);
      res.json({ success: true, data: { services } });
    }),
  );

  return router;
}
