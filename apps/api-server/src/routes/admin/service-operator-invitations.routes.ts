import { Router, type Response } from 'express';
import {
  authenticate,
  requireRole,
  type AuthRequest,
} from '../../middleware/auth.middleware.js';
import { apiLimiter } from '../../middleware/rateLimiter.js';
import {
  serviceOperatorInvitationService as service,
  ServiceOperatorInvitationError,
} from '../../services/admin/service-operator-invitation.service.js';
import { OperatorRoleContractError } from '../../config/operator-role-catalog.js';
import { DemoAccountForbiddenError } from '../../services/auth/demo-account.service.js';

export function invitationFailure(res: Response, error: unknown): void {
  if (
    error instanceof ServiceOperatorInvitationError ||
    error instanceof OperatorRoleContractError ||
    error instanceof DemoAccountForbiddenError
  ) {
    res
      .status(error.statusCode)
      .json({ success: false, code: error.code, error: error.message });
    return;
  }
  res
    .status(500)
    .json({
      success: false,
      code: 'INVITATION_UNAVAILABLE',
      error: '운영자 초대 요청을 처리하지 못했습니다.',
    });
}

const adminServiceOperatorInvitationsRouter = Router();
export { adminServiceOperatorInvitationsRouter as adminServiceOperatorInvitations };
adminServiceOperatorInvitationsRouter.use(authenticate, requireRole(['platform:super_admin']), apiLimiter);
adminServiceOperatorInvitationsRouter.get('/', async (_req, res) => {
  try {
    res.json({ success: true, data: await service.list() });
  } catch (e) {
    invitationFailure(res, e);
  }
});
adminServiceOperatorInvitationsRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const { email, targetUserId, serviceKey, role } = req.body ?? {};
    if (
      (email !== undefined && typeof email !== 'string') ||
      (targetUserId !== undefined && typeof targetUserId !== 'string') ||
      typeof serviceKey !== 'string' ||
      typeof role !== 'string'
    ) {
      res
        .status(400)
        .json({ success: false, code: 'INVALID_INVITATION_INPUT' });
      return;
    }
    res
      .status(201)
      .json({
        success: true,
        data: await service.create({
          email,
          targetUserId,
          serviceKey,
          role,
          actorId: req.user!.id,
        }),
      });
  } catch (e) {
    invitationFailure(res, e);
  }
});
for (const action of ['resend', 'cancel'] as const) {
  adminServiceOperatorInvitationsRouter.post(
    `/:id/${action}`,
    async (req: AuthRequest, res) => {
      try {
        res.json({
          success: true,
          data: await service.manage(req.params.id, req.user!.id, action),
        });
      } catch (e) {
        invitationFailure(res, e);
      }
    },
  );
}

export const serviceOperatorInvitationAcceptance = Router();
serviceOperatorInvitationAcceptance.use(authenticate, apiLimiter);
serviceOperatorInvitationAcceptance.post(
  '/inspect',
  async (req: AuthRequest, res) => {
    try {
      if (typeof req.body?.token !== 'string') {
        res
          .status(400)
          .json({ success: false, code: 'INVALID_OR_EXPIRED_INVITATION' });
        return;
      }
      res.json({
        success: true,
        data: await service.inspect(req.body.token, req.user!.id),
      });
    } catch (e) {
      invitationFailure(res, e);
    }
  },
);
serviceOperatorInvitationAcceptance.post(
  '/accept',
  async (req: AuthRequest, res) => {
    try {
      if (typeof req.body?.token !== 'string') {
        res
          .status(400)
          .json({ success: false, code: 'INVALID_OR_EXPIRED_INVITATION' });
        return;
      }
      res.json({
        success: true,
        data: await service.accept(req.body.token, req.user!.id),
      });
    } catch (e) {
      invitationFailure(res, e);
    }
  },
);
