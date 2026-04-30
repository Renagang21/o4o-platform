/**
 * Supplier Campaign Request Controller
 *
 * WO-O4O-SIGNAGE-SUPPLIER-CAMPAIGN-REQUEST-V1
 *
 * 공급자가 자신의 승인된 signage_media를 사용해
 * 서비스별 강제 삽입 캠페인을 운영자에게 요청한다.
 *
 * 경로 (mounted at /supplier/signage/campaign-requests):
 *   GET  /my-media        — 본인의 캠페인 가능 미디어 목록 (youtube/vimeo, active)
 *   POST /                — 캠페인 요청 생성
 *   GET  /                — 내 캠페인 요청 목록
 *   GET  /:id             — 단건 조회
 *
 * 정책:
 *   - 본인이 등록한 status='active', sourceType='youtube'|'vimeo' media만 선택 가능
 *   - 운영자 승인 전 forced_content 생성 없음
 *   - 승인 후 수정 불가 (새 요청으로 등록)
 *   - organization_id, 매장명 미노출
 */

import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { asyncHandler } from '../../../middleware/error-handler.js';

type AuthMiddleware = import('express').RequestHandler;

// ── Constants ─────────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ALLOWED_SERVICES = [
  'kpa-society',
  'neture',
  'glycopharm',
  'glucoseview',
  'k-cosmetics',
];

// ── Factory ───────────────────────────────────────────────────────────────────

