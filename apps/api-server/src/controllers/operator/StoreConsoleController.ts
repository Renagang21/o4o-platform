/**
 * StoreConsoleController — Extension Layer
 * WO-O4O-STORE-CONSOLE-V1
 *
 * 운영자 Store Console: organizations + channels + product_listings + slugs
 * Core Freeze 준수: KPA 엔티티 미수정, Extension 엔드포인트 사용
 */
import { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { StoreCapabilityService } from '../../modules/store-core/services/store-capability.service.js';
import { StoreChannelService } from '../../modules/store-core/services/store-channel.service.js';
import { StoreCapability as Cap, type StoreCapabilityKey } from '../../modules/store-core/constants/store-capabilities.js';
import { getCapabilityMeta } from '@o4o/capabilities';
import type { ServiceScope } from '../../utils/serviceScope.js';
import logger from '../../utils/logger.js';

export class StoreConsoleController {
  private capabilityService: StoreCapabilityService;
  private channelService: StoreChannelService;

  constructor() {
    // Lazy init — AppDataSource may not be ready at import time
    this.capabilityService = null as any;
    this.channelService = null as any;
  }

  private getCapabilityService(): StoreCapabilityService {
    if (!this.capabilityService) {
      this.capabilityService = new StoreCapabilityService(AppDataSource);
    }
    return this.capabilityService;
  }

  private getChannelService(): StoreChannelService {
    if (!this.channelService) {
      this.channelService = new StoreChannelService(AppDataSource);
    }
    return this.channelService;
  }

  /**
   * WO-O4O-SERVICE-DATA-ISOLATION-FIX-V1: Enrollment boundary check.
   * Returns true if storeId belongs to the operator's service(s).
   * Platform admin always passes.
   */
  private async assertStoreAccess(storeId: string, scope: ServiceScope): Promise<boolean> {
    if (scope.isPlatformAdmin) return true;
    const rows = await AppDataSource.query(
      `SELECT 1 FROM organization_service_enrollments
       WHERE organization_id = $1 AND service_code = ANY($2) LIMIT 1`,
      [storeId, scope.serviceKeys]
    );
    return rows.length > 0;
  }

  /**
   * GET /api/v1/operator/stores
   * 매장 목록 + slug + owner + channel_count + product_count
   */
  getStores = async (req: Request, res: Response): Promise<void> => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;
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

      // WO-O4O-SERVICE-DATA-ISOLATION-FIX-V1: Service scope filter via enrollment
      if (!scope.isPlatformAdmin) {
        conditions.push(
          `EXISTS (SELECT 1 FROM organization_service_enrollments ose WHERE ose.organization_id = o.id AND ose.service_code = ANY($${paramIdx}))`
        );
        params.push(scope.serviceKeys);
        paramIdx++;
      }

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
                o.address, o.address_detail, o.phone, o.business_number,
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

      // Stats query — WO-O4O-SERVICE-DATA-ISOLATION-FIX-V1: scoped by service
      const enrollmentJoin = scope.isPlatformAdmin
        ? ''
        : 'INNER JOIN organization_service_enrollments ose_s ON ose_s.organization_id = o.id AND ose_s.service_code = ANY($1)';
      const statsParams = scope.isPlatformAdmin ? [] : [scope.serviceKeys];

      const statsResult = await AppDataSource.query(
        `SELECT
           COUNT(DISTINCT o.id)::int as total_stores,
           COUNT(DISTINCT CASE WHEN o."isActive" = true THEN o.id END)::int as active_stores
         FROM organizations o
         ${enrollmentJoin}
         WHERE o.type IN ('pharmacy', 'store', 'branch')`,
        statsParams
      );

      const channelStatsResult = await AppDataSource.query(
        `SELECT COUNT(DISTINCT oc.organization_id)::int as with_channel
         FROM organization_channels oc
         INNER JOIN organizations o ON oc.organization_id = o.id
         ${scope.isPlatformAdmin ? '' : 'INNER JOIN organization_service_enrollments ose_c ON ose_c.organization_id = o.id AND ose_c.service_code = ANY($1)'}
         WHERE o.type IN ('pharmacy', 'store', 'branch')`,
        statsParams
      );

      const productStatsResult = await AppDataSource.query(
        `SELECT COUNT(DISTINCT opl.organization_id)::int as with_products
         FROM organization_product_listings opl
         INNER JOIN organizations o ON opl.organization_id = o.id
         ${scope.isPlatformAdmin ? '' : 'INNER JOIN organization_service_enrollments ose_p ON ose_p.organization_id = o.id AND ose_p.service_code = ANY($1)'}
         WHERE o.type IN ('pharmacy', 'store', 'branch') AND opl.is_active = true`,
        statsParams
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
          addressDetail: s.address_detail || null,
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
      logger.error('[StoreConsole] getStores error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch stores' });
    }
  };

  /**
   * GET /api/v1/operator/stores/:storeId
   * 매장 상세: 기본정보 + slug + owner
   */
  getStoreDetail = async (req: Request, res: Response): Promise<void> => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;
      const { storeId } = req.params;

      // WO-O4O-SERVICE-DATA-ISOLATION-FIX-V1: Enrollment boundary
      if (!(await this.assertStoreAccess(storeId, scope))) {
        res.status(404).json({ success: false, error: 'Store not found' });
        return;
      }

      const storeRows = await AppDataSource.query(
        `SELECT o.id, o.name, o.code, o.type, o."isActive",
                o."parentId", o.level, o.path,
                o.address, o.address_detail, o.phone, o.description,
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
          addressDetail: s.address_detail || null,
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
      logger.error('[StoreConsole] getStoreDetail error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch store detail' });
    }
  };

  /**
   * GET /api/v1/operator/stores/:storeId/channels
   * 매장 채널 상태: B2C, KIOSK, TABLET, SIGNAGE
   */
  getStoreChannels = async (req: Request, res: Response): Promise<void> => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;
      const { storeId } = req.params;

      if (!(await this.assertStoreAccess(storeId, scope))) {
        res.status(404).json({ success: false, error: 'Store not found' });
        return;
      }

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
      logger.error('[StoreConsole] getStoreChannels error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch store channels' });
    }
  };

  /**
   * GET /api/v1/operator/stores/:storeId/products
   * 매장 상품 목록: organization_product_listings + product_masters
   */
  getStoreProducts = async (req: Request, res: Response): Promise<void> => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;
      const { storeId } = req.params;

      if (!(await this.assertStoreAccess(storeId, scope))) {
        res.status(404).json({ success: false, error: 'Store not found' });
        return;
      }
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
                pm.id as master_id, pm.barcode, pm.name, pm.regulatory_name,
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
          marketingName: p.name,
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
      logger.error('[StoreConsole] getStoreProducts error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch store products' });
    }
  };

  /**
   * GET /api/v1/operator/stores/:storeId/capabilities
   * WO-O4O-STORE-CAPABILITY-SYSTEM-V1
   */
  getStoreCapabilities = async (req: Request, res: Response): Promise<void> => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;
      const { storeId } = req.params;

      if (!(await this.assertStoreAccess(storeId, scope))) {
        res.status(404).json({ success: false, error: 'Store not found' });
        return;
      }

      const svc = this.getCapabilityService();
      const capabilities = await svc.getCapabilities(storeId);

      // 전체 capability 키 기준으로 응답 (DB에 없는 키는 disabled로 표시)
      const allKeys = Object.values(Cap);
      const capMap = new Map(capabilities.map(c => [c.capability_key, c]));

      res.json({
        success: true,
        capabilities: allKeys.map(key => {
          const row = capMap.get(key);
          const meta = getCapabilityMeta(key);
          return {
            key,
            label: meta?.label ?? key,
            category: meta?.category ?? 'commerce',
            enabled: row?.enabled ?? false,
            source: row?.source ?? 'system',
            updatedAt: row?.updated_at ?? null,
          };
        }),
      });
    } catch (error) {
      logger.error('[StoreConsole] getStoreCapabilities error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch store capabilities' });
    }
  };

  /**
   * PUT /api/v1/operator/stores/:storeId/capabilities
   * WO-O4O-STORE-CAPABILITY-SYSTEM-V1
   *
   * Body: { capabilities: [{ key: "TABLET", enabled: true }, ...] }
   */
  updateStoreCapabilities = async (req: Request, res: Response): Promise<void> => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;
      const { storeId } = req.params;

      if (!(await this.assertStoreAccess(storeId, scope))) {
        res.status(404).json({ success: false, error: 'Store not found' });
        return;
      }

      const { capabilities } = req.body;

      if (!Array.isArray(capabilities)) {
        res.status(400).json({ success: false, error: 'capabilities must be an array' });
        return;
      }

      const validKeys = new Set(Object.values(Cap));
      const updates: { key: StoreCapabilityKey; enabled: boolean }[] = [];

      for (const item of capabilities) {
        if (!validKeys.has(item.key)) {
          res.status(400).json({ success: false, error: `Invalid capability key: ${item.key}` });
          return;
        }
        if (typeof item.enabled !== 'boolean') {
          res.status(400).json({ success: false, error: `enabled must be boolean for ${item.key}` });
          return;
        }
        updates.push({ key: item.key, enabled: item.enabled });
      }

      const svc = this.getCapabilityService();
      await svc.bulkUpdate(storeId, updates);

      // 업데이트 후 전체 상태 반환
      const result = await svc.getCapabilities(storeId);
      const allKeys = Object.values(Cap);
      const capMap = new Map(result.map(c => [c.capability_key, c]));

      res.json({
        success: true,
        capabilities: allKeys.map(key => {
          const row = capMap.get(key);
          const meta = getCapabilityMeta(key);
          return {
            key,
            label: meta?.label ?? key,
            category: meta?.category ?? 'commerce',
            enabled: row?.enabled ?? false,
            source: row?.source ?? 'system',
            updatedAt: row?.updated_at ?? null,
          };
        }),
      });
    } catch (error) {
      logger.error('[StoreConsole] updateStoreCapabilities error:', error);
      res.status(500).json({ success: false, error: 'Failed to update store capabilities' });
    }
  };

  /**
   * PUT /api/v1/operator/stores/:storeId/profile
   * WO-O4O-STORE-PROFILE-UNIFICATION-V1
   *
   * Body: { name?, phone?, description?, addressDetail?: StoreAddress }
   */
  updateStoreProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;
      const { storeId } = req.params;

      if (!(await this.assertStoreAccess(storeId, scope))) {
        res.status(404).json({ success: false, error: 'Store not found' });
        return;
      }

      const { name, phone, description, addressDetail } = req.body;

      const sets: string[] = [];
      const params: any[] = [];
      let idx = 1;

      if (name !== undefined) { sets.push(`name = $${idx++}`); params.push(name); }
      if (phone !== undefined) { sets.push(`phone = $${idx++}`); params.push(phone); }
      if (description !== undefined) { sets.push(`description = $${idx++}`); params.push(description); }
      if (addressDetail !== undefined) {
        sets.push(`address_detail = $${idx++}`);
        params.push(JSON.stringify(addressDetail));
        // Sync legacy address column
        const legacyAddr = [addressDetail?.baseAddress, addressDetail?.detailAddress].filter(Boolean).join(' ');
        sets.push(`address = $${idx++}`);
        params.push(legacyAddr || null);
      }

      if (sets.length === 0) {
        res.status(400).json({ success: false, error: 'No fields to update' });
        return;
      }

      sets.push(`"updatedAt" = NOW()`);
      params.push(storeId);

      await AppDataSource.query(
        `UPDATE organizations SET ${sets.join(', ')} WHERE id = $${idx}`,
        params
      );

      res.json({ success: true, message: 'Store profile updated' });
    } catch (error) {
      logger.error('[StoreConsole] updateStoreProfile error:', error);
      res.status(500).json({ success: false, error: 'Failed to update store profile' });
    }
  };

  /**
   * GET /api/v1/operator/store-channels
   * WO-O4O-STORE-CHANNEL-LIFECYCLE-V1
   *
   * Cross-store 채널 목록 (필터: status, channelType, search)
   */
  getAllChannels = async (req: Request, res: Response): Promise<void> => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;
      const {
        page = 1,
        limit = 20,
        status,
        channelType,
        search,
      } = req.query;

      const svc = this.getChannelService();
      const result = await svc.getAllChannels({
        status: status as string | undefined,
        channelType: channelType as string | undefined,
        search: search as string | undefined,
        page: Math.max(1, Number(page)),
        limit: Math.min(100, Math.max(1, Number(limit))),
        serviceKeys: scope.isPlatformAdmin ? undefined : scope.serviceKeys,
      });

      res.json({ success: true, ...result });
    } catch (error) {
      logger.error('[StoreConsole] getAllChannels error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch channels' });
    }
  };

  /**
   * PUT /api/v1/operator/stores/:storeId/channels/:channelId/status
   * WO-O4O-STORE-CHANNEL-LIFECYCLE-V1
   *
   * Channel 상태 변경 (APPROVED ↔ SUSPENDED → TERMINATED)
   */
  updateChannelStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;
      const { storeId, channelId } = req.params;

      if (!(await this.assertStoreAccess(storeId, scope))) {
        res.status(404).json({ success: false, error: 'Store not found' });
        return;
      }

      const { status } = req.body;

      const ALLOWED_STATUSES = ['APPROVED', 'SUSPENDED', 'TERMINATED'];
      if (!status || !ALLOWED_STATUSES.includes(status)) {
        res.status(400).json({
          success: false,
          error: `status must be one of: ${ALLOWED_STATUSES.join(', ')}`,
        });
        return;
      }

      const svc = this.getChannelService();
      const channel = await svc.updateChannelStatus(channelId, storeId, status);

      res.json({
        success: true,
        channel: {
          id: channel.id,
          channelType: channel.channel_type,
          status: channel.status,
          approvedAt: channel.approved_at,
          updatedAt: channel.updated_at,
        },
      });
    } catch (error: any) {
      if (error.message === 'CHANNEL_NOT_FOUND') {
        res.status(404).json({ success: false, error: 'Channel not found' });
        return;
      }
      if (error.message?.startsWith('INVALID_TRANSITION')) {
        res.status(400).json({ success: false, error: error.message });
        return;
      }
      logger.error('[StoreConsole] updateChannelStatus error:', error);
      res.status(500).json({ success: false, error: 'Failed to update channel status' });
    }
  };
}
