/**
 * WO-O4O-GUIDE-INLINE-EDIT-V1
 *
 * Guide Contents API
 *
 * GET  /api/v1/guide/contents?serviceKey=kpa-society&pageKey=guide/intro
 *   → 해당 페이지의 모든 section 오버라이드 반환 (공개)
 *
 * POST /api/v1/guide/contents
 *   → section 내용 저장/갱신 (operator 이상 권한 필요)
 *
 * 권한: requireAuth + 최소 1개의 *:operator 또는 *:admin 역할
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { GuideContent } from './entities/guide-content.entity.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../middleware/error-handler.js';

function isOperatorOrAbove(roles: string[]): boolean {
  return roles.some(
    (r) =>
      r.endsWith(':operator') ||
      r.endsWith(':admin') ||
      r === 'admin' ||
      r === 'super_admin'
  );
}

export function createGuideContentsRouter(dataSource: DataSource): Router {
  const router = Router();
  const repo = () => dataSource.getRepository(GuideContent);

  // GET /contents?serviceKey=xxx&pageKey=yyy
  // Public — returns all section overrides for a page
  router.get(
    '/contents',
    asyncHandler(async (req: Request, res: Response) => {
      const serviceKey = String(req.query.serviceKey ?? '').trim();
      const pageKey = String(req.query.pageKey ?? '').trim();

      if (!serviceKey || !pageKey) {
        return res.json({ success: true, data: { sections: {} } });
      }

      const rows = await repo().find({
        where: { serviceKey, pageKey },
        select: ['sectionKey', 'content'],
      });

      const sections: Record<string, string> = {};
      for (const row of rows) {
        sections[row.sectionKey] = row.content;
      }

      return res.json({ success: true, data: { sections } });
    })
  );

  // POST /contents — upsert one section
  // Requires: authenticated + operator/admin role
  router.post(
    '/contents',
    requireAuth as any,
    asyncHandler(async (req: Request, res: Response) => {
      const user = (req as any).user;
      const roles: string[] = user?.roles ?? [];

      if (!isOperatorOrAbove(roles)) {
        return res.status(403).json({
          success: false,
          error: '운영자 이상 권한이 필요합니다.',
          code: 'FORBIDDEN',
        });
      }

      const { serviceKey, pageKey, sectionKey, content } = req.body ?? {};

      if (!serviceKey || !pageKey || !sectionKey || content === undefined) {
        return res.status(400).json({
          success: false,
          error: 'serviceKey, pageKey, sectionKey, content 는 필수입니다.',
          code: 'BAD_REQUEST',
        });
      }

      const existing = await repo().findOne({
        where: { serviceKey, pageKey, sectionKey },
      });

      if (existing) {
        await repo().update(existing.id, {
          content: String(content),
          updatedBy: user.id ?? null,
        });
        return res.json({ success: true, data: { id: existing.id, updated: true } });
      }

      const created = repo().create({
        serviceKey: String(serviceKey),
        pageKey: String(pageKey),
        sectionKey: String(sectionKey),
        content: String(content),
        updatedBy: user.id ?? null,
      });
      const saved = await repo().save(created);
      return res.status(201).json({ success: true, data: { id: saved.id, updated: false } });
    })
  );

  return router;
}
