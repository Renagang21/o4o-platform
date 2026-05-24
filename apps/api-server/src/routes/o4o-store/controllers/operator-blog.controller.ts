/**
 * Operator Blog Controller — Operator HUB Blog Write API
 *
 * WO-O4O-OPERATOR-BLOG-PUBLISHING-WRITE-API-V1 (2026-05-24)
 *
 * 운영자가 매장 HUB 에 게시할 블로그 콘텐츠를 작성/수정/게시하는 backend write API.
 * 매장 직접 작성 (store owner) 경로 (blog.controller.ts) 와는 별도 라우터 — 권한·정책·
 * URL prefix 가 다르며, 같은 store_blog_posts 테이블을 author_role 로 분리한다.
 *
 * 권한 (3 개 서비스 공통):
 *   - {service}:operator
 *   - {service}:admin
 *   - platform:admin
 *   - platform:super_admin
 *   (supplier / store_owner / member 차단)
 *
 * 서버 강제 저장 (body 무시):
 *   - author_role = 'operator'
 *   - service_key = controller 주입 serviceKey
 *   - store_id    = null  (Canonical: 운영자 HUB 원본은 특정 매장 무귀속)
 *
 * 라우트 (router 내부, 외부 mount: /api/v1/{serviceKey}/operator/blog):
 *   - GET    /posts             — 운영자 게시 블로그 목록 (draft + published + archived)
 *   - GET    /posts/:id         — 단일 조회
 *   - POST   /posts             — 생성 (draft 로)
 *   - PUT    /posts/:id         — 수정
 *   - PATCH  /posts/:id/publish — 발행 (queryBlog HUB 노출 시작)
 *   - PATCH  /posts/:id/archive — 보관
 *   - DELETE /posts/:id         — 삭제
 *
 * 대상 서비스: KPA / GlycoPharm / K-Cosmetics
 * 제외: Neture (매장 기능 없음)
 *
 * 참조:
 *   - docs/baseline/O4O-OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1.md
 *   - docs/baseline/O4O-BUSINESS-PHILOSOPHY-V1.md (HUB 원본 vs 매장 사본)
 *   - apps/api-server/src/routes/o4o-store/controllers/blog.controller.ts (매장 직접 작성)
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { StoreBlogPost } from '../../glycopharm/entities/store-blog-post.entity.js';
import type {
  StoreBlogPostStatus,
  StoreBlogPostAuthorRole,
} from '../../glycopharm/entities/store-blog-post.entity.js';
import type { AuthRequest } from '../../../types/auth.js';
import { hasAnyServiceRole } from '../../../utils/role.utils.js';
import type { PrefixedRole } from '../../../types/roles.js';

/**
 * Generate URL-friendly slug from title.
 * Same algorithm as blog.controller.ts (store owner 경로) 와 동일.
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w가-힯ᄀ-ᇿ㄰-㆏\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 140);
}

/**
 * Operator 게시 허용 역할 — serviceKey 기반 동적 구성.
 */
function buildAllowedRoles(serviceKey: string): PrefixedRole[] {
  return [
    `${serviceKey}:admin` as PrefixedRole,
    `${serviceKey}:operator` as PrefixedRole,
    'platform:admin',
    'platform:super_admin',
  ];
}

