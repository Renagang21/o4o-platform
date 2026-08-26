/**
 * Channel Routes
 *
 * WO-P4-CHANNEL-IMPLEMENT-P0: Channel API endpoints
 *
 * Channel represents "where CMS content is displayed" - the output context
 * that connects CMS Slots to physical/virtual destinations (TV, kiosk, web, signage).
 *
 * Endpoints:
 * - GET /api/v1/channels/health - Health check (must stay above /:id)
 * - GET /api/v1/channels - List channels (serviceKey 필수 / platform admin 만 cross-service)
 * - GET /api/v1/channels/:id - Get channel by ID
 * - GET /api/v1/channels/code/:code - Get channel by code
 * - POST /api/v1/channels - Create channel (admin)
 * - PUT /api/v1/channels/:id - Update channel (admin)
 * - PATCH /api/v1/channels/:id/status - Update status (admin)
 * - DELETE /api/v1/channels/:id - Delete channel (admin)
 * - GET /api/v1/channels/:id/contents - Get current contents for channel
 */

// WO-O4O-TRUSTED-CLIENT-IP-AND-SECURITY-LOG-REDACTION-V1
import { getTrustedClientIp } from '../../utils/trusted-client-ip.js';
import { Router, Request, Response } from 'express';
import { DataSource, In } from 'typeorm';
import { Channel, ChannelType, ChannelStatus, CmsContent, CmsContentSlot, ChannelPlaybackLog, ChannelHeartbeat } from '@o4o-apps/cms-core';
import { optionalAuth, requireAdmin } from '../../middleware/auth.middleware.js';
// WO-O4O-CHANNELS-SERVICEKEY-CANONICAL-SCOPE-ALIGNMENT-V1
//   channels.serviceKey 는 CMS ledger service key 다(= slot.serviceKey 와 같은 축).
//   따라서 canonical/alias 해석은 CMS read 경계가 이미 쓰는 helper 를 그대로 쓴다.
//   여기서 ['kpa-society','kpa'] 같은 로컬 alias 배열을 새로 만들지 않는다.
import { resolveCanonicalServiceKey } from '@o4o/security-core';
import {
  resolveCmsServiceKeys,
  resolveCmsReadScope,
  CMS_SERVICE_KEY_REQUIRED_ERROR,
} from '../cms-content/cms-content-utils.js';
// WO-O4O-CHANNELS-SERVICE-SCOPED-AUTHORIZATION-CONTRACT-V1
//   channel 목록(enumeration)의 read 경계 판정 근거는 CMS read 경계와 **같은 한 벌**을 쓴다.
//   platform admin 판정은 roleAssignmentService(RBAC SSOT)로만 하고
//   `serviceKey 없음 = admin` 같은 암묵적 bypass 를 만들지 않는다 (WO §8).
import { roleAssignmentService } from '../../modules/auth/services/role-assignment.service.js';

// Valid channel types
const VALID_CHANNEL_TYPES: ChannelType[] = ['tv', 'kiosk', 'signage', 'web'];

// Valid channel statuses
const VALID_CHANNEL_STATUSES: ChannelStatus[] = ['active', 'inactive', 'maintenance'];

// Valid orientations
const VALID_ORIENTATIONS = ['landscape', 'portrait'];

/**
 * WO-O4O-CHANNEL-CODE-DATABASE-UNIQUENESS-INTEGRITY-V1
 *
 * `channels.code` 의 부분 유니크 인덱스 이름(migration 20270319000000).
 * 사전 검사(findOne)와 INSERT 사이의 경쟁 상태에서는 DB 가 유일성을 막는다.
 * 그 위반을 기존 API 계약인 409 DUPLICATE_CODE 로 수렴시키기 위한 식별자다.
 */
const CHANNEL_CODE_UNIQUE_INDEX = 'UQ_channels_code';

/**
 * unique violation(23505) 중 **channels.code 제약** 인 경우에만 true.
 *
 * 모든 23505 를 DUPLICATE_CODE 로 바꾸면 다른 유니크 제약 위반까지 잘못된 업무 오류로
 * 둔갑한다. constraint 이름으로 정확히 좁힌다. TypeORM 은 driver 오류를 wrap 하므로
 * 양쪽(err, err.driverError)을 모두 본다.
 */
export function isChannelCodeDuplicateViolation(err: unknown): boolean {
  const e = err as {
    code?: string;
    constraint?: string;
    driverError?: { code?: string; constraint?: string };
  };
  const code = e?.code ?? e?.driverError?.code;
  const constraint = e?.constraint ?? e?.driverError?.constraint;
  return code === '23505' && constraint === CHANNEL_CODE_UNIQUE_INDEX;
}

/**
 * Create Channel routes
 */
