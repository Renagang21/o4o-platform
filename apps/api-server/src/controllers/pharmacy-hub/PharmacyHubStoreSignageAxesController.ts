/**
 * Pharmacy-Hub Store Owner Signage — 미디어 · 편성(스케줄) 축
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §8 (audit #69 · #70)
 *
 *   GET    /store-owner/signage/media                내 동영상 목록
 *   POST   /store-owner/signage/media                동영상 등록 (YouTube · Vimeo)
 *   PATCH  /store-owner/signage/media/:id            수정
 *   DELETE /store-owner/signage/media/:id            삭제(soft)
 *   GET    /store-owner/signage/schedules            편성 목록
 *   POST   /store-owner/signage/schedules            편성 생성
 *   PATCH  /store-owner/signage/schedules/:id        편성 수정
 *   DELETE /store-owner/signage/schedules/:id        편성 삭제(soft)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 새 엔진·새 테이블 0
 *
 *   원장은 KPA·GlycoPharm 이 쓰는 것과 **같은** `signage_media` · `signage_schedules` 다.
 *   저장·검증도 공통 `SignageMediaService` / `SignageScheduleService` 를 그대로 호출한다
 *   (serviceKey 분기 0 — scope 는 `{ serviceKey: 'pharmacy-hub', organizationId }` 값으로만 다르다).
 *
 * 조직 계약
 *   다른 Pharmacy-Hub 매장 컨트롤러와 동일하다 — 매장은 **서버가** 결정하고
 *   클라이언트의 organizationId 는 받지 않는다. 공통 `/api/signage/:serviceKey/*` 라우트는
 *   `X-Organization-Id` 를 클라이언트에서 받는 축이라 PH 의 이 계약과 맞지 않아 재사용하지 않는다
 *   (서비스 분기가 아니라 **조직 해석 경로**의 차이다).
 *
 * 편성이 참조하는 재생 목록
 *   PH 의 재생 단위는 `store_playlists` 이므로 `storePlaylistId` 축만 쓴다.
 *   공통 service 는 published + is_active 인 매장 재생 목록만 허용한다 —
 *   초안 재생 목록은 편성 대상이 아니며, 화면도 발행된 것만 선택지로 보여준다.
 */
import type { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import logger from '../../utils/logger.js';
import { SERVICE_KEYS } from '../../constants/service-keys.js';
import {
  resolvePharmacyHubStoreOrganization,
  type StoreOrgResolution,
} from './store-organization.resolver.js';
import { SignageMediaService } from '../../routes/signage/services/media.service.js';
import { SignageScheduleService } from '../../routes/signage/services/schedule.service.js';
import type { ScopeFilter } from '../../routes/signage/dto/index.js';

const SERVICE_KEY = SERVICE_KEYS.PHARMACY_HUB;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function mediaService(): SignageMediaService {
  return new SignageMediaService(AppDataSource);
}
function scheduleService(): SignageScheduleService {
  return new SignageScheduleService(AppDataSource);
}

function storeConnectionView(resolution: StoreOrgResolution) {
  return {
    status: resolution.status,
    candidateCount: resolution.candidateCount,
    errorCode: resolution.status === 'ambiguous' ? resolution.errorCode : null,
  };
}

function sendWriteBlocked(res: Response, resolution: StoreOrgResolution): void {
  if (resolution.status === 'not_connected') {
    res.status(409).json({
      success: false,
      error: '매장이 연결되어 있지 않아 사이니지를 관리할 수 없습니다.',
      code: 'STORE_NOT_CONNECTED',
    });
    return;
  }
  res.status(409).json({
    success: false,
    error: '연결된 매장이 여러 개입니다. 운영자에게 문의해 주세요.',
    code: 'AMBIGUOUS_STORE_CONNECTION',
  });
}

function getUserId(req: Request, res: Response): string | null {
  const userId = (req as any).user?.id;
  if (typeof userId !== 'string' || userId.length === 0) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return null;
  }
  return userId;
}

