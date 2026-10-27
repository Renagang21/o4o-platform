import { Router, type Request, type Response } from 'express';
import type { DataSource } from 'typeorm';
import { z } from 'zod';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { requireAdmin } from '../../../common/middleware/auth/authorization.middleware.js';
import { requireProductDbWrite } from '../controllers/product-db-write-authority.js';
import { DescriptionIntakeError } from './contracts.js';
import { DescriptionIntakeService } from './intake.service.js';
import { CorrectionError } from '../product-correction/contracts.js';
import logger from '../../../utils/logger.js';

const revision = z.string().regex(/^[a-f0-9]{64}$/);
export function createDescriptionIntakeController(db: DataSource): Router {
  const router = Router(), service = new DescriptionIntakeService(db);
  router.use(authenticate, requireAdmin);
  const handle = (task: (req: Request) => Promise<unknown>) => async (req: Request, res: Response) => {
    try { res.json({ success: true, data: await task(req) }); }
    catch (error) {
      if (error instanceof DescriptionIntakeError || error instanceof CorrectionError) { res.status(error.status).json({ success: false, code: error.code, error: '입력·최신 설명서·선택한 상품을 다시 확인해 주세요.' }); return; }
      if (error instanceof z.ZodError) { res.status(400).json({ success: false, code: 'INVALID_DESCRIPTION_REQUEST', error: '입력 형식을 확인해 주세요.' }); return; }
      logger.error('[description-intake] request failed', error);
      res.status(500).json({ success: false, code: 'DESCRIPTION_INTAKE_FAILED', error: '상품 설명서 처리에 실패했습니다.' });
    }
  };
  const actor = (req: Request) => { const id = (req as Request & { user?: { id?: string } }).user?.id;
    if (!id) throw new DescriptionIntakeError('AUTH_REQUIRED', 401); return id; };
  const id = (req: Request) => z.string().uuid().parse(req.params.id);
  router.post('/preview', handle(req => service.preview(req.body)));
  router.post('/', requireProductDbWrite, handle(req => service.submit(req.body, actor(req))));
  router.get('/', handle(req => {
    const q = z.object({ page: z.coerce.number().int().min(1).max(100000).default(1), status: z.enum(['pending', 'reviewing', 'matched', 'rejected', 'all']).default('pending') }).parse(req.query);
    return service.list(q.page, q.status);
  }));
  router.get('/:id', handle(req => service.detail(id(req))));
  router.patch('/:id', requireProductDbWrite, handle(req => {
    const body = z.object({ expectedRevision: revision, content: z.string().max(200000) }).strict().parse(req.body);
    return service.edit(id(req), body.expectedRevision, body.content, actor(req));
  }));
  router.post('/:id/approve', requireProductDbWrite, handle(req => {
    const body = z.object({ expectedRevision: revision, acknowledgeArchived: z.boolean().default(false),
      targets: z.array(z.object({ masterId: z.string().uuid(), expectedCanonicalRevision: revision.nullable() }).strict()).min(1).max(50) }).strict().parse(req.body);
    return service.approve(id(req), { expectedRevision: body.expectedRevision!, acknowledgeArchived: body.acknowledgeArchived!,
      targets: body.targets!.map(t => ({ masterId: t.masterId!, expectedCanonicalRevision: t.expectedCanonicalRevision ?? null })) }, actor(req));
  }));
  router.post('/:id/reject', requireProductDbWrite, handle(req => {
    const body = z.object({ expectedRevision: revision, note: z.string().trim().min(1).max(2000) }).strict().parse(req.body);
    return service.reject(id(req), body.expectedRevision, body.note, actor(req));
  }));
  return router;
}
