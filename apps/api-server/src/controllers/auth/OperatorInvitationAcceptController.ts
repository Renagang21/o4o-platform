/**
 * 운영자 초대 수락 (공개) — WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1 §10~§14
 *
 * 초대 링크를 받은 사람은 아직 O4O 계정이 없을 수 있으므로 이 두 경로는 **인증 없이** 열린다.
 * 대신 접근 조건은 오직 초대 토큰이고, 부여는 Google ID token 검증을 통과해야만 일어난다.
 *
 * 응답·로그에 넣지 않는 것: raw invite token · Google ID token · Google sub.
 */
import type { Request, Response } from 'express';
import {
  operatorInvitationService,
  OperatorInvitationError,
} from '../../services/admin/operator-invitation.service.js';
import { GoogleIdTokenError } from '../../services/auth/google-identity.service.js';
import { GoogleAuthError } from '../../services/auth/google-auth.service.js';
import logger from '../../utils/logger.js';

function fail(res: Response, error: unknown, context: string): void {
  if (error instanceof OperatorInvitationError) {
    res.status(error.statusCode).json({ success: false, error: error.message, code: error.code });
    return;
  }
  if (error instanceof GoogleIdTokenError) {
    // reason 은 서버 로그에만 남긴다 — 응답에는 공통 코드만.
    logger.warn('[OperatorInvitationAccept] google id token rejected', { reason: error.reason });
    res.status(401).json({ success: false, error: 'Google 인증에 실패했습니다.', code: error.code });
    return;
  }
  if (error instanceof GoogleAuthError) {
    res.status(error.statusCode).json({ success: false, error: error.message, code: error.code });
    return;
  }
  logger.error(`[OperatorInvitationAccept] ${context} failed`, error);
  res.status(500).json({ success: false, error: '요청을 처리하지 못했습니다.' });
}

export class OperatorInvitationAcceptController {
  /**
   * GET /api/v1/operator-invitations/preview?token=...
   * 수락 화면이 "어떤 서비스·역할 초대인지" 를 로그인 전에 보여주기 위한 최소 정보.
   */
  static async preview(req: Request, res: Response): Promise<void> {
    try {
      const token = typeof req.query.token === 'string' ? req.query.token : '';
      const invitation = await operatorInvitationService.preview(token);
      res.json({ success: true, data: invitation });
    } catch (error) {
      fail(res, error, 'preview');
    }
  }

  /**
   * POST /api/v1/operator-invitations/accept — `{ token, idToken, consents? }`
   * 신규 사용자면 `consents.terms`·`consents.privacy` 가 필요하다(기존 Google 가입과 동일 계약).
   */
  static async accept(req: Request, res: Response): Promise<void> {
    try {
      const { token, idToken, consents } = req.body ?? {};
      if (typeof token !== 'string' || token.length === 0) {
        res.status(400).json({ success: false, error: '초대 토큰이 필요합니다.', code: 'INVITATION_NOT_FOUND' });
        return;
      }
      if (typeof idToken !== 'string' || idToken.length === 0) {
        res.status(400).json({ success: false, error: 'Google 인증이 필요합니다.', code: 'ID_TOKEN_REQUIRED' });
        return;
      }
      const result = await operatorInvitationService.accept({ token, idToken, consents });
      res.json({
        success: true,
        data: {
          serviceKey: result.serviceKey,
          role: result.role,
          createdUser: result.createdUser,
          membershipPolicy: result.membershipPolicy,
          idempotent: result.idempotent,
        },
      });
    } catch (error) {
      fail(res, error, 'accept');
    }
  }
}