/** body 로 조직을 지목할 수 없다 — 조용히 무시하지 않고 명시적으로 거부한다. */
function rejectsOrganizationId(req: Request, res: Response): boolean {
  if (req.body && typeof req.body === 'object' && 'organizationId' in req.body) {
    res.status(400).json({
      success: false,
      error: '매장은 서버가 결정합니다. organizationId 는 보낼 수 없습니다.',
      code: 'FIELD_NOT_ACCEPTED',
    });
    return true;
  }
  return false;
}

function fail(res: Response, userId: string, op: string, error: unknown, message: string, code: string) {
  const status = (error as any)?.statusCode;
  const errCode = (error as any)?.code;
  if (typeof status === 'number' && typeof errCode === 'string') {
    return res.status(status).json({ success: false, error: (error as Error).message, code: errCode });
  }
  logger.error(`[PharmacyHubStoreSignageAxes] ${op} failed`, {
    userId,
    error: error instanceof Error ? error.message : String(error),
  });
  return res.status(500).json({ success: false, error: message, code });
}

/** 쓰기 진입 공통: 조직 해석 후 scope 를 만든다. 실패 시 응답을 이미 보낸 상태로 null. */
async function writeScope(req: Request, res: Response, userId: string): Promise<ScopeFilter | null> {
  if (rejectsOrganizationId(req, res)) return null;
  const resolution = await resolvePharmacyHubStoreOrganization(userId);
  if (resolution.status !== 'connected') {
    sendWriteBlocked(res, resolution);
    return null;
  }
  return { serviceKey: SERVICE_KEY, organizationId: resolution.organizationId };
}

/** 존재 여부를 흘리지 않는다 — 타 매장 자원도 동일하게 404. */
function notFound(res: Response, message: string, code: string) {
  return res.status(404).json({ success: false, error: message, code });
}

function toStringArray(raw: unknown): string[] | undefined {
  if (Array.isArray(raw)) return raw.filter((t): t is string => typeof t === 'string' && t.trim().length > 0);
  if (typeof raw === 'string' && raw.trim().length > 0) return [raw.trim()];
  return undefined;
}

export class PharmacyHubStoreSignageMediaController {
  /** GET /store-owner/signage/media */
  static async list(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;
    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      const storeConnection = storeConnectionView(resolution);
      if (resolution.status !== 'connected') {
        return res.json({ success: true, data: { storeConnection, items: [], total: 0 } });
      }
      const scope: ScopeFilter = { serviceKey: SERVICE_KEY, organizationId: resolution.organizationId };
      const result = await mediaService().getMediaList(
        {
          page: Number(req.query.page) || 1,
          limit: Math.min(Number(req.query.limit) || 50, 100),
          search: typeof req.query.search === 'string' ? req.query.search : undefined,
        },
        scope,
      );
      return res.json({
        success: true,
        data: { storeConnection, items: result.data, total: result.meta.total },
      });
    } catch (error) {
      return fail(res, userId, 'listMedia', error, '동영상을 불러오지 못했습니다.', 'SIGNAGE_MEDIA_LOAD_FAILED');
    }
  }

  /** POST /store-owner/signage/media — body: { name, sourceUrl, description?, tags? } */
  static async create(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;
    try {
      const scope = await writeScope(req, res, userId);
      if (!scope) return;

      const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
      const sourceUrl = typeof req.body?.sourceUrl === 'string' ? req.body.sourceUrl.trim() : '';
      if (!name || !sourceUrl) {
        return res.status(400).json({
          success: false,
          error: '이름과 동영상 주소를 입력해 주세요.',
          code: 'VALIDATION_ERROR',
        });
      }

      // sourceType 은 서버가 URL 로 판정한다 (공통 service 가 유튜브·비메오만 허용).
      const sourceType = /vimeo\./i.test(sourceUrl) ? 'vimeo' : 'youtube';
      const created = await mediaService().createMedia(
        {
          name,
          description: typeof req.body?.description === 'string' ? req.body.description : undefined,
          mediaType: 'video',
          sourceType,
          sourceUrl,
          tags: toStringArray(req.body?.tags) ?? ['매장'],
        },
        scope,
        userId,
      );
      return res.status(201).json({ success: true, data: created });
    } catch (error) {
      return fail(res, userId, 'createMedia', error, '동영상을 등록하지 못했습니다.', 'SIGNAGE_MEDIA_CREATE_FAILED');
    }
  }

  /** PATCH /store-owner/signage/media/:id */
  static async update(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;
    try {
      const id = String(req.params.id ?? '');
      if (!UUID_RE.test(id)) return notFound(res, '동영상을 찾을 수 없습니다.', 'SIGNAGE_MEDIA_NOT_FOUND');
      const scope = await writeScope(req, res, userId);
      if (!scope) return;

      const updated = await mediaService().updateMedia(
        id,
        {
          name: typeof req.body?.name === 'string' ? req.body.name : undefined,
          description: typeof req.body?.description === 'string' ? req.body.description : undefined,
          sourceUrl: typeof req.body?.sourceUrl === 'string' ? req.body.sourceUrl : undefined,
          tags: toStringArray(req.body?.tags),
        },
        scope,
      );
      if (!updated) return notFound(res, '동영상을 찾을 수 없습니다.', 'SIGNAGE_MEDIA_NOT_FOUND');
      return res.json({ success: true, data: updated });
    } catch (error) {
      return fail(res, userId, 'updateMedia', error, '동영상을 수정하지 못했습니다.', 'SIGNAGE_MEDIA_UPDATE_FAILED');
    }
  }

  /** DELETE /store-owner/signage/media/:id — soft delete */
  static async remove(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;
    try {
      const id = String(req.params.id ?? '');
      if (!UUID_RE.test(id)) return notFound(res, '동영상을 찾을 수 없습니다.', 'SIGNAGE_MEDIA_NOT_FOUND');
      const scope = await writeScope(req, res, userId);
      if (!scope) return;

      const deleted = await mediaService().deleteMedia(id, scope);
      if (!deleted) return notFound(res, '동영상을 찾을 수 없습니다.', 'SIGNAGE_MEDIA_NOT_FOUND');
      return res.json({ success: true, data: { id, deleted: true } });
    } catch (error) {
      return fail(res, userId, 'deleteMedia', error, '동영상을 삭제하지 못했습니다.', 'SIGNAGE_MEDIA_DELETE_FAILED');
    }
  }
}

