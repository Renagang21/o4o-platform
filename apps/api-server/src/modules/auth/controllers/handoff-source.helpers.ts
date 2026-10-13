import { Request } from 'express';
import { readHandoffAuthMethod } from '../../../services/handoff-token.service.js';
import { type HandoffAuthMethod } from '../../../services/handoff-token.service.js';
import { INITIAL_SESSION_EPOCH } from '../../../services/auth/service-session-epoch.js';
import { extractToken } from '../../../common/middleware/auth/auth-context.helpers.js';
import { verifyAccessToken } from '../../../utils/token.utils.js';
import logger from '../../../utils/logger.js';
import { isBrowserSessionLive } from '../../../services/auth/browser-session.service.js';

export const SERVICE_SESSION_REVOKED_CODE = 'SERVICE_SESSION_REVOKED';

export function readCallerScope(req: Request): {
  serviceKey: string | null;
  sessionEpoch?: number;
  authMethod: HandoffAuthMethod;
  sessionId?: string;
  tokenFamily?: string;
} {
  const token = extractToken(req as never);
  const payload = token ? verifyAccessToken(token) : null;
  const authMethod: HandoffAuthMethod = readHandoffAuthMethod(
    payload?.authMethod,
  );
  if (payload?.serviceKey) {
    return {
      serviceKey: payload.serviceKey,
      sessionEpoch: payload.sessionEpoch,
      authMethod,
      sessionId: payload.sessionId,
      tokenFamily: payload.tokenFamily,
    };
  }
  return { serviceKey: null, sessionEpoch: undefined, authMethod };
}

export async function resolveVerifiedHandoffSource(
  req: Request,
  userId: string,
): Promise<{
  serviceKey: string;
  sessionEpoch: number;
  authMethod: HandoffAuthMethod;
  sessionId?: string;
  tokenFamily?: string;
} | null> {
  // claim 이 없는 배포 전 토큰도 **건너뛰지 않는다** — 건너뛰면 만료 전 최대 15분 동안
  // 로그아웃된 서비스의 인증으로 긴 세션을 얻을 수 있다(4차 리뷰 지적).
  const scope = readCallerScope(req);
  if (!(await isBrowserSessionLive(userId, scope))) {
    logger.warn('[Handoff] Blocked generation — service session revoked', {
      userId,
      serviceKey: scope.serviceKey ?? 'UNKNOWN_SCOPE',
    });
    return null; // 응답은 호출부가 한다 — BaseController.error 는 subclass 안에서만 쓸 수 있다.
  }
  return {
    serviceKey: scope.serviceKey ?? 'unknown',
    sessionId: scope.sessionId,
    tokenFamily: scope.tokenFamily,
    sessionEpoch: scope.sessionEpoch ?? INITIAL_SESSION_EPOCH,
    authMethod: scope.authMethod,
  };
}

export const SESSION_REVOKED_CODE = 'HANDOFF_SESSION_REVOKED';

export const SESSION_REVOKED_MESSAGE =
  '로그인 세션이 종료되었습니다. 다시 로그인해 주세요.';

export function hasLiveSession(
  user: { refreshTokenFamily?: string | null } | null | undefined,
): boolean {
  return (
    typeof user?.refreshTokenFamily === 'string' &&
    user.refreshTokenFamily.length > 0
  );
}

export function isSafeReturnPath(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (value.length === 0 || value.length > 512) return false;
  if (!value.startsWith('/')) return false;
  if (value.startsWith('//') || value.startsWith('/\\')) return false;
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(value)) return false;
  return true;
}
