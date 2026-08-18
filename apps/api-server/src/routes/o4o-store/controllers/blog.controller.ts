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
// WO-O4O-KPA-APPROVED-STORE-OWNER-AUTO-AUTHORIZATION-FIX-V1
import { kpaStoreOwnerOwnsStore } from '../utils/kpa-store-owner.util.js';
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
// WO-PHARMACY-HUB-STORE-CONTENT-LIBRARY-V1:
//   staff \uC800\uC791 \uB85C\uC9C1\uC744 services/store/store-blog.service.ts \uB85C \uCD94\uCD9C.
//   \uC774 \uCEE8\uD2B8\uB864\uB7EC\uB294 slug\u2192\uB9E4\uC7A5 \uD574\uC11D + \uC18C\uC720 \uD655\uC778 + \uC751\uB2F5 envelope \uB9CC \uB2F4\uB2F9\uD55C\uB2E4.
//   Pharmacy-Hub \uB294 \uAC19\uC740 \uC11C\uBE44\uC2A4 \uD568\uC218\uB97C enrollment \uAE30\uC900 \uC870\uC9C1 \uD574\uC11D\uAE30\uC640 \uD568\uAED8 \uD638\uCD9C\uD55C\uB2E4.
import {
  listStoreBlogPosts,
  createStoreBlogPost,
  updateStoreBlogPost,
  publishStoreBlogPost,
  archiveStoreBlogPost,
  deleteStoreBlogPost,
  type BlogFailure,
  type BlogResult,
} from '../../../services/store/store-blog.service.js';

const DEFAULT_SERVICE_KEY = 'glycopharm';

/**
 * \uC2E4\uD328 \uACB0\uACFC\uB97C \uC6D0\uBCF8\uACFC \uB3D9\uC77C\uD55C nested envelope \uC73C\uB85C \uB0B4\uB824\uBCF4\uB0B8\uB2E4.
 * (strictNullChecks \uAC00 \uAEBC\uC838 \uC788\uC5B4 `!result.ok` \uB85C union \uC774 \uC881\uD600\uC9C0\uC9C0 \uC54A\uB294\uB2E4.)
 */
