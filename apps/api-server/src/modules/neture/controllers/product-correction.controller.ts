import { Router, type Request, type Response } from 'express';
import type { DataSource } from 'typeorm';
import { z, ZodError } from 'zod';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { requireAdmin } from '../../../common/middleware/auth/authorization.middleware.js';
import { requireProductDbWrite } from './product-db-write-authority.js';
import { ProductCorrectionWorkspace } from '../product-correction/workspace.service.js';
import { CorrectionError } from '../product-correction/contracts.js';
import logger from '../../../utils/logger.js';

export function createProductCorrectionController(db: DataSource): Router {
  const router = Router();
  const workspace = new ProductCorrectionWorkspace(db);
  router.use(authenticate);
  router.use(requireAdmin);
  const uuid = z.string().uuid();
  const actor = (req: Request) => {
    const id = (req as Request & { user?: { id?: string } }).user?.id;
    if (!id) throw new CorrectionError('AUTH_REQUIRED', 401);
    return id;
  };
  const run = (fn: (req: Request) => Promise<unknown>) => async (req: Request, res: Response) => {
    try {
      res.json({ success: true, data: await fn(req) });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, code: 'INVALID_INPUT', error: '입력값을 확인해 주세요.' });
        return;
      }
      if (error instanceof CorrectionError) {
        res.status(error.status).json({ success: false, code: error.code, error: error.code });
        return;
      }
      logger.error('[product-correction] operation failed', {
        error: error instanceof Error ? error.name : 'UnknownError',
      });
      res
        .status(500)
        .json({ success: false, code: 'CORRECTION_FAILED', error: '보정 작업 공간 요청에 실패했습니다.' });
    }
  };
  router.get(
    '/rules',
    run(() => workspace.rules()),
  );
  router.post(
    '/rules',
    requireProductDbWrite,
    run((req) => workspace.saveRule(req.body, actor(req))),
  );
  router.put(
    '/rules/:id',
    requireProductDbWrite,
    run((req) => {
      const body = z
        .object({ revision: z.number().int().positive(), rule: z.unknown() })
        .strict()
        .parse(req.body);
      return workspace.saveRule(body.rule, actor(req), uuid.parse(req.params.id), body.revision);
    }),
  );
  router.get(
    '/rules/:id/versions',
    run((req) => workspace.versions(uuid.parse(req.params.id))),
  );
  router.post(
    '/rules/:id/preview',
    run((req) => workspace.preview(uuid.parse(req.params.id), req.body)),
  );
  router.get(
    '/batches',
    run((req) =>
      workspace.batches(z.coerce.number().int().min(1).max(10000).default(1).parse(req.query.page)),
    ),
  );
  router.post(
    '/batches',
    requireProductDbWrite,
    run((req) => workspace.createBatch(req.body, actor(req))),
  );
  router.get(
    '/batches/:id',
    run((req) => workspace.batch(uuid.parse(req.params.id))),
  );
  router.patch(
    '/batches/:id/items/:taskId',
    requireProductDbWrite,
    run((req) =>
      workspace.saveTask(uuid.parse(req.params.id), uuid.parse(req.params.taskId), req.body, actor(req)),
    ),
  );
  return router;
}
