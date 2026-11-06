import type { RequestHandler } from 'express';
import { AppDataSource } from '../database/connection.js';
import { assertOperatorMemberTarget } from '../services/operations/protected-member-target.js';
import { OperationError } from '../services/operations/operation-audit.js';

const uuid = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;
const canonicalId = (value: unknown): value is string => typeof value === 'string' && uuid.test(value);

/** Runs after route params and service authority have been resolved. Dedicated Admin APIs are separate. */
export const operatorMemberTarget: RequestHandler = async (req, res, next) => {
  try {
    if (req.params.userId !== undefined && !canonicalId(req.params.userId)
      || req.params.membershipId !== undefined && !canonicalId(req.params.membershipId)) {
      res.status(400).json({success:false,code:'INVALID_MEMBER_TARGET_ID',error:'유효한 회원·가입 ID가 필요합니다.'});
      return;
    }
    let ids: unknown[] = req.params.userId ? [req.params.userId] : Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (ids.length > 50) {
      res.status(400).json({success:false,code:'MEMBER_BATCH_LIMIT',error:'한 번에 50명까지 처리할 수 있습니다.'});
      return;
    }
    if (req.params.membershipId) {
      const rows = await AppDataSource.query('SELECT user_id FROM service_memberships WHERE id=$1', [req.params.membershipId]);
      ids = rows.map((row: { user_id: string }) => row.user_id);
    }
    // PostgreSQL also accepts compact/braced UUIDs. Never forward an ID that bypassed protection.
    if (!ids.every(canonicalId)) {
      res.status(400).json({success:false,code:'INVALID_MEMBER_TARGET_ID',error:'유효한 회원·가입 ID가 필요합니다.'});
      return;
    }
    for (const id of new Set(ids)) await assertOperatorMemberTarget(AppDataSource, id as string);
    next();
  } catch (error) {
    if (error instanceof OperationError) { res.status(error.status).json({success:false,code:error.code,error:error.message}); return; }
    next(error);
  }
};
