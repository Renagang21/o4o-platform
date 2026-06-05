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
import { OrganizationStore } from '../../../modules/store-core/entities/organization-store.entity.js';
import { StoreBlogPost } from '../../glycopharm/entities/store-blog-post.entity.js';
import type {
  StoreBlogPostStatus,
  StoreBlogPostAuthorRole,
} from '../../glycopharm/entities/store-blog-post.entity.js';
// WO-O4O-KPA-STORE-BLOG-META-V1
import { StoreBlogSettings } from '../../glycopharm/entities/store-blog-settings.entity.js';
import type { AuthRequest } from '../../../types/auth.js';
import { StoreSlugService } from '@o4o/platform-core/store-identity';
// WO-KPA-STORE-ASSET-DERIVATION-BLOG-WRITEPATH-V1: 원본(source)→blog_post 관계 기록
import { recordDerivations } from '../services/store-asset-derivation.service.js';

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
 * Allows reuse for KPA stores with service_key='kpa-society'
 */
export function createBlogController(
  dataSource: DataSource,
  requireAuth: RequestHandler,
  serviceKey: string = DEFAULT_SERVICE_KEY,
): Router {
  const router = Router();
  const orgRepo = dataSource.getRepository(OrganizationStore);
  const blogRepo = dataSource.getRepository(StoreBlogPost);
  // WO-O4O-KPA-STORE-BLOG-META-V1
  const settingsRepo = dataSource.getRepository(StoreBlogSettings);
  const slugService = new StoreSlugService(dataSource);

  // WO-O4O-KPA-STORE-BLOG-META-V1: 허용 template key 화이트리스트
  // 향후 유료 템플릿 추가 시 여기에 등록 (예: 'magazine', 'minimalist').
  const ALLOWED_TEMPLATES = new Set<string>(['professional', 'modern']);
  const DEFAULT_TEMPLATE = 'professional';

  function pickTemplate(input: unknown): string {
    if (typeof input !== 'string') return DEFAULT_TEMPLATE;
    return ALLOWED_TEMPLATES.has(input) ? input : DEFAULT_TEMPLATE;
  }

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
  // STAFF — 전체 게시글 목록 (draft 포함)
  // GET /stores/:slug/blog/staff
  // MUST be registered BEFORE /:slug/blog/:postSlug to avoid wildcard collision
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
      // WO-KPA-STORE-ASSET-DERIVATION-BLOG-WRITEPATH-V1: optional sourceItems (원본 관계 기록용)
      const { title, content, excerpt, slug: postSlug, sourceItems } = req.body;

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

      // WO-KPA-STORE-ASSET-DERIVATION-BLOG-WRITEPATH-V1:
      //   원본(source)→blog_post 관계 best-effort 기록. sourceItems 미전달 시 미기록(기존 동작 100%).
      //   organization_id = pharmacy.id ( = organizations.id, derivation/read endpoint 와 정합).
      //   실패해도 블로그 생성 응답을 막지 않는다(보조 트래킹).
      if (Array.isArray(sourceItems) && sourceItems.length > 0) {
        try {
          await recordDerivations(dataSource, {
            serviceKey,
            organizationId: pharmacy.id,
            createdBy: userId ?? null,
            derivedKind: 'blog_post',
            derivedId: saved.id,
            derivedTitle: saved.title,
            sources: sourceItems
              .filter((s: any) => s && s.id && s.kind)
              .map((s: any) => ({ kind: s.kind, id: s.id, title: s.title ?? null })),
          });
        } catch (derivationErr) {
          console.error('[store-blog] derivation record failed (non-blocking)', derivationErr);
        }
      }

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
  // ============================================================================
  // STAFF — Blog Settings 조회 (WO-O4O-KPA-STORE-BLOG-META-V1)
  // GET /stores/:slug/blog/staff/settings
  // 매장 settings row 가 없으면 null data 반환 (UI 가 default 폼으로 렌더).
  // ============================================================================
  router.get('/:slug/blog/staff/settings', requireAuth, async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
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

      const settings = await settingsRepo.findOne({ where: { storeId: pharmacy.id, serviceKey } });
      res.json({ success: true, data: settings ?? null });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  });

  // ============================================================================
  // STAFF — Blog Settings 저장 (upsert) (WO-O4O-KPA-STORE-BLOG-META-V1)
  // PUT /stores/:slug/blog/staff/settings
  // Body: { blogName?, description?, heroImage?, defaultTemplate? }
  // 미입력 컬럼은 null 또는 default 로 저장.
  // ============================================================================
  router.put('/:slug/blog/staff/settings', requireAuth, async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const authReq = req as unknown as AuthRequest;
      const userId = authReq.user?.id || authReq.authUser?.id;
      const { blogName, description, heroImage, defaultTemplate } = req.body ?? {};

      const pharmacy = await resolvePharmacy(slug);
      if (!pharmacy) {
        res.status(404).json({ success: false, error: { code: 'STORE_NOT_FOUND', message: 'Store not found' } });
        return;
      }
      if (!userId || !verifyOwner(pharmacy, userId)) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not the store owner' } });
        return;
      }

      const trim = (v: unknown): string | null => {
        if (typeof v !== 'string') return null;
        const t = v.trim();
        return t.length === 0 ? null : t;
      };

      const payload: Partial<StoreBlogSettings> = {
        storeId: pharmacy.id,
        serviceKey,
        blogName: trim(blogName),
        description: trim(description),
        heroImage: trim(heroImage),
        defaultTemplate: pickTemplate(defaultTemplate),
      };

      const existing = await settingsRepo.findOne({ where: { storeId: pharmacy.id, serviceKey } });
      let saved: StoreBlogSettings;
      if (existing) {
        existing.blogName = payload.blogName!;
        existing.description = payload.description!;
        existing.heroImage = payload.heroImage!;
        existing.defaultTemplate = payload.defaultTemplate!;
        saved = await settingsRepo.save(existing);
      } else {
        saved = await settingsRepo.save(settingsRepo.create(payload));
      }
      res.json({ success: true, data: saved });
    } catch (err: any) {
      // unique 충돌(동일 storeId 동시 insert) — 409 매핑
      if (String(err?.code) === '23505') {
        res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Settings already exist' } });
        return;
      }
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  });

  // ============================================================================
  // STAFF — 운영자 HUB 블로그 가져오기 (Operator HUB → 매장 사본)
  // POST /stores/:slug/blog/staff/import
  // body: { sourceBlogId: string }
  //
  // WO-O4O-STORE-HUB-BLOG-CONTENT-IMPORT-V1 (2026-05-24)
  //
  // 매장 경영자가 운영자 HUB 블로그를 자기 매장으로 가져온다.
  //   - 소스: store_blog_posts WHERE id=sourceBlogId AND author_role='operator'
  //           AND service_key=serviceKey AND status='published'
  //   - 사본: store_blog_posts INSERT (author_role='store', store_id=pharmacy.id,
  //           service_key=serviceKey, status='draft', title/excerpt/content 복사)
  //
  // 슬러그 충돌 시 timestamp suffix 로 fallback.
  // 사본의 excerpt 앞에 "[운영자 자료 가져옴] " 접두어로 출처 표시 (schema 변경 없는 MVP).
  // 향후 별도 origin/source_metadata 컬럼 도입 시 그쪽으로 이관.
  //
  // 권한: store_owner (verifyOwner 동일 패턴).
  // ============================================================================
  router.post('/:slug/blog/staff/import', requireAuth, async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const authReq = req as unknown as AuthRequest;
      const userId = authReq.user?.id || authReq.authUser?.id;
      const { sourceBlogId } = req.body ?? {};

      if (typeof sourceBlogId !== 'string' || sourceBlogId.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'sourceBlogId is required' },
        });
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

      // 1. 소스 블로그 조회 — 운영자 게시 + published + 같은 서비스만 허용
      const source = await blogRepo.findOne({
        where: {
          id: sourceBlogId,
          serviceKey,
          authorRole: 'operator' as StoreBlogPostAuthorRole,
          status: 'published' as StoreBlogPostStatus,
        },
      });
      if (!source) {
        res.status(404).json({
          success: false,
          error: {
            code: 'SOURCE_NOT_FOUND',
            message: 'Operator-published HUB blog not found for this service',
          },
        });
        return;
      }

      // 2. 슬러그 충돌 방지 — 매장 내 (store_id+slug) unique 정합
      const baseSlug = source.slug;
      let finalSlug = baseSlug;
      const existingBase = await blogRepo.findOne({
        where: { storeId: pharmacy.id, slug: baseSlug },
      });
      if (existingBase) {
        finalSlug = `${baseSlug}-${Date.now().toString(36)}`;
      }

      // 3. 매장 사본 생성 (author_role='store' + storeId NOT NULL)
      //    출처 표시: excerpt 접두어 (schema 변경 없는 MVP)
      const ORIGIN_PREFIX = '[운영자 자료 가져옴] ';
      const sourceExcerpt = (source.excerpt ?? '').trim();
      const copiedExcerpt = sourceExcerpt
        ? `${ORIGIN_PREFIX}${sourceExcerpt}`
        : ORIGIN_PREFIX.trim();

      const copy = blogRepo.create({
        storeId: pharmacy.id,
        serviceKey,
        authorRole: 'store' as StoreBlogPostAuthorRole,
        title: source.title,
        slug: finalSlug,
        excerpt: copiedExcerpt,
        content: source.content,
        status: 'draft' as StoreBlogPostStatus,
      });

      const saved = await blogRepo.save(copy);
      res.status(201).json({
        success: true,
        data: {
          ...saved,
          // 응답 메타 — frontend 가 "운영자 자료에서 가져옴" 토스트/표시 활용 가능
          importSource: {
            sourceBlogId: source.id,
            sourceTitle: source.title,
            sourceServiceKey: source.serviceKey,
            sourceAuthorRole: source.authorRole,
            importedAt: new Date().toISOString(),
          },
        },
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  });

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

  // ============================================================================
  // PUBLIC — Blog Settings 조회 (WO-O4O-KPA-STORE-BLOG-META-V1)
  // GET /stores/:slug/blog/settings
  // - 인증 불필요 — 공개 페이지가 blog identity (이름/소개/heroImage/template) 표시
  // - settings 미존재 시 null data 반환 (frontend 가 store info fallback)
  // - 라우트 순서: /:postSlug catch-all 보다 위에 등록 (`settings` literal 우선 매칭)
  // ============================================================================
  router.get('/:slug/blog/settings', async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const pharmacy = await resolvePharmacy(slug);
      if (!pharmacy) {
        res.status(404).json({ success: false, error: { code: 'STORE_NOT_FOUND', message: 'Store not found' } });
        return;
      }
      const settings = await settingsRepo.findOne({ where: { storeId: pharmacy.id, serviceKey } });
      res.json({ success: true, data: settings ?? null });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  });

  // ============================================================================
  // PUBLIC — 게시글 상세 (by postSlug)
  // GET /stores/:slug/blog/:postSlug
  // MUST be registered AFTER all /blog/staff routes to avoid wildcard collision
  // ============================================================================
  router.get('/:slug/blog/:postSlug', async (req: Request, res: Response) => {
    try {
      const { slug, postSlug } = req.params;

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

  return router;
}
