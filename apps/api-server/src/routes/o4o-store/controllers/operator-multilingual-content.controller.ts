/**
 * Operator Multilingual Product Content Controller — Operator HUB write API
 *
 * WO-O4O-KPA-MULTILINGUAL-PRODUCT-CONTENT-HUB-FLOW-PILOT-V1
 *
 * 운영자가 매장 HUB 에 게시할 다국어 상품 마케팅 콘텐츠 ORIGINAL 을 작성/수정/게시하는
 * backend write API. 매장 사본(store_multilingual_product_content_*)과 분리된 운영자
 * 원본(operator_multilingual_product_content_*)을 다룬다.
 *
 * operator-pop.controller.ts / operator-blog.controller.ts 의 requireOperator 가드 패턴 +
 * multilingual-product-content.controller.ts (store-owner) 의 raw SQL / locale page 패턴을 결합.
 *
 * 권한 (3 개 서비스 공통):
 *   - {service}:operator / {service}:admin / platform:admin / platform:super_admin
 *   (supplier / store_owner / member / pharmacist 차단 — 비로그인 차단)
 *
 * 서버 강제 저장 (body 무시):
 *   - author_role = 'operator'
 *   - service_key = controller 주입 serviceKey
 *
 * 라우트 (외부 mount: /api/v1/{serviceKey}/operator/multilingual-product-contents):
 *   - GET    /groups                       — 운영자 원본 목록 (draft + published + archived)
 *   - GET    /groups/:id                   — 단일 조회 (+ pages)
 *   - POST   /groups                       — 생성 (draft)
 *   - PUT    /groups/:id                   — 수정 (title/description/defaultLocale/contentKey/metadata)
 *   - PATCH  /groups/:id/publish           — 발행 (HUB 노출 시작)
 *   - PATCH  /groups/:id/archive           — 보관
 *   - DELETE /groups/:id                   — 삭제 (pages CASCADE)
 *   - PUT    /groups/:id/pages/:locale     — locale page upsert
 *   - PATCH  /groups/:id/pages/:locale/status — page 상태 변경
 *
 * 대상 서비스: KPA / GlycoPharm / K-Cosmetics
 * 제외: Neture (매장 기능 없음)
 *
 * 참조:
 *   - docs/baseline/O4O-OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1.md
 *   - apps/api-server/src/routes/o4o-store/controllers/operator-pop.controller.ts (가드 mirror)
 *   - apps/api-server/src/routes/o4o-store/controllers/multilingual-product-content.controller.ts (page 로직 mirror)
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { asyncHandler } from '../../../middleware/error-handler.js';
import type { AuthRequest } from '../../../types/auth.js';
import { hasAnyServiceRole } from '../../../utils/role.utils.js';
import type { PrefixedRole } from '../../../types/roles.js';

type AuthMiddleware = RequestHandler;

type Locale = 'ko' | 'en' | 'zh' | 'ja' | 'vi' | 'th' | 'id';
type ContentFormat = 'blocks' | 'html' | 'image_sequence' | 'json';
type Status = 'draft' | 'published' | 'archived';

const LOCALES = ['ko', 'en', 'zh', 'ja', 'vi', 'th', 'id'] as const;
const CONTENT_FORMATS = ['blocks', 'html', 'image_sequence', 'json'] as const;
const STATUSES = ['draft', 'published', 'archived'] as const;

function isOneOf<T extends readonly string[]>(value: unknown, values: T): value is T[number] {
  return typeof value === 'string' && (values as readonly string[]).includes(value);
}

function normalizeContentKey(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) return 'default';
  return value.trim().slice(0, 80);
}

function normalizeJsonObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function normalizeJsonArray(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item === 'object' && !Array.isArray(item)) as Array<Record<string, unknown>>;
}

function asString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function buildAllowedRoles(serviceKey: string): PrefixedRole[] {
  return [
    `${serviceKey}:admin` as PrefixedRole,
    `${serviceKey}:operator` as PrefixedRole,
    'platform:admin',
    'platform:super_admin',
  ];
}

async function loadOperatorGroupWithPages(
  dataSource: DataSource,
  groupId: string,
  serviceKey: string,
): Promise<Record<string, unknown> | null> {
  const groupRows = await dataSource.query(
    `SELECT
       id,
       service_key AS "serviceKey",
       author_role AS "authorRole",
       content_key AS "contentKey",
       title,
       description,
       default_locale AS "defaultLocale",
       status,
       published_at AS "publishedAt",
       metadata,
       created_by_user_id AS "createdByUserId",
       created_at AS "createdAt",
       updated_at AS "updatedAt"
     FROM operator_multilingual_product_content_groups
     WHERE id = $1 AND service_key = $2 AND author_role = 'operator'
     LIMIT 1`,
    [groupId, serviceKey],
  );
  if (groupRows.length === 0) return null;

  const pages = await dataSource.query(
    `SELECT
       id,
       group_id AS "groupId",
       locale,
       title,
       summary,
       content_format AS "contentFormat",
       content,
       assets,
       buttons,
       status,
       is_default AS "isDefault",
       sort_order AS "sortOrder",
       metadata,
       created_by_user_id AS "createdByUserId",
       created_at AS "createdAt",
       updated_at AS "updatedAt"
     FROM operator_multilingual_product_content_pages
     WHERE group_id = $1
     ORDER BY is_default DESC, sort_order ASC, locale ASC`,
    [groupId],
  );

  return { ...groupRows[0], pages };
}

export function createOperatorMultilingualContentController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
  serviceKey: string,
): Router {
  const router = Router();
  const allowedRoles = buildAllowedRoles(serviceKey);

  /** Operator/admin inline guard — operator-pop.controller.ts 동일 패턴. */
  function requireOperator(req: Request, res: Response): string | null {
    const authReq = req as unknown as AuthRequest;
    const userId = authReq.user?.id || (authReq as any).authUser?.id;
    const roles = (authReq.user?.roles as string[] | undefined) ?? [];

    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } });
      return null;
    }
    if (!hasAnyServiceRole(roles, allowedRoles)) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: `Operator or administrator role required for ${serviceKey}` },
      });
      return null;
    }
    return userId;
  }

  // GET /groups — 운영자 원본 목록
  router.get(
    '/groups',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      if (!requireOperator(req, res)) return;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const statusFilter = isOneOf(req.query.status, STATUSES) ? req.query.status : null;

      const params: unknown[] = [serviceKey];
      let where = `WHERE service_key = $1 AND author_role = 'operator'`;
      if (statusFilter) {
        params.push(statusFilter);
        where += ` AND status = $${params.length}`;
      }

      const totalRows = await dataSource.query(
        `SELECT COUNT(*)::int AS count FROM operator_multilingual_product_content_groups ${where}`,
        params,
      );
      const total = totalRows[0]?.count ?? 0;

      params.push(limit, (page - 1) * limit);
      const groups = await dataSource.query(
        `SELECT
           id,
           service_key AS "serviceKey",
           author_role AS "authorRole",
           content_key AS "contentKey",
           title,
           description,
           default_locale AS "defaultLocale",
           status,
           published_at AS "publishedAt",
           metadata,
           created_at AS "createdAt",
           updated_at AS "updatedAt"
         FROM operator_multilingual_product_content_groups
         ${where}
         ORDER BY updated_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      );

      if (groups.length === 0) {
        res.json({ success: true, data: [], meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
        return;
      }

      const groupIds = groups.map((g: any) => g.id);
      const pages = await dataSource.query(
        `SELECT
           id, group_id AS "groupId", locale, title, content_format AS "contentFormat",
           status, is_default AS "isDefault", sort_order AS "sortOrder", updated_at AS "updatedAt"
         FROM operator_multilingual_product_content_pages
         WHERE group_id = ANY($1::uuid[])
         ORDER BY is_default DESC, sort_order ASC, locale ASC`,
        [groupIds],
      );

      const pageMap = new Map<string, any[]>();
      for (const p of pages) {
        const list = pageMap.get(p.groupId) || [];
        list.push(p);
        pageMap.set(p.groupId, list);
      }

      res.json({
        success: true,
        data: groups.map((g: any) => ({ ...g, pages: pageMap.get(g.id) || [] })),
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }),
  );

  // GET /groups/:id — 단일 조회
  router.get(
    '/groups/:id',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      if (!requireOperator(req, res)) return;
      const data = await loadOperatorGroupWithPages(dataSource, req.params.id, serviceKey);
      if (!data) {
        res.status(404).json({ success: false, error: { code: 'GROUP_NOT_FOUND', message: 'Operator content group not found' } });
        return;
      }
      res.json({ success: true, data });
    }),
  );

  // POST /groups — 생성 (draft). 서버 강제: author_role='operator', service_key, status='draft'
  router.post(
    '/groups',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const userId = requireOperator(req, res);
      if (!userId) return;
      const title = asString(req.body?.title, 255);
      const description = req.body?.description === undefined ? null : asString(req.body?.description, 5000);
      const contentKey = normalizeContentKey(req.body?.contentKey);
      const defaultLocale = isOneOf(req.body?.defaultLocale, LOCALES) ? req.body.defaultLocale : 'ko';
      const metadata = normalizeJsonObject(req.body?.metadata);

      if (!title) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'title is required' } });
        return;
      }

      const [group] = await dataSource.query(
        `INSERT INTO operator_multilingual_product_content_groups
           (service_key, author_role, content_key, title, description, default_locale, status, metadata, created_by_user_id)
         VALUES ($1, 'operator', $2, $3, $4, $5, 'draft', $6::jsonb, $7)
         RETURNING id`,
        [serviceKey, contentKey, title, description, defaultLocale, JSON.stringify(metadata), userId],
      );

      const data = await loadOperatorGroupWithPages(dataSource, group.id, serviceKey);
      res.status(201).json({ success: true, data });
    }),
  );

  // PUT /groups/:id — 수정
  router.put(
    '/groups/:id',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      if (!requireOperator(req, res)) return;
      const { id } = req.params;
      const title = asString(req.body?.title, 255);
      const description = req.body?.description === undefined ? undefined : asString(req.body?.description, 5000);
      const contentKey = req.body?.contentKey === undefined ? null : normalizeContentKey(req.body?.contentKey);
      const defaultLocale = isOneOf(req.body?.defaultLocale, LOCALES) ? req.body.defaultLocale : null;
      const metadata = req.body?.metadata === undefined ? null : normalizeJsonObject(req.body.metadata);

      const [updated] = await dataSource.query(
        `UPDATE operator_multilingual_product_content_groups
         SET
           title = COALESCE($3, title),
           description = CASE WHEN $4::boolean THEN $5 ELSE description END,
           content_key = COALESCE($6, content_key),
           default_locale = COALESCE($7, default_locale),
           metadata = COALESCE($8::jsonb, metadata),
           updated_at = now()
         WHERE id = $1 AND service_key = $2 AND author_role = 'operator'
         RETURNING id`,
        [
          id,
          serviceKey,
          title,
          description !== undefined,
          description ?? null,
          contentKey,
          defaultLocale,
          metadata ? JSON.stringify(metadata) : null,
        ],
      );

      if (!updated) {
        res.status(404).json({ success: false, error: { code: 'GROUP_NOT_FOUND', message: 'Operator content group not found' } });
        return;
      }

      const data = await loadOperatorGroupWithPages(dataSource, id, serviceKey);
      res.json({ success: true, data });
    }),
  );

  // PATCH /groups/:id/publish — 발행
  router.patch(
    '/groups/:id/publish',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      if (!requireOperator(req, res)) return;
      const { id } = req.params;
      const [updated] = await dataSource.query(
        `UPDATE operator_multilingual_product_content_groups
         SET status = 'published', published_at = COALESCE(published_at, now()), updated_at = now()
         WHERE id = $1 AND service_key = $2 AND author_role = 'operator'
         RETURNING id`,
        [id, serviceKey],
      );
      if (!updated) {
        res.status(404).json({ success: false, error: { code: 'GROUP_NOT_FOUND', message: 'Operator content group not found' } });
        return;
      }
      const data = await loadOperatorGroupWithPages(dataSource, id, serviceKey);
      res.json({ success: true, data });
    }),
  );

  // PATCH /groups/:id/archive — 보관
  router.patch(
    '/groups/:id/archive',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      if (!requireOperator(req, res)) return;
      const { id } = req.params;
      const [updated] = await dataSource.query(
        `UPDATE operator_multilingual_product_content_groups
         SET status = 'archived', updated_at = now()
         WHERE id = $1 AND service_key = $2 AND author_role = 'operator'
         RETURNING id`,
        [id, serviceKey],
      );
      if (!updated) {
        res.status(404).json({ success: false, error: { code: 'GROUP_NOT_FOUND', message: 'Operator content group not found' } });
        return;
      }
      const data = await loadOperatorGroupWithPages(dataSource, id, serviceKey);
      res.json({ success: true, data });
    }),
  );

  // DELETE /groups/:id — 삭제 (pages CASCADE)
  router.delete(
    '/groups/:id',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      if (!requireOperator(req, res)) return;
      const { id } = req.params;
      const [deleted] = await dataSource.query(
        `DELETE FROM operator_multilingual_product_content_groups
         WHERE id = $1 AND service_key = $2 AND author_role = 'operator'
         RETURNING id`,
        [id, serviceKey],
      );
      if (!deleted) {
        res.status(404).json({ success: false, error: { code: 'GROUP_NOT_FOUND', message: 'Operator content group not found' } });
        return;
      }
      res.json({ success: true, data: { id, deleted: true } });
    }),
  );

  // PUT /groups/:id/pages/:locale — locale page upsert
  router.put(
    '/groups/:id/pages/:locale',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const userId = requireOperator(req, res);
      if (!userId) return;
      const { id: groupId, locale } = req.params;
      const title = asString(req.body?.title, 255);
      const summary = asString(req.body?.summary, 5000);
      const contentFormat = isOneOf(req.body?.contentFormat, CONTENT_FORMATS) ? req.body.contentFormat : 'blocks';
      const content = normalizeJsonObject(req.body?.content);
      const assets = normalizeJsonArray(req.body?.assets);
      const buttons = normalizeJsonArray(req.body?.buttons);
      const status = isOneOf(req.body?.status, STATUSES) ? req.body.status : 'draft';
      const isDefault = req.body?.isDefault === true;
      const sortOrder = Number.isFinite(Number(req.body?.sortOrder)) ? Number(req.body.sortOrder) : 0;
      const metadata = normalizeJsonObject(req.body?.metadata);

      if (!isOneOf(locale, LOCALES) || !title) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'valid locale and title are required' } });
        return;
      }

      const [group] = await dataSource.query(
        `SELECT id FROM operator_multilingual_product_content_groups
         WHERE id = $1 AND service_key = $2 AND author_role = 'operator'
         LIMIT 1`,
        [groupId, serviceKey],
      );
      if (!group) {
        res.status(404).json({ success: false, error: { code: 'GROUP_NOT_FOUND', message: 'Operator content group not found' } });
        return;
      }

      await dataSource.query(
        `INSERT INTO operator_multilingual_product_content_pages
           (group_id, locale, title, summary, content_format, content, assets, buttons, status, is_default, sort_order, metadata, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9, $10, $11, $12::jsonb, $13)
         ON CONFLICT (group_id, locale)
         DO UPDATE SET
           title = EXCLUDED.title,
           summary = EXCLUDED.summary,
           content_format = EXCLUDED.content_format,
           content = EXCLUDED.content,
           assets = EXCLUDED.assets,
           buttons = EXCLUDED.buttons,
           status = EXCLUDED.status,
           is_default = EXCLUDED.is_default,
           sort_order = EXCLUDED.sort_order,
           metadata = EXCLUDED.metadata,
           updated_at = now()`,
        [
          groupId,
          locale,
          title,
          summary,
          contentFormat,
          JSON.stringify(content),
          JSON.stringify(assets),
          JSON.stringify(buttons),
          status,
          isDefault,
          sortOrder,
          JSON.stringify(metadata),
          userId,
        ],
      );

      const data = await loadOperatorGroupWithPages(dataSource, groupId, serviceKey);
      res.json({ success: true, data });
    }),
  );

  // PATCH /groups/:id/pages/:locale/status — page 상태 변경
  router.patch(
    '/groups/:id/pages/:locale/status',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      if (!requireOperator(req, res)) return;
      const { id: groupId, locale } = req.params;
      const status = isOneOf(req.body?.status, STATUSES) ? req.body.status : null;
      if (!isOneOf(locale, LOCALES) || !status) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'valid locale and status are required' } });
        return;
      }

      const [updated] = await dataSource.query(
        `UPDATE operator_multilingual_product_content_pages p
         SET status = $4, updated_at = now()
         FROM operator_multilingual_product_content_groups g
         WHERE p.group_id = g.id
           AND p.group_id = $1
           AND p.locale = $2
           AND g.service_key = $3
           AND g.author_role = 'operator'
         RETURNING p.id`,
        [groupId, locale, serviceKey, status],
      );
      if (!updated) {
        res.status(404).json({ success: false, error: { code: 'PAGE_NOT_FOUND', message: 'Operator content page not found' } });
        return;
      }

      const data = await loadOperatorGroupWithPages(dataSource, groupId, serviceKey);
      res.json({ success: true, data });
    }),
  );

  return router;
}
