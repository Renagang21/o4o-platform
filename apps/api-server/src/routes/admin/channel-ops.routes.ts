/**
 * Admin Channel Operations Routes
 *
 * WO-P6-CHANNEL-OPS-DASHBOARD-P0: Admin API for channel operations dashboard
 *
 * Endpoints:
 * - GET /api/v1/admin/channels/ops - Get channel operations status overview
 * - GET /api/v1/admin/channels/ops/:channelId - Get detailed ops info for a channel
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { Channel, ChannelHeartbeat, ChannelPlaybackLog } from '@o4o-apps/cms-core';
import { requireAdmin } from '../../middleware/auth.middleware.js';

// Default heartbeat threshold in seconds (2 minutes)
const DEFAULT_HEARTBEAT_THRESHOLD_SEC = 120;

// Online status types
type OnlineStatus = 'ONLINE' | 'OFFLINE' | 'MAINTENANCE' | 'UNKNOWN';

/**
 * Determine online status based on heartbeat and channel status
 */
function determineOnlineStatus(
  channelStatus: string,
  lastHeartbeatAt: Date | null,
  thresholdMs: number
): OnlineStatus {
  // Maintenance takes priority
  if (channelStatus === 'maintenance') {
    return 'MAINTENANCE';
  }

  // No heartbeat = unknown
  if (!lastHeartbeatAt) {
    return 'UNKNOWN';
  }

  // Check heartbeat freshness
  const timeSinceHeartbeat = Date.now() - lastHeartbeatAt.getTime();
  return timeSinceHeartbeat <= thresholdMs ? 'ONLINE' : 'OFFLINE';
}

/**
 * Create Admin Channel Ops routes
 */
