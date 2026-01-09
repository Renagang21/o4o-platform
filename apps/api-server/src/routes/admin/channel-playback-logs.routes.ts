/**
 * Admin Channel Playback Logs Routes
 *
 * WO-P5-CHANNEL-PLAYBACK-LOG-P0: Admin API for viewing playback logs
 *
 * Endpoints:
 * - GET /api/v1/admin/channel-playback-logs - List playback logs with filters
 * - GET /api/v1/admin/channel-playback-logs/:id - Get single log entry
 */

import { Router, Request, Response } from 'express';
import { DataSource, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { ChannelPlaybackLog } from '@o4o-apps/cms-core';
import { requireAdmin } from '../../middleware/auth.middleware.js';

/**
 * Create Admin Channel Playback Logs routes
 */
export function createAdminPlaybackLogRoutes(dataSource: DataSource): Router {
  const router = Router();

  /**
   * GET /admin/channel-playback-logs
   * List playback logs with filters
   *
   * Query params:
   * - channelId: Filter by channel
   * - contentId: Filter by content
   * - serviceKey: Filter by service
   * - organizationId: Filter by organization
   * - from: Start date (ISO string)
   * - to: End date (ISO string)
   * - completed: Filter by completion status (true/false)
   * - limit: Max items (default: 100)
   * - offset: Pagination offset (default: 0)
   */
  router.get('/', requireAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        channelId,
        contentId,
        serviceKey,
        organizationId,
        from,
        to,
        completed,
        limit = '100',
        offset = '0',
      } = req.query;

      const logRepo = dataSource.getRepository(ChannelPlaybackLog);

      // Build where clause
      const where: any = {};

      if (channelId) {
        where.channelId = channelId as string;
      }
      if (contentId) {
        where.contentId = contentId as string;
      }
      if (serviceKey) {
        where.serviceKey = serviceKey as string;
      }
      if (organizationId) {
        where.organizationId = organizationId as string;
      }
      if (completed !== undefined) {
        where.completed = completed === 'true';
      }

      // Date range filtering
      if (from && to) {
        where.playedAt = Between(new Date(from as string), new Date(to as string));
      } else if (from) {
        where.playedAt = MoreThanOrEqual(new Date(from as string));
      } else if (to) {
        where.playedAt = LessThanOrEqual(new Date(to as string));
      }

      const [logs, total] = await logRepo.findAndCount({
        where,
        order: { playedAt: 'DESC' },
        take: Math.min(parseInt(limit as string, 10), 1000), // Cap at 1000
        skip: parseInt(offset as string, 10),
      });

      res.json({
        success: true,
        data: logs,
        pagination: {
          total,
          limit: parseInt(limit as string, 10),
          offset: parseInt(offset as string, 10),
        },
      });
    } catch (error: any) {
      console.error('Failed to list playback logs:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * GET /admin/channel-playback-logs/:id
   * Get single playback log entry
   */
  router.get('/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ID', message: 'Invalid log ID format' },
        });
        return;
      }

      const logRepo = dataSource.getRepository(ChannelPlaybackLog);

      const log = await logRepo.findOne({ where: { id } });
      if (!log) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Playback log not found' },
        });
        return;
      }

      res.json({
        success: true,
        data: log,
      });
    } catch (error: any) {
      console.error('Failed to get playback log:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * GET /admin/channel-playback-logs/stats/summary
   * Get summary statistics for playback logs
   */
  router.get('/stats/summary', requireAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
      const { channelId, serviceKey, from, to } = req.query;

      const logRepo = dataSource.getRepository(ChannelPlaybackLog);

      // Build base query
      const qb = logRepo.createQueryBuilder('log')
        .select('COUNT(*)', 'totalPlays')
        .addSelect('SUM(log.durationSec)', 'totalDurationSec')
        .addSelect('COUNT(DISTINCT log.channelId)', 'uniqueChannels')
        .addSelect('COUNT(DISTINCT log.contentId)', 'uniqueContents');

      if (channelId) {
        qb.andWhere('log.channelId = :channelId', { channelId });
      }
      if (serviceKey) {
        qb.andWhere('log.serviceKey = :serviceKey', { serviceKey });
      }
      if (from) {
        qb.andWhere('log.playedAt >= :from', { from: new Date(from as string) });
      }
      if (to) {
        qb.andWhere('log.playedAt <= :to', { to: new Date(to as string) });
      }

      const result = await qb.getRawOne();

      res.json({
        success: true,
        data: {
          totalPlays: parseInt(result.totalPlays, 10) || 0,
          totalDurationSec: parseInt(result.totalDurationSec, 10) || 0,
          uniqueChannels: parseInt(result.uniqueChannels, 10) || 0,
          uniqueContents: parseInt(result.uniqueContents, 10) || 0,
        },
      });
    } catch (error: any) {
      console.error('Failed to get playback stats:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  return router;
}
