/**
 * Asset Render Filter — 공개 렌더링용 자산 필터링 헬퍼
 *
 * WO-KPA-A-ASSET-RENDER-FILTER-INTEGRATION-V1
 * WO-KPA-A-CONTENT-OVERRIDE-EXTENSION-V1: store content override (COALESCE)
 *
 * kpa_store_asset_controls 기반으로 실제 서비스 화면에 노출할 자산을 필터링.
 * kpa_store_contents LEFT JOIN으로 매장 편집 콘텐츠 우선 적용.
 *
 * 필터링 정책:
 * 1. lifecycle_status = 'active' (expired/archived 제외)
 * 2. publish_status = 'published' (draft/hidden 제외)
 * 3. forced 항목: 기간 유효성 검증 (start/end)
 * 4. channel_map: 지정된 채널키가 true인 항목만
 * 5. control row 없음 → draft로 간주 → 렌더 제외
 * 6. store content 존재 시 title/content_json 우선 사용
 */

/**
 * Build SQL for fetching published assets for a given organization + channel.
 *
 * Returns parameterized query parts that can be composed into larger queries.
 *
 * @param organizationId - Target organization UUID
 * @param channelKey     - Channel key (e.g. 'home', 'signage', 'promotion'). null = no channel filter
 * @param options        - Additional filter options
 */
export interface RenderFilterOptions {
  assetType?: 'cms' | 'signage';
  page?: number;
  limit?: number;
}

export interface RenderFilterResult {
  query: string;
  countQuery: string;
  params: any[];
  countParams: any[];
}

export function buildPublishedAssetQuery(
  organizationId: string,
  channelKey: string | null,
  options: RenderFilterOptions = {},
): RenderFilterResult {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const offset = (page - 1) * limit;

  // Base WHERE conditions (always applied)
  // INNER JOIN required — control row must exist AND be published
  const conditions: string[] = [
    `s.organization_id = $1`,
    // V3: lifecycle gate — only active assets are rendered
    `c.lifecycle_status = 'active'`,
    `c.publish_status = 'published'`,
    // Forced period filter: exclude expired forced items
    `(
      c.is_forced = false
      OR (
        c.is_forced = true
        AND (c.forced_start_at IS NULL OR NOW() >= c.forced_start_at)
        AND (c.forced_end_at IS NULL OR NOW() <= c.forced_end_at)
      )
    )`,
  ];

  const queryParams: any[] = [organizationId];
  const countParams: any[] = [organizationId];
  let paramIdx = 2;

  // Channel filter
  if (channelKey) {
    conditions.push(`(c.channel_map->>'${channelKey}')::boolean = true`);
  }

  // Asset type filter
  if (options.assetType && ['cms', 'signage'].includes(options.assetType)) {
    conditions.push(`s.asset_type = $${paramIdx}`);
    queryParams.push(options.assetType);
    countParams.push(options.assetType);
    paramIdx++;
  }

  const whereClause = conditions.join('\n        AND ');

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM o4o_asset_snapshots s
    INNER JOIN kpa_store_asset_controls c
      ON c.snapshot_id = s.id AND c.organization_id = s.organization_id
    WHERE ${whereClause}
  `;

  // Data query params include limit and offset
  const dataParamOffset = paramIdx;
  queryParams.push(limit, offset);

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
    WHERE ${whereClause}
    ORDER BY
      c.is_forced DESC,
      s.created_at DESC
    LIMIT $${dataParamOffset} OFFSET $${dataParamOffset + 1}
  `;

  return {
    query,
    countQuery,
    params: queryParams,
    countParams,
  };
}
