/**
 * Supplier Signage Media Controller
 *
 * WO-O4O-NETURE-SUPPLIER-DIGITAL-SIGNAGE-AUTHORING-HUB-IMPORT-V1
 *
 * 공급자가 디지털 사이니지(YouTube 연결 동영상 카드)를 직접 제작·게시·보관한다.
 *
 * 재사용 계약:
 *   - 모델: 기존 signage_media 그대로 (신규 테이블·migration 0)
 *       serviceKey='kpa-society' (KPA 매장 HUB signage 축과 동일)
 *       source='supplier' · scope='global' · organizationId=NULL
 *       소유권 = createdByUserId (캠페인 요청 /my-media 와 동일 축)
 *   - 상태: draft → active(게시) → archived(보관) → draft(보관 해제)
 *       기존 ALLOWED_STATUS_TRANSITIONS(dto/index.ts)와 동일한 전이만 허용.
 *   - HUB 노출: 기존 hub-content querySignageMedia 가 source IN ('hq','supplier','community')
 *       AND status='active' AND scope='global' 이므로 게시(active) 즉시 노출 — 조회측 변경 0.
 *   - 매장 가져오기: 기존 asset-snapshot Full Copy(resolveSignage status='active' 게이트) 재사용 — 변경 0.
 *   - 캠페인 요청 흐름 보존: status='active' 인 본인 youtube/vimeo 미디어는 기존
 *       /supplier/signage/campaign-requests/my-media 에 자동 노출(계약 무변경).
 *
 * 정책: 상품 분류(의약품 여부)와 콘텐츠 유통을 연결하지 않는다 — 의약품 가드 없음.
 */
import { Router } from 'express';
import type { Request, Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { extractYouTubeVideoId, getYouTubeThumbnail } from '@o4o/types/signage';
import { SignageMediaUsageService } from '../../signage/services/media-usage.service.js';

const SERVICE_KEY = 'kpa-society';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 기존 signage dto ALLOWED_STATUS_TRANSITIONS 와 동일 (공급자 흐름에서 pending 미사용)
const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['active'],
  active: ['archived'],
  archived: ['draft'],
};

interface AuthedRequest extends Request {
  user?: { id?: string };
  authUser?: { id?: string };
}

function getUserId(req: AuthedRequest): string | null {
  return req.user?.id || req.authUser?.id || null;
}

/** youtube/vimeo URL 검증·정규화 결과 — flat 타입(api-server tsconfig 는 union narrowing 미지원). */
interface NormalizedVideoSource {
  ok: boolean;
  error?: string;
  sourceType?: 'youtube' | 'vimeo';
  sourceUrl?: string;
  embedId?: string | null;
  autoThumbnail?: string | null;
}

/** youtube/vimeo URL 검증·정규화. youtube 는 embedId 추출 + 썸네일 자동 생성. */
function normalizeVideoSource(rawUrl: unknown): NormalizedVideoSource {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return { ok: false, error: 'sourceUrl(YouTube URL)은 필수입니다.' };
  }
  const url = rawUrl.trim();
  const ytId = extractYouTubeVideoId(url);
  if (ytId) {
    return {
      ok: true,
      sourceType: 'youtube',
      sourceUrl: `https://www.youtube.com/watch?v=${ytId}`,
      embedId: ytId,
      autoThumbnail: getYouTubeThumbnail(url),
    };
  }
  if (url.includes('vimeo.com/')) {
    return { ok: true, sourceType: 'vimeo', sourceUrl: url, embedId: null, autoThumbnail: null };
  }
  return { ok: false, error: '유효한 YouTube(또는 Vimeo) URL 이 아닙니다.' };
}

const MEDIA_COLS = `
  id, "serviceKey", name, description, "mediaType", "sourceType", "sourceUrl", "embedId",
  "thumbnailUrl", tags, status, source, scope, "createdByUserId", metadata,
  "createdAt", "updatedAt"
`;

