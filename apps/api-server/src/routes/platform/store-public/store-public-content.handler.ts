/**
 * Store Public Content Handler — Blog posts
 *
 * WO-O4O-UNIFIED-STORE-PUBLIC-ROUTES-SPLIT-V1
 * WO-O4O-NETURE-BLOG-CANONICAL-ALIGN-V1: GET /:slug/blog/settings 추가
 *   (KPA fetchPublicBlogSettings 가 이 unified path 를 호출하지만 미존재했던 잠재 버그 동시 해결)
 * Extracted from unified-store-public.routes.ts
 *
 * Endpoints:
 *   GET /:slug/blog           — Published blog posts (paginated)
 *   GET /:slug/blog/settings  — Blog identity meta (이름·소개·heroImage·defaultTemplate)
 *   GET /:slug/blog/:postSlug — Blog post detail
 *
 * 라우트 순서: /blog/settings literal 을 /:postSlug catch-all 보다 위에 등록.
 */

import { Router, Request, Response } from 'express';
import type { DataSource, Repository } from 'typeorm';
import { LessThanOrEqual } from 'typeorm';
import { StoreBlogPost } from '../../glycopharm/entities/store-blog-post.entity.js';
import type { StoreBlogPostStatus } from '../../glycopharm/entities/store-blog-post.entity.js';
// WO-O4O-NETURE-BLOG-CANONICAL-ALIGN-V1
import { StoreBlogSettings } from '../../glycopharm/entities/store-blog-settings.entity.js';
import { resolvePublicStore } from './store-public-utils.js';

export function createStorePublicContentRoutes(deps: {
  dataSource: DataSource;
  blogRepo: Repository<StoreBlogPost>;
}): Router {
  const router = Router();
  const { dataSource, blogRepo } = deps;
  // WO-O4O-NETURE-BLOG-CANONICAL-ALIGN-V1
  const settingsRepo = dataSource.getRepository(StoreBlogSettings);

  // GET /:slug/blog — Published blog posts
  router.get('/:slug/blog', async (req: Request, res: Response): Promise<void> => {
    try {
      const resolved = await resolvePublicStore(dataSource, req.params.slug, req, res);
      if (!resolved) return;

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));

      const [posts, total] = await blogRepo.findAndCount({
        where: {
          storeId: resolved.storeId,
          serviceKey: resolved.serviceKey,
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
    } catch (error: any) {
      console.error('[UnifiedStore] GET /:slug/blog error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch blog posts' },
      });
    }
  });

  // GET /:slug/blog/settings — Blog identity meta (WO-O4O-NETURE-BLOG-CANONICAL-ALIGN-V1)
  // 라우트 순서: /:postSlug catch-all 보다 위에 등록 (`settings` literal 우선 매칭).
  router.get('/:slug/blog/settings', async (req: Request, res: Response): Promise<void> => {
    try {
      const resolved = await resolvePublicStore(dataSource, req.params.slug, req, res);
      if (!resolved) return;

      const settings = await settingsRepo.findOne({
        where: { storeId: resolved.storeId, serviceKey: resolved.serviceKey },
      });
      res.json({ success: true, data: settings ?? null });
    } catch (error: any) {
      console.error('[UnifiedStore] GET /:slug/blog/settings error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch blog settings' },
      });
    }
  });

  // GET /:slug/blog/:postSlug — Blog post detail
  router.get('/:slug/blog/:postSlug', async (req: Request, res: Response): Promise<void> => {
    try {
      const { postSlug } = req.params;
      const resolved = await resolvePublicStore(dataSource, req.params.slug, req, res);
      if (!resolved) return;

      const post = await blogRepo.findOne({
        where: {
          storeId: resolved.storeId,
          serviceKey: resolved.serviceKey,
          slug: postSlug,
          status: 'published' as StoreBlogPostStatus,
          publishedAt: LessThanOrEqual(new Date()),
        },
      });

      if (!post) {
        res.status(404).json({
          success: false,
          error: { code: 'POST_NOT_FOUND', message: 'Blog post not found' },
        });
        return;
      }

      res.json({ success: true, data: post });
    } catch (error: any) {
      console.error('[UnifiedStore] GET /:slug/blog/:postSlug error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch blog post' },
      });
    }
  });

  return router;
}