const DAY_VALUES = [0, 1, 2, 3, 4, 5, 6];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

function parseDays(raw: unknown): number[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const days = raw.map((d) => Number(d)).filter((d) => DAY_VALUES.includes(d));
  return days.length > 0 ? Array.from(new Set(days)).sort() : null;
}

export class PharmacyHubStoreSignageScheduleController {
  /** GET /store-owner/signage/schedules */
  static async list(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;
    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      const storeConnection = storeConnectionView(resolution);
      if (resolution.status !== 'connected') {
        return res.json({ success: true, data: { storeConnection, items: [], total: 0 } });
      }
      const scope: ScopeFilter = { serviceKey: SERVICE_KEY, organizationId: resolution.organizationId };
      const result = await scheduleService().getSchedules(
        { page: Number(req.query.page) || 1, limit: Math.min(Number(req.query.limit) || 50, 100) },
        scope,
      );
      return res.json({
        success: true,
        data: { storeConnection, items: result.data, total: result.meta.total },
      });
    } catch (error) {
      return fail(res, userId, 'listSchedules', error, '편성을 불러오지 못했습니다.', 'SIGNAGE_SCHEDULE_LOAD_FAILED');
    }
  }

  /** POST /store-owner/signage/schedules */
  static async create(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;
    try {
      const scope = await writeScope(req, res, userId);
      if (!scope) return;

      const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
      const storePlaylistId = String(req.body?.storePlaylistId ?? '');
      const daysOfWeek = parseDays(req.body?.daysOfWeek);
      const startTime = String(req.body?.startTime ?? '');
      const endTime = String(req.body?.endTime ?? '');

      if (
        !name ||
        !UUID_RE.test(storePlaylistId) ||
        !daysOfWeek ||
        !TIME_RE.test(startTime) ||
        !TIME_RE.test(endTime)
      ) {
        return res.status(400).json({
          success: false,
          error: '이름 · 재생 목록 · 요일 · 시작/종료 시각을 모두 입력해 주세요.',
          code: 'VALIDATION_ERROR',
        });
      }

      const created = await scheduleService().createSchedule(
        {
          name,
          storePlaylistId,
          daysOfWeek,
          startTime,
          endTime,
          validFrom: typeof req.body?.validFrom === 'string' ? req.body.validFrom : undefined,
          validUntil: typeof req.body?.validUntil === 'string' ? req.body.validUntil : undefined,
          priority: Number.isFinite(Number(req.body?.priority)) ? Number(req.body.priority) : 0,
          isActive: req.body?.isActive !== false,
        },
        scope,
      );
      return res.status(201).json({ success: true, data: created });
    } catch (error) {
      // 공통 service 는 매장 재생 목록 미존재를 평문 Error 로 던진다 — 400 으로 옮긴다.
      if (error instanceof Error && /playlist not found/i.test(error.message)) {
        return res.status(400).json({
          success: false,
          error: '발행된 재생 목록만 편성할 수 있습니다.',
          code: 'STORE_PLAYLIST_NOT_PUBLISHED',
        });
      }
      return fail(res, userId, 'createSchedule', error, '편성을 만들지 못했습니다.', 'SIGNAGE_SCHEDULE_CREATE_FAILED');
    }
  }

  /** PATCH /store-owner/signage/schedules/:id */
  static async update(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;
    try {
      const id = String(req.params.id ?? '');
      if (!UUID_RE.test(id)) return notFound(res, '편성을 찾을 수 없습니다.', 'SIGNAGE_SCHEDULE_NOT_FOUND');
      const scope = await writeScope(req, res, userId);
      if (!scope) return;

      const days = parseDays(req.body?.daysOfWeek);
      const updated = await scheduleService().updateSchedule(
        id,
        {
          name: typeof req.body?.name === 'string' ? req.body.name : undefined,
          storePlaylistId:
            typeof req.body?.storePlaylistId === 'string' && UUID_RE.test(req.body.storePlaylistId)
              ? req.body.storePlaylistId
              : undefined,
          daysOfWeek: days ?? undefined,
          startTime:
            typeof req.body?.startTime === 'string' && TIME_RE.test(req.body.startTime)
              ? req.body.startTime
              : undefined,
          endTime:
            typeof req.body?.endTime === 'string' && TIME_RE.test(req.body.endTime) ? req.body.endTime : undefined,
          priority: Number.isFinite(Number(req.body?.priority)) ? Number(req.body.priority) : undefined,
          isActive: typeof req.body?.isActive === 'boolean' ? req.body.isActive : undefined,
        },
        scope,
      );
      if (!updated) return notFound(res, '편성을 찾을 수 없습니다.', 'SIGNAGE_SCHEDULE_NOT_FOUND');
      return res.json({ success: true, data: updated });
    } catch (error) {
      if (error instanceof Error && /playlist not found/i.test(error.message)) {
        return res.status(400).json({
          success: false,
          error: '발행된 재생 목록만 편성할 수 있습니다.',
          code: 'STORE_PLAYLIST_NOT_PUBLISHED',
        });
      }
      return fail(res, userId, 'updateSchedule', error, '편성을 수정하지 못했습니다.', 'SIGNAGE_SCHEDULE_UPDATE_FAILED');
    }
  }

  /** DELETE /store-owner/signage/schedules/:id — soft delete */
  static async remove(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;
    try {
      const id = String(req.params.id ?? '');
      if (!UUID_RE.test(id)) return notFound(res, '편성을 찾을 수 없습니다.', 'SIGNAGE_SCHEDULE_NOT_FOUND');
      const scope = await writeScope(req, res, userId);
      if (!scope) return;

      const deleted = await scheduleService().deleteSchedule(id, scope);
      if (!deleted) return notFound(res, '편성을 찾을 수 없습니다.', 'SIGNAGE_SCHEDULE_NOT_FOUND');
      return res.json({ success: true, data: { id, deleted: true } });
    } catch (error) {
      return fail(res, userId, 'deleteSchedule', error, '편성을 삭제하지 못했습니다.', 'SIGNAGE_SCHEDULE_DELETE_FAILED');
    }
  }
}
