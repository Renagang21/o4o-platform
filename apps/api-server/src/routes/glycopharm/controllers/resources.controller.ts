/**
 * GlycoPharm Resources Controller
 *
 * WO-O4O-GLYCOPHARM-RESOURCES-BACKEND-V1
 *
 * Resource Layer — KPA kpa_contents 패턴 기반.
 *
 * Public/Member:
 *   GET /api/v1/glycopharm/contents?sub_type=resource
 *
 * Operator:
 *   GET    /api/v1/glycopharm/operator/resources
 *   POST   /api/v1/glycopharm/operator/resources
 *   PATCH  /api/v1/glycopharm/operator/resources/:id/status
 *   DELETE /api/v1/glycopharm/operator/resources/:id
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';

type AuthMiddleware = (...args: any[]) => any;
type ScopeGuard = (scope: string) => AuthMiddleware;

const VALID_USAGE_TYPES = ['READ', 'LINK', 'DOWNLOAD', 'COPY'] as const;
const VALID_STATUSES = ['draft', 'published', 'private'] as const;

function deriveUsageType(reqUsageType: string | undefined, sourceType: string): string {
  if (reqUsageType && (VALID_USAGE_TYPES as readonly string[]).includes(reqUsageType)) return reqUsageType;
  if (sourceType === 'external') return 'LINK';
  if (sourceType === 'upload') return 'DOWNLOAD';
  return 'READ';
}

// ─── Public / Member 조회 라우터 ──────────────────────────────────────────────

export function createGlycopharmContentsRouter(
  dataSource: DataSource,
  optionalAuth: AuthMiddleware,
): Router {
  const router = Router();

  // GET /contents?sub_type=resource — 자료실 목록 (optionalAuth)
  router.get('/', optionalAuth, async (req: Request, res: Response) => {
    try {
      const {
        page = '1',
        limit = '20',
        search,
        sub_type: subType,
        usage_type: usageTypeFilter,
        source_type: sourceTypeFilter,
        status: statusFilter,
        sort = 'latest',
      } = req.query;

      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.min(100, Math.max(1, Number(limit)));
      const offset = (pageNum - 1) * limitNum;
      const userId = (req as any).user?.id;

      const conditions: string[] = ['c.is_deleted = false'];
      const params: any[] = [];
      let idx = 1;

      // 비로그인: published만, 로그인: 본인 draft/private 포함
      if (!userId) {
        conditions.push(`c.status = 'published'`);
      } else if (!statusFilter) {
        conditions.push(`(c.status = 'published' OR c.created_by = $${idx++})`);
        params.push(userId);
      }

      if (subType) { conditions.push(`c.sub_type = $${idx++}`); params.push(subType); }
      if (statusFilter) { conditions.push(`c.status = $${idx++}`); params.push(statusFilter); }
      if (usageTypeFilter) { conditions.push(`c.usage_type = $${idx++}`); params.push(usageTypeFilter); }
      if (sourceTypeFilter) { conditions.push(`c.source_type = $${idx++}`); params.push(sourceTypeFilter); }
      if (search) {
        conditions.push(
          `(c.title ILIKE $${idx} OR c.summary ILIKE $${idx} OR c.author_name ILIKE $${idx} OR c.tags::text ILIKE $${idx})`,
        );
        params.push(`%${search}%`);
        idx++;
      }

      let orderBy = 'c.created_at DESC';
      if (sort === 'popular') orderBy = 'c.like_count DESC, c.created_at DESC';
      else if (sort === 'views') orderBy = 'c.view_count DESC, c.created_at DESC';

      const where = `WHERE ${conditions.join(' AND ')}`;
      const [[{ total }], rows] = await Promise.all([
        dataSource.query(
          `SELECT COUNT(*)::int AS total FROM glycopharm_contents c ${where}`,
          params,
        ),
        dataSource.query(
          `SELECT c.id, c.title, c.summary, c.tags, c.category, c.status,
                  c.sub_type, c.source_type, c.usage_type, c.source_url, c.source_file_name,
                  c.thumbnail_url, c.created_by, c.author_name,
                  c.like_count, c.view_count, c.reusable_policy, c.created_at, c.updated_at
           FROM glycopharm_contents c ${where}
           ORDER BY ${orderBy}
           LIMIT $${idx} OFFSET $${idx + 1}`,
          [...params, limitNum, offset],
        ),
      ]);

      res.json({
        success: true,
        data: {
          items: rows,
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (err) {
      console.error('[GlycoPharm] GET /contents error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '목록 조회 중 오류가 발생했습니다' } });
    }
  });

  return router;
}

// ─── Operator 관리 라우터 ─────────────────────────────────────────────────────

export function createGlycopharmOperatorResourcesRouter(
  dataSource: DataSource,
  authenticate: AuthMiddleware,
  requireGlycopharmScope: ScopeGuard,
): Router {
  const router = Router();

  // GET /operator/resources — 전체 status 포함 목록
  router.get(
    '/',
    authenticate,
    requireGlycopharmScope('glycopharm:operator'),
    async (req: Request, res: Response) => {
      try {
        const {
          page = '1',
          limit = '20',
          search,
          source_type: sourceTypeFilter,
          status: statusFilter,
          usage_type: usageTypeFilter,
        } = req.query;

        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.min(100, Math.max(1, Number(limit)));
        const offset = (pageNum - 1) * limitNum;

        const conditions: string[] = [`c.is_deleted = false`, `c.sub_type = 'resource'`];
        const params: any[] = [];
        let idx = 1;

        if (sourceTypeFilter) { conditions.push(`c.source_type = $${idx++}`); params.push(sourceTypeFilter); }
        if (statusFilter) { conditions.push(`c.status = $${idx++}`); params.push(statusFilter); }
        if (usageTypeFilter) { conditions.push(`c.usage_type = $${idx++}`); params.push(usageTypeFilter); }
        if (search) {
          conditions.push(
            `(c.title ILIKE $${idx} OR c.summary ILIKE $${idx} OR c.tags::text ILIKE $${idx})`,
          );
          params.push(`%${search}%`);
          idx++;
        }

        const where = `WHERE ${conditions.join(' AND ')}`;
        const [[{ total }], rows] = await Promise.all([
          dataSource.query(
            `SELECT COUNT(*)::int AS total FROM glycopharm_contents c ${where}`,
            params,
          ),
          dataSource.query(
            `SELECT c.id, c.title, c.summary, c.tags, c.category, c.status,
                    c.source_type, c.usage_type, c.source_url, c.source_file_name,
                    c.thumbnail_url, c.created_by, c.author_name,
                    c.like_count, c.view_count, c.reusable_policy, c.created_at, c.updated_at
             FROM glycopharm_contents c ${where}
             ORDER BY c.created_at DESC
             LIMIT $${idx} OFFSET $${idx + 1}`,
            [...params, limitNum, offset],
          ),
        ]);

        res.json({
          success: true,
          data: { items: rows, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
        });
      } catch (err) {
        console.error('[GlycoPharm] GET /operator/resources error:', err);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '목록 조회 중 오류가 발생했습니다' } });
      }
    },
  );

  // POST /operator/resources — 자료 등록
  router.post(
    '/',
    authenticate,
    requireGlycopharmScope('glycopharm:operator'),
    async (req: Request, res: Response) => {
      try {
        const user = (req as any).user;
        const {
          title,
          summary,
          blocks,
          tags,
          category,
          thumbnail_url,
          source_type = 'manual',
          source_url,
          source_file_name,
          usage_type: reqUsageType,
          status: reqStatus,
          reusable_policy: reqReusablePolicy,
        } = req.body;

        if (!title?.trim()) {
          res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'title은 필수입니다' } });
          return;
        }

        const sanitizedTags = Array.isArray(tags)
          ? [...new Set<string>(tags.map((v: any) => String(v).trim().replace(/^#/, '')).filter(Boolean))]
          : [];

        const status = (VALID_STATUSES as readonly string[]).includes(reqStatus) ? reqStatus : 'draft';
        const usageType = deriveUsageType(reqUsageType, source_type);
        const reusablePolicy = ['restricted', 'platform'].includes(reqReusablePolicy) ? reqReusablePolicy : 'platform';
        const authorName = user?.name || user?.email || null;

        const [inserted] = await dataSource.query(
          `INSERT INTO glycopharm_contents
             (title, summary, blocks, tags, category, thumbnail_url, sub_type,
              source_type, source_url, source_file_name, usage_type, status,
              created_by, updated_by, author_name, reusable_policy)
           VALUES ($1,$2,$3,$4,$5,$6,'resource',$7,$8,$9,$10,$11,$12,$12,$13,$14)
           RETURNING *`,
          [
            title.trim(),
            summary || null,
            JSON.stringify(Array.isArray(blocks) ? blocks : []),
            JSON.stringify(sanitizedTags),
            category || null,
            thumbnail_url || null,
            source_type,
            source_url || null,
            source_file_name || null,
            usageType,
            status,
            user?.id || null,
            authorName,
            reusablePolicy,
          ],
        );

        res.status(201).json({ success: true, data: inserted });
      } catch (err) {
        console.error('[GlycoPharm] POST /operator/resources error:', err);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '등록 중 오류가 발생했습니다' } });
      }
    },
  );

  // PATCH /operator/resources/:id/status — 상태 변경
  router.patch(
    '/:id/status',
    authenticate,
    requireGlycopharmScope('glycopharm:operator'),
    async (req: Request, res: Response) => {
      try {
        const { status: newStatus } = req.body;
        if (!newStatus || !(VALID_STATUSES as readonly string[]).includes(newStatus)) {
          res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: `status는 ${VALID_STATUSES.join(', ')} 중 하나여야 합니다` },
          });
          return;
        }

        const [existing] = await dataSource.query(
          `SELECT id, title FROM glycopharm_contents WHERE id = $1 AND is_deleted = false LIMIT 1`,
          [req.params.id],
        );
        if (!existing) {
          res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '자료를 찾을 수 없습니다' } });
          return;
        }

        const [updated] = await dataSource.query(
          `UPDATE glycopharm_contents SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
          [newStatus, existing.id],
        );
        res.json({ success: true, data: updated });
      } catch (err) {
        console.error('[GlycoPharm] PATCH /operator/resources/:id/status error:', err);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '상태 변경 중 오류가 발생했습니다' } });
      }
    },
  );

  // DELETE /operator/resources/:id — soft delete
  router.delete(
    '/:id',
    authenticate,
    requireGlycopharmScope('glycopharm:operator'),
    async (req: Request, res: Response) => {
      try {
        const [existing] = await dataSource.query(
          `SELECT id, title FROM glycopharm_contents WHERE id = $1 AND is_deleted = false LIMIT 1`,
          [req.params.id],
        );
        if (!existing) {
          res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '자료를 찾을 수 없습니다' } });
          return;
        }

        await dataSource.query(
          `UPDATE glycopharm_contents SET is_deleted = true, updated_at = NOW() WHERE id = $1`,
          [existing.id],
        );
        res.json({ success: true, data: { deleted: true, id: existing.id } });
      } catch (err) {
        console.error('[GlycoPharm] DELETE /operator/resources/:id error:', err);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '삭제 중 오류가 발생했습니다' } });
      }
    },
  );

  return router;
}
