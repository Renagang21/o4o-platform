/**
 * Content Templates Routes
 *
 * WO-O4O-CONTENT-TEMPLATE-SYSTEM-V1
 *
 * CRUD API for user-owned HTML content templates.
 * Used by @o4o/content-editor RichTextEditor for template save/load.
 *
 * WO-O4O-TEMPLATE-PUBLIC-SHARING-V1:
 * - includePublic query param to merge public templates
 * - isPublic flag on create (operator/admin only)
 */

import { Router, type Response } from 'express';
import { DataSource } from 'typeorm';
import { requireAuth, type AuthRequest } from '../../middleware/auth.middleware.js';
import { ContentTemplate } from '../../entities/ContentTemplate.js';

const PUBLIC_TEMPLATE_ROLES = ['admin', 'super_admin', 'operator', 'platform:admin', 'platform:super_admin'];

export function createContentTemplateRoutes(dataSource: DataSource): Router {
  const router = Router();
  const repo = dataSource.getRepository(ContentTemplate);

  /**
   * GET /
   * List templates (my + optionally public)
   *
   * Query: ?category=&includePublic=true&serviceKey=&limit=20&offset=0
   */
  router.get('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { category, includePublic, serviceKey, limit = '20', offset = '0' } = req.query;
      const take = parseInt(limit as string, 10);
      const skip = parseInt(offset as string, 10);

      const qb = repo.createQueryBuilder('t')
        .where('t.isActive = :active', { active: true });

      if (includePublic === 'true' && serviceKey) {
        // My templates OR public templates for this service
        qb.andWhere(
          '(t.createdByUserId = :userId OR (t.isPublic = true AND t.serviceKey = :serviceKey))',
          { userId: user.id, serviceKey },
        );
      } else if (includePublic === 'true') {
        qb.andWhere(
          '(t.createdByUserId = :userId OR t.isPublic = true)',
          { userId: user.id },
        );
      } else {
        qb.andWhere('t.createdByUserId = :userId', { userId: user.id });
      }

      if (category && typeof category === 'string') {
        qb.andWhere('t.category = :category', { category });
      }

      qb.orderBy('t.updatedAt', 'DESC')
        .take(take)
        .skip(skip);

      const [templates, total] = await qb.getManyAndCount();

      res.json({
        success: true,
        data: templates,
        pagination: { total, limit: take, offset: skip },
      });
    } catch (error: any) {
      console.error('Failed to list content templates:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * POST /
   * Create a new template
   *
   * Body: { name, contentHtml, description?, category?, serviceKey? }
   */
  router.post('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { name, contentHtml, description, category, serviceKey, isPublic } = req.body;

      if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: '템플릿 이름을 입력해주세요.' },
        });
        return;
      }

      if (!contentHtml || typeof contentHtml !== 'string' || !contentHtml.trim()) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: '템플릿 콘텐츠가 비어있습니다.' },
        });
        return;
      }

      // Public template: operator/admin only
      let publicFlag = false;
      if (isPublic === true) {
        const userRoles: string[] = (user as any).roles || [];
        const canPublic = userRoles.some((r: string) => PUBLIC_TEMPLATE_ROLES.includes(r));
        if (!canPublic) {
          res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: '공용 템플릿은 운영자/관리자만 생성할 수 있습니다.' },
          });
          return;
        }
        publicFlag = true;
      }

      const template = repo.create({
        name: name.trim(),
        contentHtml: contentHtml.trim(),
        description: description?.trim() || null,
        category: category?.trim() || 'general',
        serviceKey: serviceKey?.trim() || null,
        isPublic: publicFlag,
        createdByUserId: user.id,
        createdByUserName: (user as any).firstName || (user as any).email || 'Unknown',
      });

      const saved = await repo.save(template);

      res.status(201).json({ success: true, data: saved });
    } catch (error: any) {
      console.error('Failed to create content template:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * PUT /:id
   * Update a template (owner only)
   *
   * Body: { name?, contentHtml?, description?, category? }
   */
  router.put('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const template = await repo.findOne({ where: { id, isActive: true } });

      if (!template) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: '템플릿을 찾을 수 없습니다.' },
        });
        return;
      }

      if (template.createdByUserId !== user.id) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: '본인의 템플릿만 수정할 수 있습니다.' },
        });
        return;
      }

      const { name, contentHtml, description, category } = req.body;

      if (name !== undefined) template.name = name.trim();
      if (contentHtml !== undefined) template.contentHtml = contentHtml.trim();
      if (description !== undefined) template.description = description?.trim() || null;
      if (category !== undefined) template.category = category?.trim() || 'general';

      const saved = await repo.save(template);

      res.json({ success: true, data: saved });
    } catch (error: any) {
      console.error('Failed to update content template:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * DELETE /:id
   * Soft-delete a template (owner only)
   */
  router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const template = await repo.findOne({ where: { id, isActive: true } });

      if (!template) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: '템플릿을 찾을 수 없습니다.' },
        });
        return;
      }

      if (template.createdByUserId !== user.id) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: '본인의 템플릿만 삭제할 수 있습니다.' },
        });
        return;
      }

      template.isActive = false;
      await repo.save(template);

      res.json({ success: true, data: { id, deleted: true } });
    } catch (error: any) {
      console.error('Failed to delete content template:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  return router;
}
