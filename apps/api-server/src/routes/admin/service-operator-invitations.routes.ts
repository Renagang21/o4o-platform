import { invitationFailure } from '../../services/admin/operator-invitation-error.js';
import { Router } from 'express';
import {
  authenticate,
  requireRole,
  type AuthRequest,
} from '../../middleware/auth.middleware.js';
import { apiLimiter } from '../../middleware/rateLimiter.js';
import {
  serviceOperatorInvitationService as service,
} from '../../services/admin/service-operator-invitation.service.js';

export { invitationFailure } from '../../services/admin/operator-invitation-error.js';
const adminServiceOperatorInvitationsRouter = Router();
export { adminServiceOperatorInvitationsRouter as adminServiceOperatorInvitations };
adminServiceOperatorInvitationsRouter.use(authenticate, requireRole(['platform:super_admin']), apiLimiter);
adminServiceOperatorInvitationsRouter.get('/', async (req:AuthRequest, res) => {
  try {
    res.json({ success: true, data: await service.list(req.user!.id) });
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

serviceOperatorInvitationAcceptance.get('/scopes/:kind/:key', async (req:AuthRequest,res)=> {
  try {
    if (!['service','branch','cooperative'].includes(req.params.kind)) { res.status(400).json({success:false,code:'INVALID_INVITATION_SCOPE'}); return; }
    res.json({success:true,data:await service.listScoped(req.user!.id,req.params.kind as 'service'|'branch'|'cooperative',req.params.key,req.query.role==='admin'?'admin':'operator')});
  } catch(e) { invitationFailure(res,e); }
});
for (const action of ['resend','cancel'] as const) {
  serviceOperatorInvitationAcceptance.post(`/manage/:id/${action}`,async (req:AuthRequest,res)=> {
    try { res.json({success:true,data:await service.manage(req.params.id,req.user!.id,action)}); }
    catch(e) { invitationFailure(res,e); }
  });
}