export function createSupplierCampaignRequestController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
): Router {
  const router = Router();
  router.use(requireAuth as any);

  // ── GET /my-media — 캠페인 가능 미디어 목록 ───────────────────────────────

  router.get(
    '/my-media',
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user as { id: string };

      const rows = await dataSource.query(
        `SELECT
           id,
           name AS title,
           "sourceType",
           "sourceUrl",
           "embedId",
           "thumbnailUrl",
           "serviceKey",
           created_at AS "createdAt"
         FROM signage_media
         WHERE "createdByUserId" = $1
           AND status = 'active'
           AND "sourceType" IN ('youtube', 'vimeo')
         ORDER BY created_at DESC`,
        [user.id],
      );

      res.json({ success: true, data: rows });
    }),
  );

  // ── POST / — 캠페인 요청 생성 ─────────────────────────────────────────────

  router.post(
    '/',
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user as { id: string; name?: string; email?: string };
      const { mediaId, title, targetServices, startAt, endAt, note } = req.body;

      // ── 입력 검증 ──────────────────────────────────────────────────────────

      if (!mediaId || !UUID_RE.test(mediaId)) {
        res.status(400).json({
          success: false,
          error: 'mediaId는 유효한 UUID여야 합니다.',
          code: 'INVALID_MEDIA_ID',
        });
        return;
      }

      if (!title?.trim()) {
        res.status(400).json({
          success: false,
          error: 'title이 필요합니다.',
          code: 'MISSING_TITLE',
        });
        return;
      }

      if (!Array.isArray(targetServices) || targetServices.length === 0) {
        res.status(400).json({
          success: false,
          error: 'targetServices는 1개 이상이어야 합니다.',
          code: 'INVALID_TARGET_SERVICES',
        });
        return;
      }

      const invalidServices = (targetServices as string[]).filter(
        (s) => !ALLOWED_SERVICES.includes(s),
      );
      if (invalidServices.length > 0) {
        res.status(400).json({
          success: false,
          error: `허용되지 않는 서비스: ${invalidServices.join(', ')}`,
          code: 'INVALID_SERVICE_KEY',
        });
        return;
      }

      if (!startAt || !endAt) {
        res.status(400).json({
          success: false,
          error: 'startAt, endAt이 필요합니다.',
          code: 'MISSING_DATES',
        });
        return;
      }

      const startDate = new Date(startAt);
      const endDate = new Date(endAt);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        res.status(400).json({
          success: false,
          error: '유효한 날짜 형식이 아닙니다.',
          code: 'INVALID_DATE',
        });
        return;
      }

      if (endDate <= startDate) {
        res.status(400).json({
          success: false,
          error: 'endAt은 startAt 이후여야 합니다.',
          code: 'INVALID_DATE_RANGE',
        });
        return;
      }

      if (endDate <= new Date()) {
        res.status(400).json({
          success: false,
          error: '종료일이 이미 지났습니다.',
          code: 'PAST_END_DATE',
        });
        return;
      }

      // ── 미디어 소유권 + 상태 확인 ─────────────────────────────────────────

      const [media] = await dataSource.query(
        `SELECT id, name, "sourceUrl", "sourceType", "embedId", "thumbnailUrl"
         FROM signage_media
         WHERE id = $1
           AND "createdByUserId" = $2
           AND status = 'active'
         LIMIT 1`,
        [mediaId, user.id],
      );

      if (!media) {
        res.status(403).json({
          success: false,
          error: '본인이 등록한 활성 미디어만 선택할 수 있습니다.',
          code: 'MEDIA_NOT_ACCESSIBLE',
        });
        return;
      }

      // forced_content는 youtube/vimeo embed 방식만 지원
      if (!['youtube', 'vimeo'].includes(media.sourceType)) {
        res.status(400).json({
          success: false,
          error: '유튜브 또는 비메오 영상만 캠페인에 사용할 수 있습니다.',
          code: 'UNSUPPORTED_SOURCE_TYPE',
        });
        return;
      }

      // ── kpa_approval_requests 생성 ────────────────────────────────────────

      const payload = {
        mediaId,
        mediaSourceUrl: media.sourceUrl,
        mediaSourceType: media.sourceType,
        mediaEmbedId: media.embedId || null,
        mediaThumbnailUrl: media.thumbnailUrl || null,
        mediaTitle: media.name || null,
        title: title.trim(),
        targetServices: [...new Set(targetServices as string[])], // dedupe
        startAt,
        endAt,
        note: note?.trim() || null,
      };

      const [row] = await dataSource.query(
        `INSERT INTO kpa_approval_requests
           (entity_type, organization_id, payload, status,
            requester_id, requester_name, requester_email, submitted_at)
         VALUES ('signage_campaign_request', $1, $2, 'pending', $3, $4, $5, NOW())
         RETURNING id, entity_type, status, payload, created_at`,
        [
          user.id, // organization_id: 공급자 userId (NOT NULL 충족)
          JSON.stringify(payload),
          user.id,
          (user as any).name || '',
          (user as any).email || null,
        ],
      );

      res.status(201).json({ success: true, data: row });
    }),
  );

  // ── GET / — 내 캠페인 요청 목록 ──────────────────────────────────────────

  router.get(
    '/',
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user as { id: string };
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;

      const [countRow] = await dataSource.query(
        `SELECT COUNT(*)::int AS count
         FROM kpa_approval_requests
         WHERE entity_type = 'signage_campaign_request' AND requester_id = $1`,
        [user.id],
      );
      const total = countRow?.count ?? 0;

      const rows = await dataSource.query(
        `SELECT
           id,
           entity_type AS "entityType",
           status,
           payload,
           review_comment AS "reviewComment",
           reviewed_at AS "reviewedAt",
           created_at AS "createdAt",
           updated_at AS "updatedAt"
         FROM kpa_approval_requests
         WHERE entity_type = 'signage_campaign_request' AND requester_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [user.id, limit, offset],
      );

      res.json({ success: true, data: rows, total, page, limit });
    }),
  );

  // ── GET /:id — 단건 조회 ─────────────────────────────────────────────────

  router.get(
    '/:id',
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user as { id: string };
      const { id } = req.params;

      if (!UUID_RE.test(id)) {
        res.status(400).json({ success: false, error: 'Invalid ID', code: 'INVALID_ID' });
        return;
      }

      const [row] = await dataSource.query(
        `SELECT
           id,
           entity_type AS "entityType",
           status,
           payload,
           review_comment AS "reviewComment",
           reviewed_at AS "reviewedAt",
           created_at AS "createdAt",
           updated_at AS "updatedAt"
         FROM kpa_approval_requests
         WHERE id = $1
           AND entity_type = 'signage_campaign_request'
           AND requester_id = $2
         LIMIT 1`,
        [id, user.id],
      );

      if (!row) {
        res.status(404).json({ success: false, error: '요청을 찾을 수 없습니다.', code: 'NOT_FOUND' });
        return;
      }

      res.json({ success: true, data: row });
    }),
  );

  return router;
}
