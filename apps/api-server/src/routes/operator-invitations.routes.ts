/**
 * 운영자 초대 수락(공개) 라우트 — WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1 §10·§13
 *
 * 초대를 받은 사람은 아직 계정이 없을 수 있으므로 인증을 요구할 수 없다.
 * 접근 조건은 초대 토큰(256bit 무작위)이고, 실제 부여는 Google ID token 검증 뒤에만 일어난다.
 * 대량 시도 자체를 막기 위해 공개 rate limit 을 건다.
 */
import { Router } from 'express';
import { OperatorInvitationAcceptController } from '../controllers/auth/OperatorInvitationAcceptController.js';
import { operatorInvitationPublicLimiter } from '../config/rate-limiters.config.js';

const router: Router = Router();

router.get('/preview', operatorInvitationPublicLimiter, OperatorInvitationAcceptController.preview);
router.post('/accept', operatorInvitationPublicLimiter, OperatorInvitationAcceptController.accept);

export default router;
