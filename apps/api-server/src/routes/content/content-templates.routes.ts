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
 *
 * WO-O4O-TEMPLATE-USAGE-ANALYTICS-V1:
 * - POST /:id/use — increment usage_count + update last_used_at
 * - GET / sort=popular — order by usage_count DESC
 *
 * WO-O4O-TEMPLATE-RECOMMENDATION-V1:
 * - GET /recommend — popular + recent used templates
 *
 * WO-O4O-TEMPLATE-BOUNDARY-HARDENING-V1:
 * - POST: serviceKey validated against service catalog
 * - GET: includePublic requires serviceKey (no cross-service leakage)
 * - DELETE: admin override for public template management
 */

import { Router, type Response } from 'express';
import { DataSource } from 'typeorm';
import { requireAuth, type AuthRequest } from '../../middleware/auth.middleware.js';
import { ContentTemplate } from '../../entities/ContentTemplate.js';
import { O4O_SERVICES } from '../../config/service-catalog.js';

const PUBLIC_TEMPLATE_ROLES = ['admin', 'super_admin', 'operator', 'platform:admin', 'platform:super_admin'];
const VALID_SERVICE_KEYS = new Set(O4O_SERVICES.map((s) => s.key));

export function createContentTemplateRoutes(dataSource: DataSource): Router {
  const router = Router();
  const repo = dataSource.getRepository(ContentTemplate);

  /**
   * GET /
   * List templates (my + optionally public)
   *
   * Query: ?category=&includePublic=true&serviceKey=&sort=recent|popular&limit=20&offset=0
   */
  router.get('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { category, includePublic, serviceKey, sort, limit = '20', offset = '0' } = req.query;
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
        // serviceKey required for cross-service safety — without it, only own templates
        qb.andWhere('t.createdByUserId = :userId', { userId: user.id });
      } else {
        qb.andWhere('t.createdByUserId = :userId', { userId: user.id });
      }

      if (category && typeof category === 'string') {
        qb.andWhere('t.category = :category', { category });
      }

      if (sort === 'popular') {
        qb.orderBy('t.usageCount', 'DESC').addOrderBy('t.updatedAt', 'DESC');
      } else {
        qb.orderBy('t.updatedAt', 'DESC');
      }

      qb.take(take).skip(skip);

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

      // Validate serviceKey against service catalog
      if (serviceKey && typeof serviceKey === 'string' && !VALID_SERVICE_KEYS.has(serviceKey.trim())) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: '유효하지 않은 서비스 키입니다.' },
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
   * GET /recommend
   * Recommended templates: popular (public) + recent used (my)
   *
   * Query: ?category=&serviceKey=&limit=5
   */
  router.get('/recommend', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { category, serviceKey, limit = '5' } = req.query;
      const take = Math.min(parseInt(limit as string, 10) || 5, 20);

      // 1. Popular public templates
      const popularQb = repo.createQueryBuilder('t')
        .where('t.isActive = true')
        .andWhere('t.isPublic = true')
        .andWhere('t.usageCount > 0');

      if (serviceKey && typeof serviceKey === 'string') {
        popularQb.andWhere('t.serviceKey = :serviceKey', { serviceKey });
      }
      if (category && typeof category === 'string') {
        popularQb.andWhere('t.category = :category', { category });
      }

      popularQb.orderBy('t.usageCount', 'DESC').take(take);
      const popular = await popularQb.getMany();

      // 2. Recently used by this user
      const recentQb = repo.createQueryBuilder('t')
        .where('t.isActive = true')
        .andWhere('t.createdByUserId = :userId', { userId: user.id })
        .andWhere('t.lastUsedAt IS NOT NULL');

      if (category && typeof category === 'string') {
        recentQb.andWhere('t.category = :category', { category });
      }

      recentQb.orderBy('t.lastUsedAt', 'DESC').take(3);
      const recent = await recentQb.getMany();

      res.json({ success: true, data: { popular, recent } });
    } catch (error: any) {
      console.error('Failed to get template recommendations:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * POST /:id/use
   * Record template usage (increment count + update timestamp)
   */
  router.post('/:id/use', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;

      const result = await repo.createQueryBuilder()
        .update(ContentTemplate)
        .set({
          usageCount: () => '"usage_count" + 1',
          lastUsedAt: () => 'NOW()',
        })
        .where('id = :id AND isActive = true', { id })
        .execute();

      if (result.affected === 0) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: '템플릿을 찾을 수 없습니다.' },
        });
        return;
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error('Failed to record template usage:', error);
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
   * Soft-delete a template (owner or admin)
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

      const userRoles: string[] = (user as any).roles || [];
      const isAdmin = userRoles.some((r: string) => PUBLIC_TEMPLATE_ROLES.includes(r));

      if (template.createdByUserId !== user.id && !isAdmin) {
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
