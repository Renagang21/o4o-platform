/**
 * WorkingContent Controller — CRUD for kpa_working_contents
 *
 * WO-O4O-STORE-CONTENT-USAGE-RECOMPOSE-V1 Phase 2
 *
 * GET    /operator/working-contents          — 목록 조회 (owner_id 기반)
 * GET    /operator/working-contents/:id      — 상세 조회
 * PUT    /operator/working-contents/:id      — 편집 (title, edited_blocks, tags, category)
 * DELETE /operator/working-contents/:id      — 삭제 (hard delete)
 * POST   /operator/working-contents/:id/publish — 발행 (→ o4o_asset_snapshots)
 *
 * Guard: requireAuth + owner 본인 확인
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { isStoreOwner } from '../../../utils/store-owner.utils.js';

type AuthMiddleware = RequestHandler;

export function createWorkingContentController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
): Router {
  const router = Router();

  // GET / — 목록 조회 (owner_id 기반, 최신순)
  router.get('/', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;
    const search = (req.query.search as string) || '';
    const category = (req.query.category as string) || '';

    let where = 'owner_id = $1';
    const params: any[] = [userId];
    let idx = 2;

    if (search) {
      where += ` AND title ILIKE $${idx}`;
      params.push(`%${search}%`);
      idx++;
    }
    if (category) {
      where += ` AND category = $${idx}`;
      params.push(category);
      idx++;
    }

    const [items, countResult] = await Promise.all([
      dataSource.query(
        `SELECT id, source_content_id, title, tags, category, created_at, updated_at
         FROM kpa_working_contents
         WHERE ${where}
         ORDER BY updated_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset],
      ),
      dataSource.query(
        `SELECT COUNT(*)::int as total FROM kpa_working_contents WHERE ${where}`,
        params,
      ),
    ]);

    res.json({
      success: true,
      data: {
        items,
        total: countResult[0]?.total || 0,
        page,
        limit,
      },
    });
  }));

  // GET /:id — 상세 조회
  router.get('/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const [item] = await dataSource.query(
      `SELECT * FROM kpa_working_contents WHERE id = $1 AND owner_id = $2 LIMIT 1`,
      [req.params.id, userId],
    );

    if (!item) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Working content not found' } });
      return;
    }

    res.json({ success: true, data: item });
  }));

  // PUT /:id — 편집
  router.put('/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;

    // Verify ownership
    const [existing] = await dataSource.query(
      `SELECT id FROM kpa_working_contents WHERE id = $1 AND owner_id = $2 LIMIT 1`,
      [req.params.id, userId],
    );
    if (!existing) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Working content not found' } });
      return;
    }

    const { title, edited_blocks, tags, category } = req.body;

    const sets: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (title !== undefined) { sets.push(`title = $${idx++}`); params.push(title); }
    if (edited_blocks !== undefined) { sets.push(`edited_blocks = $${idx++}`); params.push(JSON.stringify(edited_blocks)); }
    if (tags !== undefined) { sets.push(`tags = $${idx++}`); params.push(JSON.stringify(tags)); }
    if (category !== undefined) { sets.push(`category = $${idx++}`); params.push(category || null); }

    if (sets.length === 0) {
      res.status(400).json({ success: false, error: { code: 'NO_CHANGES', message: 'No fields to update' } });
      return;
    }

    sets.push(`updated_at = NOW()`);
    params.push(existing.id);

    const [updated] = await dataSource.query(
      `UPDATE kpa_working_contents SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      params,
    );

    res.json({ success: true, data: updated });
  }));

  // DELETE /:id — 삭제
  router.delete('/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;

    const [existing] = await dataSource.query(
      `SELECT id FROM kpa_working_contents WHERE id = $1 AND owner_id = $2 LIMIT 1`,
      [req.params.id, userId],
    );
    if (!existing) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Working content not found' } });
      return;
    }

    await dataSource.query(`DELETE FROM kpa_working_contents WHERE id = $1`, [existing.id]);
    res.json({ success: true, data: { deleted: true, id: existing.id } });
  }));

  // POST /:id/publish — 발행 (Phase 3: → o4o_asset_snapshots)
  router.post('/:id/publish', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;

    // Resolve organization
    const { organizationId } = await isStoreOwner(dataSource, userId);
    if (!organizationId) {
      res.status(403).json({ success: false, error: { code: 'NO_STORE', message: 'Store ownership required for publishing' } });
      return;
    }

    const [wc] = await dataSource.query(
      `SELECT * FROM kpa_working_contents WHERE id = $1 AND owner_id = $2 LIMIT 1`,
      [req.params.id, userId],
    );
    if (!wc) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Working content not found' } });
      return;
    }

    // Build content_json for asset snapshot
    const contentJson = {
      title: wc.title,
      blocks: wc.edited_blocks,
      tags: wc.tags,
      category: wc.category,
    };

    const [snapshot] = await dataSource.query(
      `INSERT INTO o4o_asset_snapshots (organization_id, source_service, source_asset_id, asset_type, title, content_json, created_by)
       VALUES ($1, 'kpa', $2, 'content', $3, $4, $5)
       RETURNING id, organization_id, source_service, source_asset_id, asset_type, title, created_at`,
      [organizationId, wc.id, wc.title, JSON.stringify(contentJson), userId],
    );

    res.status(201).json({ success: true, data: { snapshotId: snapshot.id, ...snapshot } });
  }));

  return router;
}
