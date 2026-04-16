/**
 * Store Public Utils — Shared helpers for unified store public routes
 *
 * WO-O4O-UNIFIED-STORE-PUBLIC-ROUTES-SPLIT-V1
 * Extracted from unified-store-public.routes.ts
 */

import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import rateLimit from 'express-rate-limit';
import { StoreSlugService } from '@o4o/platform-core/store-identity';
import { OrganizationStore } from '../../../modules/store-core/entities/organization-store.entity.js';
import { cacheAside, hashCacheKey, READ_CACHE_TTL } from '../../../cache/read-cache.js';
import type { StoreBlock, TemplateProfile } from '../../glycopharm/entities/glycopharm-pharmacy.entity.js';

// ============================================================================
// Service Key Mapping (WO-O4O-STORE-SERVICEKEY-MAPPING-FIX-V1)
// ============================================================================

/**
 * platform_store_slugs.service_key = 'kpa'
 * organization_product_listings.service_key = 'kpa-society'
 * 두 테이블 간 불일치 보정: OPL 조회 시 'kpa-society'도 포함.
 */
export function resolveServiceKeys(serviceKey: string): string[] {
  if (serviceKey === 'kpa') return ['kpa', 'kpa-society'];
  return [serviceKey];
}

// ============================================================================
// Slug Resolution Helper
// ============================================================================

export interface ResolvedStore {
  storeId: string;
  serviceKey: string;
  pharmacy: OrganizationStore;
}

export async function resolvePublicStore(
  dataSource: DataSource,
  slug: string,
  req: Request,
  res: Response,
): Promise<ResolvedStore | null> {
  const slugService = new StoreSlugService(dataSource);
  const record = await slugService.findBySlug(slug);

  if (!record || !record.isActive) {
    const redirect = await slugService.findOldSlugRedirect(slug);
    if (redirect) {
      const newPath = req.originalUrl.replace(
        `/${encodeURIComponent(slug)}`,
        `/${encodeURIComponent(redirect.newSlug)}`,
      );
      res.redirect(301, newPath);
      return null;
    }
    res.status(404).json({
      success: false,
      error: { code: 'STORE_NOT_FOUND', message: 'Store not found' },
    });
    return null;
  }

  const orgRepo = dataSource.getRepository(OrganizationStore);
  const pharmacy = await orgRepo.findOne({
    where: { id: record.storeId, isActive: true },
  });

  if (!pharmacy) {
    res.status(404).json({
      success: false,
      error: { code: 'STORE_NOT_FOUND', message: 'Store not found' },
    });
    return null;
  }

  return { storeId: record.storeId, serviceKey: record.serviceKey, pharmacy };
}

// ============================================================================
// B2C Visibility-Gated Product Query (serviceKeys parameterized)
// WO-STORE-MULTI-SERVICE-GRID-V1: serviceKey → serviceKeys[]
// ============================================================================