function sendBlogFailure(res: Response, result: BlogResult<unknown>): void {
  const failure = result as BlogFailure;
  res.status(failure.status).json({
    success: false,
    error: { code: failure.code, message: failure.message },
  });
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
    // WO-O4O-STORE-SLUG-CANONICAL-CONTRACT-HARDENING-V1 §6:
    //   공개 조회는 slug 만 맞는다고 끝내지 않고 **service 귀속까지 일치**해야 한다.
    //   이 컨트롤러는 서비스별 mount(`/api/v1/{service}/stores/:slug/...`)이고
    //   `serviceKey` 는 slug 축(kpa / glycopharm / cosmetics)과 같은 값이 주입된다.
    //   slug row 의 service_key 가 다르면 이 서비스의 공개 매장이 아니다
    //   (다서비스 enrollment 조직이 다른 서비스 slug 로 열리던 결함).
    if (record.serviceKey !== serviceKey) return null;
    return orgRepo.findOne({ where: { id: record.storeId, isActive: true } });
  }

  // Helper: verify store ownership
  // WO-O4O-KPA-APPROVED-STORE-OWNER-AUTO-AUTHORIZATION-FIX-V1:
  // KPA 는 승인된 매장 경영자(role_assignments.kpa:store_owner, RBAC SSOT)면 소유자다.
  // created_by 는 생성자일 뿐 권한 SSOT 가 아니므로, 승인 경영자가 차단되던 결함을 수정.
  // 교차 매장 차단은 kpaStoreOwnerOwnsStore 내부(resolved org === store.id)에서 보장.
  // GlycoPharm / K-Cosmetics 는 기존 created_by 유지 — 별도 parity WO.
  async function verifyOwner(pharmacy: OrganizationStore, userId: string): Promise<boolean> {
    if (serviceKey === 'kpa') {
      return kpaStoreOwnerOwnsStore(dataSource, userId, pharmacy.id);
    }
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

      const pharmacy = await resolvePharmacy(slug);
      if (!pharmacy) {
        res.status(404).json({ success: false, error: { code: 'STORE_NOT_FOUND', message: 'Store not found' } });
        return;
      }

      if (!userId || !(await verifyOwner(pharmacy, userId))) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '이 매장의 경영자만 접근할 수 있습니다.' } });
        return;
      }

      const { posts, page, limit, total, totalPages } = await listStoreBlogPosts(
        dataSource,
        pharmacy.id,
        serviceKey,
        { page: req.query.page, limit: req.query.limit, status: req.query.status },
      );

      res.json({
        success: true,
        data: posts,
        meta: { page, limit, total, totalPages },
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
      // 원본 응답 순서 보존: 입력 누락(400)이 매장 조회(404)·소유 확인(403)보다 앞선다.
      if (!req.body?.title || !req.body?.content) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'title and content are required' } });
        return;
      }

      const pharmacy = await resolvePharmacy(slug);
      if (!pharmacy) {
        res.status(404).json({ success: false, error: { code: 'STORE_NOT_FOUND', message: 'Store not found' } });
        return;
      }

      if (!userId || !(await verifyOwner(pharmacy, userId))) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '이 매장의 경영자만 접근할 수 있습니다.' } });
        return;
      }

      // WO-KPA-STORE-ASSET-DERIVATION-BLOG-WRITEPATH-V1: optional sourceItems (원본 관계 기록용)
      const result = await createStoreBlogPost(dataSource, pharmacy.id, serviceKey, userId ?? null, req.body);
      if (!result.ok) {
        sendBlogFailure(res, result);
        return;
      }

      res.status(201).json({ success: true, data: result.data });
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

      const pharmacy = await resolvePharmacy(slug);
      if (!pharmacy) {
        res.status(404).json({ success: false, error: { code: 'STORE_NOT_FOUND', message: 'Store not found' } });
        return;
      }

      if (!userId || !(await verifyOwner(pharmacy, userId))) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '이 매장의 경영자만 접근할 수 있습니다.' } });
        return;
      }

      const result = await updateStoreBlogPost(dataSource, pharmacy.id, id, req.body);
      if (!result.ok) {
        sendBlogFailure(res, result);
        return;
      }

      res.json({ success: true, data: result.data });
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

      if (!userId || !(await verifyOwner(pharmacy, userId))) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '이 매장의 경영자만 접근할 수 있습니다.' } });
        return;
      }

      const result = await publishStoreBlogPost(dataSource, pharmacy.id, id);
      if (!result.ok) {
        sendBlogFailure(res, result);
        return;
      }

      res.json({ success: true, data: result.data });
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

      if (!userId || !(await verifyOwner(pharmacy, userId))) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '이 매장의 경영자만 접근할 수 있습니다.' } });
        return;
      }

      const result = await archiveStoreBlogPost(dataSource, pharmacy.id, id);
      if (!result.ok) {
        sendBlogFailure(res, result);
        return;
      }

      res.json({ success: true, data: result.data });
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
      if (!userId || !(await verifyOwner(pharmacy, userId))) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '이 매장의 경영자만 접근할 수 있습니다.' } });
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
      if (!userId || !(await verifyOwner(pharmacy, userId))) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '이 매장의 경영자만 접근할 수 있습니다.' } });
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

      if (!userId || !(await verifyOwner(pharmacy, userId))) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '이 매장의 경영자만 접근할 수 있습니다.' } });
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

      if (!userId || !(await verifyOwner(pharmacy, userId))) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '이 매장의 경영자만 접근할 수 있습니다.' } });
        return;
      }

      const result = await deleteStoreBlogPost(dataSource, pharmacy.id, id);
      if (!result.ok) {
        sendBlogFailure(res, result);
        return;
      }

      res.json({ success: true, data: result.data });
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
