import { Router } from 'express';
import { authenticate, requireRole, type AuthRequest } from '../../middleware/auth.middleware.js';
import { apiLimiter } from '../../middleware/rateLimiter.js';
import { AppDataSource } from '../../database/connection.js';
import { AdminOperationsOperators } from '../../services/admin/admin-operations-operators.js';
import { ADMIN_OPERATIONS_INVITATION_SCOPE } from '../../services/admin/admin-operations-operator-contract.js';
import { serviceOperatorInvitationService } from '../../services/admin/service-operator-invitation.service.js';
import { invitationFailure, ServiceOperatorInvitationError } from '../../services/admin/operator-invitation-error.js';

export const adminOperationsOperatorsRouter = Router();
adminOperationsOperatorsRouter.use((_req, res, next) => { res.setHeader('Cache-Control', 'private, no-store'); next(); });
adminOperationsOperatorsRouter.use(authenticate, requireRole(['platform:super_admin']), apiLimiter);
const service = new AdminOperationsOperators(AppDataSource);
adminOperationsOperatorsRouter.get('/', async (req: AuthRequest, res) => {
  try { res.json({ success: true, data: await service.list(req.user!.id) }); } catch (e) { invitationFailure(res, e); }
});
adminOperationsOperatorsRouter.post('/', async (req: AuthRequest, res) => {
  const { email, targetUserId, menuKeys } = req.body ?? {};
  if (menuKeys !== undefined) {
    invitationFailure(res, new ServiceOperatorInvitationError('OPERATIONS_INVITATION_REFRESH_REQUIRED', 400)); return;
  }
  if ((email !== undefined && typeof email !== 'string') || (targetUserId !== undefined && typeof targetUserId !== 'string')) {
    res.status(400).json({ success: false, code: 'INVALID_INVITATION_INPUT' }); return;
  }
  try {
    res.status(201).json({ success: true, data: await serviceOperatorInvitationService.create({ email, targetUserId, menuKeys, actorId: req.user!.id,
      serviceKey: 'neture', role: 'neture:operator', scopeKey: ADMIN_OPERATIONS_INVITATION_SCOPE }) });
  } catch (e) { invitationFailure(res, e); }
});
for (const action of ['duties', 'revoke'] as const) adminOperationsOperatorsRouter.post(`/:userId/${action}`, async (req: AuthRequest, res) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.userId)) {
    res.status(400).json({ success: false, code: 'INVALID_USER_ID' }); return;
  }
  try { res.json({ success: true, data: await service.change(req.user!.id, req.params.userId, req.body ?? {}, action === 'revoke') }); }
  catch (e) { invitationFailure(res, e); }
});
