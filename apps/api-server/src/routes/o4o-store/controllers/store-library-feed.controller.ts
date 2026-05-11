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

        // bind 순서:
        //   - data query: $1=orgId, $2=limit, $3=offset, [$4=searchPattern]
        //   - count query: $1=orgId, [$2=searchPattern]
        const snapshotSearchClauseData = useSearch ? `AND s.title ILIKE $4` : '';
        const directSearchClauseData = useSearch ? `AND d.title ILIKE $4` : '';
        const snapshotSearchClauseCount = useSearch ? `AND s.title ILIKE $2` : '';
        const directSearchClauseCount = useSearch ? `AND d.title ILIKE $2` : '';

        const dataQuery = `
          SELECT * FROM (
            (
              SELECT
                s.id::text AS id,
                'snapshot'::text AS origin,
                s.asset_type AS asset_type,
                s.title AS title,
                s.content_json AS content_json,
                s.created_at AS sort_at,
                COALESCE(c.lifecycle_status, 'active') AS lifecycle_status
              FROM o4o_asset_snapshots s
              LEFT JOIN kpa_store_asset_controls c
                ON c.snapshot_id = s.id AND c.organization_id = s.organization_id
              WHERE s.organization_id = $1
                AND s.asset_type IN ('cms', 'content')
                ${snapshotSearchClauseData}
            )
            UNION ALL
            (
              SELECT
                d.id::text AS id,
                'direct'::text AS origin,
                NULL::varchar AS asset_type,
                d.title AS title,
                d.content_json AS content_json,
                d.created_at AS sort_at,
                NULL::varchar AS lifecycle_status
              FROM kpa_store_contents d
              WHERE d.organization_id = $1
                AND d.source_type = 'direct'
                ${directSearchClauseData}
            )
          ) AS unified
          ORDER BY sort_at DESC
          LIMIT $2 OFFSET $3
        `;

        const countQuery = `
          SELECT COUNT(*)::int AS total FROM (
            (
              SELECT 1
              FROM o4o_asset_snapshots s
              WHERE s.organization_id = $1
                AND s.asset_type IN ('cms', 'content')
                ${snapshotSearchClauseCount}
            )
            UNION ALL
            (
              SELECT 1
              FROM kpa_store_contents d
              WHERE d.organization_id = $1
                AND d.source_type = 'direct'
                ${directSearchClauseCount}
            )
          ) AS unified
        `;

        const dataParams: any[] = useSearch
          ? [organizationId, limit, offset, searchPattern]
          : [organizationId, limit, offset];
        const countParams: any[] = useSearch
          ? [organizationId, searchPattern]
          : [organizationId];

        const [items, countResult] = await Promise.all([
          dataSource.query(dataQuery, dataParams),
          dataSource.query(countQuery, countParams),
        ]);

        const total = countResult[0]?.total || 0;
        const totalPages = Math.max(1, Math.ceil(total / limit));

        const normalized = (items as Array<{
          id: string;
          origin: 'snapshot' | 'direct';
          asset_type: string | null;
          title: string;
          content_json: Record<string, unknown> | null;
          sort_at: string;
          lifecycle_status: string | null;
        }>).map((row) => ({
          id: row.id,
          origin: row.origin,
          selectionKey: `${row.origin}:${row.id}`,
          assetType: row.asset_type,
          title: row.title,
          contentJson: row.content_json ?? {},
          createdAt: row.sort_at,
          lifecycleStatus: row.lifecycle_status,
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
