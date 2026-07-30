/**
 * App Availability Routes (read-only)
 *
 * WO-O4O-ADMIN-APP-AVAILABILITY-READ-CONTRACT-FIX-V1
 *
 * 목적:
 *   admin-dashboard 의 메뉴·라우트 게이팅(useAdminMenu / AppRouteGuard / AppGuard)은
 *   "이 앱이 활성인가" 만 알면 된다. 그런데 기존에는 플랫폼 관리자 전용
 *   `GET /api/v1/admin/apps` (requireAdmin = platform:admin | platform:super_admin) 를
 *   역할 구분 없이 호출해, 서비스 운영자 계정은 403 을 받고 그 실패가 `apps=[]` 로 해석되어
 *   정상 활성 앱까지 비활성으로 판정되었다.
 *
 * 본 라우트는 그 게이팅에 필요한 **최소 정보만** 인증 사용자에게 제공한다.
 *   - `GET /api/v1/apps/availability` → { apps: [{ appId, active }] }
 *
 * 보안 경계:
 *   - `authenticate` 만 적용한다. `requireAdmin` 은 적용하지 않는다.
 *     (앱 활성 여부는 feature availability 이며, 사용자 인가가 아니다.
 *      실제 권한 검사는 각 API·화면의 기존 인증/인가 계약이 담당한다.)
 *   - 기존 `/api/v1/admin/apps` 의 requireAdmin 경계는 그대로 유지된다(본 파일 무관).
 *   - 관리 전용 필드는 응답에 포함하지 않는다:
 *     version / previousVersion / dependencies / source / type / installedAt / updatedAt /
 *     availableVersion / hasUpdate / ownsTables / ownsCPT / ownsACF
 *
 * app_registry 의미(선행 조사):
 *   `app_registry` 는 appId + status('installed'|'active'|'inactive') 만 보유하며
 *   serviceKey / organizationId / 구독 컬럼이 없다 → 전 플랫폼 공통 feature availability.
 *   조직별 권한이나 유료 구독 판정을 포함하지 않으므로 인증 사용자 공개가 안전하다.
 */

import { Router, Request, Response } from 'express';
import { AppManager } from '../services/AppManager.js';
import { authenticate } from '../middleware/auth.middleware.js';
import logger from '../utils/logger.js';

const router: Router = Router();

// 인증만 요구한다 (requireAdmin 미적용 — 위 보안 경계 주석 참조).
router.use(authenticate);

// AppDataSource 초기화 이전 접근을 피하기 위한 lazy singleton (admin/apps.routes.ts 와 동일 패턴).
let _appManager: AppManager | null = null;
const getAppManager = (): AppManager => {
  if (!_appManager) {
    _appManager = new AppManager();
  }
  return _appManager;
};

/**
 * GET /api/v1/apps/availability
 *
 * 레지스트리에 등록된 앱의 **설치·활성 여부만** 반환한다.
 * 응답: { apps: [{ appId: string, active: boolean }] }
 *
 *   - 목록에 있음        → 설치됨 (active 값으로 활성/비활성 구분)
 *   - 목록에 없음        → 미설치
 *
 * 설치/비활성을 구분해 반환하는 이유: 기존 AppGuard 가 "미설치" 와 "비활성" 을 다른 안내로
 * 표시하므로 그 UX 계약을 보존한다. 두 값 모두 feature availability 이며 관리 정보가 아니다.
 *
 * 실패 시 500 을 반환하며, 호출측은 이를 "앱 비활성" 이 아니라 "상태 확인 실패" 로 구분해야 한다.
 */
router.get('/availability', async (_req: Request, res: Response) => {
  try {
    const apps = await getAppManager().listInstalled();
    res.json({
      apps: apps.map((app) => ({
        appId: app.appId,
        active: app.status === 'active',
      })),
    });
  } catch (error) {
    logger.error('[AppAvailability] Failed to list active apps:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load app availability',
      code: 'APP_AVAILABILITY_FAILED',
    });
  }
});

export default router;