export function createAdminChannelOpsRoutes(dataSource: DataSource): Router {
  const router = Router();

  /**
   * GET /admin/channels/ops
   * Get channel operations status overview
   *
   * Query params:
   * - serviceKey: Filter by service
   * - organizationId: Filter by organization
   * - type: Filter by channel type
   * - status: Filter by online status (ONLINE, OFFLINE, MAINTENANCE, UNKNOWN)
   * - thresholdSec: Custom online threshold (default: 120 seconds)
   */
  router.get('/', requireAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        serviceKey,
        organizationId,
        type,
        status: statusFilter,
        thresholdSec = String(DEFAULT_HEARTBEAT_THRESHOLD_SEC),
      } = req.query;

      const channelRepo = dataSource.getRepository(Channel);
      const heartbeatRepo = dataSource.getRepository(ChannelHeartbeat);
      const playbackLogRepo = dataSource.getRepository(ChannelPlaybackLog);

      // Build channel query
      const channelWhere: any = {};
      if (serviceKey) {
        channelWhere.serviceKey = serviceKey as string;
      }
      if (organizationId) {
        channelWhere.organizationId = organizationId as string;
      }
      if (type) {
        channelWhere.type = type as string;
      }

      // Get all channels
      const channels = await channelRepo.find({
        where: channelWhere,
        order: { name: 'ASC' },
      });

      const thresholdMs = parseInt(thresholdSec as string, 10) * 1000;

      // Build ops data for each channel
      const opsData = await Promise.all(
        channels.map(async (channel) => {
          // Get latest heartbeat
          const latestHeartbeat = await heartbeatRepo.findOne({
            where: { channelId: channel.id },
            order: { receivedAt: 'DESC' },
          });

          // Get latest playback log
          const latestPlayback = await playbackLogRepo.findOne({
            where: { channelId: channel.id },
            order: { playedAt: 'DESC' },
          });

          // Determine online status
          const onlineStatus = determineOnlineStatus(
            channel.status,
            latestHeartbeat?.receivedAt || null,
            thresholdMs
          );

          return {
            channelId: channel.id,
            name: channel.name,
            code: channel.code,
            type: channel.type,
            serviceKey: channel.serviceKey,
            organizationId: channel.organizationId,
            channelStatus: channel.status,
            onlineStatus,
            slotKey: channel.slotKey,
            location: channel.location,
            resolution: channel.resolution,
            orientation: channel.orientation,
            // Heartbeat info
            lastHeartbeatAt: latestHeartbeat?.receivedAt || null,
            uptimeSec: latestHeartbeat?.uptimeSec || null,
            playerVersion: latestHeartbeat?.playerVersion || null,
            deviceType: latestHeartbeat?.deviceType || null,
            platform: latestHeartbeat?.platform || null,
            ipAddress: latestHeartbeat?.ipAddress || null,
            // Playback info
            lastPlayedContent: latestPlayback
              ? {
                  contentId: latestPlayback.contentId,
                  playedAt: latestPlayback.playedAt,
                  durationSec: latestPlayback.durationSec,
                  completed: latestPlayback.completed,
                }
              : null,
          };
        })
      );

      // Apply status filter if provided
      let filteredData = opsData;
      if (statusFilter) {
        filteredData = opsData.filter((d) => d.onlineStatus === statusFilter);
      }

      // Calculate summary
      const summary = {
        total: opsData.length,
        online: opsData.filter((d) => d.onlineStatus === 'ONLINE').length,
        offline: opsData.filter((d) => d.onlineStatus === 'OFFLINE').length,
        maintenance: opsData.filter((d) => d.onlineStatus === 'MAINTENANCE').length,
        unknown: opsData.filter((d) => d.onlineStatus === 'UNKNOWN').length,
      };

      res.json({
        success: true,
        data: filteredData,
        summary,
        thresholdSec: parseInt(thresholdSec as string, 10),
        checkedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Failed to get channel ops data:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * GET /admin/channels/ops/:channelId
   * Get detailed ops info for a specific channel
   *
   * Query params:
   * - thresholdSec: Custom online threshold (default: 120 seconds)
   * - playbackLimit: Number of recent playback logs (default: 10)
   * - heartbeatLimit: Number of recent heartbeats (default: 10)
   */
  router.get('/:channelId', requireAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
      const { channelId } = req.params;
      const {
        thresholdSec = String(DEFAULT_HEARTBEAT_THRESHOLD_SEC),
        playbackLimit = '10',
        heartbeatLimit = '10',
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
      const playbackLogRepo = dataSource.getRepository(ChannelPlaybackLog);

      // Get channel
      const channel = await channelRepo.findOne({ where: { id: channelId } });
      if (!channel) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Channel not found' },
        });
        return;
      }

      // Get recent heartbeats
      const recentHeartbeats = await heartbeatRepo.find({
        where: { channelId },
        order: { receivedAt: 'DESC' },
        take: parseInt(heartbeatLimit as string, 10),
      });

      // Get recent playback logs
      const recentPlaybacks = await playbackLogRepo.find({
        where: { channelId },
        order: { playedAt: 'DESC' },
        take: parseInt(playbackLimit as string, 10),
      });

      const thresholdMs = parseInt(thresholdSec as string, 10) * 1000;
      const latestHeartbeat = recentHeartbeats[0] || null;

      // Determine online status
      const onlineStatus = determineOnlineStatus(
        channel.status,
        latestHeartbeat?.receivedAt || null,
        thresholdMs
      );

      res.json({
        success: true,
        data: {
          // Channel info
          channel: {
            id: channel.id,
            name: channel.name,
            code: channel.code,
            type: channel.type,
            status: channel.status,
            serviceKey: channel.serviceKey,
            organizationId: channel.organizationId,
            slotKey: channel.slotKey,
            location: channel.location,
            resolution: channel.resolution,
            orientation: channel.orientation,
            autoplay: channel.autoplay,
            defaultDurationSec: channel.defaultDurationSec,
            refreshIntervalSec: channel.refreshIntervalSec,
            metadata: channel.metadata,
            createdAt: channel.createdAt,
            updatedAt: channel.updatedAt,
          },
          // Online status
          onlineStatus,
          // Latest heartbeat summary
          latestHeartbeat: latestHeartbeat
            ? {
                receivedAt: latestHeartbeat.receivedAt,
                playerVersion: latestHeartbeat.playerVersion,
                deviceType: latestHeartbeat.deviceType,
                platform: latestHeartbeat.platform,
                ipAddress: latestHeartbeat.ipAddress,
                uptimeSec: latestHeartbeat.uptimeSec,
                metrics: latestHeartbeat.metrics,
              }
            : null,
          // Recent heartbeats
          recentHeartbeats: recentHeartbeats.map((h) => ({
            id: h.id,
            receivedAt: h.receivedAt,
            uptimeSec: h.uptimeSec,
            isOnline: h.isOnline,
          })),
          // Recent playbacks
          recentPlaybacks: recentPlaybacks.map((p) => ({
            id: p.id,
            contentId: p.contentId,
            playedAt: p.playedAt,
            durationSec: p.durationSec,
            completed: p.completed,
          })),
        },
        thresholdSec: parseInt(thresholdSec as string, 10),
        checkedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Failed to get channel ops detail:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  return router;
}
