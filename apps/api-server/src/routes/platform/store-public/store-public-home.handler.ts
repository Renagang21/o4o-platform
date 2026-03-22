/**
 * Store Public Home Handler — Store info, layout, template, config, hero
 *
 * WO-O4O-UNIFIED-STORE-PUBLIC-ROUTES-SPLIT-V1
 * Extracted from unified-store-public.routes.ts
 *
 * Endpoints:
 *   GET /:slug                   — Store info
 *   GET /:slug/layout            — Block layout + channels
 *   GET /:slug/template          — Template profile
 *   GET /:slug/storefront-config — Storefront config
 *   GET /:slug/hero              — Hero contents
 */

import { Router, Request, Response } from 'express';
import type { DataSource, Repository } from 'typeorm';
import { GlycopharmPharmacyExtension } from '../../glycopharm/entities/glycopharm-pharmacy-extension.entity.js';
import { GlycopharmProduct } from '../../glycopharm/entities/glycopharm-product.entity.js';
import type { TemplateProfile } from '../../glycopharm/entities/glycopharm-pharmacy.entity.js';
import { resolvePublicStore, generateDefaultBlocks, deriveChannels } from './store-public-utils.js';

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

  // GET /:slug/layout — Block layout + channels
  router.get('/:slug/layout', async (req: Request, res: Response): Promise<void> => {
    try {
      const resolved = await resolvePublicStore(dataSource, req.params.slug, req, res);
      if (!resolved) return;

      const { pharmacy } = resolved;
      const hasCustomBlocks = pharmacy.storefront_blocks && pharmacy.storefront_blocks.length > 0;
      const blocks = hasCustomBlocks
        ? pharmacy.storefront_blocks!
        : generateDefaultBlocks((pharmacy.template_profile || 'BASIC') as TemplateProfile);
      const channels = await deriveChannels(dataSource, pharmacy.id);

      res.json({
        success: true,
        data: {
          storeId: pharmacy.id,
          templateProfile: pharmacy.template_profile || 'BASIC',
          blocks,
          isDefault: !hasCustomBlocks,
          channels,
        },
      });
    } catch (error: any) {
      console.error('[UnifiedStore] GET /:slug/layout error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch layout' },
      });
    }
  });

  // GET /:slug/template — Template profile
  router.get('/:slug/template', async (req: Request, res: Response): Promise<void> => {
    try {
      const resolved = await resolvePublicStore(dataSource, req.params.slug, req, res);
      if (!resolved) return;

      res.json({
        success: true,
        data: {
          templateProfile: resolved.pharmacy.template_profile || 'BASIC',
          theme: resolved.pharmacy.storefront_config?.theme || null,
        },
      });
    } catch (error: any) {
      console.error('[UnifiedStore] GET /:slug/template error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch template profile' },
      });
    }
  });

  // GET /:slug/storefront-config — Storefront config
  router.get('/:slug/storefront-config', async (req: Request, res: Response): Promise<void> => {
    try {
      const resolved = await resolvePublicStore(dataSource, req.params.slug, req, res);
      if (!resolved) return;

      res.json({ success: true, data: resolved.pharmacy.storefront_config || {} });
    } catch (error: any) {
      console.error('[UnifiedStore] GET /:slug/storefront-config error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch storefront config' },
      });
    }
  });

  // GET /:slug/hero — Hero contents
  router.get('/:slug/hero', async (req: Request, res: Response): Promise<void> => {
    try {
      const resolved = await resolvePublicStore(dataSource, req.params.slug, req, res);
      if (!resolved) return;

      const heroContents = resolved.pharmacy.storefront_config?.heroContents || [];
      res.json({ success: true, data: heroContents });
    } catch (error: any) {
      console.error('[UnifiedStore] GET /:slug/hero error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch hero contents' },
      });
    }
  });

  return router;
}