export async function queryVisibleProducts(
  dataSource: DataSource,
  pharmacyId: string,
  serviceKeys: string[],
  options: {
    category?: string;
    q?: string;
    sort?: string;
    order?: string;
    page?: number;
    limit?: number;
    isFeatured?: boolean;
    productId?: string;
  } = {},
): Promise<{ data: any[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
  // WO-O4O-GA-PRELAUNCH-VERIFICATION-V1: SHA1 hash key (collision-safe)
  const ck = hashCacheKey(`sf:${pharmacyId}`, {
    sk: serviceKeys.sort().join(','),
    p: options.page || 1,
    l: options.limit || 20,
    cat: options.category,
    q: options.q,
    s: options.sort,
    o: options.order,
    f: options.isFeatured,
    pid: options.productId,
  });

  return cacheAside(ck, READ_CACHE_TTL.STOREFRONT, async () => {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [pharmacyId, serviceKeys];
    let paramIdx = 3;

    if (options.category) {
      conditions.push(`pm.brand_name = $${paramIdx}`);
      params.push(options.category);
      paramIdx++;
    }
    if (options.q && options.q.length >= 2) {
      conditions.push(`(pm.marketing_name ILIKE $${paramIdx})`);
      params.push(`%${options.q}%`);
      paramIdx++;
    }
    if (options.isFeatured !== undefined) {
      // is_featured not applicable in v2 — filter ignored
    }
    if (options.productId) {
      conditions.push(`spo.id = $${paramIdx}`);
      params.push(options.productId);
      paramIdx++;
    }

    const whereExtra = conditions.length > 0 ? 'AND ' + conditions.join(' AND ') : '';

    const sortMap: Record<string, string> = {
      created_at: 'spo.created_at',
      name: 'pm.marketing_name',
      price: 'spo.price_general',
      sort_order: 'opl.created_at',
    };
    const sortField = sortMap[options.sort || 'created_at'] || 'spo.created_at';
    const sortOrder = options.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const countResult: Array<{ count: string }> = await dataSource.query(
      `SELECT COUNT(DISTINCT spo.id)::int AS count
       FROM supplier_product_offers spo
       JOIN product_masters pm ON pm.id = spo.master_id
       JOIN neture_suppliers s ON s.id = spo.supplier_id
       INNER JOIN organization_product_listings opl
         ON opl.offer_id = spo.id
         AND opl.organization_id = $1
         AND opl.service_key = ANY($2::text[])
         AND opl.is_active = true
       INNER JOIN organization_product_channels opc
         ON opc.product_listing_id = opl.id
         AND opc.is_active = true
       INNER JOIN organization_channels oc
         ON oc.id = opc.channel_id
         AND oc.channel_type = 'B2C'
         AND oc.status = 'APPROVED'
       WHERE spo.is_active = true
         AND s.status = 'ACTIVE'
         ${whereExtra}`,
      params,
    );
    const total = Number(countResult[0]?.count || 0);

    const data = await dataSource.query(
      `SELECT DISTINCT ON (spo.id)
         spo.id, pm.marketing_name AS name,
         '' AS sku, pm.brand_name AS category,
         spo.price_general AS price, NULL::int AS sale_price,
         0 AS stock_quantity, '[]'::jsonb AS images,
         CASE WHEN spo.is_active THEN 'active' ELSE 'inactive' END AS status,
         false AS is_featured,
         s.name AS manufacturer,
         COALESCE(sp.description, spo.consumer_detail_description, '') AS description,
         COALESCE(sp.short_description, spo.consumer_short_description, '') AS short_description,
         opl.created_at AS sort_order,
         spo.created_at, spo.updated_at,
         opl.organization_id AS pharmacy_id,
         opc.sales_limit
       FROM supplier_product_offers spo
       JOIN product_masters pm ON pm.id = spo.master_id
       JOIN neture_suppliers s ON s.id = spo.supplier_id
       INNER JOIN organization_product_listings opl
         ON opl.offer_id = spo.id
         AND opl.organization_id = $1
         AND opl.service_key = ANY($2::text[])
         AND opl.is_active = true
       INNER JOIN organization_product_channels opc
         ON opc.product_listing_id = opl.id
         AND opc.is_active = true
       INNER JOIN organization_channels oc
         ON oc.id = opc.channel_id
         AND oc.channel_type = 'B2C'
         AND oc.status = 'APPROVED'
       LEFT JOIN store_products sp
         ON sp.product_master_id = pm.id
         AND sp.organization_id = opl.organization_id
         AND sp.is_active = true
       WHERE spo.is_active = true
         AND s.status = 'ACTIVE'
         ${whereExtra}
       ORDER BY spo.id, ${sortField} ${sortOrder}
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    );

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  });
}

// ============================================================================
// TABLET Visibility-Gated Product Query (serviceKey parameterized)
// ============================================================================

export async function queryTabletVisibleProducts(
  dataSource: DataSource,
  pharmacyId: string,
  serviceKey: string,
  options: {
    category?: string;
    q?: string;
    sort?: string;
    order?: string;
    page?: number;
    limit?: number;
  } = {},
): Promise<{ data: any[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
  // WO-O4O-GA-PRELAUNCH-VERIFICATION-V1: SHA1 hash key (collision-safe)
  const ck = hashCacheKey(`sf:tablet:${pharmacyId}`, {
    sk: serviceKey,
    p: options.page || 1,
    l: options.limit || 20,
    cat: options.category,
    q: options.q,
    s: options.sort,
    o: options.order,
  });

  return cacheAside(ck, READ_CACHE_TTL.STOREFRONT, async () => {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [pharmacyId, serviceKey];
    let paramIdx = 3;

    if (options.category) {
      conditions.push(`pm.brand_name = $${paramIdx}`);
      params.push(options.category);
      paramIdx++;
    }
    if (options.q && options.q.length >= 2) {
      conditions.push(`(pm.marketing_name ILIKE $${paramIdx})`);
      params.push(`%${options.q}%`);
      paramIdx++;
    }

    const whereExtra = conditions.length > 0 ? 'AND ' + conditions.join(' AND ') : '';

    const sortMap: Record<string, string> = {
      created_at: 'spo.created_at',
      name: 'pm.marketing_name',
      price: 'spo.price_general',
      sort_order: 'opl.created_at',
    };
    const sortField = sortMap[options.sort || 'sort_order'] || 'opl.created_at';
    const sortOrder = options.order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const countResult: Array<{ count: string }> = await dataSource.query(
      `SELECT COUNT(DISTINCT spo.id)::int AS count
       FROM supplier_product_offers spo
       JOIN product_masters pm ON pm.id = spo.master_id
       JOIN neture_suppliers s ON s.id = spo.supplier_id
       INNER JOIN organization_product_listings opl
         ON opl.offer_id = spo.id
         AND opl.organization_id = $1
         AND opl.service_key = $2
         AND opl.is_active = true
       INNER JOIN organization_product_channels opc
         ON opc.product_listing_id = opl.id
         AND opc.is_active = true
       INNER JOIN organization_channels oc
         ON oc.id = opc.channel_id
         AND oc.channel_type = 'TABLET'
         AND oc.status = 'APPROVED'
       WHERE spo.is_active = true
         AND s.status = 'ACTIVE'
         ${whereExtra}`,
      params,
    );
    const total = Number(countResult[0]?.count || 0);

    const data = await dataSource.query(
      `SELECT DISTINCT ON (spo.id)
         spo.id, pm.marketing_name AS name,
         '' AS sku, pm.brand_name AS category,
         spo.price_general AS price, NULL::int AS sale_price,
         0 AS stock_quantity, '[]'::jsonb AS images,
         CASE WHEN spo.is_active THEN 'active' ELSE 'inactive' END AS status,
         false AS is_featured,
         s.name AS manufacturer,
         COALESCE(sp.description, spo.consumer_detail_description, '') AS description,
         COALESCE(sp.short_description, spo.consumer_short_description, '') AS short_description,
         opl.created_at AS sort_order,
         spo.created_at, spo.updated_at,
         opl.organization_id AS pharmacy_id
       FROM supplier_product_offers spo
       JOIN product_masters pm ON pm.id = spo.master_id
       JOIN neture_suppliers s ON s.id = spo.supplier_id
       INNER JOIN organization_product_listings opl
         ON opl.offer_id = spo.id
         AND opl.organization_id = $1
         AND opl.service_key = $2
         AND opl.is_active = true
       INNER JOIN organization_product_channels opc
         ON opc.product_listing_id = opl.id
         AND opc.is_active = true
       INNER JOIN organization_channels oc
         ON oc.id = opc.channel_id
         AND oc.channel_type = 'TABLET'
         AND oc.status = 'APPROVED'
       LEFT JOIN store_products sp
         ON sp.product_master_id = pm.id
         AND sp.organization_id = opl.organization_id
         AND sp.is_active = true
       WHERE spo.is_active = true
         AND s.status = 'ACTIVE'
         ${whereExtra}
       ORDER by spo.id, ${sortField} ${sortOrder}
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    );

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  });
}

// ============================================================================
// Layout: Template Profile → Default Blocks
// ============================================================================

export function generateDefaultBlocks(profile: TemplateProfile): StoreBlock[] {
  switch (profile) {
    case 'COMMERCE_FOCUS':
      return [
        { type: 'HERO', enabled: true },
        { type: 'PRODUCT_GRID', enabled: true, config: { limit: 4 } },
        { type: 'BLOG_LIST', enabled: true, config: { limit: 3 } },
      ];
    case 'CONTENT_FOCUS':
      return [
        { type: 'HERO', enabled: true },
        { type: 'BLOG_LIST', enabled: true, config: { limit: 3 } },
        { type: 'INFO_SECTION', enabled: true },
        { type: 'PRODUCT_GRID', enabled: true, config: { limit: 4 } },
      ];
    case 'MINIMAL':
      return [
        { type: 'HERO', enabled: true },
        { type: 'PRODUCT_GRID', enabled: true, config: { limit: 4 } },
      ];
    case 'BASIC':
    default:
      return [
        { type: 'HERO', enabled: true },
        { type: 'PRODUCT_GRID', enabled: true, config: { limit: 4 } },
        { type: 'BLOG_LIST', enabled: true, config: { limit: 3 } },
        { type: 'TABLET_PROMO', enabled: true },
      ];
  }
}

export async function deriveChannels(
  dataSource: DataSource,
  organizationId: string,
): Promise<{ B2C: boolean; TABLET: boolean; SIGNAGE: boolean }> {
  const rows: Array<{ channel_type: string }> = await dataSource.query(
    `SELECT channel_type FROM organization_channels WHERE organization_id = $1 AND status = 'APPROVED'`,
    [organizationId],
  );
  const approved = new Set(rows.map((r) => r.channel_type));
  return {
    B2C: approved.has('B2C'),
    TABLET: approved.has('TABLET'),
    SIGNAGE: approved.has('SIGNAGE'),
  };
}

// ============================================================================
// Rate limiter for tablet requests
// ============================================================================

export const tabletRequestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
    }
    return req.ip || 'unknown';
  },
});
