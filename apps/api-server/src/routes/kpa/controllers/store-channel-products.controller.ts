/**
 * Store Channel Products Controller — Channel Execution Console
 *
 * WO-CHANNEL-EXECUTION-CONSOLE-V1 Phase 1
 * WO-CHANNEL-APPROVAL-GUARD-ENFORCEMENT-V1 (status=APPROVED 서버 강제)
 *
 * 채널별 제품 진열을 제어하는 실행 콘솔 API.
 * 대상 채널: B2C, KIOSK (TABLET/SIGNAGE 제외)
 *
 * Endpoints:
 *  GET    /:channelId           — 채널에 등록된 제품 목록
 *  GET    /:channelId/available — 등록 가능한 제품 목록
 *  POST   /:channelId           — 제품 등록
 *  PATCH  /:channelId/:productChannelId/deactivate — 제품 비활성화
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import type { AuthRequest } from '../../../types/auth.js';
import { resolveStoreAccess } from '../../../utils/store-owner.utils.js';
import { OrganizationProductChannel } from '../entities/organization-product-channel.entity.js';

type AuthMiddleware = import('express').RequestHandler;

// Channels that support product management
const PRODUCT_CHANNELS = ['B2C', 'KIOSK'] as const;

// ─────────────────────────────────────────────────────
// Controller
// ─────────────────────────────────────────────────────

export function createStoreChannelProductsController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware
): Router {
  const router = Router();

  /**
   * Auth guard: pharmacy owner + resolve organizationId
   * WO-ROLE-NORMALIZATION-PHASE3-A-V1: organization_members 기반
   */
  async function resolveOrgContext(req: Request, res: Response): Promise<{ userId: string; organizationId: string } | null> {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User ID not found' } });
      return null;
    }

    const userRoles: string[] = authReq.user?.roles || [];
    const organizationId = await resolveStoreAccess(dataSource, userId, userRoles);
    if (!organizationId) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Pharmacy owner or operator role required' } });
      return null;
    }

    return { userId, organizationId };
  }

  /**
   * Validate channel belongs to org and is a product-manageable type.
   * When requireApproved=true, also checks status=APPROVED (WO-CHANNEL-APPROVAL-GUARD-ENFORCEMENT-V1).
   * Returns channel_type on success, null on failure (response already sent).
   */
  async function validateChannel(
    channelId: string,
    organizationId: string,
    res: Response,
    requireApproved = false
  ): Promise<string | null> {
    const rows = await dataSource.query(
      `SELECT channel_type, status FROM organization_channels WHERE id = $1 AND organization_id = $2`,
      [channelId, organizationId]
    );
    if (rows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'CHANNEL_NOT_FOUND', message: 'Channel not found' } });
      return null;
    }
    const channelType: string = rows[0].channel_type;
    if (!PRODUCT_CHANNELS.includes(channelType as any)) {
      res.status(400).json({
        success: false,
        error: { code: 'CHANNEL_NOT_ELIGIBLE', message: `Product management is not available for ${channelType} channels` },
      });
      return null;
    }
    if (requireApproved && rows[0].status !== 'APPROVED') {
      res.status(403).json({
        success: false,
        error: { code: 'CHANNEL_NOT_APPROVED', message: 'Channel must be APPROVED to manage products' },
      });
      return null;
    }
    return channelType;
  }

  // ─── GET /:channelId — 채널에 등록된 제품 목록 ───
  router.get(
    '/:channelId',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const ctx = await resolveOrgContext(req, res);
        if (!ctx) return;

        const { channelId } = req.params;
        const channelType = await validateChannel(channelId, ctx.organizationId, res);
        if (!channelType) return;

        const products = await dataSource.query(
          `SELECT
             opc.id,
             opc.is_active AS "isActive",
             opc.display_order AS "displayOrder",
             opc.created_at AS "createdAt",
             opl.id AS "productListingId",
             opl.product_name AS "productName",
             opl.retail_price AS "retailPrice",
             opl.service_key AS "serviceKey",
             opl.is_active AS "listingActive"
           FROM organization_product_channels opc
           JOIN organization_product_listings opl ON opl.id = opc.product_listing_id
           JOIN organization_channels oc ON oc.id = opc.channel_id
           WHERE opc.channel_id = $1
             AND oc.organization_id = $2
           ORDER BY opc.display_order ASC, opc.created_at ASC`,
          [channelId, ctx.organizationId]
        );

        res.json({ success: true, data: products });
      } catch (error: any) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  // ─── GET /:channelId/available — 등록 가능한 제품 목록 ───
  router.get(
    '/:channelId/available',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const ctx = await resolveOrgContext(req, res);
        if (!ctx) return;

        const { channelId } = req.params;
        const channelType = await validateChannel(channelId, ctx.organizationId, res);
        if (!channelType) return;

        const available = await dataSource.query(
          `SELECT
             opl.id,
             opl.product_name AS "productName",
             opl.retail_price AS "retailPrice",
             opl.service_key AS "serviceKey",
             opl.created_at AS "createdAt"
           FROM organization_product_listings opl
           WHERE opl.organization_id = $1
             AND opl.is_active = true
             AND opl.id NOT IN (
               SELECT product_listing_id
               FROM organization_product_channels
               WHERE channel_id = $2 AND is_active = true
             )
           ORDER BY opl.product_name ASC`,
          [ctx.organizationId, channelId]
        );

        res.json({ success: true, data: available });
      } catch (error: any) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  // ─── POST /:channelId — 제품 등록 ───
  router.post(
    '/:channelId',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const ctx = await resolveOrgContext(req, res);
        if (!ctx) return;

        const { channelId } = req.params;
        const { productListingId } = req.body;

        if (!productListingId || typeof productListingId !== 'string') {
          res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'productListingId is required' } });
          return;
        }

        // Validate channel (requireApproved: mutation)
        const channelType = await validateChannel(channelId, ctx.organizationId, res, true);
        if (!channelType) return;

        // Validate product listing belongs to same org and is active
        const listings = await dataSource.query(
          `SELECT id FROM organization_product_listings WHERE id = $1 AND organization_id = $2 AND is_active = true`,
          [productListingId, ctx.organizationId]
        );
        if (listings.length === 0) {
          res.status(404).json({ success: false, error: { code: 'LISTING_NOT_FOUND', message: 'Product listing not found or inactive' } });
          return;
        }

        // Check for existing mapping (active or inactive)
        const pcRepo = dataSource.getRepository(OrganizationProductChannel);
        const existing = await pcRepo.findOne({
          where: { channel_id: channelId, product_listing_id: productListingId },
        });

        if (existing) {
          if (existing.is_active) {
            res.status(409).json({ success: false, error: { code: 'ALREADY_EXISTS', message: 'Product is already active on this channel' } });
            return;
          }
          // Reactivate inactive mapping
          existing.is_active = true;
          const saved = await pcRepo.save(existing);
          res.status(200).json({ success: true, data: { id: saved.id, reactivated: true } });
          return;
        }

        // Get max display_order for this channel
        const maxOrderResult = await dataSource.query(
          `SELECT COALESCE(MAX(display_order), -1) + 1 AS "nextOrder"
           FROM organization_product_channels
           WHERE channel_id = $1`,
          [channelId]
        );
        const nextOrder = maxOrderResult[0]?.nextOrder ?? 0;

        // Create new mapping
        const newPc = pcRepo.create({
          channel_id: channelId,
          product_listing_id: productListingId,
          is_active: true,
          display_order: nextOrder,
        });
        const saved = await pcRepo.save(newPc);

        res.status(201).json({ success: true, data: { id: saved.id, reactivated: false } });
      } catch (error: any) {
        // Handle unique constraint violation
        if (error.code === '23505') {
          res.status(409).json({ success: false, error: { code: 'ALREADY_EXISTS', message: 'Product is already on this channel' } });
          return;
        }
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  // ─── PATCH /:channelId/reorder — 노출 순서 변경 ───
  router.patch(
    '/:channelId/reorder',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const ctx = await resolveOrgContext(req, res);
        if (!ctx) return;

        const { channelId } = req.params;
        const { items } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
          res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'items array is required' } });
          return;
        }

        // Validate channel (requireApproved: mutation)
        const channelType = await validateChannel(channelId, ctx.organizationId, res, true);
        if (!channelType) return;

        // Validate all items belong to this channel
        const pcRepo = dataSource.getRepository(OrganizationProductChannel);
        const ids = items.map((item: { id: string; displayOrder: number }) => item.id);

        const existing = await pcRepo
          .createQueryBuilder('opc')
          .where('opc.id IN (:...ids)', { ids })
          .andWhere('opc.channel_id = :channelId', { channelId })
          .getMany();

        if (existing.length !== ids.length) {
          res.status(400).json({
            success: false,
            error: { code: 'INVALID_ITEMS', message: 'Some items do not belong to this channel' },
          });
          return;
        }

        // Update display_order in transaction
        await dataSource.transaction(async (manager) => {
          for (const item of items as Array<{ id: string; displayOrder: number }>) {
            await manager.update(OrganizationProductChannel, item.id, {
              display_order: item.displayOrder,
            });
          }
        });

        res.json({ success: true, data: { updated: items.length } });
      } catch (error: any) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  // ─── PATCH /:channelId/:productChannelId/deactivate — 제품 비활성화 ───
  router.patch(
    '/:channelId/:productChannelId/deactivate',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const ctx = await resolveOrgContext(req, res);
        if (!ctx) return;

        const { channelId, productChannelId } = req.params;

        // Validate channel ownership (requireApproved: mutation)
        const channelType = await validateChannel(channelId, ctx.organizationId, res, true);
        if (!channelType) return;

        // Find and validate the product-channel mapping
        const pcRepo = dataSource.getRepository(OrganizationProductChannel);
        const pc = await pcRepo.findOne({
          where: { id: productChannelId, channel_id: channelId },
        });

        if (!pc) {
          res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Product channel mapping not found' } });
          return;
        }

        if (!pc.is_active) {
          res.status(400).json({ success: false, error: { code: 'ALREADY_INACTIVE', message: 'Product is already inactive' } });
          return;
        }

        pc.is_active = false;
        await pcRepo.save(pc);

        res.json({ success: true, data: { id: pc.id, isActive: false } });
      } catch (error: any) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  return router;
}
