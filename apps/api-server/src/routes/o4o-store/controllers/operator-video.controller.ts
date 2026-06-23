/**
 * Operator Video Controller — Operator HUB Video Write API (QR 전용 동영상)
 *
 * WO-O4O-KPA-QR-CODE-VIDEO-CONTENT-V1 (2026-06-23)
 *
 * 운영자가 매장 HUB 에 게시할 동영상 콘텐츠(외부 URL)를 작성/수정/게시하는 backend write API.
 * operator-pop.controller.ts 패턴 1:1 mirror — store_videos / store_pops 가 동일 형태이기 때문.
 * 차이: content(본문) → videoUrl(외부 URL), excerpt → description.
 *
 * 권한 (3 개 서비스 공통): {service}:operator / {service}:admin / platform:admin / platform:super_admin
 *
 * 서버 강제 저장 (body 무시): author_role='operator', service_key=주입값, store_id=null, status='draft'
 *
 * 라우트 (외부 mount: /api/v1/{serviceKey}/operator/video):
 *   - GET    /posts             — 운영자 게시 동영상 목록 (draft + published + archived)
 *   - GET    /posts/:id         — 단일 조회
 *   - POST   /posts             — 생성 (draft)
 *   - PUT    /posts/:id         — 수정
 *   - PATCH  /posts/:id/publish — 발행 (queryVideo HUB 노출 시작)
 *   - PATCH  /posts/:id/archive — 보관
 *   - DELETE /posts/:id         — 삭제
 *
 * 대상 서비스: KPA 전용 (이번 WO). 공통화는 후속 IR.
 *
 * 참조: apps/api-server/src/routes/o4o-store/controllers/operator-pop.controller.ts (mirror 원본)
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { StoreVideo } from '../entities/store-video.entity.js';
import type {
  StoreVideoStatus,
  StoreVideoAuthorRole,
} from '../entities/store-video.entity.js';
import type { AuthRequest } from '../../../types/auth.js';
import { hasAnyServiceRole } from '../../../utils/role.utils.js';
import type { PrefixedRole } from '../../../types/roles.js';

/**
 * Generate URL-friendly slug from title. operator-pop.controller.ts 와 동일 알고리즘 (mirror).
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

function buildAllowedRoles(serviceKey: string): PrefixedRole[] {
  return [
    `${serviceKey}:admin` as PrefixedRole,
    `${serviceKey}:operator` as PrefixedRole,
    'platform:admin',
    'platform:super_admin',
  ];
}

export function createOperatorVideoController(
  dataSource: DataSource,
  requireAuth: RequestHandler,
  serviceKey: string,
): Router {
  const router = Router();
  const videoRepo = dataSource.getRepository(StoreVideo);
  const allowedRoles = buildAllowedRoles(serviceKey);

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
   * 운영자 게시 슬러그 충돌 검사 — store_id NULL 이라 DB unique 가 NULL 비교 안 함 → app-level.
   */
  async function isOperatorSlugTaken(
    slug: string,
    excludeId?: string,
  ): Promise<boolean> {
    const params: any[] = [serviceKey, slug];
    let sql = `SELECT id FROM store_videos
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

  // GET /posts — 운영자 게시 목록
  router.get('/posts', requireAuth, async (req: Request, res: Response) => {
    if (!requireOperator(req, res)) return;
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const statusFilter = req.query.status as string | undefined;

      const where: any = {
        serviceKey,
        authorRole: 'operator' as StoreVideoAuthorRole,
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

  // GET /posts/:id — 단일 조회
  router.get('/posts/:id', requireAuth, async (req: Request, res: Response) => {
    if (!requireOperator(req, res)) return;
    try {
      const { id } = req.params;
      const post = await videoRepo.findOne({
        where: { id, serviceKey, authorRole: 'operator' as StoreVideoAuthorRole },
      });
      if (!post) {
        res.status(404).json({ success: false, error: { code: 'POST_NOT_FOUND', message: 'Operator video not found' } });
        return;
      }
      res.json({ success: true, data: post });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  });

  // POST /posts — 생성 (draft)
  // 서버 강제: author_role='operator', service_key, store_id=null, status='draft'
  // body: { title, videoUrl, description?, slug? }
  router.post('/posts', requireAuth, async (req: Request, res: Response) => {
    if (!requireOperator(req, res)) return;
    try {
      const { title, videoUrl, description, slug: postSlug } = req.body ?? {};

      if (!title || !videoUrl) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'title and videoUrl are required' },
        });
        return;
      }

      const finalSlug = typeof postSlug === 'string' && postSlug.trim().length > 0
        ? postSlug.trim()
        : generateSlug(title);

      if (await isOperatorSlugTaken(finalSlug)) {
        res.status(409).json({
          success: false,
          error: { code: 'SLUG_CONFLICT', message: 'An operator video with this slug already exists in this service' },
        });
        return;
      }

      const post = videoRepo.create({
        storeId: null,
        serviceKey,
        authorRole: 'operator' as StoreVideoAuthorRole,
        title,
        slug: finalSlug,
        description: typeof description === 'string' ? description : undefined,
        videoUrl: String(videoUrl).trim(),
        status: 'draft' as StoreVideoStatus,
      });

      const saved = await videoRepo.save(post);
      res.status(201).json({ success: true, data: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  });

  // PUT /posts/:id — 수정 (author_role/service_key/store_id 변경 불가)
  router.put('/posts/:id', requireAuth, async (req: Request, res: Response) => {
    if (!requireOperator(req, res)) return;
    try {
      const { id } = req.params;
      const { title, videoUrl, description, slug: postSlug } = req.body ?? {};

      const post = await videoRepo.findOne({
        where: { id, serviceKey, authorRole: 'operator' as StoreVideoAuthorRole },
      });
      if (!post) {
        res.status(404).json({ success: false, error: { code: 'POST_NOT_FOUND', message: 'Operator video not found' } });
        return;
      }

      if (typeof postSlug === 'string' && postSlug.trim().length > 0 && postSlug.trim() !== post.slug) {
        const newSlug = postSlug.trim();
        if (await isOperatorSlugTaken(newSlug, id)) {
          res.status(409).json({
            success: false,
            error: { code: 'SLUG_CONFLICT', message: 'An operator video with this slug already exists in this service' },
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

  // PATCH /posts/:id/publish — 발행
  router.patch('/posts/:id/publish', requireAuth, async (req: Request, res: Response) => {
    if (!requireOperator(req, res)) return;
    try {
      const { id } = req.params;
      const post = await videoRepo.findOne({
        where: { id, serviceKey, authorRole: 'operator' as StoreVideoAuthorRole },
      });
      if (!post) {
        res.status(404).json({ success: false, error: { code: 'POST_NOT_FOUND', message: 'Operator video not found' } });
        return;
      }
      if (post.status === 'published') {
        res.status(400).json({ success: false, error: { code: 'ALREADY_PUBLISHED', message: 'Video is already published' } });
        return;
      }
      post.status = 'published';
      post.publishedAt = new Date();
      const saved = await videoRepo.save(post);
      res.json({ success: true, data: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  });

  // PATCH /posts/:id/archive — 보관 (HUB 미노출)
  router.patch('/posts/:id/archive', requireAuth, async (req: Request, res: Response) => {
    if (!requireOperator(req, res)) return;
    try {
      const { id } = req.params;
      const post = await videoRepo.findOne({
        where: { id, serviceKey, authorRole: 'operator' as StoreVideoAuthorRole },
      });
      if (!post) {
        res.status(404).json({ success: false, error: { code: 'POST_NOT_FOUND', message: 'Operator video not found' } });
        return;
      }
      post.status = 'archived';
      const saved = await videoRepo.save(post);
      res.json({ success: true, data: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  });

  // DELETE /posts/:id — 삭제
  router.delete('/posts/:id', requireAuth, async (req: Request, res: Response) => {
    if (!requireOperator(req, res)) return;
    try {
      const { id } = req.params;
      const post = await videoRepo.findOne({
        where: { id, serviceKey, authorRole: 'operator' as StoreVideoAuthorRole },
      });
      if (!post) {
        res.status(404).json({ success: false, error: { code: 'POST_NOT_FOUND', message: 'Operator video not found' } });
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
