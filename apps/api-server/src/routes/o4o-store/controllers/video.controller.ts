/**
 * Store Video Controller — Store Video Channel (매장 store_videos 사본 관리)
 *
 * WO-O4O-KPA-QR-CODE-VIDEO-CONTENT-V1 (2026-06-23)
 *
 * 매장 경영자가 운영자 HUB 동영상을 자기 매장 사본으로 가져오고(=복사), 사본을 조회·수정·삭제하는
 * staff API. pop.controller.ts 의 staff CRUD + import 패턴 mirror.
 *
 * V1 범위:
 *   GET    /stores/:slug/video/staff           — 매장 store_videos 사본 목록 (author_role='store')
 *   POST   /stores/:slug/video/staff/import    — 운영자 HUB 동영상 가져오기 (author_role='store' INSERT)
 *   PUT    /stores/:slug/video/staff/:id       — 사본 수정
 *   DELETE /stores/:slug/video/staff/:id       — 사본 삭제
 *
 * V1 범위 외 (WO 고정 — 2차 검토):
 *   - POST /stores/:slug/video/staff (매장 직접 동영상 등록) — 내 매장 직접 등록은 V1 제외.
 *
 * Drift Guard:
 *   - import endpoint 는 author_role='operator' AND status='published' 원본만 통과
 *   - 사본 author_role='store' AND storeId NOT NULL 강제 (DB CHECK + 본 controller)
 *   - storeId 게이트로 매장 간 사본 접근 차단
 *   - 복사 후 원본 수정/삭제는 사본에 영향을 주지 않음 (값 복사 — 독립). copied_from_id 는 추적용.
 *
 * 참조: apps/api-server/src/routes/o4o-store/controllers/pop.controller.ts (mirror 원본)
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { OrganizationStore } from '../../../modules/store-core/entities/organization-store.entity.js';
import { StoreVideo } from '../entities/store-video.entity.js';
import type { StoreVideoStatus, StoreVideoAuthorRole } from '../entities/store-video.entity.js';
import type { AuthRequest } from '../../../types/auth.js';
import { StoreSlugService } from '@o4o/platform-core/store-identity';

const DEFAULT_SERVICE_KEY = 'kpa';

export function createStoreVideoStaffController(
  dataSource: DataSource,
  requireAuth: RequestHandler,
  serviceKey: string = DEFAULT_SERVICE_KEY,
): Router {
  const router = Router();
  const orgRepo = dataSource.getRepository(OrganizationStore);
  const videoRepo = dataSource.getRepository(StoreVideo);
  const slugService = new StoreSlugService(dataSource);

  async function resolvePharmacy(slug: string): Promise<OrganizationStore | null> {
    const record = await slugService.findBySlug(slug);
    if (!record || !record.isActive) return null;
    return orgRepo.findOne({ where: { id: record.storeId, isActive: true } });
  }

  function verifyOwner(pharmacy: OrganizationStore, userId: string): boolean {
    return pharmacy.created_by_user_id === userId;
  }

  // ============================================================================
  // STAFF — 매장 store_videos 사본 목록 (author_role='store' 한정)
  // GET /stores/:slug/video/staff
  // ============================================================================
  router.get('/:slug/video/staff', requireAuth, async (req: Request, res: Response) => {
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
        authorRole: 'store' as StoreVideoAuthorRole,
      };
      if (statusFilter && ['draft', 'published', 'archived'].includes(statusFilter)) {
        where.status = statusFilter as StoreVideoStatus;
      }

      const [posts, total] = await videoRepo.findAndCount({
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
  // STAFF — 운영자 HUB 동영상 가져오기 (Operator HUB → 매장 사본)
  // POST /stores/:slug/video/staff/import
  // body: { sourceId: string }
  //
  //   - 소스: store_videos WHERE id=sourceId AND author_role='operator'
  //           AND service_key=serviceKey AND status='published'
  //   - 사본: store_videos INSERT (author_role='store', storeId=pharmacy.id,
  //           serviceKey, status='draft', title/description/video_url 복사,
  //           copied_from_id=source.id)
  // ============================================================================
  router.post('/:slug/video/staff/import', requireAuth, async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const authReq = req as unknown as AuthRequest;
      const userId = authReq.user?.id || authReq.authUser?.id;
      const { sourceId } = req.body ?? {};

      if (typeof sourceId !== 'string' || sourceId.trim().length === 0) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'sourceId is required' } });
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

      // 1. 소스 동영상 조회 — 운영자 게시 + published + 같은 서비스만 허용
      const source = await videoRepo.findOne({
        where: {
          id: sourceId,
          serviceKey,
          authorRole: 'operator' as StoreVideoAuthorRole,
          status: 'published' as StoreVideoStatus,
        },
      });
      if (!source) {
        res.status(404).json({
          success: false,
          error: { code: 'SOURCE_NOT_FOUND', message: 'Operator-published HUB video not found for this service' },
        });
        return;
      }

      // 2. 슬러그 충돌 방지 — 매장 내 (store_id+slug) unique 정합
      const baseSlug = source.slug;
      let finalSlug = baseSlug;
      const existingBase = await videoRepo.findOne({ where: { storeId: pharmacy.id, slug: baseSlug } });
      if (existingBase) {
        finalSlug = `${baseSlug}-${Date.now().toString(36)}`;
      }

      // 3. 매장 사본 생성 — 값 복사(독립) + copied_from_id 로 출처 추적
      const copy = videoRepo.create({
        storeId: pharmacy.id,
        serviceKey,
        authorRole: 'store' as StoreVideoAuthorRole,
        title: source.title,
        slug: finalSlug,
        description: source.description,
        videoUrl: source.videoUrl,
        status: 'draft' as StoreVideoStatus,
        copiedFromId: source.id,
      });

      const saved = await videoRepo.save(copy);
      res.status(201).json({
        success: true,
        data: {
          ...saved,
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
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  });

  // ============================================================================
  // STAFF — 사본 수정 (author_role/serviceKey/storeId/copiedFromId 변경 불가)
  // PUT /stores/:slug/video/staff/:id
  // body 변경 허용: title, videoUrl, description, slug
  // ============================================================================
  router.put('/:slug/video/staff/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const { slug, id } = req.params;
      const authReq = req as unknown as AuthRequest;
      const userId = authReq.user?.id || authReq.authUser?.id;
      const { title, videoUrl, description, slug: postSlug } = req.body ?? {};

      const pharmacy = await resolvePharmacy(slug);
      if (!pharmacy) {
        res.status(404).json({ success: false, error: { code: 'STORE_NOT_FOUND', message: 'Store not found' } });
        return;
      }
      if (!userId || !verifyOwner(pharmacy, userId)) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not the store owner' } });
        return;
      }

      const post = await videoRepo.findOne({
        where: {
          id,
          storeId: pharmacy.id,
          serviceKey,
          authorRole: 'store' as StoreVideoAuthorRole,
        },
      });
      if (!post) {
        res.status(404).json({ success: false, error: { code: 'POST_NOT_FOUND', message: 'Store video copy not found' } });
        return;
      }

      if (typeof postSlug === 'string' && postSlug.trim().length > 0 && postSlug.trim() !== post.slug) {
        const newSlug = postSlug.trim();
        const existing = await videoRepo.findOne({ where: { storeId: pharmacy.id, slug: newSlug } });
        if (existing) {
          res.status(409).json({
            success: false,
            error: { code: 'SLUG_CONFLICT', message: 'A video with this slug already exists in this store' },
          });
          return;
        }
        post.slug = newSlug;
      }

      if (typeof title === 'string') post.title = title;
      if (typeof videoUrl === 'string' && videoUrl.trim().length > 0) post.videoUrl = videoUrl.trim();
      if (description !== undefined) post.description = typeof description === 'string' ? description : undefined;

      const saved = await videoRepo.save(post);
      res.json({ success: true, data: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  });

  // ============================================================================
  // STAFF — 사본 삭제
  // DELETE /stores/:slug/video/staff/:id
  // ============================================================================
  router.delete('/:slug/video/staff/:id', requireAuth, async (req: Request, res: Response) => {
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

      const post = await videoRepo.findOne({
        where: {
          id,
          storeId: pharmacy.id,
          serviceKey,
          authorRole: 'store' as StoreVideoAuthorRole,
        },
      });
      if (!post) {
        res.status(404).json({ success: false, error: { code: 'POST_NOT_FOUND', message: 'Store video copy not found' } });
        return;
      }

      await videoRepo.remove(post);
      res.json({ success: true, data: { id, deleted: true } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  });

  return router;
}
