/**
 * Pharmacy-Hub Store Owner Signage Controller — 디지털 사이니지
 *
 * WO-PHARMACY-HUB-STORE-EXECUTION-ASSETS-V1 (범위 D)
 *
 *   GET    /api/v1/pharmacy-hub/store-owner/signage/playlists                    목록
 *   POST   /api/v1/pharmacy-hub/store-owner/signage/playlists                    생성 (SINGLE|LIST)
 *   PATCH  /api/v1/pharmacy-hub/store-owner/signage/playlists/:id                이름·발행 상태
 *   DELETE /api/v1/pharmacy-hub/store-owner/signage/playlists/:id                보관(비활성화)
 *   GET    /api/v1/pharmacy-hub/store-owner/signage/playlists/:id/items          항목 목록(미리보기)
 *   POST   /api/v1/pharmacy-hub/store-owner/signage/playlists/:id/items/from-library  자료함에서 추가
 *   POST   /api/v1/pharmacy-hub/store-owner/signage/playlists/:id/items/from-media    매장 미디어에서 추가
 *   PATCH  /api/v1/pharmacy-hub/store-owner/signage/playlists/:id/items/reorder  순서 변경
 *   DELETE /api/v1/pharmacy-hub/store-owner/signage/playlists/:id/items/:itemId  항목 삭제
 *   GET    /api/v1/pharmacy-hub/store-owner/signage/sources                      추가 가능한 자료
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * canonical 구조를 그대로 쓴다 (새 사이니지 엔진 0)
 *
 *   재생 단위 = `store_playlists` (+ `store_playlist_items`) — **매장 소유**
 *   항목 실체 = `o4o_asset_snapshots` — 원본에서 복사된 **매장 소유 사본**
 *   원본      = 매장 자료함(`store_execution_assets`) 또는 매장 미디어(`signage_media`)
 *
 *   저장·검증·스냅샷 계약은 공통 `StorePlaylistRepository` 를 그대로 호출한다
 *   (KPA 가 쓰는 것과 같은 클래스 — 로직 복제 0 / 신규 테이블 0 / migration 0).
 *
 * 원본·사본 독립성 (작업요청서 §자산 소유·복사 원칙)
 *   항목 추가는 `AssetCopyService.copyResolved()` 를 거쳐 **매장 organization 소유의
 *   새 스냅샷**을 만든다 (새 id · 매장 organizationId · 원본 출처는 source_asset_id 로 보존).
 *   재생 목록은 스냅샷을 참조하므로 원본을 직접 수정하지 않고 row 를 공유하지도 않는다.
 *   같은 원본을 다시 추가하면 기존 스냅샷을 재사용한다(DUPLICATE_SNAPSHOT 처리) — 중복 생성 없음.
 *
 * 매장 미디어 추가 경계
 *   `addItemFromSignage` 는 `signage_media.organizationId = <매장 org>` 인 것만 통과한다.
 *   서비스 단위 공용 미디어나 타 매장 미디어는 이 경로로 들어오지 않는다.
 *
 * 본 WO 에서 만들지 않는 것
 *   `signage_media` **신규 등록 경로**. 미디어 원본 작성은 운영자·공급자 영역이고
 *   Pharmacy-Hub 에는 아직 그 축이 없다. 없는 것을 있는 것처럼 보이게 하지 않으며,
 *   매장은 자기 자료함(W8)에서 항목을 가져오는 것을 주 경로로 쓴다.
 *
 * 조직 계약은 다른 Pharmacy-Hub 매장 컨트롤러와 동일하다 (enrollment 기준 · 클라이언트 미신뢰).
 */