export function createOperatorBlogController(
  dataSource: DataSource,
  requireAuth: RequestHandler,
  serviceKey: string,
): Router {
  const router = Router();
  const blogRepo = dataSource.getRepository(StoreBlogPost);
  const allowedRoles = buildAllowedRoles(serviceKey);

  /**
   * Operator/admin 권한 inline guard.
   * 다른 service controller (glycopharm/admin.controller.ts 등) 와 동일 패턴.
   */
  function requireOperator(req: Request, res: Response): string | null {
    const authReq = req as unknown as AuthRequest;
    const userId = authReq.user?.id || (authReq as any).authUser?.id;
    const roles = (authReq.user?.roles as string[] | undefined) ?? [];

    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
      });
      return null;
    }
    if (!hasAnyServiceRole(roles, allowedRoles)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Operator or administrator role required for ${serviceKey}`,
        },
      });
      return null;
    }
    return userId;
  }

  /**
   * Operator 게시 슬러그 충돌 검사.
   * store_id NULL 이라 DB unique (storeId, slug) 가 NULL 비교 안 함 → application-level 처리.
   * 같은 service_key + author_role='operator' + slug 인 row 가 있으면 409.
   */
  async function isOperatorSlugTaken(
    slug: string,
    excludeId?: string,
  ): Promise<boolean> {
    const params: any[] = [serviceKey, slug];
    let sql = `SELECT id FROM store_blog_posts
               WHERE service_key = $1
                 AND author_role = 'operator'
                 AND slug = $2`;
    if (excludeId) {
      sql += ` AND id <> $3`;
      params.push(excludeId);
    }
    sql += ` LIMIT 1`;
    const rows = await dataSource.query(sql, params);
    return rows.length > 0;
  }

  // ============================================================================
  // GET /posts — 운영자 게시 목록 (draft + published + archived)
  // ============================================================================
  router.get('/posts', requireAuth, async (req: Request, res: Response) => {
    if (!requireOperator(req, res)) return;
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const statusFilter = req.query.status as string | undefined;

      const where: any = {
        serviceKey,
        authorRole: 'operator' as StoreBlogPostAuthorRole,
      };
      if (statusFilter && ['draft', 'published', 'archived'].includes(statusFilter)) {
        where.status = statusFilter as StoreBlogPostStatus;
      }

      const [posts, total] = await blogRepo.findAndCount({
        where,
        order: { updatedAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      res.json({
        success: true,
        data: posts,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  });

  // ============================================================================
  // GET /posts/:id — 단일 조회
  // ============================================================================
  router.get('/posts/:id', requireAuth, async (req: Request, res: Response) => {
    if (!requireOperator(req, res)) return;
    try {
      const { id } = req.params;
      const post = await blogRepo.findOne({
        where: {
          id,
          serviceKey,
          authorRole: 'operator' as StoreBlogPostAuthorRole,
        },
      });
      if (!post) {
        res.status(404).json({
          success: false,
          error: { code: 'POST_NOT_FOUND', message: 'Operator blog post not found' },
        });
        return;
      }
      res.json({ success: true, data: post });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  });

  // ============================================================================
  // POST /posts — 생성 (draft)
  //
  // 서버 강제: author_role='operator', service_key=serviceKey, store_id=null, status='draft'
  // body: { title, content, excerpt?, slug? }
  // ============================================================================
  router.post('/posts', requireAuth, async (req: Request, res: Response) => {
    if (!requireOperator(req, res)) return;
    try {
      const { title, content, excerpt, slug: postSlug } = req.body ?? {};

      if (!title || !content) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'title and content are required' },
        });
        return;
      }

      const finalSlug = (typeof postSlug === 'string' && postSlug.trim().length > 0
        ? postSlug.trim()
        : generateSlug(title));

      if (await isOperatorSlugTaken(finalSlug)) {
        res.status(409).json({
          success: false,
          error: {
            code: 'SLUG_CONFLICT',
            message: 'An operator blog post with this slug already exists in this service',
          },
        });
        return;
      }

      // 서버 강제 저장 — body 의 author_role / service_key / store_id 는 무시
      const post = blogRepo.create({
        storeId: null,
        serviceKey,
        authorRole: 'operator' as StoreBlogPostAuthorRole,
        title,
        slug: finalSlug,
        excerpt: typeof excerpt === 'string' ? excerpt : String(content).substring(0, 200),
        content,
        status: 'draft' as StoreBlogPostStatus,
      });

      const saved = await blogRepo.save(post);
      res.status(201).json({ success: true, data: saved });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  });

  // ============================================================================
  // PUT /posts/:id — 수정
  //
  // 강제 보호: author_role / service_key / store_id 는 body 로 변경 불가.
  // body 변경 허용: title, content, excerpt, slug
  // ============================================================================
  router.put('/posts/:id', requireAuth, async (req: Request, res: Response) => {
    if (!requireOperator(req, res)) return;
    try {
      const { id } = req.params;
      const { title, content, excerpt, slug: postSlug } = req.body ?? {};

      const post = await blogRepo.findOne({
        where: {
          id,
          serviceKey,
          authorRole: 'operator' as StoreBlogPostAuthorRole,
        },
      });
      if (!post) {
        res.status(404).json({
          success: false,
          error: { code: 'POST_NOT_FOUND', message: 'Operator blog post not found' },
        });
        return;
      }

      if (typeof postSlug === 'string' && postSlug.trim().length > 0 && postSlug.trim() !== post.slug) {
        const newSlug = postSlug.trim();
        if (await isOperatorSlugTaken(newSlug, id)) {
          res.status(409).json({
            success: false,
            error: {
              code: 'SLUG_CONFLICT',
              message: 'An operator blog post with this slug already exists in this service',
            },
          });
          return;
        }
        post.slug = newSlug;
      }

      if (typeof title === 'string') post.title = title;
      if (typeof content === 'string') post.content = content;
      if (excerpt !== undefined) post.excerpt = typeof excerpt === 'string' ? excerpt : undefined;

      const saved = await blogRepo.save(post);
      res.json({ success: true, data: saved });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  });

  // ============================================================================
  // PATCH /posts/:id/publish — 발행
  // ============================================================================
  router.patch('/posts/:id/publish', requireAuth, async (req: Request, res: Response) => {
    if (!requireOperator(req, res)) return;
    try {
      const { id } = req.params;
      const post = await blogRepo.findOne({
        where: {
          id,
          serviceKey,
          authorRole: 'operator' as StoreBlogPostAuthorRole,
        },
      });
      if (!post) {
        res.status(404).json({
          success: false,
          error: { code: 'POST_NOT_FOUND', message: 'Operator blog post not found' },
        });
        return;
      }
      if (post.status === 'published') {
        res.status(400).json({
          success: false,
          error: { code: 'ALREADY_PUBLISHED', message: 'Post is already published' },
        });
        return;
      }
      post.status = 'published';
      post.publishedAt = new Date();
      const saved = await blogRepo.save(post);
      res.json({ success: true, data: saved });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  });

  // ============================================================================
  // PATCH /posts/:id/archive — 보관 (HUB 미노출)
  // ============================================================================
  router.patch('/posts/:id/archive', requireAuth, async (req: Request, res: Response) => {
    if (!requireOperator(req, res)) return;
    try {
      const { id } = req.params;
      const post = await blogRepo.findOne({
        where: {
          id,
          serviceKey,
          authorRole: 'operator' as StoreBlogPostAuthorRole,
        },
      });
      if (!post) {
        res.status(404).json({
          success: false,
          error: { code: 'POST_NOT_FOUND', message: 'Operator blog post not found' },
        });
        return;
      }
      post.status = 'archived';
      const saved = await blogRepo.save(post);
      res.json({ success: true, data: saved });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  });

  // ============================================================================
  // DELETE /posts/:id — 삭제
  // ============================================================================
  router.delete('/posts/:id', requireAuth, async (req: Request, res: Response) => {
    if (!requireOperator(req, res)) return;
    try {
      const { id } = req.params;
      const post = await blogRepo.findOne({
        where: {
          id,
          serviceKey,
          authorRole: 'operator' as StoreBlogPostAuthorRole,
        },
      });
      if (!post) {
        res.status(404).json({
          success: false,
          error: { code: 'POST_NOT_FOUND', message: 'Operator blog post not found' },
        });
        return;
      }
      await blogRepo.remove(post);
      res.json({ success: true, data: { id, deleted: true } });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  });

  return router;
}
