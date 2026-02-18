/**
 * KPA Store Template Controller
 *
 * WO-KPA-STORE-CHANNEL-INTEGRATION-V1
 *
 * GET  /stores/:slug/template — Template Profile 조회 (public)
 * PUT  /stores/:slug/template — Template Profile 변경 (staff, owner only)
 *
 * PK 공유 구조(glycopharm_pharmacies.id === kpa_organizations.id)를 활용하여
 * 동일 엔티티에서 template_profile 읽기/쓰기.
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { GlycopharmPharmacy } from '../../glycopharm/entities/glycopharm-pharmacy.entity.js';
import type { TemplateProfile } from '../../glycopharm/entities/glycopharm-pharmacy.entity.js';
import type { AuthRequest } from '../../../types/auth.js';

const VALID_PROFILES: TemplateProfile[] = ['BASIC', 'COMMERCE_FOCUS', 'CONTENT_FOCUS', 'MINIMAL'];

export function createKpaStoreTemplateController(
  dataSource: DataSource,
  requireAuth: RequestHandler,
): Router {
  const router = Router();
  const pharmacyRepo = dataSource.getRepository(GlycopharmPharmacy);

  // GET /:slug/template — public
  router.get('/:slug/template', async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;
      const pharmacy = await pharmacyRepo.findOne({ where: { slug, status: 'active' as any } });

      if (!pharmacy) {
        res.status(404).json({ success: false, error: { code: 'STORE_NOT_FOUND', message: 'Store not found' } });
        return;
      }

      res.json({
        success: true,
        data: {
          templateProfile: pharmacy.template_profile || 'BASIC',
          theme: pharmacy.storefront_config?.theme || null,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch template profile' },
      });
    }
  });

  // PUT /:slug/template — authenticated, owner only
  router.put('/:slug/template', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;
      const authReq = req as unknown as AuthRequest;
      const userId = authReq.user?.id || authReq.authUser?.id;
      const { templateProfile } = req.body;

      if (!templateProfile || !VALID_PROFILES.includes(templateProfile)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: `templateProfile must be one of: ${VALID_PROFILES.join(', ')}` },
        });
        return;
      }

      const pharmacy = await pharmacyRepo.findOne({ where: { slug, status: 'active' as any } });
      if (!pharmacy) {
        res.status(404).json({ success: false, error: { code: 'STORE_NOT_FOUND', message: 'Store not found' } });
        return;
      }

      if (!userId || pharmacy.created_by_user_id !== userId) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not the store owner' } });
        return;
      }

      await pharmacyRepo.update(pharmacy.id, { template_profile: templateProfile });

      res.json({ success: true, data: { templateProfile } });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update template profile' },
      });
    }
  });

  return router;
}
