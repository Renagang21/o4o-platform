import { CentralOperationMenuGrantService } from '../../services/admin/central-operation-menu-grants.js';
import { AppDataSource } from '../../database/connection.js';
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
const menus = new CentralOperationMenuGrantService(AppDataSource);
adminServiceOperatorInvitationsRouter.get('/menu-grants', async (req: AuthRequest, res) => {
  try {
    if (typeof req.query.userId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.query.userId) || typeof req.query.role !== 'string') {
      res.status(400).json({ success: false, code: 'INVALID_CENTRAL_MENU_INPUT' }); return;
    }
    res.json({ success: true, data: await menus.read(req.user!.id, req.query.userId, req.query.role) });
  } catch (error) { invitationFailure(res, error); }
});
adminServiceOperatorInvitationsRouter.patch('/menu-grants', async (req: AuthRequest, res) => {
  try {
    const { userId, role, menuKeys, reason, version } = req.body ?? {};
    if (typeof userId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId) || typeof role !== 'string' || !(version === null || typeof version === 'string')) {
      res.status(400).json({ success: false, code: 'INVALID_CENTRAL_MENU_INPUT' }); return;
    }
    res.json({ success: true, data: await menus.update(req.user!.id, userId, role, { menuKeys, reason, version }) });
  } catch (error) { invitationFailure(res, error); }
});
adminServiceOperatorInvitationsRouter.get('/', async (req:AuthRequest, res) => {
  try {
    res.json({ success: true, data: await service.list(req.user!.id) });
  } catch (e) {
    invitationFailure(res, e);
  }
});
adminServiceOperatorInvitationsRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const { email, targetUserId, serviceKey, role, centralDelegation, menuKeys } = req.body ?? {};
    if (
      (centralDelegation !== undefined && typeof centralDelegation !== 'boolean') ||
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
          ...(menuKeys !== undefined ? { menuKeys } : {}),
          ...(centralDelegation === true ? { scopeKey: 'o4o-direct' } : {}),
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
