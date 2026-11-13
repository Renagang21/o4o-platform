/**
 * Published Assets Controller — 공개 렌더링 엔드포인트
 *
 * WO-KPA-A-ASSET-RENDER-FILTER-INTEGRATION-V1
 * WO-KPA-A-CONTENT-OVERRIDE-EXTENSION-V1: store content override (COALESCE)
 * WO-O4O-SNAPSHOT-POLICY-MIGRATION-V1: lifecycle_status execution gate
 *
 * Storefront / Signage / Promotion 화면에서 게시된 자산을 조회하는 공개 API.
 * kpa_store_asset_controls 기반 필터링:
 *   - publish_status = 'published'
 *   - forced 기간 유효성
 *   - channel_map 채널 매칭
 *   - control row 없음 → 제외
 *   - store content 존재 시 title/content_json 우선 사용
 *
 * Endpoints:
 *   GET /published-assets/:organizationId                — 조직의 게시 자산 목록
 *   GET /published-assets/:organizationId/:snapshotId    — 단건 게시 자산 상세
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { buildPublishedAssetQuery, PUBLISHED_CHANNEL_KEY } from '../../kpa/helpers/asset-render-filter.js';

const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const channelParam = (value: unknown) => (typeof value === 'string' && value ? value : null);
/** 공개 요청 입력 검사 — 잘못된 값은 400 으로 돌려보내 SQL 에 닿지 않게 한다. */
function invalidPublicInput(res: Response, ids: string[], channelKey: string | null): boolean {
  if (ids.some(id => !UUID.test(id))) {
    res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid identifier' } });
    return true;
  }
  if (channelKey !== null && !PUBLISHED_CHANNEL_KEY.test(channelKey)) {
    res.status(400).json({ success: false, error: { code: 'INVALID_CHANNEL', message: 'Invalid channel' } });
    return true;
  }
  return false;
}

export function createPublishedAssetsController(
  dataSource: DataSource,
): Router {
  const router = Router();

  /**
   * GET /published-assets/:organizationId
   *
   * Public endpoint — no auth required.
   * Returns published assets for a specific organization.
   *
   * Query params:
   *   ?channel=home|signage|promotion  — filter by channel_map key
   *   ?type=cms|signage                — filter by asset type
   *   ?page=1                          — pagination
   *   ?limit=20                        — page size
   */
  router.get(
    '/:organizationId',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { organizationId } = req.params;
        const channelKey = channelParam(req.query.channel);
        if (invalidPublicInput(res, [organizationId], channelKey)) return;
        const assetType = req.query.type as 'cms' | 'signage' | undefined;
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

        const filter = buildPublishedAssetQuery(organizationId, channelKey, {
          assetType: assetType && ['cms', 'signage'].includes(assetType) ? assetType : undefined,
          page,
          limit,
        });

        const [countResult, items] = await Promise.all([
          dataSource.query(filter.countQuery, filter.countParams),
          dataSource.query(filter.query, filter.params),
        ]);

        const total = countResult[0]?.total || 0;

        res.json({
          success: true,
          data: {
            items,
            total,
            page,
            limit,
          },
        });
      } catch {
        // 내부 오류 내용은 공개 응답에 싣지 않는다.
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to load published assets' },
        });
      }
    },
  );

  /**
   * GET /published-assets/:organizationId/:snapshotId
   *
   * Public endpoint — single published asset detail.
   * Returns full content_json for rendering.
   * Returns 404 if asset is not published or not visible.
   */
  router.get(
    '/:organizationId/:snapshotId',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { organizationId, snapshotId } = req.params;
        const channelKey = channelParam(req.query.channel);
        if (invalidPublicInput(res, [organizationId, snapshotId], channelKey)) return;

        // Channel filter — 값은 $3 으로 바인딩한다.
        const channelCondition = channelKey ? 'AND (c.channel_map->>$3)::boolean = true' : '';

        const query = `
          SELECT
            s.id,
            s.organization_id AS "organizationId",
            s.source_service AS "sourceService",
            s.source_asset_id AS "sourceAssetId",
            s.asset_type AS "assetType",
            COALESCE(sc.title, s.title) AS "title",
            COALESCE(sc.content_json, s.content_json) AS "contentJson",
            s.created_at AS "createdAt",
            c.publish_status AS "publishStatus",
            c.channel_map AS "channelMap",
            c.is_forced AS "isForced",
            c.forced_start_at AS "forcedStartAt",
            c.forced_end_at AS "forcedEndAt",
            c.snapshot_type AS "snapshotType",
            c.lifecycle_status AS "lifecycleStatus",
            CASE WHEN sc.id IS NOT NULL THEN true ELSE false END AS "hasStoreContent"
          FROM o4o_asset_snapshots s
          INNER JOIN kpa_store_asset_controls c
            ON c.snapshot_id = s.id AND c.organization_id = s.organization_id
          LEFT JOIN kpa_store_contents sc
            ON sc.snapshot_id = s.id AND sc.organization_id = s.organization_id
          WHERE s.organization_id = $1
            AND s.id = $2
            AND c.lifecycle_status = 'active'
            AND c.publish_status = 'published'
            AND (
              c.is_forced = false
              OR (
                c.is_forced = true
                AND (c.forced_start_at IS NULL OR NOW() >= c.forced_start_at)
                AND (c.forced_end_at IS NULL OR NOW() < c.forced_end_at)
              )
            )
            ${channelCondition}
          LIMIT 1
        `;

        const result = await dataSource.query(query, channelKey ? [organizationId, snapshotId, channelKey] : [organizationId, snapshotId]);

        if (!result.length) {
          res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Published asset not found' },
          });
          return;
        }

        res.json({
          success: true,
          data: result[0],
        });
      } catch {
        // 내부 오류 내용은 공개 응답에 싣지 않는다.
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to load published assets' },
        });
      }
    },
  );

  return router;
}
