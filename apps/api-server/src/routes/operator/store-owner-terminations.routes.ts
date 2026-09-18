/**
 * Store Owner Termination Operator API
 *
 * WO-O4O-STORE-OWNER-AGREEMENT-PUBLISH-PREREQUISITES-V1 §5
 *
 * 운영자 전용:
 * - 종료 case 생성/조회
 * - 반환 JSON package 생성
 * - 종료 effective 처리
 * - purge preview / explicit apply
 *
 * production apply 는 body.apply=true + confirmation 문자열이 모두 맞아야 한다.
 */

import { Router, type Request, type Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { injectServiceScope, type ServiceScope } from '../../utils/serviceScope.js';
import {
  StoreOwnerTerminationError,
  StoreOwnerTerminationService,
} from '../../services/store-owner-termination.service.js';
import {
  STORE_OWNER_AGREEMENT_SERVICE_KEYS,
} from '../../common/auth/store-owner-agreement.policy.js';

const router = Router();
const ALLOWED = new Set(STORE_OWNER_AGREEMENT_SERVICE_KEYS);

router.use(
  authenticate,
  requireRole([
    'platform:super_admin',
    'kpa:admin', 'kpa:operator',
    'cosmetics:admin', 'cosmetics:operator',
    'pharmacy-hub:admin', 'pharmacy-hub:operator',
  ]),
  injectServiceScope,
);

function service(): StoreOwnerTerminationService {
  return new StoreOwnerTerminationService(AppDataSource);
}

function requestedServiceKey(req: Request): string {
  const bodyKey = typeof req.body?.serviceKey === 'string' ? req.body.serviceKey.trim() : '';
  const queryKey = typeof req.query.serviceKey === 'string' ? req.query.serviceKey.trim() : '';
  return bodyKey || queryKey;
}

function assertScopedService(req: Request, serviceKey: string): void {
  if (!ALLOWED.has(serviceKey)) {
    throw new StoreOwnerTerminationError('INVALID_SERVICE_KEY', '매장 경영자 계약 대상 서비스가 아닙니다.', 400);
  }
  const scope = (req as any).serviceScope as ServiceScope | undefined;
  if (!scope) throw new StoreOwnerTerminationError('SERVICE_SCOPE_REQUIRED', '서비스 범위를 확인할 수 없습니다.', 403);
  if (!scope.isPlatformAdmin && !scope.serviceKeys.includes(serviceKey)) {
    throw new StoreOwnerTerminationError('SERVICE_SCOPE_DENIED', '해당 서비스 운영 권한이 없습니다.', 403);
  }
}

async function scopedCase(req: Request, caseId: string) {
  const row = await service().getCase(caseId);
  assertScopedService(req, row.serviceKey);
  return row;
}

function sendError(res: Response, error: unknown): void {
  if (error instanceof StoreOwnerTerminationError) {
    res.status(error.httpStatus).json({ success: false, error: error.message, code: error.code });
    return;
  }
  res.status(500).json({
    success: false,
    error: '매장 경영자 계약 종료 작업을 처리하지 못했습니다.',
    code: 'INTERNAL_ERROR',
  });
}

router.get('/', async (req, res) => {
  try {
    const serviceKey = requestedServiceKey(req);
    assertScopedService(req, serviceKey);
    const rows = await service().listCases([serviceKey]);
    res.json({ success: true, data: rows });
  } catch (error) {
    sendError(res, error);
  }
});

router.get('/overdue', async (req, res) => {
  try {
    const serviceKey = requestedServiceKey(req);
    assertScopedService(req, serviceKey);
    const rows = await service().overdueCases([serviceKey]);
    res.json({ success: true, data: rows });
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/', async (req, res) => {
  try {
    const serviceKey = requestedServiceKey(req);
    assertScopedService(req, serviceKey);
    const actor = (req as any).user?.id as string | undefined;
    const { organizationId, userId, returnRequested, terminationEffectiveAt } = req.body ?? {};
    if (!actor || typeof organizationId !== 'string' || typeof userId !== 'string') {
      throw new StoreOwnerTerminationError('VALIDATION_ERROR', 'organizationId와 userId가 필요합니다.', 400);
    }
    const effective = terminationEffectiveAt ? new Date(String(terminationEffectiveAt)) : new Date();
    const row = await service().createCase({
      serviceKey,
      organizationId,
      userId,
      requestedBy: actor,
      returnRequested: Boolean(returnRequested),
      terminationEffectiveAt: effective,
    });
    res.status(201).json({ success: true, data: row });
  } catch (error) {
    sendError(res, error);
  }
});

router.get('/:caseId', async (req, res) => {
  try {
    const row = await scopedCase(req, req.params.caseId);
    res.json({ success: true, data: row });
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/:caseId/return-package', async (req, res) => {
  try {
    await scopedCase(req, req.params.caseId);
    const pkg = await service().buildReturnPackage(req.params.caseId);
    // 본문은 응답으로만 전달하며 server log 에 기록하지 않는다.
    res.json({ success: true, data: pkg });
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/:caseId/terminate', async (req, res) => {
  try {
    await scopedCase(req, req.params.caseId);
    const row = await service().terminate(req.params.caseId);
    res.json({ success: true, data: row });
  } catch (error) {
    sendError(res, error);
  }
});

router.get('/:caseId/purge-preview', async (req, res) => {
  try {
    await scopedCase(req, req.params.caseId);
    const preview = await service().previewPurge(req.params.caseId);
    res.json({ success: true, data: preview });
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/:caseId/purge', async (req, res) => {
  try {
    await scopedCase(req, req.params.caseId);
    const apply = req.body?.apply === true;
    if (apply && req.body?.confirmation !== 'PURGE_ACTIVE_STORE_DATA') {
      throw new StoreOwnerTerminationError(
        'PURGE_CONFIRMATION_REQUIRED',
        '실제 파기에는 confirmation=PURGE_ACTIVE_STORE_DATA가 필요합니다.',
        400,
      );
    }
    const result = await service().purge(req.params.caseId, apply);
    res.json({ success: true, data: { ...result, mode: apply ? 'apply' : 'dry-run' } });
  } catch (error) {
    sendError(res, error);
  }
});

export default router;
