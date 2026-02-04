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

// Get operator notification settings
// Accessible by operators, admins, and staff
router.get('/settings/notifications',
  requireRole(['admin', 'super_admin', 'operator', 'staff']),
  controller.getSettings
);

// Update operator notification settings
// Accessible by operators and admins
router.put('/settings/notifications',
  requireRole(['admin', 'super_admin', 'operator']),
  controller.updateSettings
);

export default router;
