import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireServiceLegalScope } from '../service-legal/service-legal-scope.js';
import { StoreOwnerTerminationService } from './store-owner-termination.service.js';

function statusOf(error: any): number {
  return Number.isInteger(error?.statusCode) ? error.statusCode : 500;
}

export function createStoreOwnerTerminationRoutes(dataSource: DataSource): Router {
  const router = Router();
  const service = new StoreOwnerTerminationService(dataSource);

  router.use('/:serviceKey/store-owner-terminations', authenticate, requireServiceLegalScope('admin'));

  router.get('/:serviceKey/store-owner-terminations', async (req: Request, res: Response) => {
    try {
      const rows = await service.list(req.params.serviceKey);
      const now = Date.now();
      res.json({
        success: true,
        data: rows.map((row) => ({
          ...row,
          purgeState:
            row.status === 'purge_completed' ? 'completed' :
            ['terminated','failed'].includes(row.status) && new Date(row.purgeDueAt).getTime() < now ? 'overdue' :
            ['terminated','failed'].includes(row.status) ? 'due' : 'not_due',
        })),
      });
    } catch (error: any) {
      res.status(statusOf(error)).json({ success: false, error: error.message, code: error.code });
    }
  });

  router.post('/:serviceKey/store-owner-terminations', async (req: Request, res: Response) => {
    try {
      const body = req.body ?? {};
      if (!body.organizationId || !body.userId || !body.terminationEffectiveAt) {
        return res.status(400).json({
          success: false,
          error: 'organizationId, userId, terminationEffectiveAt 이 필요합니다.',
          code: 'VALIDATION_ERROR',
        });
      }
      const row = await service.create({
        serviceKey: req.params.serviceKey,
        organizationId: String(body.organizationId),
        userId: String(body.userId),
        requestedBy: (req as any).user?.id ?? null,
        returnRequested: body.returnRequested === true,
        terminationEffectiveAt: new Date(body.terminationEffectiveAt),
      });
      return res.status(201).json({ success: true, data: row });
    } catch (error: any) {
      return res.status(statusOf(error)).json({ success: false, error: error.message, code: error.code });
    }
  });

  router.get('/:serviceKey/store-owner-terminations/:id/export', async (req: Request, res: Response) => {
    try {
      const result = await service.exportPackage(req.params.id);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="store-owner-data-${req.params.id}.json"`);
      return res.send(JSON.stringify(result, null, 2));
    } catch (error: any) {
      return res.status(statusOf(error)).json({ success: false, error: error.message, code: error.code });
    }
  });

  router.post('/:serviceKey/store-owner-terminations/:id/return-completed', async (req: Request, res: Response) => {
    try {
      const row = await service.markReturnCompleted(req.params.id);
      return res.json({ success: true, data: row });
    } catch (error: any) {
      return res.status(statusOf(error)).json({ success: false, error: error.message, code: error.code });
    }
  });

  router.post('/:serviceKey/store-owner-terminations/:id/terminate', async (req: Request, res: Response) => {
    try {
      const row = await service.terminate(req.params.id);
      return res.json({ success: true, data: row });
    } catch (error: any) {
      return res.status(statusOf(error)).json({ success: false, error: error.message, code: error.code });
    }
  });

  router.get('/:serviceKey/store-owner-terminations/:id/purge-dry-run', async (req: Request, res: Response) => {
    try {
      const result = await service.purge(req.params.id, false);
      return res.json({ success: true, data: result.plan });
    } catch (error: any) {
      return res.status(statusOf(error)).json({ success: false, error: error.message, code: error.code });
    }
  });

  router.post('/:serviceKey/store-owner-terminations/:id/purge', async (req: Request, res: Response) => {
    try {
      if (req.body?.confirm !== 'APPLY') {
        return res.status(400).json({
          success: false,
          error: '실제 파기에는 confirm=APPLY 가 필요합니다.',
          code: 'PURGE_CONFIRMATION_REQUIRED',
        });
      }
      const result = await service.purge(req.params.id, true);
      return res.json({ success: true, data: result });
    } catch (error: any) {
      return res.status(statusOf(error)).json({ success: false, error: error.message, code: error.code });
    }
  });

  return router;
}
