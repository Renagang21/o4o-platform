/**
 * Blog Controller — Store Blog Channel
 *
 * WO-STORE-BLOG-CHANNEL-V1
 * WO-KPA-STORE-ENGINE-IDENTICAL-MODE-V1: serviceKey 필터 일관성
 *
 * Public (인증 불필요):
 * - GET  /stores/:slug/blog              — 발행된 게시글 목록
 * - GET  /stores/:slug/blog/:postSlug    — 게시글 상세
 *
 * Staff (인증 + 소유자 확인):
 * - GET    /stores/:slug/blog/staff           — 전체 게시글 목록 (draft 포함)
 * - POST   /stores/:slug/blog/staff           — 게시글 생성
 * - PUT    /stores/:slug/blog/staff/:id       — 게시글 수정
 * - PATCH  /stores/:slug/blog/staff/:id/publish  — 발행
 * - PATCH  /stores/:slug/blog/staff/:id/archive  — 보관
 * - DELETE /stores/:slug/blog/staff/:id       — 삭제
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource, LessThanOrEqual } from 'typeorm';
import { OrganizationStore } from '../../kpa/entities/organization-store.entity.js';
import { StoreBlogPost } from '../entities/store-blog-post.entity.js';
import type { StoreBlogPostStatus } from '../entities/store-blog-post.entity.js';
import type { AuthRequest } from '../../../types/auth.js';
import { StoreSlugService } from '@o4o/platform-core/store-identity';

const DEFAULT_SERVICE_KEY = 'glycopharm';

/**
 * Generate URL-friendly slug from title.
 * Keeps Korean characters (URL-encoded by browser), strips special chars.
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 140);
}

/**
 * WO-KPA-STORE-CHANNEL-INTEGRATION-V1: serviceKey parameter
 * Allows reuse for KPA stores with service_key='kpa'
 */