export function createSupplierSignageMediaController(
  dataSource: DataSource,
  requireAuth: RequestHandler,
): Router {
  const router = Router();
  router.use(requireAuth);

  // WO-O4O-KPA-SIGNAGE-MEDIA-USAGE-GUARD-AND-SAFE-DELETE-V1 (Scope 7): 사용처 가드
  const usageService = new SignageMediaUsageService(dataSource);

  /** neture_suppliers ACTIVE 확인 (supplier-screen-set.controller 패턴 재사용) */
  async function requireSupplier(req: AuthedRequest, res: Response): Promise<string | null> {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
      return null;
    }
    const rows = await dataSource.query(
      `SELECT id FROM neture_suppliers WHERE user_id = $1 AND status = 'ACTIVE' LIMIT 1`,
      [userId],
    );
    if (!rows?.[0]) {
      res.status(403).json({ success: false, error: '활성 공급자만 사용할 수 있습니다.', code: 'SUPPLIER_MEMBERSHIP_REQUIRED' });
      return null;
    }
    return userId; // 소유권 축 = createdByUserId
  }

  // 소유권 WHERE — 본인(supplier source) 미디어만
  const OWN_WHERE = `"createdByUserId" = $OWNER AND source = 'supplier' AND "serviceKey" = '${SERVICE_KEY}' AND "deletedAt" IS NULL`;

  // GET / — 내 사이니지 목록 (전 상태)
  router.get('/', async (req, res) => {
    const userId = await requireSupplier(req as AuthedRequest, res); if (!userId) return;
    try {
      const rows = await dataSource.query(
        `SELECT ${MEDIA_COLS} FROM signage_media
         WHERE ${OWN_WHERE.replace('$OWNER', '$1')}
         ORDER BY "updatedAt" DESC`,
        [userId],
      );
      res.json({ success: true, data: rows });
    } catch (err) {
      console.error('[SupplierSignage] GET / error:', err);
      res.status(500).json({ success: false, error: 'Failed to list signage media', code: 'INTERNAL_ERROR' });
    }
  });

  // GET /:id — 단건 (본인 소유)
  router.get('/:id', async (req, res) => {
    const userId = await requireSupplier(req as AuthedRequest, res); if (!userId) return;
    if (!UUID_RE.test(req.params.id)) { res.status(400).json({ success: false, error: 'Invalid id', code: 'VALIDATION_ERROR' }); return; }
    try {
      const rows = await dataSource.query(
        `SELECT ${MEDIA_COLS} FROM signage_media
         WHERE id = $1 AND ${OWN_WHERE.replace('$OWNER', '$2')} LIMIT 1`,
        [req.params.id, userId],
      );
      if (!rows?.[0]) { res.status(404).json({ success: false, error: 'Not found', code: 'SIGNAGE_MEDIA_NOT_FOUND' }); return; }
      res.json({ success: true, data: rows[0] });
    } catch (err) {
      console.error('[SupplierSignage] GET /:id error:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch signage media', code: 'INTERNAL_ERROR' });
    }
  });

  // POST / — 생성 (draft)
  router.post('/', async (req, res) => {
    const userId = await requireSupplier(req as AuthedRequest, res); if (!userId) return;
    try {
      const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
      if (!name || name.length > 200) { res.status(400).json({ success: false, error: '제목은 1~200자 필수입니다.', code: 'VALIDATION_ERROR' }); return; }
      const video = normalizeVideoSource(req.body?.sourceUrl);
      if (!video.ok) { res.status(400).json({ success: false, error: video.error, code: 'INVALID_VIDEO_URL' }); return; }
      const description = typeof req.body?.description === 'string' ? req.body.description.trim() || null : null;
      const thumbnailUrl =
        (typeof req.body?.thumbnailUrl === 'string' && req.body.thumbnailUrl.trim()) || video.autoThumbnail || null;
      const tags = Array.isArray(req.body?.tags) ? req.body.tags.filter((t: unknown) => typeof t === 'string').slice(0, 20) : [];
      const metadata =
        req.body?.metadata && typeof req.body.metadata === 'object' && !Array.isArray(req.body.metadata)
          ? req.body.metadata
          : {};

      const rows = await dataSource.query(
        `INSERT INTO signage_media
           (id, "serviceKey", "organizationId", name, description, "mediaType", "sourceType", "sourceUrl", "embedId",
            "thumbnailUrl", tags, status, source, scope, "createdByUserId", metadata, "createdAt", "updatedAt", version)
         VALUES
           (gen_random_uuid(), $1, NULL, $2, $3, 'video', $4, $5, $6,
            $7, $8, 'draft', 'supplier', 'global', $9, $10::jsonb, NOW(), NOW(), 1)
         RETURNING ${MEDIA_COLS}`,
        [SERVICE_KEY, name, description, video.sourceType, video.sourceUrl, video.embedId, thumbnailUrl, tags, userId, JSON.stringify(metadata)],
      );
      res.status(201).json({ success: true, data: rows[0] });
    } catch (err) {
      console.error('[SupplierSignage] POST / error:', err);
      res.status(500).json({ success: false, error: 'Failed to create signage media', code: 'INTERNAL_ERROR' });
    }
  });

  // PATCH /:id — 수정 (제목·문구·URL·썸네일·태그·연결 정보)
  router.patch('/:id', async (req, res) => {
    const userId = await requireSupplier(req as AuthedRequest, res); if (!userId) return;
    if (!UUID_RE.test(req.params.id)) { res.status(400).json({ success: false, error: 'Invalid id', code: 'VALIDATION_ERROR' }); return; }
    try {
      const sets: string[] = [];
      const params: unknown[] = [];
      const push = (frag: string, v: unknown) => { params.push(v); sets.push(frag.replace('$N', `$${params.length}`)); };

      if (req.body?.name !== undefined) {
        const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
        if (!name || name.length > 200) { res.status(400).json({ success: false, error: '제목은 1~200자 필수입니다.', code: 'VALIDATION_ERROR' }); return; }
        push(`name = $N`, name);
      }
      if (req.body?.description !== undefined) {
        push(`description = $N`, typeof req.body.description === 'string' ? req.body.description.trim() || null : null);
      }
      if (req.body?.sourceUrl !== undefined) {
        const video = normalizeVideoSource(req.body.sourceUrl);
        if (!video.ok) { res.status(400).json({ success: false, error: video.error, code: 'INVALID_VIDEO_URL' }); return; }
        push(`"sourceType" = $N`, video.sourceType);
        push(`"sourceUrl" = $N`, video.sourceUrl);
        push(`"embedId" = $N`, video.embedId);
        // 썸네일 미지정 시 새 동영상 기준 자동 갱신
        if (req.body?.thumbnailUrl === undefined && video.autoThumbnail) push(`"thumbnailUrl" = $N`, video.autoThumbnail);
      }
      if (req.body?.thumbnailUrl !== undefined) {
        push(`"thumbnailUrl" = $N`, (typeof req.body.thumbnailUrl === 'string' && req.body.thumbnailUrl.trim()) || null);
      }
      if (req.body?.tags !== undefined) {
        push(`tags = $N`, Array.isArray(req.body.tags) ? req.body.tags.filter((t: unknown) => typeof t === 'string').slice(0, 20) : []);
      }
      if (req.body?.metadata !== undefined) {
        const metadata =
          req.body.metadata && typeof req.body.metadata === 'object' && !Array.isArray(req.body.metadata)
            ? req.body.metadata
            : {};
        push(`metadata = $N::jsonb`, JSON.stringify(metadata));
      }
      if (sets.length === 0) { res.status(400).json({ success: false, error: '변경할 필드가 없습니다.', code: 'VALIDATION_ERROR' }); return; }

      params.push(req.params.id, userId);
      const rows = await dataSource.query(
        `UPDATE signage_media SET ${sets.join(', ')}, "updatedAt" = NOW(), version = version + 1
         WHERE id = $${params.length - 1} AND ${OWN_WHERE.replace('$OWNER', `$${params.length}`)}
         RETURNING ${MEDIA_COLS}`,
        params,
      );
      // TypeORM raw UPDATE...RETURNING → [rows, count]
      const row = Array.isArray(rows?.[0]) ? rows[0][0] : rows?.[0];
      if (!row) { res.status(404).json({ success: false, error: 'Not found', code: 'SIGNAGE_MEDIA_NOT_FOUND' }); return; }
      res.json({ success: true, data: row });
    } catch (err) {
      console.error('[SupplierSignage] PATCH /:id error:', err);
      res.status(500).json({ success: false, error: 'Failed to update signage media', code: 'INTERNAL_ERROR' });
    }
  });

  /** 상태 전이 공통 (기존 signage 전이 규칙 준수) */
  async function transition(req: AuthedRequest, res: Response, to: 'draft' | 'active' | 'archived') {
    const userId = await requireSupplier(req, res); if (!userId) return;
    if (!UUID_RE.test(req.params.id)) { res.status(400).json({ success: false, error: 'Invalid id', code: 'VALIDATION_ERROR' }); return; }
    try {
      const cur = await dataSource.query(
        `SELECT id, status FROM signage_media WHERE id = $1 AND ${OWN_WHERE.replace('$OWNER', '$2')} LIMIT 1`,
        [req.params.id, userId],
      );
      if (!cur?.[0]) { res.status(404).json({ success: false, error: 'Not found', code: 'SIGNAGE_MEDIA_NOT_FOUND' }); return; }
      const from = cur[0].status as string;
      if (!(STATUS_TRANSITIONS[from] ?? []).includes(to)) {
        res.status(409).json({ success: false, error: `${from} → ${to} 전이는 허용되지 않습니다.`, code: 'INVALID_STATUS_TRANSITION' });
        return;
      }
      const upd = await dataSource.query(
        `UPDATE signage_media SET status = $1, "updatedAt" = NOW(), version = version + 1
         WHERE id = $2 AND ${OWN_WHERE.replace('$OWNER', '$3')}
         RETURNING ${MEDIA_COLS}`,
        [to, req.params.id, userId],
      );
      const row = Array.isArray(upd?.[0]) ? upd[0][0] : upd?.[0];
      if (!row) { res.status(404).json({ success: false, error: 'Not found', code: 'SIGNAGE_MEDIA_NOT_FOUND' }); return; }
      res.json({ success: true, data: row });
    } catch (err) {
      console.error(`[SupplierSignage] transition→${to} error:`, err);
      res.status(500).json({ success: false, error: 'Failed to change status', code: 'INTERNAL_ERROR' });
    }
  }

  // 게시: draft → active (HUB 노출 시작)
  router.post('/:id/publish', (req, res) => transition(req as AuthedRequest, res, 'active'));
  // 보관: active → archived (HUB 목록·가져오기·캠페인 대상 제외. 이미 가져간 매장 사본은 Full Copy 라 무영향)
  router.post('/:id/archive', (req, res) => transition(req as AuthedRequest, res, 'archived'));
  // 보관 해제: archived → draft
  router.post('/:id/unarchive', (req, res) => transition(req as AuthedRequest, res, 'draft'));

  // DELETE /:id — soft delete. active 는 먼저 보관해야 함
  //   (캠페인 my-media 조회가 deletedAt 을 보지 않으므로, active 상태 직삭제를 막아 정합 유지)
  //   WO-O4O-KPA-SIGNAGE-MEDIA-USAGE-GUARD-AND-SAFE-DELETE-V1 (Scope 7):
  //     소유권 가드 유지 + 게시 상태 가드(DELETE_BLOCKED_ACTIVE) 유지 + 사용처 가드 추가.
  //     active 가 아니어도 HQ/매장에서 사용 중이면 SIGNAGE_MEDIA_IN_USE(409) 로 차단한다.
  //     (공급자 미디어 사본은 Full Copy snapshot 이라 원본 soft delete 로 매장 사본이 깨지지 않지만,
  //      직접 참조 사용처가 있으면 재생에서 사라지므로 동일 가드를 적용한다.)
  router.delete('/:id', async (req, res) => {
    const userId = await requireSupplier(req as AuthedRequest, res); if (!userId) return;
    if (!UUID_RE.test(req.params.id)) { res.status(400).json({ success: false, error: 'Invalid id', code: 'VALIDATION_ERROR' }); return; }
    try {
      // 소유권 + 존재 확인 (OWN_WHERE 에 deletedAt IS NULL 포함 → 이미 삭제된 건 404)
      const owned = await dataSource.query(
        `SELECT id, status FROM signage_media WHERE id = $1 AND ${OWN_WHERE.replace('$OWNER', '$2')} LIMIT 1`,
        [req.params.id, userId],
      );
      if (!owned?.[0]) {
        res.status(404).json({ success: false, error: 'Not found', code: 'SIGNAGE_MEDIA_NOT_FOUND' });
        return;
      }

      // 사용처 가드 (active 여부와 무관하게 우선 차단)
      const usage = await usageService.computeUsage(req.params.id);
      if (usage.inUse) {
        res.status(409).json({
          success: false,
          code: 'SIGNAGE_MEDIA_IN_USE',
          error: '사용 중인 사이니지 미디어는 삭제할 수 없습니다. 먼저 모든 사용처에서 연결을 제거하세요.',
          usage: {
            hqPlaylists: usage.directPlaylistUsageCount,
            storePlaylists: usage.storePlaylistUsageCount,
            stores: usage.storeCount,
            detail: usage.usages,
          },
        });
        return;
      }

      // 게시 상태 가드 (기존 계약 유지)
      if (owned[0].status === 'active') {
        res.status(409).json({ success: false, error: '게시 중인 사이니지는 먼저 보관해야 삭제할 수 있습니다.', code: 'DELETE_BLOCKED_ACTIVE' });
        return;
      }

      const upd = await dataSource.query(
        `UPDATE signage_media SET "deletedAt" = NOW(), "updatedAt" = NOW()
         WHERE id = $1 AND ${OWN_WHERE.replace('$OWNER', '$2')} AND status <> 'active'
         RETURNING id`,
        [req.params.id, userId],
      );
      const row = Array.isArray(upd?.[0]) ? upd[0][0] : upd?.[0];
      if (!row) {
        res.status(404).json({ success: false, error: 'Not found', code: 'SIGNAGE_MEDIA_NOT_FOUND' });
        return;
      }
      res.json({ success: true, data: { deleted: true, id: row.id } });
    } catch (err) {
      console.error('[SupplierSignage] DELETE /:id error:', err);
      res.status(500).json({ success: false, error: 'Failed to delete signage media', code: 'INTERNAL_ERROR' });
    }
  });

  return router;
}
