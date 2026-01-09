/**
 * Admin Ops Metrics Routes
 *
 * WO-NEXT-OPS-METRICS-P0: Unified operations metrics for platform-wide health monitoring
 *
 * This is NOT an analytics dashboard - it's an operational judgment tool.
 * Purpose: Allow operators to quickly determine if intervention is needed.
 *
 * Endpoints:
 * - GET /api/v1/admin/ops/metrics - Get platform-wide operational metrics
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { Channel, ChannelHeartbeat, CmsContent, CmsContentSlot } from '@o4o-apps/cms-core';
import { requireAdmin } from '../../middleware/auth.middleware.js';

// Default heartbeat threshold in seconds (2 minutes)
const DEFAULT_HEARTBEAT_THRESHOLD_SEC = 120;

// Critical slot keys that should have content
const CRITICAL_SLOT_KEYS = ['home-hero', 'intranet-hero', 'dashboard-banner', 'store-tv-loop'];

/**
 * Create Admin Ops Metrics routes
 */
export function createAdminOpsMetricsRoutes(dataSource: DataSource): Router {
  const router = Router();

  /**
   * GET /admin/ops/metrics
   * Get platform-wide operational metrics for quick health assessment
   *
   * Returns aggregated counts and status indicators for:
   * - Services (active count)
   * - Channels (online/offline/maintenance/unknown)
   * - CMS (locked slots, empty critical areas, expired content)
   * - Operations status (automated vs manual attention needed)
   */
  router.get('/metrics', requireAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
      const { thresholdSec = String(DEFAULT_HEARTBEAT_THRESHOLD_SEC) } = req.query;
      const thresholdMs = parseInt(thresholdSec as string, 10) * 1000;

      const channelRepo = dataSource.getRepository(Channel);
      const heartbeatRepo = dataSource.getRepository(ChannelHeartbeat);
      const contentRepo = dataSource.getRepository(CmsContent);
      const slotRepo = dataSource.getRepository(CmsContentSlot);

      // ================================================================
      // 1. CHANNEL METRICS
      // ================================================================
      const channels = await channelRepo.find();

      // Get latest heartbeat for each channel
      const channelStatusCounts = {
        total: channels.length,
        online: 0,
        offline: 0,
        maintenance: 0,
        unknown: 0,
      };

      // Count by service
      const serviceKeys = new Set<string>();

      for (const channel of channels) {
        if (channel.serviceKey) {
          serviceKeys.add(channel.serviceKey);
        }

        // Check maintenance status first
        if (channel.status === 'maintenance') {
          channelStatusCounts.maintenance++;
          continue;
        }

        // Get latest heartbeat
        const latestHeartbeat = await heartbeatRepo.findOne({
          where: { channelId: channel.id },
          order: { receivedAt: 'DESC' },
        });

        if (!latestHeartbeat) {
          channelStatusCounts.unknown++;
        } else {
          const timeSinceHeartbeat = Date.now() - latestHeartbeat.receivedAt.getTime();
          if (timeSinceHeartbeat <= thresholdMs) {
            channelStatusCounts.online++;
          } else {
            channelStatusCounts.offline++;
          }
        }
      }

      // ================================================================
      // 2. CMS METRICS
      // ================================================================

      // Count locked slots
      const lockedSlotsCount = await slotRepo.count({
        where: { isLocked: true },
      });

      // Find empty critical slots (critical slot keys without active content)
      const allSlots = await slotRepo.find({
        where: { isActive: true },
        relations: ['content'],
      });

      const slotKeysByContent = new Map<string, boolean>();
      for (const slot of allSlots) {
        if (slot.content && slot.content.status === 'published') {
          slotKeysByContent.set(slot.slotKey, true);
        }
      }

      let emptyCriticalSlotsCount = 0;
      for (const criticalKey of CRITICAL_SLOT_KEYS) {
        if (!slotKeysByContent.has(criticalKey)) {
          emptyCriticalSlotsCount++;
        }
      }

      // Count expired content (status = published but expiresAt < now)
      const now = new Date();
      const allContents = await contentRepo.find({
        where: { status: 'published' },
      });

      let expiredContentsCount = 0;
      for (const content of allContents) {
        if (content.expiresAt && content.expiresAt < now) {
          expiredContentsCount++;
        }
      }

      // Count draft-only areas (slots with only draft content)
      const draftOnlyAreasCount = 0; // Simplified for P0

      // ================================================================
      // 3. OPERATIONS STATUS INDICATORS
      // ================================================================

      // Channels that are automated (online + has heartbeat + has content in slot)
      let automatedCount = 0;
      let manualAttentionCount = 0;
      let contractControlledCount = 0;

      for (const channel of channels) {
        // Get latest heartbeat
        const latestHeartbeat = await heartbeatRepo.findOne({
          where: { channelId: channel.id },
          order: { receivedAt: 'DESC' },
        });

        const isOnline = latestHeartbeat &&
          (Date.now() - latestHeartbeat.receivedAt.getTime() <= thresholdMs);

        // Check if slot has content
        const slotContent = await slotRepo.findOne({
          where: { slotKey: channel.slotKey, isActive: true },
          relations: ['content'],
        });
        const hasContent = slotContent?.content?.status === 'published';

        // Check if slot is locked (contract controlled)
        const isLocked = slotContent?.isLocked;

        if (isLocked) {
          contractControlledCount++;
        } else if (isOnline && hasContent) {
          automatedCount++;
        } else {
          manualAttentionCount++;
        }
      }

      // ================================================================
      // 4. BUILD RESPONSE
      // ================================================================
      const response = {
        success: true,
        data: {
          services: {
            total: serviceKeys.size,
            active: serviceKeys.size, // For now, assume all are active
            list: Array.from(serviceKeys),
          },
          channels: channelStatusCounts,
          cms: {
            lockedSlots: lockedSlotsCount,
            emptyCriticalSlots: emptyCriticalSlotsCount,
            expiredContents: expiredContentsCount,
            draftOnlyAreas: draftOnlyAreasCount,
            criticalSlotKeys: CRITICAL_SLOT_KEYS,
          },
          opsStatus: {
            automated: automatedCount,
            manualAttention: manualAttentionCount,
            contractControlled: contractControlledCount,
          },
          health: {
            // Overall health indicator
            status: getOverallHealthStatus(channelStatusCounts, emptyCriticalSlotsCount, expiredContentsCount),
            indicators: {
              channelsHealthy: channelStatusCounts.offline === 0 && channelStatusCounts.unknown === 0,
              cmsHealthy: emptyCriticalSlotsCount === 0 && expiredContentsCount === 0,
              noManualAttentionNeeded: manualAttentionCount === 0,
            },
          },
          lastUpdatedAt: new Date().toISOString(),
        },
        thresholdSec: parseInt(thresholdSec as string, 10),
      };

      res.json(response);
    } catch (error: any) {
      console.error('Failed to get ops metrics:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  return router;
}

/**
 * Determine overall health status based on metrics
 */
function getOverallHealthStatus(
  channelCounts: { total: number; online: number; offline: number; maintenance: number; unknown: number },
  emptyCritical: number,
  expiredContents: number
): 'healthy' | 'warning' | 'critical' {
  // Critical: Any offline channels or empty critical slots
  if (channelCounts.offline > 0 || emptyCritical > 0) {
    return 'critical';
  }

  // Warning: Unknown channels or expired content
  if (channelCounts.unknown > 0 || expiredContents > 0) {
    return 'warning';
  }

  return 'healthy';
}
