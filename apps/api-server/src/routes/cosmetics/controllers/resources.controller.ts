/**
 * K-Cosmetics Resources Controller
 *
 * WO-O4O-KCOS-RESOURCES-BACKEND-V1
 *
 * Resource Layer — GP glycopharm_contents (canonical template) mirror.
 *
 * Public/Member:
 *   GET /api/v1/cosmetics/contents?sub_type=resource
 *
 * Operator:
 *   GET    /api/v1/cosmetics/operator/resources
 *   POST   /api/v1/cosmetics/operator/resources
 *   PATCH  /api/v1/cosmetics/operator/resources/:id/status
 *   DELETE /api/v1/cosmetics/operator/resources/:id
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

// ─── Public / Member 조회 + 회원 작성 라우터 ──────────────────────────────────
//
// WO-O4O-GP-KCOS-CONTENT-STANDARD-ROUTE-ALIGNMENT-V1 (Phase A):
//   KPA 회원 콘텐츠(`sub_type='content'`) 풀세트를 미러링.
//   - resource browse(`?sub_type=resource`) 기존 동작 유지(하위 호환)
//   - 회원 본문은 `body`(rich text) 에 저장. content_type 은 저장하지 않음.
//   - recommend / AI / copy-to-store 는 범위 외(제외).

function sanitizeContentTags(t: unknown): string[] {
  if (!Array.isArray(t)) return [];
  return [...new Set<string>(
    t.map((v: any) => String(v).trim().replace(/^#/, ''))
      .filter(Boolean).filter((v: string) => v.length <= 30),
  )];
}

export function createCosmeticsContentsRouter(
  dataSource: DataSource,
  optionalAuth: AuthMiddleware,
  authenticate: AuthMiddleware,
): Router {
  const router = Router();

  // operator/admin 판정 — 작성자 본인이 아니어도 수정/삭제 허용
  const isOperatorOrAdmin = (user: any): boolean =>
    Array.isArray(user?.roles) &&
    user.roles.some((r: string) =>
      r === 'cosmetics:operator' || r === 'cosmetics:admin' || r === 'platform:super_admin');

  // GET /contents — 목록 (optionalAuth). ?sub_type=resource(자료실) / ?sub_type=content(회원) / ?my=true
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
        category,
        tag,
        my,
        sort = 'latest',
      } = req.query;

      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.min(100, Math.max(1, Number(limit)));
      const offset = (pageNum - 1) * limitNum;
      const userId = (req as any).user?.id;

      const conditions: string[] = ['c.is_deleted = false'];
      const params: any[] = [];
      let idx = 1;

      // my=true: 내 콘텐츠만(로그인 필수) / 비로그인: published만 / 로그인: 본인 draft·private 포함
      if (my === 'true' && userId) {
        conditions.push(`c.created_by = $${idx++}`); params.push(userId);
      } else if (!userId) {
        conditions.push(`c.status = 'published'`);
      } else if (!statusFilter) {
        conditions.push(`(c.status = 'published' OR c.created_by = $${idx++})`);
        params.push(userId);
      }

      if (subType) { conditions.push(`c.sub_type = $${idx++}`); params.push(subType); }
      if (statusFilter) { conditions.push(`c.status = $${idx++}`); params.push(statusFilter); }
      if (usageTypeFilter) { conditions.push(`c.usage_type = $${idx++}`); params.push(usageTypeFilter); }
      if (sourceTypeFilter) { conditions.push(`c.source_type = $${idx++}`); params.push(sourceTypeFilter); }
      if (category) { conditions.push(`c.category = $${idx++}`); params.push(category); }
      if (tag) { conditions.push(`c.tags @> $${idx++}::jsonb`); params.push(JSON.stringify([tag])); }
      if (search) {
        conditions.push(
          `(c.title ILIKE $${idx} OR c.summary ILIKE $${idx} OR c.body ILIKE $${idx} OR c.author_name ILIKE $${idx} OR c.tags::text ILIKE $${idx})`,
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
          `SELECT COUNT(*)::int AS total FROM cosmetics_contents c ${where}`,
          params,
        ),
        dataSource.query(
          `SELECT c.id, c.title, c.summary, c.tags, c.category, c.status,
                  c.sub_type, c.source_type, c.usage_type, c.source_url, c.source_file_name,
                  c.thumbnail_url, c.created_by, c.author_name,
                  c.like_count, c.view_count, c.reusable_policy, c.created_at, c.updated_at
           FROM cosmetics_contents c ${where}
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
      console.error('[K-Cosmetics] GET /contents error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '목록 조회 중 오류가 발생했습니다' } });
    }
  });

  // POST /contents — 회원 작성 (authenticate)
  router.post('/', authenticate, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const {
        title, summary, body, tags, category, thumbnail_url,
        source_type = 'manual', source_url, source_file_name,
        sub_type: subType, usage_type: reqUsageType,
        status: reqStatus, reusable_policy: reqReusablePolicy,
      } = req.body;

      if (!title?.trim()) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'title은 필수입니다' } });
        return;
      }

      const sanitizedTags = sanitizeContentTags(tags);
      if (sanitizedTags.length === 0) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: '태그를 1개 이상 입력해주세요' } });
        return;
      }

      const status = (VALID_STATUSES as readonly string[]).includes(reqStatus) ? reqStatus : 'draft';
      const usageType = deriveUsageType(reqUsageType, source_type);
      if (usageType === 'COPY' && !(typeof body === 'string' && body.trim().length > 0)) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'COPY 타입은 본문(body)이 필요합니다' } });
        return;
      }
      const reusablePolicy = ['restricted', 'platform'].includes(reqReusablePolicy) ? reqReusablePolicy : 'platform';
      const authorName = user?.name || user?.email || null;

      const [inserted] = await dataSource.query(
        `INSERT INTO cosmetics_contents
           (title, summary, body, tags, category, thumbnail_url, sub_type,
            source_type, source_url, source_file_name, usage_type, status,
            created_by, updated_by, author_name, reusable_policy)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13,$14,$15)
         RETURNING *`,
        [
          title.trim(),
          summary || null,
          body || null,
          JSON.stringify(sanitizedTags),
          category || null,
          thumbnail_url || null,
          subType || null,
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
      console.error('[K-Cosmetics] POST /contents error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '등록 중 오류가 발생했습니다' } });
    }
  });

  // GET /contents/:id — 상세 (optionalAuth)
  router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
    try {
      const [content] = await dataSource.query(
        `SELECT * FROM cosmetics_contents WHERE id = $1 AND is_deleted = false LIMIT 1`,
        [req.params.id],
      );
      if (!content) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '콘텐츠를 찾을 수 없습니다' } });
        return;
      }
      res.json({ success: true, data: content });
    } catch (err) {
      console.error('[K-Cosmetics] GET /contents/:id error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '상세 조회 중 오류가 발생했습니다' } });
    }
  });

  // PATCH /contents/:id — 수정 (본인 또는 operator/admin)
  router.patch('/:id', authenticate, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const [existing] = await dataSource.query(
        `SELECT * FROM cosmetics_contents WHERE id = $1 AND is_deleted = false LIMIT 1`,
        [req.params.id],
      );
      if (!existing) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '콘텐츠를 찾을 수 없습니다' } });
        return;
      }
      if (existing.created_by !== user?.id && !isOperatorOrAdmin(user)) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '수정 권한이 없습니다' } });
        return;
      }

      const {
        title, summary, body, tags, category, thumbnail_url,
        source_type, source_url, source_file_name,
        sub_type: subType, usage_type: reqUsageType,
        status: reqStatus, reusable_policy: reqReusablePolicy,
      } = req.body;

      const sets: string[] = ['updated_at = NOW()'];
      const params: any[] = [];
      let idx = 1;

      if (title !== undefined) { sets.push(`title = $${idx++}`); params.push(title.trim()); }
      if (summary !== undefined) { sets.push(`summary = $${idx++}`); params.push(summary || null); }
      if (body !== undefined) { sets.push(`body = $${idx++}`); params.push(body || null); }
      if (tags !== undefined) {
        const sanitized = sanitizeContentTags(tags);
        if (sanitized.length === 0) {
          res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: '태그를 1개 이상 입력해주세요' } });
          return;
        }
        sets.push(`tags = $${idx++}`); params.push(JSON.stringify(sanitized));
      }
      if (category !== undefined) { sets.push(`category = $${idx++}`); params.push(category || null); }
      if (thumbnail_url !== undefined) { sets.push(`thumbnail_url = $${idx++}`); params.push(thumbnail_url || null); }
      if (source_type !== undefined) { sets.push(`source_type = $${idx++}`); params.push(source_type); }
      if (source_url !== undefined) { sets.push(`source_url = $${idx++}`); params.push(source_url || null); }
      if (source_file_name !== undefined) { sets.push(`source_file_name = $${idx++}`); params.push(source_file_name || null); }
      if (subType !== undefined) { sets.push(`sub_type = $${idx++}`); params.push(subType || null); }
      if (reqUsageType !== undefined) {
        sets.push(`usage_type = $${idx++}`);
        params.push((VALID_USAGE_TYPES as readonly string[]).includes(reqUsageType) ? reqUsageType : existing.usage_type);
      }
      if (reqStatus !== undefined) {
        sets.push(`status = $${idx++}`);
        params.push((VALID_STATUSES as readonly string[]).includes(reqStatus) ? reqStatus : existing.status);
      }
      if (reqReusablePolicy !== undefined) {
        sets.push(`reusable_policy = $${idx++}`);
        params.push(['restricted', 'platform'].includes(reqReusablePolicy) ? reqReusablePolicy : existing.reusable_policy);
      }
      sets.push(`updated_by = $${idx++}`); params.push(user?.id || null);

      params.push(existing.id);
      const [updated] = await dataSource.query(
        `UPDATE cosmetics_contents SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
        params,
      );
      res.json({ success: true, data: updated });
    } catch (err) {
      console.error('[K-Cosmetics] PATCH /contents/:id error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '수정 중 오류가 발생했습니다' } });
    }
  });

  // DELETE /contents/:id — soft delete (본인 또는 operator/admin)
  router.delete('/:id', authenticate, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const [existing] = await dataSource.query(
        `SELECT id, created_by FROM cosmetics_contents WHERE id = $1 AND is_deleted = false LIMIT 1`,
        [req.params.id],
      );
      if (!existing) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '콘텐츠를 찾을 수 없습니다' } });
        return;
      }
      if (existing.created_by !== user?.id && !isOperatorOrAdmin(user)) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '삭제 권한이 없습니다' } });
        return;
      }
      await dataSource.query(
        `UPDATE cosmetics_contents SET is_deleted = true, updated_at = NOW() WHERE id = $1`,
        [existing.id],
      );
      res.json({ success: true, data: { deleted: true, id: existing.id } });
    } catch (err) {
      console.error('[K-Cosmetics] DELETE /contents/:id error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '삭제 중 오류가 발생했습니다' } });
    }
  });

  // POST /contents/:id/view — 조회수 증가 (optionalAuth)
  router.post('/:id/view', optionalAuth, async (req: Request, res: Response) => {
    try {
      await dataSource.query(
        `UPDATE cosmetics_contents SET view_count = view_count + 1 WHERE id = $1 AND is_deleted = false`,
        [req.params.id],
      );
      res.json({ success: true });
    } catch (err) {
      console.error('[K-Cosmetics] POST /contents/:id/view error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '조회수 갱신 중 오류가 발생했습니다' } });
    }
  });

  return router;
}

// ─── Operator 관리 라우터 ─────────────────────────────────────────────────────

export function createCosmeticsOperatorResourcesRouter(
  dataSource: DataSource,
  authenticate: AuthMiddleware,
  requireCosmeticsScope: ScopeGuard,
): Router {
  const router = Router();

  // GET /operator/resources — 전체 status 포함 목록
  router.get(
    '/',
    authenticate,
    requireCosmeticsScope('cosmetics:operator'),
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
            `SELECT COUNT(*)::int AS total FROM cosmetics_contents c ${where}`,
            params,
          ),
          dataSource.query(
            `SELECT c.id, c.title, c.summary, c.tags, c.category, c.status,
                    c.source_type, c.usage_type, c.source_url, c.source_file_name,
                    c.thumbnail_url, c.created_by, c.author_name,
                    c.like_count, c.view_count, c.reusable_policy, c.created_at, c.updated_at
             FROM cosmetics_contents c ${where}
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
        console.error('[K-Cosmetics] GET /operator/resources error:', err);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '목록 조회 중 오류가 발생했습니다' } });
      }
    },
  );

  // POST /operator/resources — 자료 등록
  router.post(
    '/',
    authenticate,
    requireCosmeticsScope('cosmetics:operator'),
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
          `INSERT INTO cosmetics_contents
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
        console.error('[K-Cosmetics] POST /operator/resources error:', err);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '등록 중 오류가 발생했습니다' } });
      }
    },
  );

  // PATCH /operator/resources/:id/status — 상태 변경
  router.patch(
    '/:id/status',
    authenticate,
    requireCosmeticsScope('cosmetics:operator'),
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
          `SELECT id, title FROM cosmetics_contents WHERE id = $1 AND is_deleted = false LIMIT 1`,
          [req.params.id],
        );
        if (!existing) {
          res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '자료를 찾을 수 없습니다' } });
          return;
        }

        const [updated] = await dataSource.query(
          `UPDATE cosmetics_contents SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
          [newStatus, existing.id],
        );
        res.json({ success: true, data: updated });
      } catch (err) {
        console.error('[K-Cosmetics] PATCH /operator/resources/:id/status error:', err);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '상태 변경 중 오류가 발생했습니다' } });
      }
    },
  );

  // DELETE /operator/resources/:id — soft delete
  router.delete(
    '/:id',
    authenticate,
    requireCosmeticsScope('cosmetics:operator'),
    async (req: Request, res: Response) => {
      try {
        const [existing] = await dataSource.query(
          `SELECT id, title FROM cosmetics_contents WHERE id = $1 AND is_deleted = false LIMIT 1`,
          [req.params.id],
        );
        if (!existing) {
          res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '자료를 찾을 수 없습니다' } });
          return;
        }

        await dataSource.query(
          `UPDATE cosmetics_contents SET is_deleted = true, updated_at = NOW() WHERE id = $1`,
          [existing.id],
        );
        res.json({ success: true, data: { deleted: true, id: existing.id } });
      } catch (err) {
        console.error('[K-Cosmetics] DELETE /operator/resources/:id error:', err);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '삭제 중 오류가 발생했습니다' } });
      }
    },
  );

  return router;
}
