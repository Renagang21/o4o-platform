import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate } from '../../../middleware/auth.middleware.js';
import {
  MediaCatalogError,
  MediaCatalogService,
} from '../services/media-catalog.service.js';

export function createMediaCatalogRouter(ds: DataSource): Router {
  const router = Router();
  const service = new MediaCatalogService(ds);
  const admin = (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as { roles?: string[] } | undefined;
    if (
      !user?.roles?.some((role) =>
        ['platform:admin', 'platform:super_admin'].includes(role),
      )
    ) {
      res.status(403).json({ success: false, code: 'PLATFORM_ADMIN_REQUIRED' });
      return;
    }
    next();
  };
  const run =
    (fn: (req: Request) => Promise<unknown>, status = 200) =>
    async (req: Request, res: Response) => {
      try {
        if (
          ['POST', 'PATCH'].includes(req.method) &&
          (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))
        )
          throw new MediaCatalogError('INVALID_BODY');
        res.status(status).json({ success: true, data: await fn(req) });
      } catch (error) {
        if (error instanceof MediaCatalogError) {
          res
            .status(error.status)
            .json({ success: false, error: error.message, code: error.code });
          return;
        }
        if ((error as { code?: string }).code === '23505') {
          res.status(409).json({ success: false, code: 'LINK_ALREADY_EXISTS' });
          return;
        }
        res.status(500).json({ success: false, code: 'MEDIA_CATALOG_ERROR' });
      }
    };
  router.post(
    '/media-library/external',
    authenticate,
    admin,
    run((req) => service.createExternal(req.body, req.user!.id), 201),
  );
  router.get(
    '/media-library/:id/relations',
    authenticate,
    admin,
    run((req) => service.relations(req.params.id)),
  );
  router.patch(
    '/media-library/:id/catalog',
    authenticate,
    admin,
    run((req) => service.patch(req.params.id, req.body, req.user!.id)),
  );
  router.post(
    '/media-library/:id/links',
    authenticate,
    admin,
    run((req) => service.saveLink(req.params.id, req.body), 201),
  );
  router.patch(
    '/media-library/:id/links/:linkId',
    authenticate,
    admin,
    run((req) => service.saveLink(req.params.id, req.body, req.params.linkId)),
  );
  router.delete(
    '/media-library/:id/links/:linkId',
    authenticate,
    admin,
    run((req) => service.removeLink(req.params.id, req.params.linkId)),
  );
  return router;
}