export function createChannelRoutes(dataSource: DataSource): Router {
  const router = Router();

  /**
   * GET /channels/health
   * Health check endpoint
   *
   * WO-O4O-CHANNELS-TYPEORM-ENTITY-REGISTRATION-AND-RUNTIME-CLOSURE-V1:
   *   이 라우트는 반드시 '/:id' 보다 먼저 선언되어야 한다. 아래쪽에 두면
   *   router.get('/:id') 가 먼저 매칭되어 /channels/health 가 400 INVALID_ID 로 응답한다.
   */
  router.get('/health', (req: Request, res: Response): void => {
    res.json({
      status: 'ok',
      service: 'channels',
      timestamp: new Date().toISOString(),
    });
  });

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
      // WO-O4O-CHANNELS-SERVICE-SCOPED-AUTHORIZATION-CONTRACT-V1 §13:
      //   목록은 **enumeration** 이다. serviceKey 없이 전 서비스 channel 을 익명에게
      //   돌려주던 동작을 닫는다. 판정은 CMS read 경계와 동일한 helper 한 벌로 한다.
      //     serviceKey 주어짐            → 그 서비스(+alias)로 제한 (platform admin 도 동일)
      //     serviceKey 없음 + platform admin → cross-service 유지 (역할 근거)
      //     serviceKey 없음 + 그 외      → 400 SERVICE_KEY_REQUIRED (기존 CMS 에러 계약 재사용)
      //   단건 조회(/:id, /code/:code, /:id/contents)는 device-addressed public read 로
      //   기존 계약을 그대로 유지한다 — signage player 는 serviceKey 를 갖지 않는다.
      const scope = await resolveCmsReadScope({
        user: (req as any).user,
        serviceKey,
        roleChecker: roleAssignmentService,
        onError: (message) => console.warn('[Channels] platform admin role check failed:', message),
      });
      if (!scope.ok) {
        res.status(400).json(CMS_SERVICE_KEY_REQUIRED_ERROR);
        return;
      }

      const where: any = {};
      if (scope.serviceKeys) {
        // alias 입력('kpa')과 canonical 입력('kpa-society')이 같은 모집단을 반환해야 한다.
        where.serviceKey = In(scope.serviceKeys);
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
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
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

      // WO-O4O-SIGNAGE-PLAYER-CHANNEL-CODE-LOOKUP-CONTRACT-CLOSURE-V1 §13:
      //   code 는 platform-global 식별자다 — 생성/수정 시 serviceKey 무관하게
      //   중복을 거부한다(409 DUPLICATE_CODE). 다만 DB unique constraint 는 아직 없어
      //   경쟁 조건으로 중복 row 가 생기면 findOne 이 임의의 한 건을 돌려준다.
      //   exact lookup 이 호출마다 다른 채널을 재생시키지 않도록 **가장 오래된 행**으로
      //   고정한다(중복 방지 정책상 원본이 먼저 만들어진 행이다).
      //   unique constraint 추가는 이 WO 범위 밖(§30).
      const channel = await channelRepo.findOne({
        where: { code },
        order: { createdAt: 'ASC' },
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
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
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
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
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
        // 신규 write 는 항상 canonical ledger key 로 저장한다(role prefix 저장 금지).
        serviceKey: serviceKey ? resolveCanonicalServiceKey(String(serviceKey)) : null,
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
      // WO-O4O-CHANNEL-CODE-DATABASE-UNIQUENESS-INTEGRITY-V1 §16:
      //   사전 검사를 통과했더라도 동시 요청이면 DB 유니크 인덱스가 INSERT 를 막는다.
      //   그 경우 500 이나 Postgres 원문이 아니라 기존 계약인 409 DUPLICATE_CODE 로 응답한다.
      if (isChannelCodeDuplicateViolation(error)) {
        res.status(409).json({
          success: false,
          error: { code: 'DUPLICATE_CODE', message: 'A channel with this code already exists' },
        });
        return;
      }
      console.error('Failed to create channel:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
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
      if (serviceKey !== undefined) channel.serviceKey = serviceKey ? resolveCanonicalServiceKey(String(serviceKey)) : null;
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
      // WO-O4O-CHANNEL-CODE-DATABASE-UNIQUENESS-INTEGRITY-V1 §16
      if (isChannelCodeDuplicateViolation(error)) {
        res.status(409).json({
          success: false,
          error: { code: 'DUPLICATE_CODE', message: 'A channel with this code already exists' },
        });
        return;
      }
      console.error('Failed to update channel:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
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
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
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
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
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
        // 문자열 동등 비교는 alias 를 고립시킨다: canonical 채널('kpa-society')이
        // legacy slot('kpa', slotKey=intranet-hero)을 놓치고, 그 반대도 마찬가지다.
        // CMS slot 이 이미 alias 집합으로 같은 서비스를 인식하므로 여기서도 같은 집합을 쓴다.
        qb.andWhere('(slot.serviceKey IN (:...serviceKeys) OR slot.serviceKey IS NULL)', {
          serviceKeys: resolveCmsServiceKeys(channel.serviceKey),
        });
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
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
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
      // WO-O4O-TRUSTED-CLIENT-IP-AND-SECURITY-LOG-REDACTION-V1: XFF 첫 값 폴백 제거
      const ipAddress = getTrustedClientIp(req);

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

  return router;
}