export function createBlogController(
  dataSource: DataSource,
  requireAuth: RequestHandler,
  serviceKey: string = DEFAULT_SERVICE_KEY,
): Router {
  const router = Router();
  const orgRepo = dataSource.getRepository(OrganizationStore);
  const blogRepo = dataSource.getRepository(StoreBlogPost);
  const slugService = new StoreSlugService(dataSource);

  // Helper: resolve organization by slug (active stores only)
  async function resolvePharmacy(slug: string): Promise<OrganizationStore | null> {
    const record = await slugService.findBySlug(slug);
    if (!record || !record.isActive) return null;
    return orgRepo.findOne({ where: { id: record.storeId, isActive: true } });
  }

  // Helper: verify store ownership
  function verifyOwner(pharmacy: OrganizationStore, userId: string): boolean {
    return pharmacy.created_by_user_id === userId;
  }

  // ============================================================================
  // PUBLIC — 발행된 게시글 목록
  // GET /stores/:slug/blog
  // ============================================================================
  router.get('/:slug/blog', async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));

      const pharmacy = await resolvePharmacy(slug);
      if (!pharmacy) {
        res.status(404).json({ success: false, error: { code: 'STORE_NOT_FOUND', message: 'Store not found' } });
        return;
      }

      const [posts, total] = await blogRepo.findAndCount({
        where: {
          storeId: pharmacy.id,
          serviceKey,
          status: 'published' as StoreBlogPostStatus,
          publishedAt: LessThanOrEqual(new Date()),
        },
        order: { publishedAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
        select: ['id', 'title', 'slug', 'excerpt', 'status', 'publishedAt', 'createdAt'],
      });

      res.json({
        success: true,
        data: posts,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  });

  // ============================================================================
  // PUBLIC — 게시글 상세 (by postSlug)
  // GET /stores/:slug/blog/:postSlug
  // Must be registered AFTER /stores/:slug/blog/staff to avoid collision
  // ============================================================================
  router.get('/:slug/blog/:postSlug', async (req: Request, res: Response) => {
    try {
      const { slug, postSlug } = req.params;

      // "staff" is handled by the staff route above
      if (postSlug === 'staff') return;

      const pharmacy = await resolvePharmacy(slug);
      if (!pharmacy) {
        res.status(404).json({ success: false, error: { code: 'STORE_NOT_FOUND', message: 'Store not found' } });
        return;
      }

      const post = await blogRepo.findOne({
        where: {
          storeId: pharmacy.id,
          serviceKey,
          slug: postSlug,
          status: 'published' as StoreBlogPostStatus,
          publishedAt: LessThanOrEqual(new Date()),
        },
      });

      if (!post) {
        res.status(404).json({ success: false, error: { code: 'POST_NOT_FOUND', message: 'Blog post not found' } });
        return;
      }

      res.json({ success: true, data: post });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  });

  // ============================================================================
  // STAFF — 전체 게시글 목록 (draft 포함)
  // GET /stores/:slug/blog/staff
  // ============================================================================
  router.get('/:slug/blog/staff', requireAuth, async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const authReq = req as unknown as AuthRequest;
      const userId = authReq.user?.id || authReq.authUser?.id;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const statusFilter = req.query.status as string | undefined;

      const pharmacy = await resolvePharmacy(slug);
      if (!pharmacy) {
        res.status(404).json({ success: false, error: { code: 'STORE_NOT_FOUND', message: 'Store not found' } });
        return;
      }

      if (!userId || !verifyOwner(pharmacy, userId)) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not the store owner' } });
        return;
      }

      const where: any = { storeId: pharmacy.id, serviceKey };
      if (statusFilter && ['draft', 'published', 'archived'].includes(statusFilter)) {
        where.status = statusFilter;
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
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  });

  // ============================================================================
  // STAFF — 게시글 생성
  // POST /stores/:slug/blog/staff
  // ============================================================================
  router.post('/:slug/blog/staff', requireAuth, async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const authReq = req as unknown as AuthRequest;
      const userId = authReq.user?.id || authReq.authUser?.id;
      const { title, content, excerpt, slug: postSlug } = req.body;

      if (!title || !content) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'title and content are required' } });
        return;
      }

      const pharmacy = await resolvePharmacy(slug);
      if (!pharmacy) {
        res.status(404).json({ success: false, error: { code: 'STORE_NOT_FOUND', message: 'Store not found' } });
        return;
      }

      if (!userId || !verifyOwner(pharmacy, userId)) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not the store owner' } });
        return;
      }

      const finalSlug = postSlug || generateSlug(title);

      // Check slug uniqueness within store
      const existing = await blogRepo.findOne({ where: { storeId: pharmacy.id, slug: finalSlug } });
      if (existing) {
        res.status(409).json({ success: false, error: { code: 'SLUG_CONFLICT', message: 'A post with this slug already exists' } });
        return;
      }

      const post = blogRepo.create({
        storeId: pharmacy.id,
        serviceKey,
        title,
        slug: finalSlug,
        excerpt: excerpt || content.substring(0, 200),
        content,
        status: 'draft' as StoreBlogPostStatus,
      });

      const saved = await blogRepo.save(post);
      res.status(201).json({ success: true, data: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  });

  // ============================================================================
  // STAFF — 게시글 수정
  // PUT /stores/:slug/blog/staff/:id
  // ============================================================================
  router.put('/:slug/blog/staff/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const { slug, id } = req.params;
      const authReq = req as unknown as AuthRequest;
      const userId = authReq.user?.id || authReq.authUser?.id;
      const { title, content, excerpt, slug: postSlug } = req.body;

      const pharmacy = await resolvePharmacy(slug);
      if (!pharmacy) {
        res.status(404).json({ success: false, error: { code: 'STORE_NOT_FOUND', message: 'Store not found' } });
        return;
      }

      if (!userId || !verifyOwner(pharmacy, userId)) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not the store owner' } });
        return;
      }

      const post = await blogRepo.findOne({ where: { id, storeId: pharmacy.id } });
      if (!post) {
        res.status(404).json({ success: false, error: { code: 'POST_NOT_FOUND', message: 'Blog post not found' } });
        return;
      }

      // If slug is being changed, check uniqueness
      if (postSlug && postSlug !== post.slug) {
        const existing = await blogRepo.findOne({ where: { storeId: pharmacy.id, slug: postSlug } });
        if (existing) {
          res.status(409).json({ success: false, error: { code: 'SLUG_CONFLICT', message: 'A post with this slug already exists' } });
          return;
        }
        post.slug = postSlug;
      }

      if (title) post.title = title;
      if (content) post.content = content;
      if (excerpt !== undefined) post.excerpt = excerpt;

      const saved = await blogRepo.save(post);
      res.json({ success: true, data: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  });

  // ============================================================================
  // STAFF — 발행
  // PATCH /stores/:slug/blog/staff/:id/publish
  // ============================================================================
  router.patch('/:slug/blog/staff/:id/publish', requireAuth, async (req: Request, res: Response) => {
    try {
      const { slug, id } = req.params;
      const authReq = req as unknown as AuthRequest;
      const userId = authReq.user?.id || authReq.authUser?.id;

      const pharmacy = await resolvePharmacy(slug);
      if (!pharmacy) {
        res.status(404).json({ success: false, error: { code: 'STORE_NOT_FOUND', message: 'Store not found' } });
        return;
      }

      if (!userId || !verifyOwner(pharmacy, userId)) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not the store owner' } });
        return;
      }

      const post = await blogRepo.findOne({ where: { id, storeId: pharmacy.id } });
      if (!post) {
        res.status(404).json({ success: false, error: { code: 'POST_NOT_FOUND', message: 'Blog post not found' } });
        return;
      }

      if (post.status === 'published') {
        res.status(400).json({ success: false, error: { code: 'ALREADY_PUBLISHED', message: 'Post is already published' } });
        return;
      }

      post.status = 'published';
      post.publishedAt = new Date();
      const saved = await blogRepo.save(post);
      res.json({ success: true, data: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  });

  // ============================================================================
  // STAFF — 보관
  // PATCH /stores/:slug/blog/staff/:id/archive
  // ============================================================================
  router.patch('/:slug/blog/staff/:id/archive', requireAuth, async (req: Request, res: Response) => {
    try {
      const { slug, id } = req.params;
      const authReq = req as unknown as AuthRequest;
      const userId = authReq.user?.id || authReq.authUser?.id;

      const pharmacy = await resolvePharmacy(slug);
      if (!pharmacy) {
        res.status(404).json({ success: false, error: { code: 'STORE_NOT_FOUND', message: 'Store not found' } });
        return;
      }

      if (!userId || !verifyOwner(pharmacy, userId)) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not the store owner' } });
        return;
      }

      const post = await blogRepo.findOne({ where: { id, storeId: pharmacy.id } });
      if (!post) {
        res.status(404).json({ success: false, error: { code: 'POST_NOT_FOUND', message: 'Blog post not found' } });
        return;
      }

      post.status = 'archived';
      const saved = await blogRepo.save(post);
      res.json({ success: true, data: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  });

  // ============================================================================
  // STAFF — 삭제
  // DELETE /stores/:slug/blog/staff/:id
  // ============================================================================
  router.delete('/:slug/blog/staff/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const { slug, id } = req.params;
      const authReq = req as unknown as AuthRequest;
      const userId = authReq.user?.id || authReq.authUser?.id;

      const pharmacy = await resolvePharmacy(slug);
      if (!pharmacy) {
        res.status(404).json({ success: false, error: { code: 'STORE_NOT_FOUND', message: 'Store not found' } });
        return;
      }

      if (!userId || !verifyOwner(pharmacy, userId)) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not the store owner' } });
        return;
      }

      const post = await blogRepo.findOne({ where: { id, storeId: pharmacy.id } });
      if (!post) {
        res.status(404).json({ success: false, error: { code: 'POST_NOT_FOUND', message: 'Blog post not found' } });
        return;
      }

      await blogRepo.remove(post);
      res.json({ success: true, data: { id, deleted: true } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  });

  return router;
}
