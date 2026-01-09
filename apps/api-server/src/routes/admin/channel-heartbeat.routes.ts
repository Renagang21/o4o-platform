/**
 * Admin Channel Heartbeat Routes
 *
 * WO-P5-CHANNEL-HEARTBEAT-P1: Admin API for viewing channel health status
 *
 * Endpoints:
 * - GET /api/v1/admin/channels/heartbeat - List heartbeats with filters
 * - GET /api/v1/admin/channels/heartbeat/status - Get current online status for all channels
 * - GET /api/v1/admin/channels/heartbeat/:channelId - Get heartbeat history for a channel
 */

import { Router, Request, Response } from 'express';
import { DataSource, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Channel, ChannelHeartbeat } from '@o4o-apps/cms-core';
import { requireAdmin } from '../../middleware/auth.middleware.js';

// Default heartbeat threshold in seconds (2 minutes)
const DEFAULT_HEARTBEAT_THRESHOLD_SEC = 120;

/**
 * Create Admin Channel Heartbeat routes
 */
export function createAdminHeartbeatRoutes(dataSource: DataSource): Router {
  const router = Router();

  /**
   * GET /admin/channels/heartbeat
   * List heartbeats with filters
   *
   * Query params:
   * - channelId: Filter by channel
   * - serviceKey: Filter by service
   * - organizationId: Filter by organization
   * - from: Start date (ISO string)
   * - to: End date (ISO string)
   * - limit: Max items (default: 100)
   * - offset: Pagination offset (default: 0)
   */
  router.get('/', requireAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        channelId,
        serviceKey,
        organizationId,
        from,
        to,
        limit = '100',
        offset = '0',
      } = req.query;

      const heartbeatRepo = dataSource.getRepository(ChannelHeartbeat);

      // Build where clause
      const where: any = {};

      if (channelId) {
        where.channelId = channelId as string;
      }
      if (serviceKey) {
        where.serviceKey = serviceKey as string;
      }
      if (organizationId) {
        where.organizationId = organizationId as string;
      }

      // Date range filtering
      if (from && to) {
        where.receivedAt = Between(new Date(from as string), new Date(to as string));
      } else if (from) {
        where.receivedAt = MoreThanOrEqual(new Date(from as string));
      } else if (to) {
        where.receivedAt = LessThanOrEqual(new Date(to as string));
      }

      const [heartbeats, total] = await heartbeatRepo.findAndCount({
        where,
        order: { receivedAt: 'DESC' },
        take: Math.min(parseInt(limit as string, 10), 1000), // Cap at 1000
        skip: parseInt(offset as string, 10),
      });

      res.json({
        success: true,
        data: heartbeats,
        pagination: {
          total,
          limit: parseInt(limit as string, 10),
          offset: parseInt(offset as string, 10),
        },
      });
    } catch (error: any) {
      console.error('Failed to list heartbeats:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * GET /admin/channels/heartbeat/status
   * Get current online status for all channels
   *
   * Query params:
   * - serviceKey: Filter by service
   * - organizationId: Filter by organization
   * - thresholdSec: Custom online threshold (default: 120 seconds)
   */
  router.get('/status', requireAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        serviceKey,
        organizationId,
        thresholdSec = String(DEFAULT_HEARTBEAT_THRESHOLD_SEC),
      } = req.query;

      const channelRepo = dataSource.getRepository(Channel);
      const heartbeatRepo = dataSource.getRepository(ChannelHeartbeat);

      // Build channel query
      const channelWhere: any = {};
      if (serviceKey) {
        channelWhere.serviceKey = serviceKey as string;
      }
      if (organizationId) {
        channelWhere.organizationId = organizationId as string;
      }

      // Get all channels
      const channels = await channelRepo.find({ where: channelWhere });

      const threshold = parseInt(thresholdSec as string, 10) * 1000;
      const now = Date.now();

      // Get latest heartbeat for each channel
      const statusResults = await Promise.all(
        channels.map(async (channel) => {
          const latestHeartbeat = await heartbeatRepo.findOne({
            where: { channelId: channel.id },
            order: { receivedAt: 'DESC' },
          });

          let onlineStatus: 'online' | 'offline' | 'unknown' = 'unknown';
          let lastSeenAt: Date | null = null;
          let playerInfo: Record<string, any> | null = null;

          if (latestHeartbeat) {
            lastSeenAt = latestHeartbeat.receivedAt;
            const timeSinceLastHeartbeat = now - latestHeartbeat.receivedAt.getTime();
            onlineStatus = timeSinceLastHeartbeat <= threshold ? 'online' : 'offline';
            playerInfo = {
              playerVersion: latestHeartbeat.playerVersion,
              deviceType: latestHeartbeat.deviceType,
              platform: latestHeartbeat.platform,
              ipAddress: latestHeartbeat.ipAddress,
              uptimeSec: latestHeartbeat.uptimeSec,
            };
          }

          return {
            channelId: channel.id,
            channelName: channel.name,
            channelCode: channel.code,
            channelType: channel.type,
            channelStatus: channel.status,
            onlineStatus,
            lastSeenAt,
            playerInfo,
          };
        })
      );

      // Summary stats
      const summary = {
        total: statusResults.length,
        online: statusResults.filter((r) => r.onlineStatus === 'online').length,
        offline: statusResults.filter((r) => r.onlineStatus === 'offline').length,
        unknown: statusResults.filter((r) => r.onlineStatus === 'unknown').length,
      };

      res.json({
        success: true,
        data: statusResults,
        summary,
        thresholdSec: parseInt(thresholdSec as string, 10),
        checkedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Failed to get channel status:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * GET /admin/channels/heartbeat/:channelId
   * Get heartbeat history for a specific channel
   *
   * Query params:
   * - from: Start date (ISO string)
   * - to: End date (ISO string)
   * - limit: Max items (default: 50)
   */
  router.get('/:channelId', requireAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
      const { channelId } = req.params;
      const {
        from,
        to,
        limit = '50',
        thresholdSec = String(DEFAULT_HEARTBEAT_THRESHOLD_SEC),
      } = req.query;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(channelId)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ID', message: 'Invalid channel ID format' },
        });
        return;
      }

      const channelRepo = dataSource.getRepository(Channel);
      const heartbeatRepo = dataSource.getRepository(ChannelHeartbeat);

      // Get channel info
      const channel = await channelRepo.findOne({ where: { id: channelId } });
      if (!channel) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Channel not found' },
        });
        return;
      }

      // Build where clause
      const where: any = { channelId };

      if (from && to) {
        where.receivedAt = Between(new Date(from as string), new Date(to as string));
      } else if (from) {
        where.receivedAt = MoreThanOrEqual(new Date(from as string));
      } else if (to) {
        where.receivedAt = LessThanOrEqual(new Date(to as string));
      }

      // Get heartbeat history
      const heartbeats = await heartbeatRepo.find({
        where,
        order: { receivedAt: 'DESC' },
        take: Math.min(parseInt(limit as string, 10), 500),
      });

      // Calculate current online status
      const threshold = parseInt(thresholdSec as string, 10) * 1000;
      const now = Date.now();
      let onlineStatus: 'online' | 'offline' | 'unknown' = 'unknown';

      if (heartbeats.length > 0) {
        const timeSinceLastHeartbeat = now - heartbeats[0].receivedAt.getTime();
        onlineStatus = timeSinceLastHeartbeat <= threshold ? 'online' : 'offline';
      }

      res.json({
        success: true,
        channel: {
          id: channel.id,
          name: channel.name,
          code: channel.code,
          type: channel.type,
          status: channel.status,
        },
        onlineStatus,
        lastHeartbeat: heartbeats[0] || null,
        history: heartbeats,
        thresholdSec: parseInt(thresholdSec as string, 10),
      });
    } catch (error: any) {
      console.error('Failed to get channel heartbeat history:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  return router;
}
