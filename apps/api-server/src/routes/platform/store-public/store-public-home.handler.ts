/**
 * Store Public Home Handler — Store info, layout, template, config, hero
 *
 * WO-O4O-UNIFIED-STORE-PUBLIC-ROUTES-SPLIT-V1
 * Extracted from unified-store-public.routes.ts
 *
 * WO-O4O-KPA-INTERNAL-STOREFRONT-RETIREMENT-V1:
 *   KPA 자체 storefront 종료 — 자체몰 렌더링 전용 endpoint 4건 제거.
 *   `/layout`(KPA-only) · `/template` · `/storefront-config` · `/hero`(3건 소비처 0)
 *
 * Endpoints:
 *   GET /:slug — Store info (CROSS-SERVICE: KPA·K-Cosmetics 블로그 공개층 공통)
 */

import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { resolvePublicStore } from './store-public-utils.js';

export function createStorePublicHomeRoutes(deps: {
  dataSource: DataSource;
}): Router {
  const router = Router();
  const { dataSource } = deps;

  // GET /:slug — Store info
  router.get('/:slug', async (req: Request, res: Response): Promise<void> => {
    try {
      const resolved = await resolvePublicStore(dataSource, req.params.slug, req, res);
      if (!resolved) return;

      const { pharmacy } = resolved;

      // WO-O4O-GLYCOPHARM-COMPLETE-ERASURE-V1:
      //   `productCount` 는 glycopharm_products, `logo`/`hero_image` 는
      //   glycopharm_pharmacy_extensions 가 유일한 출처였다 (둘 다 프로덕션 0행 —
      //   이 엔드포인트는 이미 모든 매장에 대해 0/null 을 반환하고 있었다).
      //   GlycoPharm 삭제로 출처가 사라졌다. 소비처(KPA·K-Cos 블로그 og:image)의
      //   응답 shape 를 깨지 않기 위해 키는 유지하고 값은 상수로 둔다.
      //   대체 데이터원은 이번 범위에서 만들지 않는다.

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
          logo: null,
          hero_image: null,
          status: pharmacy.isActive ? 'active' : 'inactive',
          productCount: 0,
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
