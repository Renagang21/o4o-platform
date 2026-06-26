/**
 * Store Library Feed Controller — 내 자료함 통합 paginated feed
 *
 * WO-O4O-STORE-LIBRARY-DIRECT-CONTENT-UNIFIED-V1
 *
 * 매장 자료함의 "콘텐츠" 영역에서 snapshot 기반 자료(o4o_asset_snapshots) 와
 * direct 작성 자료(kpa_store_contents source_type='direct') 를 단일 paginated feed
 * 로 제공한다. 두 소스는 UNION ALL 후 sort_at(snapshot.created_at, direct.created_at)
 * 기준 정렬되어 페이지 일관성과 검색 일관성을 보장한다.
 *
 * WO-O4O-DIRECT-CONTENT-CREATED-AT-COLUMN-V1:
 *   direct 의 sort_at 을 updated_at → created_at 으로 변경. 수정해도 feed 순서가
 *   바뀌지 않도록 "생성 시점" 기준 정렬을 보장.
 *
 * 이 컨트롤러는 기존 `store-library.controller.ts` (store_library_items CRUD, 자료
 * Display Domain) 와 별개이며 mount 경로도 분리된다 — 자료함 "콘텐츠" 통합 view 전용.
 *
 * Endpoint:
 *   GET /store-library/contents?page=1&limit=20&search=...&type=document
 *
 * Query:
 *   - page  : 1+ (default 1)
 *   - limit : 1..50 (default 20)
 *   - search: title ILIKE partial match (1..200자, trim)
 *   - type  : 'document' (default; cms+content+direct 통합) — 향후 확장 가능
 *
 * 응답 (canonical):
 *   { success: true, data: { items, total, page, limit, totalPages } }
 *
 * Item (normalized):
 *   {
 *     id, origin('snapshot'|'direct'), selectionKey,
 *     assetType('cms'|'content'|null), title, contentJson,
 *     createdAt, lifecycleStatus
 *   }
 *
 * 정책:
 *   - libraryItem 독립성 유지 (id = snapshot.id 또는 store_content.id)
 *   - sourceAssetId 기반 dedupe 금지 — 동일 원본 다중 복사 유지
 *   - publishStatus / control 필드는 snapshot 항목에만 의미가 있음. direct 는 null
 *   - direct 콘텐츠 정렬 기준은 created_at (WO-O4O-DIRECT-CONTENT-CREATED-AT-COLUMN-V1)
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { KpaMember } from '../../kpa/entities/kpa-member.entity.js';
import type { AuthRequest } from '../../../types/auth.js';
import { isStoreOwner } from '../../../utils/store-owner.utils.js';

type AuthMiddleware = import('express').RequestHandler;

async function resolveDualOrgId(dataSource: DataSource, userId: string): Promise<string | null> {
  // store-content.controller 와 동일: organization_members(role_assignments) 우선,
  // kpa_members fallback. direct 작성/조회와 조회 일관성 유지를 위함.
  const { organizationId: orgFromRa } = await isStoreOwner(dataSource, userId, 'kpa');
  if (orgFromRa) return orgFromRa;
  const member = await dataSource.getRepository(KpaMember).findOne({ where: { user_id: userId } });
  return member?.organization_id || null;
}

export function createStoreLibraryFeedController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
): Router {
  const router = Router();

  router.get(
    '/contents',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        if (!userId) {
          res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
          return;
        }

        const organizationId = await resolveDualOrgId(dataSource, userId);
        if (!organizationId) {
          res.json({
            success: true,
            data: { items: [], total: 0, page: 1, limit: 20, totalPages: 1 },
          });
          return;
        }

        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
        const offset = (page - 1) * limit;
        const rawSearch = typeof req.query.search === 'string' ? req.query.search.trim() : '';
        const search = rawSearch.length > 0 ? rawSearch.slice(0, 200) : '';

        const requestedType = typeof req.query.type === 'string' && req.query.type !== ''
          ? req.query.type
          : 'document';
        if (requestedType !== 'document') {
          res.status(400).json({
            success: false,
            error: { code: 'INVALID_TYPE', message: "type must be 'document'" },
          });
          return;
        }

        // UNION ALL — snapshot(cms+content) + direct(source_type='direct')
        // sort_at = snapshot.created_at OR direct.created_at, ORDER BY DESC
        // (WO-O4O-DIRECT-CONTENT-CREATED-AT-COLUMN-V1: direct 도 created_at 사용)
        const useSearch = !!search;
        const searchPattern = useSearch ? `%${search}%` : null;

        // WO-O4O-KPA-CONTENT-LIST-TAG-SEARCH-FILTER-V1:
        //   출처 탭(source) + 태그 정확 필터(tag) + 태그 텍스트 검색(tags::text) 추가.
        //   source_group 매핑: snapshot.asset_type='cms' → 'operator'(운영자 제공),
        //     snapshot.asset_type='content' → 'community'(커뮤니티 가져옴),
        //     direct/execution-asset → 'mine'(내가 만든 콘텐츠).
        //   (kpa_contents 에 producer/author_role 컬럼이 없어 그 이상의 세분화는 불가 — asset_type 기준 매핑.)
        const ALLOWED_SOURCES = new Set(['operator', 'community', 'mine']);
        const rawSource = typeof req.query.source === 'string' ? req.query.source.trim() : '';
        const sourceFilter = ALLOWED_SOURCES.has(rawSource) ? rawSource : null; // 'all'/미지정 → null
        const rawTag = typeof req.query.tag === 'string' ? req.query.tag.trim().slice(0, 30) : '';
        const tagFilter = rawTag.length > 0 ? rawTag : null;
        const tagJson = tagFilter ? JSON.stringify([tagFilter]) : null;

        // bind 순서 (동적):
        //   data:  $1=orgId, $2=limit, $3=offset, [$4=search], [source], [tag]
        //   count: $1=orgId,                       [$2=search], [source], [tag]
        // search 는 limit/offset 뒤(data=$4), 그 다음 source/tag 가 이어진다.
        let dNext = useSearch ? 5 : 4;
        const dSourceIdx = sourceFilter ? dNext++ : 0;
        const dTagIdx = tagFilter ? dNext++ : 0;
        let cNext = useSearch ? 3 : 2;
        const cSourceIdx = sourceFilter ? cNext++ : 0;
        const cTagIdx = tagFilter ? cNext++ : 0;

        // 검색: 제목 + 본문/요약(content_json::text) + tags::text. exec 는 description/html_content/category 추가.
        const mkSnapDirSearch = (alias: string, idx: number) =>
          `AND (${alias}.title ILIKE $${idx} OR ${alias}.content_json::text ILIKE $${idx} OR ${alias}.tags::text ILIKE $${idx})`;
        const mkExecSearch = (idx: number) =>
          `AND (e.title ILIKE $${idx} OR COALESCE(e.description, '') ILIKE $${idx} OR COALESCE(e.html_content, '') ILIKE $${idx} OR COALESCE(e.category, '') ILIKE $${idx} OR e.tags::text ILIKE $${idx})`;
        const snapshotSearchClauseData = useSearch ? mkSnapDirSearch('s', 4) : '';
        const directSearchClauseData = useSearch ? mkSnapDirSearch('d', 4) : '';
        const execSearchClauseData = useSearch ? mkExecSearch(4) : '';
        const snapshotSearchClauseCount = useSearch ? mkSnapDirSearch('s', 2) : '';
        const directSearchClauseCount = useSearch ? mkSnapDirSearch('d', 2) : '';
        const execSearchClauseCount = useSearch ? mkExecSearch(2) : '';

        // outer 필터 (source_group / tags @> 정확 매칭). 'all' 은 source 절 없음.
        const mkOuterFilter = (sourceIdx: number, tagIdx: number) =>
          `${sourceIdx ? `AND source_group = $${sourceIdx}` : ''} ${tagIdx ? `AND tags @> $${tagIdx}::jsonb` : ''}`;
        const dataOuterFilter = mkOuterFilter(dSourceIdx, dTagIdx);
        const countOuterFilter = mkOuterFilter(cSourceIdx, cTagIdx);

        const dataQuery = `
          SELECT * FROM (
            (
              SELECT
                s.id::text AS id,
                'snapshot'::text AS origin,
                s.asset_type AS asset_type,
                CASE WHEN s.asset_type = 'cms' THEN 'operator' ELSE 'community' END AS source_group,
                s.title AS title,
                s.content_json AS content_json,
                s.created_at AS sort_at,
                COALESCE(c.lifecycle_status, 'active') AS lifecycle_status,
                -- WO-O4O-KPA-CONTENT-LIST-TAG-FIELD-AND-DISPLAY-V1: snapshot 태그는 기존 content_json 에 존재(resolver 복사).
                --   신규 tags 컬럼이 비어있으면 content_json->'tags' 로 fallback.
                COALESCE(NULLIF(s.tags, '[]'::jsonb), s.content_json->'tags', '[]'::jsonb) AS tags
              FROM o4o_asset_snapshots s
              LEFT JOIN kpa_store_asset_controls c
                ON c.snapshot_id = s.id AND c.organization_id = s.organization_id
              WHERE s.organization_id = $1
                AND s.asset_type IN ('cms', 'content')
                AND (c.publish_status IS NULL OR c.publish_status != 'hidden')
                ${snapshotSearchClauseData}
            )
            UNION ALL
            (
              SELECT
                d.id::text AS id,
                'direct'::text AS origin,
                NULL::varchar AS asset_type,
                'mine'::text AS source_group,
                d.title AS title,
                d.content_json AS content_json,
                d.created_at AS sort_at,
                NULL::varchar AS lifecycle_status,
                COALESCE(d.tags, '[]'::jsonb) AS tags
              FROM kpa_store_contents d
              WHERE d.organization_id = $1
                AND d.source_type = 'direct'
                ${directSearchClauseData}
            )
            UNION ALL
            (
              SELECT
                e.id::text AS id,
                'execution-asset'::text AS origin,
                'content'::varchar AS asset_type,
                'mine'::text AS source_group,
                e.title AS title,
                jsonb_build_object('html', e.html_content) AS content_json,
                e.created_at AS sort_at,
                NULL::varchar AS lifecycle_status,
                COALESCE(e.tags, '[]'::jsonb) AS tags
              FROM store_execution_assets e
              WHERE e.organization_id = $1
                AND e.is_active = true
                AND e.asset_type = 'content'
                ${execSearchClauseData}
            )
          ) AS unified
          WHERE 1=1 ${dataOuterFilter}
          ORDER BY sort_at DESC
          LIMIT $2 OFFSET $3
        `;

        const countQuery = `
          SELECT COUNT(*)::int AS total FROM (
            (
              SELECT
                (CASE WHEN s.asset_type = 'cms' THEN 'operator' ELSE 'community' END) AS source_group,
                COALESCE(NULLIF(s.tags, '[]'::jsonb), s.content_json->'tags', '[]'::jsonb) AS tags
              FROM o4o_asset_snapshots s
              LEFT JOIN kpa_store_asset_controls c
                ON c.snapshot_id = s.id AND c.organization_id = s.organization_id
              WHERE s.organization_id = $1
                AND s.asset_type IN ('cms', 'content')
                AND (c.publish_status IS NULL OR c.publish_status != 'hidden')
                ${snapshotSearchClauseCount}
            )
            UNION ALL
            (
              SELECT 'mine'::text AS source_group, COALESCE(d.tags, '[]'::jsonb) AS tags
              FROM kpa_store_contents d
              WHERE d.organization_id = $1
                AND d.source_type = 'direct'
                ${directSearchClauseCount}
            )
            UNION ALL
            (
              SELECT 'mine'::text AS source_group, COALESCE(e.tags, '[]'::jsonb) AS tags
              FROM store_execution_assets e
              WHERE e.organization_id = $1
                AND e.is_active = true
                AND e.asset_type = 'content'
                ${execSearchClauseCount}
            )
          ) AS unified
          WHERE 1=1 ${countOuterFilter}
        `;

        const dataParams: any[] = [organizationId, limit, offset];
        if (useSearch) dataParams.push(searchPattern);
        if (sourceFilter) dataParams.push(sourceFilter);
        if (tagJson) dataParams.push(tagJson);
        const countParams: any[] = [organizationId];
        if (useSearch) countParams.push(searchPattern);
        if (sourceFilter) countParams.push(sourceFilter);
        if (tagJson) countParams.push(tagJson);

        const [items, countResult] = await Promise.all([
          dataSource.query(dataQuery, dataParams),
          dataSource.query(countQuery, countParams),
        ]);

        const total = countResult[0]?.total || 0;
        const totalPages = Math.max(1, Math.ceil(total / limit));

        const normalized = (items as Array<{
          id: string;
          origin: 'snapshot' | 'direct' | 'execution-asset';
          asset_type: string | null;
          title: string;
          content_json: Record<string, unknown> | null;
          sort_at: string;
          lifecycle_status: string | null;
          tags: unknown;
        }>).map((row) => ({
          id: row.id,
          origin: row.origin,
          selectionKey: `${row.origin}:${row.id}`,
          assetType: row.asset_type,
          title: row.title,
          contentJson: row.content_json ?? {},
          createdAt: row.sort_at,
          lifecycleStatus: row.lifecycle_status,
          // WO-O4O-KPA-CONTENT-LIST-TAG-FIELD-AND-DISPLAY-V1: 항상 string[] 로 정규화.
          tags: Array.isArray(row.tags)
            ? row.tags.filter((t): t is string => typeof t === 'string')
            : [],
        }));

        res.json({
          success: true,
          data: { items: normalized, total, page, limit, totalPages },
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    },
  );

  return router;
}
