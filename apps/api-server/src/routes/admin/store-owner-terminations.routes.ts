import { Router, type Request, type Response } from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth.middleware.js';
import {
  StoreOwnerTerminationError,
  storeOwnerTerminationService,
  type StoreOwnerContractServiceKey,
} from '../../services/store-owner-termination.service.js';
import logger from '../../utils/logger.js';
import { standardLimiter } from '../../config/rate-limiters.config.js';

const router = Router();
// destructive/PII-return admin workflow — centralized authenticated-endpoint limiter first.
router.use(standardLimiter);
router.use(authenticate);
router.use(requireAdmin);

function fail(res: Response, error: unknown): void {
  if (error instanceof StoreOwnerTerminationError) {
    res.status(error.httpStatus).json({ success:false, error:error.message, code:error.code });
    return;
  }
  logger.error('[store-owner-termination] route failed', {
    error: error instanceof Error ? error.message : String(error),
  });
  res.status(500).json({ success:false, error:'매장 계약 종료 처리 중 오류가 발생했습니다.', code:'STORE_OWNER_TERMINATION_FAILED' });
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const data = await storeOwnerTerminationService.listCases(Number(req.query.limit ?? 100));
    res.json({ success:true, data });
  } catch (e) { fail(res,e); }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body ?? {};
    const data = await storeOwnerTerminationService.createCase({
      serviceKey: String(body.serviceKey ?? '') as StoreOwnerContractServiceKey,
      organizationId: String(body.organizationId ?? ''),
      userId: String(body.userId ?? ''),
      requestedBy: (req as any).user?.id ?? null,
      returnRequested: !!body.returnRequested,
      terminationEffectiveAt: body.terminationEffectiveAt ? String(body.terminationEffectiveAt) : null,
    });
    res.status(201).json({ success:true, data });
  } catch (e) { fail(res,e); }
});

router.get('/:caseId', async (req: Request, res: Response) => {
  try { res.json({ success:true, data:await storeOwnerTerminationService.getCase(req.params.caseId) }); }
  catch (e) { fail(res,e); }
});

router.get('/:caseId/return-package', async (req: Request, res: Response) => {
  try { res.json({ success:true, data:await storeOwnerTerminationService.buildReturnPackage(req.params.caseId) }); }
  catch (e) { fail(res,e); }
});

router.post('/:caseId/return-completed', async (req: Request, res: Response) => {
  try { res.json({ success:true, data:await storeOwnerTerminationService.markReturnCompleted(req.params.caseId) }); }
  catch (e) { fail(res,e); }
});

router.post('/:caseId/cancel', async (req: Request, res: Response) => {
  try { res.json({ success:true, data:await storeOwnerTerminationService.cancelCase(req.params.caseId) }); }
  catch (e) { fail(res,e); }
});

router.post('/:caseId/terminate', async (req: Request, res: Response) => {
  try { res.json({ success:true, data:await storeOwnerTerminationService.terminateCase(req.params.caseId) }); }
  catch (e) { fail(res,e); }
});

router.get('/:caseId/purge-preview', async (req: Request, res: Response) => {
  try { res.json({ success:true, data:await storeOwnerTerminationService.previewPurge(req.params.caseId) }); }
  catch (e) { fail(res,e); }
});

router.post('/:caseId/purge', async (req: Request, res: Response) => {
  try {
    if (req.body?.mode !== 'apply') {
      res.status(400).json({ success:false, error:'실파기는 mode=apply가 필요합니다.', code:'PURGE_APPLY_CONFIRMATION_REQUIRED' });
      return;
    }
    const data = await storeOwnerTerminationService.purgeCase(req.params.caseId, { dryRun:false });
    res.json({ success:true, data });
  } catch (e) { fail(res,e); }
});

export default router;
