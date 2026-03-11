/**
 * StoreConsoleController — Extension Layer
 * WO-O4O-STORE-CONSOLE-V1
 *
 * 운영자 Store Console: organizations + channels + product_listings + slugs
 * Core Freeze 준수: KPA 엔티티 미수정, Extension 엔드포인트 사용
 */
import { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';

export class StoreConsoleController {

  /**
   * GET /api/v1/operator/stores
   * 매장 목록 + slug + owner + channel_count + product_count
   */
  getStores = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
      } = req.query;

      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.min(100, Math.max(1, Number(limit)));
      const offset = (pageNum - 1) * limitNum;

      // Build WHERE conditions
      const conditions: string[] = [`o.type IN ('pharmacy', 'store', 'branch')`];
      const params: any[] = [];
      let paramIdx = 1;

      if (search) {
        conditions.push(
          `(o.name ILIKE $${paramIdx} OR o.code ILIKE $${paramIdx} OR u.name ILIKE $${paramIdx} OR u.email ILIKE $${paramIdx})`
        );
        params.push(`%${search}%`);
        paramIdx++;
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      // Sorting
      const validSortFields: Record<string, string> = {
        createdAt: 'o."createdAt"',
        name: 'o.name',
        code: 'o.code',
        channelCount: 'channel_count',
        productCount: 'product_count',
      };
      const sortField = validSortFields[sortBy as string] || 'o."createdAt"';
      const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';

      // Count total
      const countResult = await AppDataSource.query(
        `SELECT COUNT(*)::int as total
         FROM organizations o
         LEFT JOIN users u ON o.created_by_user_id = u.id
         ${whereClause}`,
        params
      );
      const total = countResult[0]?.total || 0;
      const totalPages = Math.ceil(total / limitNum);

      // Fetch stores
      const stores = await AppDataSource.query(
        `SELECT o.id, o.name, o.code, o.type, o."isActive",
                o.address, o.phone, o.business_number,
                o.template_profile, o.created_by_user_id,
                o."createdAt", o."updatedAt",
                u.email as owner_email, u.name as owner_name,
                (SELECT pss.slug FROM platform_store_slugs pss
                 WHERE pss.store_id = o.id AND pss.is_active = true LIMIT 1) as slug,
                (SELECT COUNT(*)::int FROM organization_channels oc
                 WHERE oc.organization_id = o.id) as channel_count,
                (SELECT COUNT(*)::int FROM organization_product_listings opl
                 WHERE opl.organization_id = o.id AND opl.is_active = true) as product_count
         FROM organizations o
         LEFT JOIN users u ON o.created_by_user_id = u.id
         ${whereClause}
         ORDER BY ${sortField} ${order}
         LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...params, limitNum, offset]
      );

      // Stats query
      const statsResult = await AppDataSource.query(
        `SELECT
           COUNT(*)::int as total_stores,
           COUNT(CASE WHEN o."isActive" = true THEN 1 END)::int as active_stores
         FROM organizations o
         WHERE o.type IN ('pharmacy', 'store', 'branch')`
      );

      const channelStatsResult = await AppDataSource.query(
        `SELECT COUNT(DISTINCT oc.organization_id)::int as with_channel
         FROM organization_channels oc
         INNER JOIN organizations o ON oc.organization_id = o.id
         WHERE o.type IN ('pharmacy', 'store', 'branch')`
      );

      const productStatsResult = await AppDataSource.query(
        `SELECT COUNT(DISTINCT opl.organization_id)::int as with_products
         FROM organization_product_listings opl
         INNER JOIN organizations o ON opl.organization_id = o.id
         WHERE o.type IN ('pharmacy', 'store', 'branch') AND opl.is_active = true`
      );

      res.json({
        success: true,
        stores: stores.map((s: any) => ({
          id: s.id,
          name: s.name,
          code: s.code,
          type: s.type,
          isActive: s.isActive,
          address: s.address,
          phone: s.phone,
          businessNumber: s.business_number,
          templateProfile: s.template_profile,
          ownerEmail: s.owner_email,
          ownerName: s.owner_name,
          slug: s.slug,
          channelCount: s.channel_count,
          productCount: s.product_count,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        })),
        stats: {
          totalStores: statsResult[0]?.total_stores || 0,
          activeStores: statsResult[0]?.active_stores || 0,
          withChannel: channelStatsResult[0]?.with_channel || 0,
          withProducts: productStatsResult[0]?.with_products || 0,
        },
        pagination: { page: pageNum, limit: limitNum, total, totalPages },
      });
    } catch (error) {
      console.error('[StoreConsole] getStores error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch stores' });
    }
  };

  /**
   * GET /api/v1/operator/stores/:storeId
   * 매장 상세: 기본정보 + slug + owner
   */
  getStoreDetail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { storeId } = req.params;

      const storeRows = await AppDataSource.query(
        `SELECT o.id, o.name, o.code, o.type, o."isActive",
                o."parentId", o.level, o.path,
                o.address, o.phone, o.description,
                o.business_number, o.created_by_user_id,
                o.template_profile, o.storefront_config,
                o.metadata, o."createdAt", o."updatedAt",
                u.email as owner_email, u.name as owner_name,
                (SELECT pss.slug FROM platform_store_slugs pss
                 WHERE pss.store_id = o.id AND pss.is_active = true LIMIT 1) as slug
         FROM organizations o
         LEFT JOIN users u ON o.created_by_user_id = u.id
         WHERE o.id = $1`,
        [storeId]
      );

      if (storeRows.length === 0) {
        res.status(404).json({ success: false, error: 'Store not found' });
        return;
      }

      const s = storeRows[0];

      res.json({
        success: true,
        store: {
          id: s.id,
          name: s.name,
          code: s.code,
          type: s.type,
          isActive: s.isActive,
          parentId: s.parentId,
          level: s.level,
          path: s.path,
          address: s.address,
          phone: s.phone,
          description: s.description,
          businessNumber: s.business_number,
          createdByUserId: s.created_by_user_id,
          templateProfile: s.template_profile,
          storefrontConfig: s.storefront_config,
          metadata: s.metadata,
          ownerEmail: s.owner_email,
          ownerName: s.owner_name,
          slug: s.slug,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        },
      });
    } catch (error) {
      console.error('[StoreConsole] getStoreDetail error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch store detail' });
    }
  };

  /**
   * GET /api/v1/operator/stores/:storeId/channels
   * 매장 채널 상태: B2C, KIOSK, TABLET, SIGNAGE
   */
  getStoreChannels = async (req: Request, res: Response): Promise<void> => {
    try {
      const { storeId } = req.params;

      const channels = await AppDataSource.query(
        `SELECT oc.id, oc.channel_type, oc.status,
                oc.approved_at, oc.approved_by,
                oc.created_at, oc.updated_at,
                u.name as approved_by_name
         FROM organization_channels oc
         LEFT JOIN users u ON oc.approved_by = u.id
         WHERE oc.organization_id = $1
         ORDER BY oc.channel_type ASC`,
        [storeId]
      );

      res.json({
        success: true,
        channels: channels.map((c: any) => ({
          id: c.id,
          channelType: c.channel_type,
          status: c.status,
          approvedAt: c.approved_at,
          approvedBy: c.approved_by,
          approvedByName: c.approved_by_name,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
        })),
      });
    } catch (error) {
      console.error('[StoreConsole] getStoreChannels error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch store channels' });
    }
  };

  /**
   * GET /api/v1/operator/stores/:storeId/products
   * 매장 상품 목록: organization_product_listings + product_masters
   */
  getStoreProducts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { storeId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.min(100, Math.max(1, Number(limit)));
      const offset = (pageNum - 1) * limitNum;

      const countResult = await AppDataSource.query(
        `SELECT COUNT(*)::int as total
         FROM organization_product_listings opl
         WHERE opl.organization_id = $1 AND opl.is_active = true`,
        [storeId]
      );
      const total = countResult[0]?.total || 0;
      const totalPages = Math.ceil(total / limitNum);

      const products = await AppDataSource.query(
        `SELECT opl.id, opl.is_active, opl.price, opl.created_at, opl.updated_at,
                pm.id as master_id, pm.barcode, pm.marketing_name, pm.regulatory_name,
                pm.manufacturer_name,
                (SELECT pi.image_url FROM product_images pi WHERE pi.master_id = pm.id AND pi.is_primary = true LIMIT 1) as primary_image,
                spo.price_general as offer_price, spo.distribution_type
         FROM organization_product_listings opl
         LEFT JOIN product_masters pm ON opl.master_id = pm.id
         LEFT JOIN supplier_product_offers spo ON opl.offer_id = spo.id
         WHERE opl.organization_id = $1 AND opl.is_active = true
         ORDER BY opl.created_at DESC
         LIMIT $2 OFFSET $3`,
        [storeId, limitNum, offset]
      );

      res.json({
        success: true,
        products: products.map((p: any) => ({
          id: p.id,
          isActive: p.is_active,
          price: p.price,
          masterId: p.master_id,
          barcode: p.barcode,
          marketingName: p.marketing_name,
          regulatoryName: p.regulatory_name,
          manufacturerName: p.manufacturer_name,
          primaryImage: p.primary_image,
          offerPrice: p.offer_price,
          distributionType: p.distribution_type,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        })),
        pagination: { page: pageNum, limit: limitNum, total, totalPages },
      });
    } catch (error) {
      console.error('[StoreConsole] getStoreProducts error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch store products' });
    }
  };
}
