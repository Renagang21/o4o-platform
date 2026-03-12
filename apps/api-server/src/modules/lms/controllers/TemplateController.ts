import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { TemplateService } from '../services/TemplateService.js';
import logger from '../../../utils/logger.js';

/**
 * TemplateController
 * LMS Module - Template Management (WO-O4O-TEMPLATE-SYSTEM-FOUNDATION)
 *
 * Ownership: authorUserId === userId OR kpa:admin bypasses
 */
export class TemplateController extends BaseController {
  private static async checkTemplateOwnership(
    templateId: string,
    userId: string,
    userRoles: string[],
  ): Promise<{ allowed: boolean; notFound: boolean }> {
    if (userRoles.includes('kpa:admin')) return { allowed: true, notFound: false };
    const service = TemplateService.getInstance();
    const template = await service.getTemplate(templateId);
    if (!template) return { allowed: false, notFound: true };
    if (template.authorUserId === userId) return { allowed: true, notFound: false };
    return { allowed: false, notFound: false };
  }

  // ============================================
  // Template CRUD
  // ============================================

  static async createTemplate(req: Request, res: Response): Promise<any> {
    try {
      const data = req.body;
      const userId = (req as any).user?.id;

      if (!data.authorUserId && userId) {
        data.authorUserId = userId;
      }

      const service = TemplateService.getInstance();
      const template = await service.createTemplate(data);

      return BaseController.created(res, { template });
    } catch (error: any) {
      logger.error('[TemplateController.createTemplate] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getTemplate(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = TemplateService.getInstance();

      const template = await service.getTemplate(id);

      if (!template) {
        return BaseController.notFound(res, 'Template not found');
      }

      return BaseController.ok(res, { template });
    } catch (error: any) {
      logger.error('[TemplateController.getTemplate] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async listTemplates(req: Request, res: Response): Promise<any> {
    try {
      const filters = req.query;
      const service = TemplateService.getInstance();

      const { templates, total } = await service.listTemplates(filters as any);

      return BaseController.okPaginated(res, templates, {
        total,
        page: Number(filters.page) || 1,
        limit: Number(filters.limit) || 20,
        totalPages: Math.ceil(total / (Number(filters.limit) || 20)),
      });
    } catch (error: any) {
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        logger.warn('[TemplateController.listTemplates] Template tables not found - returning empty');
        return BaseController.okPaginated(res, [], {
          total: 0,
          page: Number(req.query.page) || 1,
          limit: Number(req.query.limit) || 20,
          totalPages: 0,
        });
      }
      logger.error('[TemplateController.listTemplates] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async updateTemplate(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const data = req.body;
      const userId = (req as any).user?.id;
      const userRoles: string[] = (req as any).user?.roles || [];

      const ownership = await TemplateController.checkTemplateOwnership(id, userId, userRoles);
      if (ownership.notFound) return BaseController.notFound(res, 'Template not found');
      if (!ownership.allowed) return BaseController.forbidden(res, 'You can only modify your own templates');

      const service = TemplateService.getInstance();
      const template = await service.updateTemplate(id, data);

      return BaseController.ok(res, { template });
    } catch (error: any) {
      logger.error('[TemplateController.updateTemplate] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async deleteTemplate(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const userRoles: string[] = (req as any).user?.roles || [];

      const ownership = await TemplateController.checkTemplateOwnership(id, userId, userRoles);
      if (ownership.notFound) return BaseController.notFound(res, 'Template not found');
      if (!ownership.allowed) return BaseController.forbidden(res, 'You can only delete your own templates');

      const service = TemplateService.getInstance();
      await service.deleteTemplate(id);

      return BaseController.noContent(res);
    } catch (error: any) {
      logger.error('[TemplateController.deleteTemplate] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  // ============================================
  // Version Management
  // ============================================

  static async createVersion(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const data = req.body;
      const userId = (req as any).user?.id;
      const userRoles: string[] = (req as any).user?.roles || [];

      const ownership = await TemplateController.checkTemplateOwnership(id, userId, userRoles);
      if (ownership.notFound) return BaseController.notFound(res, 'Template not found');
      if (!ownership.allowed) return BaseController.forbidden(res, 'You can only create versions for your own templates');

      const service = TemplateService.getInstance();
      const version = await service.createVersion(id, data);

      if (!version) {
        return BaseController.notFound(res, 'Template not found');
      }

      return BaseController.created(res, { version });
    } catch (error: any) {
      logger.error('[TemplateController.createVersion] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getVersions(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = TemplateService.getInstance();

      const versions = await service.getVersions(id);

      return BaseController.ok(res, { versions });
    } catch (error: any) {
      logger.error('[TemplateController.getVersions] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  // ============================================
  // Block Management
  // ============================================

  static async addBlock(req: Request, res: Response): Promise<any> {
    try {
      const { versionId } = req.params;
      const data = req.body;

      const service = TemplateService.getInstance();
      const block = await service.addBlock(versionId, data);

      return BaseController.created(res, { block });
    } catch (error: any) {
      logger.error('[TemplateController.addBlock] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getBlocks(req: Request, res: Response): Promise<any> {
    try {
      const { versionId } = req.params;
      const service = TemplateService.getInstance();

      const blocks = await service.getBlocks(versionId);

      return BaseController.ok(res, { blocks });
    } catch (error: any) {
      logger.error('[TemplateController.getBlocks] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async updateBlock(req: Request, res: Response): Promise<any> {
    try {
      const { blockId } = req.params;
      const data = req.body;

      const service = TemplateService.getInstance();
      const block = await service.updateBlock(blockId, data);

      if (!block) {
        return BaseController.notFound(res, 'Block not found');
      }

      return BaseController.ok(res, { block });
    } catch (error: any) {
      logger.error('[TemplateController.updateBlock] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async removeBlock(req: Request, res: Response): Promise<any> {
    try {
      const { blockId } = req.params;

      const service = TemplateService.getInstance();
      const deleted = await service.removeBlock(blockId);

      if (!deleted) {
        return BaseController.notFound(res, 'Block not found');
      }

      return BaseController.noContent(res);
    } catch (error: any) {
      logger.error('[TemplateController.removeBlock] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async reorderBlocks(req: Request, res: Response): Promise<any> {
    try {
      const { versionId } = req.params;
      const { blockIds } = req.body;

      const service = TemplateService.getInstance();
      const blocks = await service.reorderBlocks(versionId, blockIds);

      return BaseController.ok(res, { blocks });
    } catch (error: any) {
      logger.error('[TemplateController.reorderBlocks] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  // ============================================
  // Publishing
  // ============================================

  static async publishTemplate(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const userRoles: string[] = (req as any).user?.roles || [];

      const ownership = await TemplateController.checkTemplateOwnership(id, userId, userRoles);
      if (ownership.notFound) return BaseController.notFound(res, 'Template not found');
      if (!ownership.allowed) return BaseController.forbidden(res, 'You can only publish your own templates');

      const service = TemplateService.getInstance();
      const template = await service.publishTemplate(id);

      return BaseController.ok(res, { template });
    } catch (error: any) {
      logger.error('[TemplateController.publishTemplate] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async archiveTemplate(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const userRoles: string[] = (req as any).user?.roles || [];

      const ownership = await TemplateController.checkTemplateOwnership(id, userId, userRoles);
      if (ownership.notFound) return BaseController.notFound(res, 'Template not found');
      if (!ownership.allowed) return BaseController.forbidden(res, 'You can only archive your own templates');

      const service = TemplateService.getInstance();
      const template = await service.archiveTemplate(id);

      return BaseController.ok(res, { template });
    } catch (error: any) {
      logger.error('[TemplateController.archiveTemplate] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  // ============================================
  // Template Library (WO-O4O-TEMPLATE-LIBRARY)
  // ============================================

  static async searchTemplates(req: Request, res: Response): Promise<any> {
    try {
      const filters = req.query;
      const service = TemplateService.getInstance();

      const { templates, total } = await service.searchTemplates(filters as any);

      return BaseController.okPaginated(res, templates, {
        total,
        page: Number(filters.page) || 1,
        limit: Number(filters.limit) || 20,
        totalPages: Math.ceil(total / (Number(filters.limit) || 20)),
      });
    } catch (error: any) {
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        logger.warn('[TemplateController.searchTemplates] Template tables not found - returning empty');
        return BaseController.okPaginated(res, [], {
          total: 0,
          page: Number(req.query.page) || 1,
          limit: Number(req.query.limit) || 20,
          totalPages: 0,
        });
      }
      logger.error('[TemplateController.searchTemplates] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async listLibrary(req: Request, res: Response): Promise<any> {
    try {
      const filters = req.query;
      const service = TemplateService.getInstance();

      const { templates, total } = await service.searchTemplates({
        type: filters.type as any,
        category: filters.category as string,
        tag: filters.tag as string,
        keyword: filters.keyword as string,
        page: filters.page ? Number(filters.page) : undefined,
        limit: filters.limit ? Number(filters.limit) : undefined,
      });

      return BaseController.okPaginated(res, templates, {
        total,
        page: Number(filters.page) || 1,
        limit: Number(filters.limit) || 20,
        totalPages: Math.ceil(total / (Number(filters.limit) || 20)),
      });
    } catch (error: any) {
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        logger.warn('[TemplateController.listLibrary] Template tables not found - returning empty');
        return BaseController.okPaginated(res, [], {
          total: 0,
          page: Number(req.query.page) || 1,
          limit: Number(req.query.limit) || 20,
          totalPages: 0,
        });
      }
      logger.error('[TemplateController.listLibrary] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getTemplatePreview(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = TemplateService.getInstance();

      const preview = await service.getTemplatePreview(id);

      if (!preview) {
        return BaseController.notFound(res, 'Template not found');
      }

      return BaseController.ok(res, preview);
    } catch (error: any) {
      logger.error('[TemplateController.getTemplatePreview] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  // Tags

  static async listTags(req: Request, res: Response): Promise<any> {
    try {
      const service = TemplateService.getInstance();
      const tags = await service.listTags();
      return BaseController.ok(res, { tags });
    } catch (error: any) {
      logger.error('[TemplateController.listTags] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async createTag(req: Request, res: Response): Promise<any> {
    try {
      const { name, slug } = req.body;
      const service = TemplateService.getInstance();
      const tag = await service.createTag({ name, slug });
      return BaseController.created(res, { tag });
    } catch (error: any) {
      logger.error('[TemplateController.createTag] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async addTagToTemplate(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const { tagId } = req.body;
      const service = TemplateService.getInstance();
      await service.addTagToTemplate(id, tagId);
      const tags = await service.getTemplateTags(id);
      return BaseController.ok(res, { tags });
    } catch (error: any) {
      logger.error('[TemplateController.addTagToTemplate] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async removeTagFromTemplate(req: Request, res: Response): Promise<any> {
    try {
      const { id, tagId } = req.params;
      const service = TemplateService.getInstance();
      await service.removeTagFromTemplate(id, tagId);
      const tags = await service.getTemplateTags(id);
      return BaseController.ok(res, { tags });
    } catch (error: any) {
      logger.error('[TemplateController.removeTagFromTemplate] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getTemplateTags(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = TemplateService.getInstance();
      const tags = await service.getTemplateTags(id);
      return BaseController.ok(res, { tags });
    } catch (error: any) {
      logger.error('[TemplateController.getTemplateTags] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  // Categories

  static async listCategories(req: Request, res: Response): Promise<any> {
    try {
      const service = TemplateService.getInstance();
      const categories = await service.listCategories();
      return BaseController.ok(res, { categories });
    } catch (error: any) {
      logger.error('[TemplateController.listCategories] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async createCategory(req: Request, res: Response): Promise<any> {
    try {
      const { name, slug } = req.body;
      const service = TemplateService.getInstance();
      const category = await service.createCategory({ name, slug });
      return BaseController.created(res, { category });
    } catch (error: any) {
      logger.error('[TemplateController.createCategory] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async addCategoryToTemplate(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const { categoryId } = req.body;
      const service = TemplateService.getInstance();
      await service.addCategoryToTemplate(id, categoryId);
      const categories = await service.getTemplateCategories(id);
      return BaseController.ok(res, { categories });
    } catch (error: any) {
      logger.error('[TemplateController.addCategoryToTemplate] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async removeCategoryFromTemplate(req: Request, res: Response): Promise<any> {
    try {
      const { id, categoryId } = req.params;
      const service = TemplateService.getInstance();
      await service.removeCategoryFromTemplate(id, categoryId);
      const categories = await service.getTemplateCategories(id);
      return BaseController.ok(res, { categories });
    } catch (error: any) {
      logger.error('[TemplateController.removeCategoryFromTemplate] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getTemplateCategories(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = TemplateService.getInstance();
      const categories = await service.getTemplateCategories(id);
      return BaseController.ok(res, { categories });
    } catch (error: any) {
      logger.error('[TemplateController.getTemplateCategories] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }
}
