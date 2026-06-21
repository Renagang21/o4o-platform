/**
 * Multilingual Product Content Controller
 *
 * WO-O4O-MULTILINGUAL-PRODUCT-CONTENT-API-V1
 *
 * Store-scoped API for free multilingual product marketing content pages.
 * V1 intentionally avoids fixed content taxonomy and uses raw SQL so the large
 * connection.ts entity registry does not need to be touched before it is split.
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { createRequireStoreOwner, type StoreOwnerServiceKey } from '../../../utils/store-owner.utils.js';

type AuthMiddleware = RequestHandler;

type Locale = 'ko' | 'en' | 'zh' | 'ja' | 'vi' | 'th' | 'id';
type TargetKind = 'local' | 'listing';
type ContentFormat = 'blocks' | 'html' | 'image_sequence' | 'json';
type Status = 'draft' | 'published' | 'archived';
type SourceType = 'store_created' | 'operator_hub' | 'supplier_offline_imported';

const LOCALES = ['ko', 'en', 'zh', 'ja', 'vi', 'th', 'id'] as const;
const TARGET_KINDS = ['local', 'listing'] as const;
const CONTENT_FORMATS = ['blocks', 'html', 'image_sequence', 'json'] as const;
const STATUSES = ['draft', 'published', 'archived'] as const;
const SOURCE_TYPES = ['store_created', 'operator_hub', 'supplier_offline_imported'] as const;

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

async function assertTargetBelongsToStore(
  dataSource: DataSource,
  organizationId: string,
  serviceKey: string | undefined,
  targetKind: TargetKind,
  targetId: string,
): Promise<boolean> {
  if (targetKind === 'local') {
    const rows = await dataSource.query(
      `SELECT 1 FROM store_local_products
       WHERE id = $1 AND organization_id = $2 AND is_active = true
       LIMIT 1`,
      [targetId, organizationId],
    );
    return rows.length > 0;
  }

  const params: Array<string> = [targetId, organizationId];
  let serviceClause = '';
  if (serviceKey) {
    params.push(serviceKey === 'cosmetics' ? 'k-cosmetics' : serviceKey);
    serviceClause = `AND service_key = $${params.length}`;
  }

  const rows = await dataSource.query(
    `SELECT 1 FROM organization_product_listings
     WHERE id = $1 AND organization_id = $2 AND is_active = true
       ${serviceClause}
     LIMIT 1`,
    params,
  );
  return rows.length > 0;
}

async function loadGroupWithPages(
  dataSource: DataSource,
  groupId: string,
  organizationId: string,
): Promise<Record<string, unknown> | null> {
  const groupRows = await dataSource.query(
    `SELECT
       id,
       organization_id AS "organizationId",
       service_key AS "serviceKey",
       target_kind AS "targetKind",
       target_id AS "targetId",
       content_key AS "contentKey",
       title,
       default_locale AS "defaultLocale",
       source_type AS "sourceType",
       source_ref_id AS "sourceRefId",
       status,
       metadata,
       created_by_user_id AS "createdByUserId",
       created_at AS "createdAt",
       updated_at AS "updatedAt"
     FROM store_multilingual_product_content_groups
     WHERE id = $1 AND organization_id = $2
     LIMIT 1`,
    [groupId, organizationId],
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
     FROM store_multilingual_product_content_pages
     WHERE group_id = $1
     ORDER BY is_default DESC, sort_order ASC, locale ASC`,
    [groupId],
  );

  return { ...groupRows[0], pages };
}

function pickFallbackPage(pages: any[], requestedLocale: Locale | null, defaultLocale: string): any | null {
  if (requestedLocale) {
    const requested = pages.find((p) => p.locale === requestedLocale && p.status === 'published');
    if (requested) return { ...requested, resolvedLocale: requested.locale, fallbackReason: null };
  }
  const english = pages.find((p) => p.locale === 'en' && p.status === 'published');
  if (english) return { ...english, resolvedLocale: english.locale, fallbackReason: 'requested_locale_missing' };
  const defaultPage = pages.find((p) => p.locale === defaultLocale && p.status === 'published');
  if (defaultPage) return { ...defaultPage, resolvedLocale: defaultPage.locale, fallbackReason: 'requested_locale_missing' };
  const korean = pages.find((p) => p.locale === 'ko' && p.status === 'published');
  if (korean) return { ...korean, resolvedLocale: korean.locale, fallbackReason: 'requested_locale_missing' };
  return null;
}

export function createMultilingualProductContentController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
  serviceKey?: StoreOwnerServiceKey,
): Router {
  const router = Router();
  const requireStoreOwner = createRequireStoreOwner(dataSource, serviceKey);

  // GET /pharmacy/multilingual-product-contents
  router.get(
    '/pharmacy/multilingual-product-contents',
    requireAuth,
    requireStoreOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId as string;
      const targetKind = req.query.targetKind;
      const targetId = req.query.targetId;
      const contentKey = normalizeContentKey(req.query.contentKey);
      const includeArchived = req.query.includeArchived === 'true';

      const params: unknown[] = [organizationId];
      let where = 'WHERE organization_id = $1';
      if (isOneOf(targetKind, TARGET_KINDS)) {
        params.push(targetKind);
        where += ` AND target_kind = $${params.length}`;
      }
      if (typeof targetId === 'string' && targetId.trim()) {
        params.push(targetId.trim());
        where += ` AND target_id = $${params.length}`;
      }
      if (contentKey !== 'default' || typeof req.query.contentKey === 'string') {
        params.push(contentKey);
        where += ` AND content_key = $${params.length}`;
      }
      if (!includeArchived) {
        where += ` AND status <> 'archived'`;
      }

      const groups = await dataSource.query(
        `SELECT
           id,
           organization_id AS "organizationId",
           service_key AS "serviceKey",
           target_kind AS "targetKind",
           target_id AS "targetId",
           content_key AS "contentKey",
           title,
           default_locale AS "defaultLocale",
           source_type AS "sourceType",
           source_ref_id AS "sourceRefId",
           status,
           metadata,
           created_by_user_id AS "createdByUserId",
           created_at AS "createdAt",
           updated_at AS "updatedAt"
         FROM store_multilingual_product_content_groups
         ${where}
         ORDER BY updated_at DESC
         LIMIT 100`,
        params,
      );

      if (groups.length === 0) {
        res.json({ success: true, data: [] });
        return;
      }

      const groupIds = groups.map((g: any) => g.id);
      const pages = await dataSource.query(
        `SELECT
           id,
           group_id AS "groupId",
           locale,
           title,
           summary,
           content_format AS "contentFormat",
           status,
           is_default AS "isDefault",
           sort_order AS "sortOrder",
           created_at AS "createdAt",
           updated_at AS "updatedAt"
         FROM store_multilingual_product_content_pages
         WHERE group_id = ANY($1::uuid[])
         ORDER BY is_default DESC, sort_order ASC, locale ASC`,
        [groupIds],
      );

      const pageMap = new Map<string, any[]>();
      for (const page of pages) {
        const list = pageMap.get(page.groupId) || [];
        list.push(page);
        pageMap.set(page.groupId, list);
      }

      res.json({
        success: true,
        data: groups.map((g: any) => ({ ...g, pages: pageMap.get(g.id) || [] })),
      });
    }),
  );

  // POST /pharmacy/multilingual-product-contents — create or update group by target+contentKey
  router.post(
    '/pharmacy/multilingual-product-contents',
    requireAuth,
    requireStoreOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId as string;
      const userId = (req as any).user?.id as string | undefined;
      const targetKind = req.body?.targetKind;
      const targetId = asString(req.body?.targetId, 80);
      const contentKey = normalizeContentKey(req.body?.contentKey);
      const title = asString(req.body?.title, 255);
      const defaultLocale = isOneOf(req.body?.defaultLocale, LOCALES) ? req.body.defaultLocale : 'ko';
      const sourceType = isOneOf(req.body?.sourceType, SOURCE_TYPES) ? req.body.sourceType : 'store_created';
      const status = isOneOf(req.body?.status, STATUSES) ? req.body.status : 'draft';
      const metadata = normalizeJsonObject(req.body?.metadata);

      if (!isOneOf(targetKind, TARGET_KINDS) || !targetId || !title) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'targetKind, targetId and title are required' } });
        return;
      }

      const targetOk = await assertTargetBelongsToStore(dataSource, organizationId, serviceKey, targetKind, targetId);
      if (!targetOk) {
        res.status(404).json({ success: false, error: { code: 'TARGET_NOT_FOUND', message: 'Target product not found for this store' } });
        return;
      }

      const [group] = await dataSource.query(
        `INSERT INTO store_multilingual_product_content_groups
           (organization_id, service_key, target_kind, target_id, content_key, title, default_locale, source_type, status, metadata, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11)
         ON CONFLICT (organization_id, target_kind, target_id, content_key)
         DO UPDATE SET
           title = EXCLUDED.title,
           default_locale = EXCLUDED.default_locale,
           source_type = EXCLUDED.source_type,
           status = EXCLUDED.status,
           metadata = EXCLUDED.metadata,
           updated_at = now()
         RETURNING id`,
        [organizationId, serviceKey || null, targetKind, targetId, contentKey, title, defaultLocale, sourceType, status, JSON.stringify(metadata), userId || null],
      );

      const data = await loadGroupWithPages(dataSource, group.id, organizationId);
      res.status(201).json({ success: true, data });
    }),
  );

  // PATCH /pharmacy/multilingual-product-contents/:groupId
  router.patch(
    '/pharmacy/multilingual-product-contents/:groupId',
    requireAuth,
    requireStoreOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId as string;
      const { groupId } = req.params;
      const title = asString(req.body?.title, 255);
      const defaultLocale = isOneOf(req.body?.defaultLocale, LOCALES) ? req.body.defaultLocale : null;
      const status = isOneOf(req.body?.status, STATUSES) ? req.body.status : null;
      const metadata = req.body?.metadata === undefined ? null : normalizeJsonObject(req.body.metadata);

      const [updated] = await dataSource.query(
        `UPDATE store_multilingual_product_content_groups
         SET
           title = COALESCE($3, title),
           default_locale = COALESCE($4, default_locale),
           status = COALESCE($5, status),
           metadata = COALESCE($6::jsonb, metadata),
           updated_at = now()
         WHERE id = $1 AND organization_id = $2
         RETURNING id`,
        [groupId, organizationId, title, defaultLocale, status, metadata ? JSON.stringify(metadata) : null],
      );

      if (!updated) {
        res.status(404).json({ success: false, error: { code: 'GROUP_NOT_FOUND', message: 'Content group not found' } });
        return;
      }

      const data = await loadGroupWithPages(dataSource, groupId, organizationId);
      res.json({ success: true, data });
    }),
  );

  // PUT /pharmacy/multilingual-product-contents/:groupId/pages/:locale — upsert locale page
  router.put(
    '/pharmacy/multilingual-product-contents/:groupId/pages/:locale',
    requireAuth,
    requireStoreOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId as string;
      const userId = (req as any).user?.id as string | undefined;
      const { groupId, locale } = req.params;
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
        `SELECT id FROM store_multilingual_product_content_groups
         WHERE id = $1 AND organization_id = $2
         LIMIT 1`,
        [groupId, organizationId],
      );
      if (!group) {
        res.status(404).json({ success: false, error: { code: 'GROUP_NOT_FOUND', message: 'Content group not found' } });
        return;
      }

      await dataSource.query(
        `INSERT INTO store_multilingual_product_content_pages
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
          userId || null,
        ],
      );

      const data = await loadGroupWithPages(dataSource, groupId, organizationId);
      res.json({ success: true, data });
    }),
  );

  // GET /pharmacy/multilingual-product-contents/:groupId/resolve?locale=en
  router.get(
    '/pharmacy/multilingual-product-contents/:groupId/resolve',
    requireAuth,
    requireStoreOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId as string;
      const { groupId } = req.params;
      const requestedLocale = isOneOf(req.query.locale, LOCALES) ? req.query.locale : null;
      const group = await loadGroupWithPages(dataSource, groupId, organizationId);
      if (!group) {
        res.status(404).json({ success: false, error: { code: 'GROUP_NOT_FOUND', message: 'Content group not found' } });
        return;
      }

      const page = pickFallbackPage((group.pages as any[]) || [], requestedLocale, String(group.defaultLocale || 'ko'));
      if (!page) {
        res.status(404).json({ success: false, error: { code: 'PUBLISHED_PAGE_NOT_FOUND', message: 'No published locale page found' } });
        return;
      }

      res.json({ success: true, data: { group, page, requestedLocale } });
    }),
  );

  // PATCH /pharmacy/multilingual-product-contents/:groupId/pages/:locale/status
  router.patch(
    '/pharmacy/multilingual-product-contents/:groupId/pages/:locale/status',
    requireAuth,
    requireStoreOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId as string;
      const { groupId, locale } = req.params;
      const status = isOneOf(req.body?.status, STATUSES) ? req.body.status : null;
      if (!isOneOf(locale, LOCALES) || !status) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'valid locale and status are required' } });
        return;
      }

      const [updated] = await dataSource.query(
        `UPDATE store_multilingual_product_content_pages p
         SET status = $4, updated_at = now()
         FROM store_multilingual_product_content_groups g
         WHERE p.group_id = g.id
           AND p.group_id = $1
           AND p.locale = $2
           AND g.organization_id = $3
         RETURNING p.id`,
        [groupId, locale, organizationId, status],
      );
      if (!updated) {
        res.status(404).json({ success: false, error: { code: 'PAGE_NOT_FOUND', message: 'Content page not found' } });
        return;
      }

      const data = await loadGroupWithPages(dataSource, groupId, organizationId);
      res.json({ success: true, data });
    }),
  );

  return router;
}
