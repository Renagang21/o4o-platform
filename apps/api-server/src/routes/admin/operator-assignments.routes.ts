/**
 * 운영자 지정 · 초대 라우트 — WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1 §5·§7
 *
 * 전부 `platform:super_admin` 전용이다. 비밀번호를 받는 필드는 어디에도 없다.
 */
import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { operatorAssignmentController } from '../../controllers/admin/OperatorAssignmentController.js';

const router: Router = Router();

const ADMIN_ROLES = ['platform:super_admin'];

router.use(authenticate);
router.use(requireRole(ADMIN_ROLES));

// (A) 직접 지정 — 대상은 언제나 userId
router.get('/roles', operatorAssignmentController.listRoles);
router.get('/candidates', operatorAssignmentController.searchCandidates);
router.post('/', operatorAssignmentController.assign);

export default router;
