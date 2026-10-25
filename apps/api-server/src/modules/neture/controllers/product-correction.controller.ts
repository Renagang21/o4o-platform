import { Router, type Request, type Response } from 'express';
import type { DataSource } from 'typeorm';
import { z, ZodError } from 'zod';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { requireAdmin } from '../../../common/middleware/auth/authorization.middleware.js';
import { requireProductDbWrite } from './product-db-write-authority.js';
import { ProductCorrectionWorkspace } from '../product-correction/workspace.service.js';
import { ProductCorrectionOperationsService } from '../product-correction/operations.service.js';
import { CorrectionError } from '../product-correction/contracts.js';
import logger from '../../../utils/logger.js';
import { ProductCorrectionProposalService } from '../product-correction/proposal.service.js';
import { generateProductCorrectionDraft } from '../product-correction/ai-draft.service.js';
import { AiExtensionError } from '@o4o/ai-core';

export function createProductCorrectionController(db: DataSource): Router {
  const router = Router();
  const workspace = new ProductCorrectionWorkspace(db);
  const proposals = new ProductCorrectionProposalService(db);
  const operations = new ProductCorrectionOperationsService(db);
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
      if (error instanceof AiExtensionError) {
        res.status(error.code === 'QUOTA_EXCEEDED' ? 429 : error.code === 'ACCESS_DENIED' ? 403 : 503)
          .json({ success: false, code: error.code, error: 'AI 초안을 준비하지 못했습니다. 수동 검토를 계속할 수 있습니다.' });
        return;
      }
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
  router.post('/batches/:id/items/:taskId/ai-draft', requireProductDbWrite, run(req => {
    const body = z.object({ revision: z.number().int().positive() }).strict().parse(req.body);
    return generateProductCorrectionDraft(db, {
      batchId: uuid.parse(req.params.id), taskId: uuid.parse(req.params.taskId), revision: body.revision, actorId: actor(req),
    });
  }));
  router.patch(
    '/batches/:id/items/:taskId',
    requireProductDbWrite,
    run((req) =>
      workspace.saveTask(uuid.parse(req.params.id), uuid.parse(req.params.taskId), req.body, actor(req)),
    ),
  );
  router.post(
    '/rules/:id/runs',
    requireProductDbWrite,
    run((req) => operations.execute(uuid.parse(req.params.id), req.body, actor(req))),
  );
  router.get(
    '/runs',
    run((req) => operations.runs(z.coerce.number().int().min(1).max(10000).default(1).parse(req.query.page))),
  );
  router.get(
    '/runs/:id',
    run((req) => operations.run(uuid.parse(req.params.id))),
  );
  router.post(
    '/runs/:id/retry',
    requireProductDbWrite,
    run((req) => operations.retry(uuid.parse(req.params.id), actor(req))),
  );
  router.get(
    '/operations',
    run((req) =>
      operations.operations(
        z
          .enum(['all', 'open', 'due', 'followup', 'reviewed', 'outdated'])
          .default('all')
          .parse(req.query.filter),
        z.coerce.number().int().min(1).max(10000).default(1).parse(req.query.page),
      ),
    ),
  );
  router.get(
    '/batches/:id/items/:taskId/versions',
    run((req) =>
      operations.taskVersions(
        uuid.parse(req.params.id),
        uuid.parse(req.params.taskId),
        z.coerce.number().int().min(1).max(10000).default(1).parse(req.query.page),
      ),
    ),
  );
  router.get(
    '/batches/:id/items/:taskId/change-context',
    run((req) => proposals.context(uuid.parse(req.params.id), uuid.parse(req.params.taskId))),
  );
  router.get(
    '/batches/:id/items/:taskId/proposals',
    run((req) => proposals.list(uuid.parse(req.params.id), uuid.parse(req.params.taskId))),
  );
  router.post(
    '/batches/:id/items/:taskId/proposals',
    requireProductDbWrite,
    run((req) =>
      proposals.create(
        uuid.parse(req.params.id),
        uuid.parse(req.params.taskId),
        req.body,
        actor(req),
      ),
    ),
  );
  router.get(
    '/proposals',
    run((req) =>
      proposals.queue(
        z
          .enum(['all', 'pending', 'reviewed', 'applied', 'failed'])
          .default('all')
          .parse(req.query.filter),
        z.coerce.number().int().min(1).max(10000).default(1).parse(req.query.page),
      ),
    ),
  );
  router.get(
    '/proposals/:id/versions',
    run((req) => proposals.versions(uuid.parse(req.params.id))),
  );
  router.get(
    '/proposals/:id/attempts',
    run((req) => proposals.attempts(uuid.parse(req.params.id))),
  );
  router.post(
    '/proposals/:id/review',
    requireProductDbWrite,
    run((req) => proposals.review(uuid.parse(req.params.id), req.body, actor(req))),
  );
  router.post(
    '/proposals/:id/apply',
    requireProductDbWrite,
    run((req) => proposals.apply(uuid.parse(req.params.id), req.body, actor(req))),
  );
  router.get('/proposals/:id', run(req => proposals.proposal(uuid.parse(req.params.id))));
  return router;
}
