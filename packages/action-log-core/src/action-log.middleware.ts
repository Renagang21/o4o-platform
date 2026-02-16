/**
 * ActionLog Middleware — wrapWithActionLogging
 *
 * WO-PLATFORM-ACTION-LOG-CORE-V1
 *
 * Express handler를 감싸서 실행 전후에 자동으로 ActionLog를 기록한다.
 * 성공/실패/duration 자동 계산.
 */

import type { Request, Response, RequestHandler } from 'express';
import type { ActionLogService } from './action-log.service.js';
import type { ActionSource } from './types.js';

interface WrapOptions {
  serviceKey: string;
  actionKey: string;
  source?: ActionSource;
  /** req에서 userId를 추출하는 함수 (기본: req.user.id) */
  getUserId?: (req: Request) => string | undefined;
  /** req에서 organizationId를 추출하는 함수 */
  getOrgId?: (req: Request) => string | undefined;
}

/**
 * Express handler를 감싸서 자동 ActionLog 기록.
 *
 * 사용법:
 *   router.post('/trigger/care-review', requireAuth,
 *     wrapWithActionLogging(actionLogService, {
 *       serviceKey: 'glycopharm',
 *       actionKey: 'glycopharm.trigger.care_review',
 *     }, originalHandler),
 *   );
 */
export function wrapWithActionLogging(
  logService: ActionLogService,
  opts: WrapOptions,
  handler: (req: Request, res: Response) => Promise<void>,
): RequestHandler {
  return async (req: Request, res: Response, next: () => void) => {
    const start = Date.now();
    const userId = opts.getUserId
      ? opts.getUserId(req)
      : (req as any).user?.id;

    if (!userId) {
      // No user — skip logging, let handler handle auth
      await handler(req, res);
      return;
    }

    const orgId = opts.getOrgId ? opts.getOrgId(req) : undefined;

    try {
      await handler(req, res);

      const durationMs = Date.now() - start;
      const statusCode = res.statusCode;
      const isSuccess = statusCode >= 200 && statusCode < 400;

      // Fire-and-forget: don't block response
      if (isSuccess) {
        logService.logSuccess(opts.serviceKey, userId, opts.actionKey, {
          organizationId: orgId,
          source: opts.source ?? 'manual',
          durationMs,
        }).catch(() => {/* swallow log errors */});
      } else {
        logService.logFailure(opts.serviceKey, userId, opts.actionKey, `HTTP ${statusCode}`, {
          organizationId: orgId,
          source: opts.source ?? 'manual',
          durationMs,
        }).catch(() => {/* swallow log errors */});
      }
    } catch (error: any) {
      const durationMs = Date.now() - start;
      logService.logFailure(opts.serviceKey, userId, opts.actionKey, error.message || 'Unknown error', {
        organizationId: orgId,
        source: opts.source ?? 'manual',
        durationMs,
      }).catch(() => {/* swallow log errors */});

      throw error;
    }
  };
}
