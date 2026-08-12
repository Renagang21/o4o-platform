/**
 * Store Public Home Handler — Store info, layout, template, config, hero
 *
 * WO-O4O-UNIFIED-STORE-PUBLIC-ROUTES-SPLIT-V1
 * Extracted from unified-store-public.routes.ts
 *
 * WO-O4O-KPA-INTERNAL-STOREFRONT-RETIREMENT-V1:
 *   KPA 자체 storefront 종료 — 자체몰 렌더링 전용 endpoint 4건 제거.
 *   `/layout`(KPA-only) · `/template` · `/storefront-config` · `/hero`(3건 소비처 0)
 *   GlycoPharm 은 `/api/v1/glycopharm/stores/*` 자체 controller 를 쓰므로 영향 없다.
 *
 * Endpoints:
 *   GET /:slug — Store info (CROSS-SERVICE: KPA·GlycoPharm·K-Cosmetics 블로그 공개층 공통)
 */

import { Router, Request, Response } from 'express';
import type { DataSource, Repository } from 'typeorm';
import { GlycopharmPharmacyExtension } from '../../glycopharm/entities/glycopharm-pharmacy-extension.entity.js';
import { GlycopharmProduct } from '../../glycopharm/entities/glycopharm-product.entity.js';
import { resolvePublicStore } from './store-public-utils.js';

export function createStorePublicHomeRoutes(deps: {
  dataSource: DataSource;
  productRepo: Repository<GlycopharmProduct>;
}): Router {
  const router = Router();
  const { dataSource, productRepo } = deps;

  // GET /:slug — Store info
  router.get('/:slug', async (req: Request, res: Response): Promise<void> => {
    try {
      const resolved = await resolvePublicStore(dataSource, req.params.slug, req, res);
      if (!resolved) return;

      const { pharmacy } = resolved;
      const productCount = await productRepo.count({
        where: { pharmacy_id: pharmacy.id, status: 'active' },
      });

      // Load extension for glycopharm-specific fields (logo, hero_image)
      const extRepo = dataSource.getRepository(GlycopharmPharmacyExtension);
      const extension = await extRepo.findOne({ where: { organization_id: pharmacy.id } });

      res.json({
        success: true,
        data: {
          id: pharmacy.id,
          name: pharmacy.name,
          slug: req.params.slug,
          description: pharmacy.description,
          address: pharmacy.address,
          addressDetail: (pharmacy as any).address_detail || null,
          phone: pharmacy.phone,
          logo: extension?.logo || null,
          hero_image: extension?.hero_image || null,
          status: pharmacy.isActive ? 'active' : 'inactive',
          productCount,
        },
      });
    } catch (error: any) {
      console.error('[UnifiedStore] GET /:slug error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch store' },
      });
    }
  });


  return router;
}
