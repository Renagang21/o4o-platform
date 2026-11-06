import type { RequestHandler } from 'express';
import { AppDataSource } from '../database/connection.js';
import { assertOperatorMemberTarget } from '../services/operations/protected-member-target.js';
import { OperationError } from '../services/operations/operation-audit.js';

const uuid = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;

/** Runs after route params and service authority have been resolved. Dedicated Admin APIs are separate. */
export const operatorMemberTarget: RequestHandler = async (req, res, next) => {
  try {
    let ids: unknown[] = req.params.userId ? [req.params.userId] : Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (ids.length>50) { next(); return; } // Existing batch handlers reject oversized input.
    if (req.params.membershipId && uuid.test(req.params.membershipId)) {
      const rows = await AppDataSource.query('SELECT user_id FROM service_memberships WHERE id=$1', [req.params.membershipId]);
      ids = rows.map((row: { user_id: string }) => row.user_id);
    }
    for (const id of new Set(ids)) {
      // Existing handlers retain input validation and response contracts.
      if (typeof id === 'string' && uuid.test(id))
        await assertOperatorMemberTarget(AppDataSource, id);
    }
    next();
  } catch (error) {
    if (error instanceof OperationError) { res.status(error.status).json({success:false,code:error.code,error:error.message}); return; }
    next(error);
  }
};
