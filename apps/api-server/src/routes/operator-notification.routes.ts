/**
 * Operator Notification Routes
 * WO-O4O-OPERATOR-NOTIFICATION-EMAIL-MANAGEMENT-V1
 *
 * 운영자 알림 이메일 설정 API
 * - GET/PUT /api/operator/settings/notifications
 */

import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { OperatorNotificationController } from '../controllers/OperatorNotificationController.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router: RouterType = Router();
const controller = new OperatorNotificationController();

// All routes require authentication
router.use(requireAuth);

// WO-O4O-ADMIN-RBAC-LEGACY-AND-NAVIGATION-CLEANUP-CONSOLIDATED-V1: dead-deny 부분 해소
//   기존 가드는 무접두 역할(admin/super_admin/operator/staff)만 허용했는데, requireRole 은
//   role_assignments 에 대한 In() 정확 매칭이고 시스템에 해당 보유자가 **0명**이라
//   모든 사용자에게 403 이었다(서비스 admin/operator 9종 보유자로 403 실측 — IR §6).
//
//   canonical 최고 관리자만 명시적으로 허용한다. 무접두 'super_admin' 은 보유자 0 무효항이라 제거.
//   'admin'/'operator'/'staff' 는 향후 부여 가능성이 있어 유지한다.
//
//   ⚠️ 서비스 운영자(kpa:operator / neture:operator 등)에게 알림 설정을 열지 여부는
//      **정책 결정 사항**이라 본 WO 범위에서 제외했다. 따라서 이 엔드포인트는 여전히
//      플랫폼 관리자 전용이다. (후속: WO-…-OPERATOR-NOTIFICATION-SERVICE-SCOPE-POLICY-V1)
const PLATFORM_ADMIN = ['platform:super_admin', 'platform:admin'];

// Get operator notification settings
router.get('/settings/notifications',
  requireRole([...PLATFORM_ADMIN, 'admin', 'operator', 'staff']),
  controller.getSettings
);

// Update operator notification settings
router.put('/settings/notifications',
  requireRole([...PLATFORM_ADMIN, 'admin', 'operator']),
  controller.updateSettings
);

export default router;
