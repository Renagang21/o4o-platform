/**
 * News/Content Controller — shared for all services using cms_contents
 *
 * WO-O4O-CONTENT-CANONICAL-CROSS-SERVICE-ALIGNMENT-V1
 *
 * Parameterized by serviceKey. Provides public GET routes
 * and operator CRUD (operator-scoped).
 *
 * Routes created:
 *   GET /news/admin/list  (operator)
 *   POST /news            (operator)
 *   PUT /news/:id         (operator)
 *   DELETE /news/:id      (soft-archive, operator)
 *   DELETE /news/:id/hard (hard-delete archived, operator)
 *   POST /news/batch-publish
 *   POST /news/batch-archive
 *   POST /news/batch-hard-delete
 *   GET /news             (public/optional-auth)
 *   GET /news/:id         (public/optional-auth)
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { ContentQueryService } from '../../../modules/content/index.js';
import { asyncHandler } from '../../../middleware/error-handler.js';

type AuthMiddleware = (...args: any[]) => any;
type ScopeMiddlewareFn = (scope: string) => AuthMiddleware;

const ALLOWED_TYPES = ['notice', 'news', 'event'];

export function createNewsController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
  optionalAuth: AuthMiddleware,
  requireScopeFn: ScopeMiddlewareFn,
  serviceKey: string,
  operatorScope: string,
): Router {
  const router = Router();
  const contentRepo = dataSource.getRepository('CmsContent');
  const contentService = new ContentQueryService(dataSource, {
    serviceKeys: [serviceKey],
    defaultTypes: ['notice', 'news'],
  });

  // ─── Public/optional-auth routes ─────────────────────────────

  // GET /news — 공개 목록 (published only)
  router.get('/', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
    const result = await contentService.listPublished({
      type: req.query.type as string,
      sort: (req.query.sort as any) || 'latest',
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 12,
    });
    res.json({ success: true, ...result });
  }));

  // GET /news/:id — 공개 상세 조회
  router.get('/:id([0-9a-f-]{36})', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
    const content = await contentService.getById(req.params.id);
    if (!content) {
      res.status(404).json({ success: false, error: { message: 'Content not found' } });
      return;
    }
    res.json({ success: true, data: content });
  }));

  // ─── Operator CRUD routes ─────────────────────────────────────

  // GET /news/admin/list — 운영자 전체 목록 (all statuses)
  router.get('/admin/list', requireAuth, requireScopeFn(operatorScope), asyncHandler(async (req: Request, res: Response) => {
    const type = req.query.type as string;
    const status = req.query.status as string;
    const search = req.query.search as string | undefined;
    const picked = req.query.picked as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const qb = contentRepo.createQueryBuilder('c')
      .where('c.serviceKey = :sk', { sk: serviceKey });

    if (type && ALLOWED_TYPES.includes(type)) {
      qb.andWhere('c.type = :type', { type });
    } else {
      qb.andWhere('c.type IN (:...types)', { types: ALLOWED_TYPES });
    }
    if (status && ['draft', 'published', 'archived'].includes(status)) {
      qb.andWhere('c.status = :status', { status });
    }
    if (search && search.trim()) {
      qb.andWhere('c.title ILIKE :search', { search: `%${search.trim()}%` });
    }
    if (picked === 'true') {
      qb.andWhere('c.isOperatorPicked = true');
    }

    qb.orderBy('c.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    res.json({ success: true, data, total, page, limit, totalPages: Math.ceil(total / limit) });
  }));

  // POST /news — 새 콘텐츠 생성
  router.post('/', requireAuth, requireScopeFn(operatorScope), asyncHandler(async (req: Request, res: Response) => {
    const { title, content, type, status: reqStatus, summary, isOperatorPicked, isPinned } = req.body;
    if (!title || !type) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'title and type are required' } });
      return;
    }
    if (!ALLOWED_TYPES.includes(type)) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: `type must be one of: ${ALLOWED_TYPES.join(', ')}` } });
      return;
    }
    const validStatus = reqStatus === 'published' ? 'published' : 'draft';
    const userId = (req as any).user?.id;

    const entity = contentRepo.create({
      serviceKey,
      type,
      title,
      summary: summary || null,
      body: content || null,
      status: validStatus,
      publishedAt: validStatus === 'published' ? new Date() : null,
      createdBy: userId,
      isOperatorPicked: isOperatorPicked === true,
      isPinned: isPinned === true,
    });

    const saved = await contentRepo.save(entity);
    res.status(201).json({ success: true, data: saved });
  }));

  // PUT /news/:id — 콘텐츠 수정
  router.put('/:id', requireAuth, requireScopeFn(operatorScope), asyncHandler(async (req: Request, res: Response) => {
    const existing = await contentRepo.createQueryBuilder('c')
      .where('c.id = :id', { id: req.params.id })
      .andWhere('c.serviceKey = :sk', { sk: serviceKey })
      .getOne();
    if (!existing) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Content not found' } });
      return;
    }

    const { title, content, type, status: reqStatus, summary, isOperatorPicked } = req.body;
    if (title !== undefined) (existing as any).title = title;
    if (summary !== undefined) (existing as any).summary = summary;
    if (content !== undefined) (existing as any).body = content;
    if (type !== undefined && ALLOWED_TYPES.includes(type)) (existing as any).type = type;
    if (isOperatorPicked !== undefined) (existing as any).isOperatorPicked = isOperatorPicked === true;
    if (req.body.isPinned !== undefined) (existing as any).isPinned = req.body.isPinned === true;
    if (reqStatus !== undefined && ['draft', 'published', 'archived'].includes(reqStatus)) {
      if (reqStatus === 'published' && (existing as any).status !== 'published') {
        (existing as any).publishedAt = new Date();
      }
      (existing as any).status = reqStatus;
    }

    const updated = await contentRepo.save(existing);
    res.json({ success: true, data: updated });
  }));

  // DELETE /news/:id/hard — 완전 삭제 (archived only)
  router.delete('/:id/hard', requireAuth, requireScopeFn(operatorScope), asyncHandler(async (req: Request, res: Response) => {
    const existing = await contentRepo.createQueryBuilder('c')
      .where('c.id = :id', { id: req.params.id })
      .andWhere('c.serviceKey = :sk', { sk: serviceKey })
      .getOne();
    if (!existing) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Content not found' } });
      return;
    }
    if ((existing as any).status !== 'archived') {
      res.status(400).json({ success: false, error: { code: 'NOT_ARCHIVED', message: '보관 상태의 콘텐츠만 완전 삭제할 수 있습니다.' } });
      return;
    }
    await contentRepo.delete({ id: (existing as any).id });
    res.json({ success: true, data: { deleted: true, id: (existing as any).id } });
  }));

  // DELETE /news/:id — 소프트 삭제 (→ archived)
  router.delete('/:id', requireAuth, requireScopeFn(operatorScope), asyncHandler(async (req: Request, res: Response) => {
    const existing = await contentRepo.createQueryBuilder('c')
      .where('c.id = :id', { id: req.params.id })
      .andWhere('c.serviceKey = :sk', { sk: serviceKey })
      .getOne();
    if (!existing) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Content not found' } });
      return;
    }
    (existing as any).status = 'archived';
    const updated = await contentRepo.save(existing);
    res.json({ success: true, data: updated });
  }));

  // ─── Batch endpoints ──────────────────────────────────────────

  router.post('/batch-publish', requireAuth, requireScopeFn(operatorScope), asyncHandler(async (req: Request, res: Response) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, error: 'ids array is required' });
      return;
    }
    if (ids.length > 50) {
      res.status(400).json({ success: false, error: 'Maximum 50 items per batch' });
      return;
    }

    const results: Array<{ id: string; status: 'success' | 'skipped' | 'failed'; error?: string }> = [];
    for (const id of ids) {
      try {
        const item = await contentRepo.createQueryBuilder('c')
          .where('c.id = :id', { id })
          .andWhere('c.serviceKey = :sk', { sk: serviceKey })
          .getOne();
        if (!item) { results.push({ id, status: 'failed', error: 'Not found' }); continue; }
        if ((item as any).status !== 'draft') { results.push({ id, status: 'skipped', error: 'Not in draft status' }); continue; }
        (item as any).status = 'published';
        (item as any).publishedAt = new Date();
        await contentRepo.save(item);
        results.push({ id, status: 'success' });
      } catch (err: any) {
        results.push({ id, status: 'failed', error: err.message || 'Unknown error' });
      }
    }
    res.json({ success: true, data: { results } });
  }));

  router.post('/batch-archive', requireAuth, requireScopeFn(operatorScope), asyncHandler(async (req: Request, res: Response) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, error: 'ids array is required' });
      return;
    }
    if (ids.length > 50) {
      res.status(400).json({ success: false, error: 'Maximum 50 items per batch' });
      return;
    }

    const results: Array<{ id: string; status: 'success' | 'skipped' | 'failed'; error?: string }> = [];
    for (const id of ids) {
      try {
        const item = await contentRepo.createQueryBuilder('c')
          .where('c.id = :id', { id })
          .andWhere('c.serviceKey = :sk', { sk: serviceKey })
          .getOne();
        if (!item) { results.push({ id, status: 'failed', error: 'Not found' }); continue; }
        if ((item as any).status === 'archived') { results.push({ id, status: 'skipped', error: 'Already archived' }); continue; }
        (item as any).status = 'archived';
        await contentRepo.save(item);
        results.push({ id, status: 'success' });
      } catch (err: any) {
        results.push({ id, status: 'failed', error: err.message || 'Unknown error' });
      }
    }
    res.json({ success: true, data: { results } });
  }));

  router.post('/batch-hard-delete', requireAuth, requireScopeFn(operatorScope), asyncHandler(async (req: Request, res: Response) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, error: 'ids array is required' });
      return;
    }
    if (ids.length > 50) {
      res.status(400).json({ success: false, error: 'Maximum 50 items per batch' });
      return;
    }

    const results: Array<{ id: string; status: 'success' | 'skipped' | 'failed'; error?: string }> = [];
    for (const id of ids) {
      try {
        const item = await contentRepo.createQueryBuilder('c')
          .where('c.id = :id', { id })
          .andWhere('c.serviceKey = :sk', { sk: serviceKey })
          .getOne();
        if (!item) { results.push({ id, status: 'failed', error: 'Not found' }); continue; }
        if ((item as any).status !== 'archived') { results.push({ id, status: 'skipped', error: 'Only archived items can be hard deleted' }); continue; }
        await contentRepo.delete({ id });
        results.push({ id, status: 'success' });
      } catch (err: any) {
        results.push({ id, status: 'failed', error: err.message || 'Unknown error' });
      }
    }
    res.json({ success: true, data: { results } });
  }));

  return router;
}
