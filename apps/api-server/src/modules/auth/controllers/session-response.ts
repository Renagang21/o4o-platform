import type { Request, Response } from 'express';
import type { AuthTokens } from '../../../types/auth.js';
import { BaseController } from '../../../common/base.controller.js';
import { authenticationService } from '../../../services/authentication.service.js';
import { demoAccountService } from '../../../services/auth/demo-account.service.js';
import { policyAcceptanceService } from '../../policy-acceptance/policy-acceptance.service.js';
import { resolveSessionServiceKey } from '../../../utils/session-origin.js';
import { isCrossOriginRequest } from './auth-helpers.js';

interface Session {
  user: Record<string, unknown>;
  tokens: AuthTokens;
  isNewUser: boolean;
  serviceMembership?: unknown;
}
interface Options {
  message: string;
  status?: 200 | 201;
  includeLegacyTokens?: boolean;
  includeDemoMetadata?: boolean;
}

/** Provider-neutral transport response. Credential verification and session issuance stay in services. */
export class SessionResponse extends BaseController {
  static async send(
    req: Request,
    res: Response,
    session: Session,
    options: Options,
  ): Promise<unknown> {
    authenticationService.setAuthCookies(req, res, session.tokens);
    const user = session.user;
    user.displayName =
      (user.name as string | null | undefined) ||
      `${(user.lastName as string) || ''}${(user.firstName as string) || ''}`.trim() ||
      (user.email as string | undefined)?.split('@')[0] ||
      '사용자';
    try {
      user.pendingPolicyAcceptances =
        await policyAcceptanceService.getEnforcedPendingForUser(
          String(user.id),
          resolveSessionServiceKey(req.get('origin')),
        );
    } catch {
      user.pendingPolicyAcceptances = [];
    }
    if (options.includeDemoMetadata)
      user.demo = await demoAccountService.getDemoMetadata(String(user.id));
    const includeTokens =
      options.includeLegacyTokens || isCrossOriginRequest(req);
    const body = {
      message: options.message,
      user,
      isNewUser: session.isNewUser,
      ...(session.serviceMembership && {
        serviceMembership: session.serviceMembership,
      }),
      ...(includeTokens && {
        tokens: {
          accessToken: session.tokens.accessToken,
          refreshToken: session.tokens.refreshToken,
          expiresIn: session.tokens.expiresIn,
        },
      }),
    };
    return options.status === 201
      ? BaseController.created(res, body)
      : BaseController.ok(res, body);
  }
}
