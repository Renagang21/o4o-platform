/**
 * KPA Store Template Controller
 *
 * WO-KPA-STORE-CHANNEL-INTEGRATION-V1
 *
 * GET  /stores/:slug/template — Template Profile 조회 (public)
 * PUT  /stores/:slug/template — Template Profile 변경 (staff, owner only)
 *
 * organizations 테이블의 template_profile 읽기/쓰기.
 * slug → StoreSlugService 기반 해석.
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { OrganizationStore } from '../entities/organization-store.entity.js';
import type { TemplateProfile } from '../../glycopharm/entities/glycopharm-pharmacy.entity.js';
import type { AuthRequest } from '../../../types/auth.js';
import { StoreSlugService } from '@o4o/platform-core/store-identity';

const VALID_PROFILES: TemplateProfile[] = ['BASIC', 'COMMERCE_FOCUS', 'CONTENT_FOCUS', 'MINIMAL'];

export function createKpaStoreTemplateController(
  dataSource: DataSource,
  requireAuth: RequestHandler,
): Router {
  const router = Router();
  const orgRepo = dataSource.getRepository(OrganizationStore);
  const slugService = new StoreSlugService(dataSource);

  async function findOrgBySlug(slug: string, activeOnly = false): Promise<OrganizationStore | null> {
    const record = await slugService.findBySlug(slug);
    if (!record || !record.isActive) return null;
    const where: any = { id: record.storeId };
    if (activeOnly) where.isActive = true;
    return orgRepo.findOne({ where });
  }

  // GET /:slug/template — public
  router.get('/:slug/template', async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;
      const pharmacy = await findOrgBySlug(slug, true);

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

      const pharmacy = await findOrgBySlug(slug, true);
      if (!pharmacy) {
        res.status(404).json({ success: false, error: { code: 'STORE_NOT_FOUND', message: 'Store not found' } });
        return;
      }

      if (!userId || pharmacy.created_by_user_id !== userId) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not the store owner' } });
        return;
      }

      await orgRepo.update(pharmacy.id, { template_profile: templateProfile });

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
