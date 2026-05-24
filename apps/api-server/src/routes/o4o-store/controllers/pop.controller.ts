/**
 * Store POP Controller — Store POP Channel (매장 store_pops 사본 관리)
 *
 * WO-O4O-KPA-STORE-HUB-POP-CONTENT-IMPORT-V1 (2026-05-24)
 *
 * 매장 경영자가 자기 매장 POP 사본 (author_role='store') 을 조회·수정·삭제하고,
 * 운영자가 발행한 HUB POP 을 자기 매장 사본으로 가져오는 staff API.
 *
 * blog.controller.ts staff CRUD + import 패턴 1:1 mirror — store_blog_posts 와
 * store_pops 가 동일 schema 형태이기 때문.
 *
 * Staff (인증 + 매장 owner 확인):
 *   GET    /stores/:slug/pop/staff           — 매장 store_pops 사본 목록 (author_role='store')
 *   POST   /stores/:slug/pop/staff/import    — 운영자 HUB POP 가져오기 (author_role='store' INSERT)
 *   PUT    /stores/:slug/pop/staff/:id       — 사본 수정
 *   DELETE /stores/:slug/pop/staff/:id       — 사본 삭제
 *
 * 본 WO 범위 외 (후속):
 *   - POST /stores/:slug/pop/staff (매장 직접 POP 작성)
 *   - PATCH /stores/:slug/pop/staff/:id/publish (매장 사본 발행)
 *   - PATCH /stores/:slug/pop/staff/:id/archive
 *
 * 기존 createStorePopController (PDF 생성, /pharmacy/pop/generate) 는 별도 controller —
 * 본 controller 는 store_pops 사본 row 관리 전용.
 *
 * Drift Guard:
 *   - import endpoint 는 author_role='operator' AND status='published' 원본만 통과
 *   - 사본 author_role='store' AND storeId NOT NULL 강제 (DB CHECK 제약 + 본 controller)
 *   - storeId 게이트 (storeId=pharmacy.id) 로 매장 간 사본 접근 차단
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { OrganizationStore } from '../../../modules/store-core/entities/organization-store.entity.js';
import { StorePop } from '../entities/store-pop.entity.js';
import type { StorePopStatus, StorePopAuthorRole } from '../entities/store-pop.entity.js';
import type { AuthRequest } from '../../../types/auth.js';
import { StoreSlugService } from '@o4o/platform-core/store-identity';

const DEFAULT_SERVICE_KEY = 'kpa';

export function createStorePopStaffController(
  dataSource: DataSource,
  requireAuth: RequestHandler,
  serviceKey: string = DEFAULT_SERVICE_KEY,
): Router {
  const router = Router();
  const orgRepo = dataSource.getRepository(OrganizationStore);
  const popRepo = dataSource.getRepository(StorePop);
  const slugService = new StoreSlugService(dataSource);

  // Helper: resolve organization by slug (active stores only) — blog.controller.ts mirror
  async function resolvePharmacy(slug: string): Promise<OrganizationStore | null> {
    const record = await slugService.findBySlug(slug);
    if (!record || !record.isActive) return null;
    return orgRepo.findOne({ where: { id: record.storeId, isActive: true } });
  }

  // Helper: verify store ownership — blog.controller.ts mirror
  function verifyOwner(pharmacy: OrganizationStore, userId: string): boolean {
    return pharmacy.created_by_user_id === userId;
  }

  // ============================================================================
  // STAFF — 매장 store_pops 사본 목록 (author_role='store' 한정)
  // GET /stores/:slug/pop/staff
  // ============================================================================
  router.get('/:slug/pop/staff', requireAuth, async (req: Request, res: Response) => {
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

      const where: any = {
        storeId: pharmacy.id,
        serviceKey,
        authorRole: 'store' as StorePopAuthorRole,
      };
      if (statusFilter && ['draft', 'published', 'archived'].includes(statusFilter)) {
        where.status = statusFilter as StorePopStatus;
      }

      const [posts, total] = await popRepo.findAndCount({
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
  // STAFF — 운영자 HUB POP 가져오기 (Operator HUB → 매장 사본)
  // POST /stores/:slug/pop/staff/import
  // body: { sourceId: string }
  //
  // blog import 패턴 mirror.
  //   - 소스: store_pops WHERE id=sourceId AND author_role='operator'
  //           AND service_key=serviceKey AND status='published'
  //   - 사본: store_pops INSERT (author_role='store', storeId=pharmacy.id,
  //           serviceKey, status='draft', title/excerpt/content 복사)
  //
  // 슬러그 충돌 시 timestamp suffix 로 fallback.
  // 사본 excerpt 앞에 "[운영자 자료 가져옴] " 접두어로 출처 표시 (schema 변경 없는 MVP).
  // 향후 별도 origin/source_metadata 컬럼 도입 시 그쪽으로 이관.
  // ============================================================================
  router.post('/:slug/pop/staff/import', requireAuth, async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const authReq = req as unknown as AuthRequest;
      const userId = authReq.user?.id || authReq.authUser?.id;
      const { sourceId } = req.body ?? {};

      if (typeof sourceId !== 'string' || sourceId.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'sourceId is required' },
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

      // 1. 소스 POP 조회 — 운영자 게시 + published + 같은 서비스만 허용
      const source = await popRepo.findOne({
        where: {
          id: sourceId,
          serviceKey,
          authorRole: 'operator' as StorePopAuthorRole,
          status: 'published' as StorePopStatus,
        },
      });
      if (!source) {
        res.status(404).json({
          success: false,
          error: {
            code: 'SOURCE_NOT_FOUND',
            message: 'Operator-published HUB POP not found for this service',
          },
        });
        return;
      }

      // 2. 슬러그 충돌 방지 — 매장 내 (store_id+slug) unique 정합
      const baseSlug = source.slug;
      let finalSlug = baseSlug;
      const existingBase = await popRepo.findOne({
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

      const copy = popRepo.create({
        storeId: pharmacy.id,
        serviceKey,
        authorRole: 'store' as StorePopAuthorRole,
        title: source.title,
        slug: finalSlug,
        excerpt: copiedExcerpt,
        content: source.content,
        status: 'draft' as StorePopStatus,
      });

      const saved = await popRepo.save(copy);
      res.status(201).json({
        success: true,
        data: {
          ...saved,
          // 응답 메타 — frontend 가 "운영자 자료에서 가져옴" 토스트/표시 활용 가능
          importSource: {
            sourceId: source.id,
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

  // ============================================================================
  // STAFF — 사본 수정
  // PUT /stores/:slug/pop/staff/:id
  //
  // 강제 보호: author_role / serviceKey / storeId 는 body 로 변경 불가.
  // body 변경 허용: title, content, excerpt, slug
  // 본 endpoint 는 author_role='store' 사본만 대상 — operator 원본은 조회 안 됨.
  // ============================================================================
  router.put('/:slug/pop/staff/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const { slug, id } = req.params;
      const authReq = req as unknown as AuthRequest;
      const userId = authReq.user?.id || authReq.authUser?.id;
      const { title, content, excerpt, slug: postSlug } = req.body ?? {};

      const pharmacy = await resolvePharmacy(slug);
      if (!pharmacy) {
        res.status(404).json({ success: false, error: { code: 'STORE_NOT_FOUND', message: 'Store not found' } });
        return;
      }
      if (!userId || !verifyOwner(pharmacy, userId)) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not the store owner' } });
        return;
      }

      const post = await popRepo.findOne({
        where: {
          id,
          storeId: pharmacy.id,
          serviceKey,
          authorRole: 'store' as StorePopAuthorRole,
        },
      });
      if (!post) {
        res.status(404).json({ success: false, error: { code: 'POST_NOT_FOUND', message: 'Store POP copy not found' } });
        return;
      }

      // If slug is being changed, check uniqueness within store
      if (typeof postSlug === 'string' && postSlug.trim().length > 0 && postSlug.trim() !== post.slug) {
        const newSlug = postSlug.trim();
        const existing = await popRepo.findOne({ where: { storeId: pharmacy.id, slug: newSlug } });
        if (existing) {
          res.status(409).json({
            success: false,
            error: { code: 'SLUG_CONFLICT', message: 'A POP with this slug already exists in this store' },
          });
          return;
        }
        post.slug = newSlug;
      }

      if (typeof title === 'string') post.title = title;
      if (typeof content === 'string') post.content = content;
      if (excerpt !== undefined) post.excerpt = typeof excerpt === 'string' ? excerpt : undefined;

      const saved = await popRepo.save(post);
      res.json({ success: true, data: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  });

  // ============================================================================
  // STAFF — 사본 삭제
  // DELETE /stores/:slug/pop/staff/:id
  // ============================================================================
  router.delete('/:slug/pop/staff/:id', requireAuth, async (req: Request, res: Response) => {
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

      const post = await popRepo.findOne({
        where: {
          id,
          storeId: pharmacy.id,
          serviceKey,
          authorRole: 'store' as StorePopAuthorRole,
        },
      });
      if (!post) {
        res.status(404).json({ success: false, error: { code: 'POST_NOT_FOUND', message: 'Store POP copy not found' } });
        return;
      }

      await popRepo.remove(post);
      res.json({ success: true, data: { id, deleted: true } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  });

  return router;
}