import type { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import logger from '../../utils/logger.js';
import { SERVICE_KEYS } from '../../constants/service-keys.js';
import {
  resolvePharmacyHubStoreOrganization,
  type StoreOrgResolution,
} from './store-organization.resolver.js';
import { StorePlaylistRepository } from '../../routes/o4o-store/repositories/store-playlist.repository.js';

const SERVICE_KEY = SERVICE_KEYS.PHARMACY_HUB;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PLAYLIST_TYPES = ['SINGLE', 'LIST'] as const;
type PlaylistType = (typeof PLAYLIST_TYPES)[number];

function repo(): StorePlaylistRepository {
  return new StorePlaylistRepository(AppDataSource);
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

function notFound(res: Response, message = '재생 목록을 찾을 수 없습니다.') {
  return res.status(404).json({ success: false, error: message, code: 'PLAYLIST_NOT_FOUND' });
}

function fail(res: Response, userId: string, op: string, error: unknown, message: string, code: string) {
  // repository 는 statusCode/code 를 붙인 오류를 던진다 (ITEM_LOCKED 등) — 그대로 전달한다.
  const status = (error as any)?.statusCode;
  const errCode = (error as any)?.code;
  if (typeof status === 'number' && typeof errCode === 'string') {
    return res.status(status).json({
      success: false,
      error: (error as Error).message,
      code: errCode,
    });
  }
  logger.error(`[PharmacyHubStoreSignage] ${op} failed`, {
    userId,
    error: error instanceof Error ? error.message : String(error),
  });
  return res.status(500).json({ success: false, error: message, code });
}

/**
 * 조직 해석 + 재생 목록 소유 확인.
 * 통과하면 organizationId 를, 실패하면 응답을 이미 보낸 상태로 null 을 돌려준다.
 */
async function resolveOwnedPlaylist(
  req: Request,
  res: Response,
  userId: string,
): Promise<string | null> {
  const playlistId = String(req.params.id ?? '');
  if (!UUID_RE.test(playlistId)) {
    notFound(res);
    return null;
  }

  const resolution = await resolvePharmacyHubStoreOrganization(userId);
  if (resolution.status !== 'connected') {
    sendWriteBlocked(res, resolution);
    return null;
  }

  const owned = await repo().verifyOwnership(playlistId, resolution.organizationId);
  if (!owned) {
    // 존재 여부 자체를 흘리지 않는다 — 타 매장 재생 목록도 동일하게 404.
    notFound(res);
    return null;
  }
  return resolution.organizationId;
}

export class PharmacyHubStoreSignageController {
  /** GET /store-owner/signage/playlists */
  static async listPlaylists(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      const storeConnection = storeConnectionView(resolution);
      if (resolution.status !== 'connected') {
        return res.json({ success: true, data: { storeConnection, items: [] } });
      }

      const items = await repo().findPlaylistsByOrganization(resolution.organizationId);
      return res.json({ success: true, data: { storeConnection, items } });
    } catch (error) {
      return fail(res, userId, 'listPlaylists', error, '재생 목록을 불러오지 못했습니다.', 'SIGNAGE_LOAD_FAILED');
    }
  }

  /**
   * GET /store-owner/signage/sources — 재생 목록에 넣을 수 있는 매장 소유 자료.
   *
   * 자료함(store_execution_assets) + 매장 미디어(signage_media, 같은 org) 두 축이다.
   * 매장 미디어는 Pharmacy-Hub 에 아직 등록 경로가 없어 보통 빈 배열이며, 그 상태가 정상이다.
   */
  static async sources(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      const storeConnection = storeConnectionView(resolution);
      if (resolution.status !== 'connected') {
        return res.json({ success: true, data: { storeConnection, libraryAssets: [], media: [] } });
      }
      const organizationId = resolution.organizationId;

      const [libraryAssets, media] = await Promise.all([
        AppDataSource.query(
          `SELECT id, title, asset_type AS "assetType", mime_type AS "mimeType", file_url AS "fileUrl"
             FROM store_execution_assets
            WHERE organization_id = $1 AND is_active = true
            ORDER BY created_at DESC
            LIMIT 200`,
          [organizationId],
        ),
        // signage_media 는 SnakeNamingStrategy 미적용(camelCase 컬럼) — 큰따옴표로 참조한다.
        AppDataSource.query(
          `SELECT "id", "name", "mediaType", "sourceType", "thumbnailUrl"
             FROM "signage_media"
            WHERE "organizationId" = $1 AND "deletedAt" IS NULL
            ORDER BY "createdAt" DESC
            LIMIT 200`,
          [organizationId],
        ),
      ]);

      return res.json({ success: true, data: { storeConnection, libraryAssets, media } });
    } catch (error) {
      return fail(res, userId, 'sources', error, '자료를 불러오지 못했습니다.', 'SIGNAGE_SOURCES_FAILED');
    }
  }

  /** POST /store-owner/signage/playlists — body: { name, playlistType } */
  static async createPlaylist(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;
    if (rejectsOrganizationId(req, res)) return;

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      if (resolution.status !== 'connected') return sendWriteBlocked(res, resolution);

      const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
      if (!name) {
        return res
          .status(400)
          .json({ success: false, error: '재생 목록 이름을 입력해 주세요.', code: 'VALIDATION_ERROR' });
      }
      const playlistType = req.body?.playlistType ?? 'LIST';
      if (!(PLAYLIST_TYPES as readonly string[]).includes(playlistType)) {
        return res.status(400).json({
          success: false,
          error: 'playlistType 은 SINGLE 또는 LIST 여야 합니다.',
          code: 'VALIDATION_ERROR',
        });
      }

      const created = await repo().createPlaylist(
        resolution.organizationId,
        name,
        playlistType as PlaylistType,
      );
      return res.status(201).json({ success: true, data: created });
    } catch (error) {
      return fail(res, userId, 'createPlaylist', error, '재생 목록을 만들지 못했습니다.', 'SIGNAGE_CREATE_FAILED');
    }
  }

  /** PATCH /store-owner/signage/playlists/:id — body: { name?, publishStatus? } */
  static async updatePlaylist(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;
    if (rejectsOrganizationId(req, res)) return;

    try {
      const organizationId = await resolveOwnedPlaylist(req, res, userId);
      if (!organizationId) return;

      const updated = await repo().updatePlaylist(req.params.id, organizationId, {
        name: typeof req.body?.name === 'string' ? req.body.name : undefined,
        publishStatus: typeof req.body?.publishStatus === 'string' ? req.body.publishStatus : undefined,
      });
      if (!updated) {
        return res
          .status(400)
          .json({ success: false, error: '변경할 내용이 없습니다.', code: 'NO_CHANGES' });
      }
      return res.json({ success: true, data: updated });
    } catch (error) {
      return fail(res, userId, 'updatePlaylist', error, '재생 목록을 수정하지 못했습니다.', 'SIGNAGE_UPDATE_FAILED');
    }
  }

  /** DELETE /store-owner/signage/playlists/:id — 보관(is_active=false). 물리 삭제 아님. */
  static async archivePlaylist(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;

    try {
      const organizationId = await resolveOwnedPlaylist(req, res, userId);
      if (!organizationId) return;

      const deleted = await repo().softDeletePlaylist(req.params.id, organizationId);
      if (!deleted) return notFound(res);
      return res.json({ success: true, data: { id: deleted.id, archived: true } });
    } catch (error) {
      return fail(res, userId, 'archivePlaylist', error, '재생 목록을 보관하지 못했습니다.', 'SIGNAGE_ARCHIVE_FAILED');
    }
  }

  /** GET /store-owner/signage/playlists/:id/items — 미리보기용 항목 목록 */
  static async listItems(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;

    try {
      const organizationId = await resolveOwnedPlaylist(req, res, userId);
      if (!organizationId) return;

      // serviceKey 를 넘기면 강제 편성(운영자 캠페인)이 합쳐진다 — 실제 재생과 같은 목록을 보여준다.
      const items = await repo().findPlaylistItems(req.params.id, SERVICE_KEY);
      return res.json({ success: true, data: { items } });
    } catch (error) {
      return fail(res, userId, 'listItems', error, '항목을 불러오지 못했습니다.', 'SIGNAGE_ITEMS_FAILED');
    }
  }

  /** POST /store-owner/signage/playlists/:id/items/from-library — body: { libraryItemId } */
  static async addItemFromLibrary(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;
    if (rejectsOrganizationId(req, res)) return;

    try {
      const organizationId = await resolveOwnedPlaylist(req, res, userId);
      if (!organizationId) return;

      const libraryItemId = String(req.body?.libraryItemId ?? '');
      if (!UUID_RE.test(libraryItemId)) {
        return res
          .status(400)
          .json({ success: false, error: '추가할 자료를 선택해 주세요.', code: 'VALIDATION_ERROR' });
      }

      const item = await repo().addItemFromLibrary(
        req.params.id,
        libraryItemId,
        organizationId,
        userId,
      );
      return res.status(201).json({ success: true, data: item });
    } catch (error) {
      return fail(res, userId, 'addItemFromLibrary', error, '자료를 추가하지 못했습니다.', 'SIGNAGE_ADD_FAILED');
    }
  }

  /** POST /store-owner/signage/playlists/:id/items/from-media — body: { mediaId } */
  static async addItemFromMedia(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;
    if (rejectsOrganizationId(req, res)) return;

    try {
      const organizationId = await resolveOwnedPlaylist(req, res, userId);
      if (!organizationId) return;

      const mediaId = String(req.body?.mediaId ?? '');
      if (!UUID_RE.test(mediaId)) {
        return res
          .status(400)
          .json({ success: false, error: '추가할 미디어를 선택해 주세요.', code: 'VALIDATION_ERROR' });
      }

      // repository 가 signage_media.organizationId = 매장 org 를 강제한다 (타 매장 미디어 차단).
      const item = await repo().addItemFromSignage(req.params.id, mediaId, organizationId, userId);
      return res.status(201).json({ success: true, data: item });
    } catch (error) {
      return fail(res, userId, 'addItemFromMedia', error, '미디어를 추가하지 못했습니다.', 'SIGNAGE_ADD_FAILED');
    }
  }

  /** PATCH /store-owner/signage/playlists/:id/items/reorder — body: { order: string[] } */
  static async reorderItems(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;
    if (rejectsOrganizationId(req, res)) return;

    try {
      const organizationId = await resolveOwnedPlaylist(req, res, userId);
      if (!organizationId) return;

      const order = req.body?.order;
      if (!Array.isArray(order) || order.some((v) => typeof v !== 'string')) {
        return res
          .status(400)
          .json({ success: false, error: 'order 는 항목 id 배열이어야 합니다.', code: 'VALIDATION_ERROR' });
      }

      const result = await repo().reorderItems(req.params.id, order);
      return res.json({ success: true, data: result });
    } catch (error) {
      return fail(res, userId, 'reorderItems', error, '순서를 바꾸지 못했습니다.', 'SIGNAGE_REORDER_FAILED');
    }
  }

  /**
   * DELETE /store-owner/signage/playlists/:id/items/:itemId
   * 강제 편성 항목(is_locked)은 매장이 지울 수 없다 — repository 가 403 ITEM_LOCKED 를 던진다.
   */
  static async deleteItem(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;

    try {
      const organizationId = await resolveOwnedPlaylist(req, res, userId);
      if (!organizationId) return;

      const result = await repo().deleteItem(req.params.id, String(req.params.itemId));
      return res.json({ success: true, data: result });
    } catch (error) {
      return fail(res, userId, 'deleteItem', error, '항목을 삭제하지 못했습니다.', 'SIGNAGE_ITEM_DELETE_FAILED');
    }
  }
}
