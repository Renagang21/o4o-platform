/**
 * Channel Routes
 *
 * WO-P4-CHANNEL-IMPLEMENT-P0: Channel API endpoints
 *
 * Channel represents "where CMS content is displayed" - the output context
 * that connects CMS Slots to physical/virtual destinations (TV, kiosk, web, signage).
 *
 * Endpoints:
 * - GET /api/v1/channels - List channels (with filters)
 * - GET /api/v1/channels/:id - Get channel by ID
 * - GET /api/v1/channels/code/:code - Get channel by code
 * - POST /api/v1/channels - Create channel (admin)
 * - PUT /api/v1/channels/:id - Update channel (admin)
 * - PATCH /api/v1/channels/:id/status - Update status (admin)
 * - DELETE /api/v1/channels/:id - Delete channel (admin)
 * - GET /api/v1/channels/:id/contents - Get current contents for channel
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { Channel, ChannelType, ChannelStatus, CmsContent, CmsContentSlot, ChannelPlaybackLog, ChannelHeartbeat } from '@o4o-apps/cms-core';
import { optionalAuth, requireAdmin } from '../../middleware/auth.middleware.js';

// Valid channel types
const VALID_CHANNEL_TYPES: ChannelType[] = ['tv', 'kiosk', 'signage', 'web'];

// Valid channel statuses
const VALID_CHANNEL_STATUSES: ChannelStatus[] = ['active', 'inactive', 'maintenance'];

// Valid orientations
const VALID_ORIENTATIONS = ['landscape', 'portrait'];

/**
 * Create Channel routes
 */
