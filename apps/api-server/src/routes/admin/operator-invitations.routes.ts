/**
 * 운영자 초대(관리자) 라우트 — WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1 §7·§15
 *
 * 전부 `platform:super_admin` 전용. 초대 생성은 `operator_invitations` 1행만 만들고
 * users / credentials 를 만들지 않는다. 취소는 이미 부여된 권한을 회수하지 않는다.
 */
import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { operatorAssignmentController } from '../../controllers/admin/OperatorAssignmentController.js';

const router: Router = Router();

const ADMIN_ROLES = ['platform:super_admin'];

router.use(authenticate);
router.use(requireRole(ADMIN_ROLES));

router.get('/', operatorAssignmentController.listInvitations);
router.post('/', operatorAssignmentController.createInvitation);
// 재전송은 한 방식뿐이다 — 같은 행의 토큰 회전(새 초대 행을 만들지 않는다).
router.post('/:id/resend', operatorAssignmentController.resendInvitation);
router.post('/:id/cancel', operatorAssignmentController.cancelInvitation);

export default router;