export function createChannelRoutes(dataSource: DataSource): Router {
  const router = Router();

  /**
   * GET /channels
   * List channels with optional filters
   *
   * Query params:
   * - serviceKey: Filter by service (glycopharm, kpa, etc.)
   * - organizationId: Filter by organization
   * - type: Filter by channel type (tv, kiosk, signage, web)
   * - status: Filter by status (active, inactive, maintenance)
   * - slotKey: Filter by connected slot
   * - limit: Max items (default: 50)
   * - offset: Pagination offset (default: 0)
   */
  router.get('/', optionalAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        serviceKey,
        organizationId,
        type,
        status,
        slotKey,
        limit = '50',
        offset = '0',
      } = req.query;

      const channelRepo = dataSource.getRepository(Channel);

      // Build where clause
      const where: any = {};
      if (serviceKey) {
        where.serviceKey = serviceKey as string;
      }
      if (organizationId) {
        where.organizationId = organizationId as string;
      }
      if (type) {
        where.type = type as ChannelType;
      }
      if (status) {
        where.status = status as ChannelStatus;
      }
      if (slotKey) {
        where.slotKey = slotKey as string;
      }

      const [channels, total] = await channelRepo.findAndCount({
        where,
        order: { name: 'ASC', createdAt: 'DESC' },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
      });

      res.json({
        success: true,
        data: channels,
        pagination: {
          total,
          limit: parseInt(limit as string, 10),
          offset: parseInt(offset as string, 10),
        },
      });
    } catch (error: any) {
      console.error('Failed to list channels:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * GET /channels/code/:code
   * Get channel by code (machine-readable identifier)
   */
  router.get('/code/:code', optionalAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.params;
      const channelRepo = dataSource.getRepository(Channel);

      const channel = await channelRepo.findOne({
        where: { code },
      });

      if (!channel) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Channel not found' },
        });
        return;
      }

      res.json({
        success: true,
        data: channel,
      });
    } catch (error: any) {
      console.error('Failed to get channel by code:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * GET /channels/:id
   * Get channel by ID
   */
  router.get('/:id', optionalAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // Check if it's a UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ID', message: 'Invalid channel ID format' },
        });
        return;
      }

      const channelRepo = dataSource.getRepository(Channel);

      const channel = await channelRepo.findOne({
        where: { id },
      });

      if (!channel) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Channel not found' },
        });
        return;
      }

      res.json({
        success: true,
        data: channel,
      });
    } catch (error: any) {
      console.error('Failed to get channel:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * POST /channels
   * Create a new channel (admin only)
   */
  router.post('/', requireAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        serviceKey,
        organizationId,
        name,
        code,
        description,
        type,
        slotKey,
        status = 'active',
        resolution,
        orientation = 'landscape',
        autoplay = true,
        refreshIntervalSec,
        defaultDurationSec = 10,
        location,
        metadata = {},
      } = req.body;

      // Validate required fields
      if (!name || !type || !slotKey) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'name, type, and slotKey are required' },
        });
        return;
      }

      // Validate type
      if (!VALID_CHANNEL_TYPES.includes(type)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: `type must be one of: ${VALID_CHANNEL_TYPES.join(', ')}` },
        });
        return;
      }

      // Validate status
      if (!VALID_CHANNEL_STATUSES.includes(status)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: `status must be one of: ${VALID_CHANNEL_STATUSES.join(', ')}` },
        });
        return;
      }

      // Validate orientation
      if (!VALID_ORIENTATIONS.includes(orientation)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: `orientation must be one of: ${VALID_ORIENTATIONS.join(', ')}` },
        });
        return;
      }

      const channelRepo = dataSource.getRepository(Channel);

      // Check code uniqueness if provided
      if (code) {
        const existing = await channelRepo.findOne({ where: { code } });
        if (existing) {
          res.status(409).json({
            success: false,
            error: { code: 'DUPLICATE_CODE', message: 'A channel with this code already exists' },
          });
          return;
        }
      }

      const channel = channelRepo.create({
        serviceKey: serviceKey || null,
        organizationId: organizationId || null,
        name,
        code: code || null,
        description: description || null,
        type: type as ChannelType,
        slotKey,
        status: status as ChannelStatus,
        resolution: resolution || null,
        orientation,
        autoplay,
        refreshIntervalSec: refreshIntervalSec || null,
        defaultDurationSec,
        location: location || null,
        metadata,
      });

      const saved = await channelRepo.save(channel);

      res.status(201).json({
        success: true,
        data: saved,
      });
    } catch (error: any) {
      console.error('Failed to create channel:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * PUT /channels/:id
   * Update a channel (admin only)
   */
  router.put('/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const {
        serviceKey,
        organizationId,
        name,
        code,
        description,
        type,
        slotKey,
        status,
        resolution,
        orientation,
        autoplay,
        refreshIntervalSec,
        defaultDurationSec,
        location,
        metadata,
      } = req.body;

      const channelRepo = dataSource.getRepository(Channel);

      const channel = await channelRepo.findOne({ where: { id } });
      if (!channel) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Channel not found' },
        });
        return;
      }

      // Validate type if provided
      if (type !== undefined && !VALID_CHANNEL_TYPES.includes(type)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: `type must be one of: ${VALID_CHANNEL_TYPES.join(', ')}` },
        });
        return;
      }

      // Validate status if provided
      if (status !== undefined && !VALID_CHANNEL_STATUSES.includes(status)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: `status must be one of: ${VALID_CHANNEL_STATUSES.join(', ')}` },
        });
        return;
      }

      // Validate orientation if provided
      if (orientation !== undefined && !VALID_ORIENTATIONS.includes(orientation)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: `orientation must be one of: ${VALID_ORIENTATIONS.join(', ')}` },
        });
        return;
      }

      // Check code uniqueness if being changed
      if (code !== undefined && code !== channel.code) {
        if (code) {
          const existing = await channelRepo.findOne({ where: { code } });
          if (existing) {
            res.status(409).json({
              success: false,
              error: { code: 'DUPLICATE_CODE', message: 'A channel with this code already exists' },
            });
            return;
          }
        }
      }

      // Update fields
      if (serviceKey !== undefined) channel.serviceKey = serviceKey;
      if (organizationId !== undefined) channel.organizationId = organizationId;
      if (name !== undefined) channel.name = name;
      if (code !== undefined) channel.code = code;
      if (description !== undefined) channel.description = description;
      if (type !== undefined) channel.type = type as ChannelType;
      if (slotKey !== undefined) channel.slotKey = slotKey;
      if (status !== undefined) channel.status = status as ChannelStatus;
      if (resolution !== undefined) channel.resolution = resolution;
      if (orientation !== undefined) channel.orientation = orientation;
      if (autoplay !== undefined) channel.autoplay = autoplay;
      if (refreshIntervalSec !== undefined) channel.refreshIntervalSec = refreshIntervalSec;
      if (defaultDurationSec !== undefined) channel.defaultDurationSec = defaultDurationSec;
      if (location !== undefined) channel.location = location;
      if (metadata !== undefined) channel.metadata = metadata;

      const updated = await channelRepo.save(channel);

      res.json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      console.error('Failed to update channel:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * PATCH /channels/:id/status
   * Update channel status only (admin only)
   */
  router.patch('/:id/status', requireAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !VALID_CHANNEL_STATUSES.includes(status)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: `status must be one of: ${VALID_CHANNEL_STATUSES.join(', ')}` },
        });
        return;
      }

      const channelRepo = dataSource.getRepository(Channel);

      const channel = await channelRepo.findOne({ where: { id } });
      if (!channel) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Channel not found' },
        });
        return;
      }

      channel.status = status as ChannelStatus;
      const updated = await channelRepo.save(channel);

      res.json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      console.error('Failed to update channel status:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * DELETE /channels/:id
   * Delete a channel (admin only)
   */
  router.delete('/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const channelRepo = dataSource.getRepository(Channel);

      const channel = await channelRepo.findOne({ where: { id } });
      if (!channel) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Channel not found' },
        });
        return;
      }

      await channelRepo.remove(channel);

      res.json({
        success: true,
        message: 'Channel deleted successfully',
      });
    } catch (error: any) {
      console.error('Failed to delete channel:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * GET /channels/:id/contents
   * Get current contents for a channel
   *
   * This is the KEY endpoint that connects Channel to CMS.
   *
   * Logic:
   * 1. Get channel by ID
   * 2. Read channel.slotKey
   * 3. Query CmsContentSlot WHERE:
   *    - slotKey = channel.slotKey
   *    - serviceKey = channel.serviceKey OR null
   *    - organizationId = channel.organizationId OR null
   *    - isActive = true
   *    - startsAt <= NOW() OR startsAt IS NULL
   *    - endsAt >= NOW() OR endsAt IS NULL
   * 4. Join CmsContent WHERE status = 'published'
   * 5. Order by sortOrder
   * 6. Return content list
   */
  router.get('/:id/contents', optionalAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const channelRepo = dataSource.getRepository(Channel);
      const slotRepo = dataSource.getRepository(CmsContentSlot);

      // 1. Get channel
      const channel = await channelRepo.findOne({ where: { id } });
      if (!channel) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Channel not found' },
        });
        return;
      }

      // 2. Check channel status
      if (channel.status !== 'active') {
        res.json({
          success: true,
          data: [],
          channel: {
            id: channel.id,
            name: channel.name,
            status: channel.status,
            slotKey: channel.slotKey,
          },
          meta: {
            message: `Channel is ${channel.status}`,
            total: 0,
          },
        });
        return;
      }

      // 3. Build query for slots
      const now = new Date();

      // We need to find slots that match:
      // - slotKey = channel.slotKey
      // - (serviceKey = channel.serviceKey OR serviceKey IS NULL)
      // - (organizationId = channel.organizationId OR organizationId IS NULL)
      // - isActive = true
      const qb = slotRepo.createQueryBuilder('slot')
        .leftJoinAndSelect('slot.content', 'content')
        .where('slot.slotKey = :slotKey', { slotKey: channel.slotKey })
        .andWhere('slot.isActive = true')
        .andWhere('content.status = :status', { status: 'published' });

      // Scope filtering: match channel's scope OR null (global)
      if (channel.serviceKey) {
        qb.andWhere('(slot.serviceKey = :serviceKey OR slot.serviceKey IS NULL)', { serviceKey: channel.serviceKey });
      } else {
        qb.andWhere('slot.serviceKey IS NULL');
      }

      if (channel.organizationId) {
        qb.andWhere('(slot.organizationId = :organizationId OR slot.organizationId IS NULL)', { organizationId: channel.organizationId });
      } else {
        qb.andWhere('slot.organizationId IS NULL');
      }

      // Time window filtering
      qb.andWhere('(slot.startsAt IS NULL OR slot.startsAt <= :now)', { now });
      qb.andWhere('(slot.endsAt IS NULL OR slot.endsAt >= :now)', { now });

      // Order by sortOrder
      qb.orderBy('slot.sortOrder', 'ASC');

      const slots = await qb.getMany();

      // 4. Build response with content items
      const contents = slots
        .filter(slot => slot.content)
        .map(slot => ({
          slotId: slot.id,
          sortOrder: slot.sortOrder,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          content: {
            id: slot.content!.id,
            type: slot.content!.type,
            title: slot.content!.title,
            summary: slot.content!.summary,
            body: slot.content!.body,
            imageUrl: slot.content!.imageUrl,
            linkUrl: slot.content!.linkUrl,
            linkText: slot.content!.linkText,
            metadata: slot.content!.metadata,
          },
        }));

      res.json({
        success: true,
        data: contents,
        channel: {
          id: channel.id,
          name: channel.name,
          code: channel.code,
          type: channel.type,
          status: channel.status,
          slotKey: channel.slotKey,
          serviceKey: channel.serviceKey,
          organizationId: channel.organizationId,
          resolution: channel.resolution,
          orientation: channel.orientation,
          autoplay: channel.autoplay,
          defaultDurationSec: channel.defaultDurationSec,
          refreshIntervalSec: channel.refreshIntervalSec,
        },
        meta: {
          total: contents.length,
          fetchedAt: now.toISOString(),
        },
      });
    } catch (error: any) {
      console.error('Failed to get channel contents:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * POST /channels/:id/playback-log
   * Record a playback event from signage player
   * WO-P5-CHANNEL-PLAYBACK-LOG-P0
   *
   * This endpoint receives playback logs from signage players.
   * No authentication required (Player 신뢰 기반).
   * Fire-and-forget: failures should not affect player operation.
   */
  router.post('/:id/playback-log', async (req: Request, res: Response): Promise<void> => {
    try {
      const { id: channelId } = req.params;
      const {
        contentId,
        durationSec,
        completed = true,
        playedAt,
      } = req.body;

      // Validate required fields
      if (!contentId || durationSec === undefined) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'contentId and durationSec are required' },
        });
        return;
      }

      // Validate UUID formats
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(channelId) || !uuidRegex.test(contentId)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid UUID format' },
        });
        return;
      }

      const channelRepo = dataSource.getRepository(Channel);
      const logRepo = dataSource.getRepository(ChannelPlaybackLog);

      // Get channel to capture serviceKey and organizationId
      const channel = await channelRepo.findOne({ where: { id: channelId } });
      if (!channel) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Channel not found' },
        });
        return;
      }

      // Create playback log
      const log = logRepo.create({
        channelId,
        contentId,
        serviceKey: channel.serviceKey,
        organizationId: channel.organizationId,
        playedAt: playedAt ? new Date(playedAt) : new Date(),
        durationSec: parseInt(String(durationSec), 10),
        completed: Boolean(completed),
        source: 'signage-web',
      });

      await logRepo.save(log);

      res.status(201).json({
        success: true,
        data: { id: log.id },
      });
    } catch (error: any) {
      console.error('Failed to create playback log:', error);
      // Return 200 anyway to not disrupt player operation
      res.status(200).json({
        success: false,
        error: { code: 'LOG_FAILED', message: 'Failed to record playback log' },
      });
    }
  });

  /**
   * POST /channels/:id/heartbeat
   * Record a heartbeat from signage player
   * WO-P5-CHANNEL-HEARTBEAT-P1
   *
   * This endpoint receives heartbeat signals from signage players
   * to track device health and online status.
   * No authentication required (Player 신뢰 기반).
   * Fire-and-forget: failures should not affect player operation.
   */
  router.post('/:id/heartbeat', async (req: Request, res: Response): Promise<void> => {
    try {
      const { id: channelId } = req.params;
      const {
        playerVersion,
        deviceType,
        platform,
        uptimeSec,
        metrics = {},
      } = req.body;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(channelId)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid channel ID format' },
        });
        return;
      }

      const channelRepo = dataSource.getRepository(Channel);
      const heartbeatRepo = dataSource.getRepository(ChannelHeartbeat);

      // Get channel to capture serviceKey and organizationId
      const channel = await channelRepo.findOne({ where: { id: channelId } });
      if (!channel) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Channel not found' },
        });
        return;
      }

      // Extract IP address from request
      const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString().split(',')[0] || null;

      // Create heartbeat record
      const heartbeat = heartbeatRepo.create({
        channelId,
        serviceKey: channel.serviceKey,
        organizationId: channel.organizationId,
        playerVersion: playerVersion || null,
        deviceType: deviceType || null,
        platform: platform || null,
        ipAddress,
        isOnline: true,
        uptimeSec: uptimeSec ? parseInt(String(uptimeSec), 10) : null,
        metrics: metrics || {},
      });

      await heartbeatRepo.save(heartbeat);

      res.status(201).json({
        success: true,
        data: { id: heartbeat.id },
      });
    } catch (error: any) {
      console.error('Failed to record heartbeat:', error);
      // Return 200 anyway to not disrupt player operation
      res.status(200).json({
        success: false,
        error: { code: 'HEARTBEAT_FAILED', message: 'Failed to record heartbeat' },
      });
    }
  });

  /**
   * GET /channels/health
   * Health check endpoint
   */
  router.get('/health', (req: Request, res: Response): void => {
    res.json({
      status: 'ok',
      service: 'channels',
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
