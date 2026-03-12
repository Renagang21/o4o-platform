import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { BaseService } from '../../../common/base.service.js';
import {
  Template,
  TemplateType,
  TemplateStatus,
  TemplateVisibility,
  TemplateVersion,
  TemplateVersionStatus,
  TemplateBlock,
  TemplateBlockType,
  // WO-O4O-TEMPLATE-LIBRARY
  TemplateTag,
  TemplateTagMap,
  TemplateCategory,
  TemplateCategoryMap,
} from '@o4o/interactive-content-core/entities';
import logger from '../../../utils/logger.js';

/**
 * TemplateService
 * LMS Module - Template Management (WO-O4O-TEMPLATE-SYSTEM-FOUNDATION)
 */

export interface CreateTemplateRequest {
  type: TemplateType;
  title: string;
  description?: string;
  thumbnail?: string;
  authorUserId?: string;
  organizationId?: string;
  serviceKey?: string;
  visibility?: TemplateVisibility;
  metadata?: Record<string, any>;
}

export interface UpdateTemplateRequest extends Partial<CreateTemplateRequest> {
  status?: TemplateStatus;
}

export interface TemplateFilters {
  type?: TemplateType;
  status?: TemplateStatus;
  visibility?: TemplateVisibility;
  organizationId?: string;
  serviceKey?: string;
  authorUserId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateBlockRequest {
  blockType: TemplateBlockType;
  content?: Record<string, any>;
  metadata?: Record<string, any>;
  bundleId?: string;
}

export interface UpdateBlockRequest extends Partial<CreateBlockRequest> {
  position?: number;
}

export interface TemplateSearchFilters {
  type?: TemplateType;
  tag?: string;
  category?: string;
  keyword?: string;
  authorUserId?: string;
  page?: number;
  limit?: number;
}

export class TemplateService extends BaseService<Template> {
  private static instance: TemplateService;
  private templateRepository: Repository<Template>;
  private versionRepository: Repository<TemplateVersion>;
  private blockRepository: Repository<TemplateBlock>;
  private tagRepository: Repository<TemplateTag>;
  private tagMapRepository: Repository<TemplateTagMap>;
  private categoryRepository: Repository<TemplateCategory>;
  private categoryMapRepository: Repository<TemplateCategoryMap>;

  constructor() {
    const templateRepository = AppDataSource.getRepository(Template);
    super(templateRepository);
    this.templateRepository = templateRepository;
    this.versionRepository = AppDataSource.getRepository(TemplateVersion);
    this.blockRepository = AppDataSource.getRepository(TemplateBlock);
    this.tagRepository = AppDataSource.getRepository(TemplateTag);
    this.tagMapRepository = AppDataSource.getRepository(TemplateTagMap);
    this.categoryRepository = AppDataSource.getRepository(TemplateCategory);
    this.categoryMapRepository = AppDataSource.getRepository(TemplateCategoryMap);
  }

  static getInstance(): TemplateService {
    if (!TemplateService.instance) {
      TemplateService.instance = new TemplateService();
    }
    return TemplateService.instance;
  }

  // ============================================
  // Template CRUD
  // ============================================

  async createTemplate(data: CreateTemplateRequest): Promise<Template> {
    const template = this.templateRepository.create({
      ...data,
      visibility: data.visibility ?? TemplateVisibility.PRIVATE,
      metadata: data.metadata || {},
    });
    return this.templateRepository.save(template);
  }

  async getTemplate(id: string): Promise<Template | null> {
    return this.templateRepository.findOne({ where: { id } });
  }

  async listTemplates(filters: TemplateFilters): Promise<{ templates: Template[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.templateRepository.createQueryBuilder('template');

    if (filters.type) {
      qb.andWhere('template.type = :type', { type: filters.type });
    }
    if (filters.status) {
      qb.andWhere('template.status = :status', { status: filters.status });
    }
    if (filters.visibility) {
      qb.andWhere('template.visibility = :visibility', { visibility: filters.visibility });
    }
    if (filters.organizationId) {
      qb.andWhere('template.organizationId = :organizationId', { organizationId: filters.organizationId });
    }
    if (filters.serviceKey) {
      qb.andWhere('template.serviceKey = :serviceKey', { serviceKey: filters.serviceKey });
    }
    if (filters.authorUserId) {
      qb.andWhere('template.authorUserId = :authorUserId', { authorUserId: filters.authorUserId });
    }
    if (filters.search) {
      qb.andWhere('(template.title ILIKE :search OR template.description ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    qb.orderBy('template.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [templates, total] = await qb.getManyAndCount();
    return { templates, total };
  }

  async updateTemplate(id: string, data: UpdateTemplateRequest): Promise<Template | null> {
    const template = await this.getTemplate(id);
    if (!template) return null;

    Object.assign(template, data);
    return this.templateRepository.save(template);
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const result = await this.templateRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  // ============================================
  // Publishing
  // ============================================

  async publishTemplate(id: string): Promise<Template | null> {
    const template = await this.getTemplate(id);
    if (!template) return null;

    // Find and publish the latest draft version
    const draftVersion = await this.versionRepository.findOne({
      where: { templateId: id, status: TemplateVersionStatus.DRAFT },
      order: { versionNumber: 'DESC' },
    });

    if (draftVersion) {
      draftVersion.publish();
      await this.versionRepository.save(draftVersion);
      template.currentVersionId = draftVersion.id;
    }

    template.publish();
    return this.templateRepository.save(template);
  }

  async archiveTemplate(id: string): Promise<Template | null> {
    const template = await this.getTemplate(id);
    if (!template) return null;

    template.archive();
    return this.templateRepository.save(template);
  }

  // ============================================
  // Version Management
  // ============================================

  async createVersion(templateId: string, data?: Partial<TemplateVersion>): Promise<TemplateVersion | null> {
    const template = await this.getTemplate(templateId);
    if (!template) return null;

    const latestVersion = await this.versionRepository.findOne({
      where: { templateId },
      order: { versionNumber: 'DESC' },
    });

    const versionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

    const version = this.versionRepository.create({
      ...data,
      templateId,
      versionNumber,
    });

    return this.versionRepository.save(version);
  }

  async getVersions(templateId: string): Promise<TemplateVersion[]> {
    return this.versionRepository.find({
      where: { templateId },
      order: { versionNumber: 'DESC' },
    });
  }

  // ============================================
  // Block Management
  // ============================================

  async addBlock(versionId: string, data: CreateBlockRequest): Promise<TemplateBlock> {
    const lastBlock = await this.blockRepository.findOne({
      where: { templateVersionId: versionId },
      order: { position: 'DESC' },
    });

    const position = lastBlock ? lastBlock.position + 1 : 0;

    const block = this.blockRepository.create({
      ...data,
      templateVersionId: versionId,
      position,
      content: data.content || {},
      metadata: data.metadata || {},
    });

    return this.blockRepository.save(block);
  }

  async getBlocks(versionId: string): Promise<TemplateBlock[]> {
    return this.blockRepository.find({
      where: { templateVersionId: versionId },
      order: { position: 'ASC' },
    });
  }

  async updateBlock(blockId: string, data: UpdateBlockRequest): Promise<TemplateBlock | null> {
    const block = await this.blockRepository.findOne({ where: { id: blockId } });
    if (!block) return null;

    Object.assign(block, data);
    return this.blockRepository.save(block);
  }

  async removeBlock(blockId: string): Promise<boolean> {
    const result = await this.blockRepository.delete(blockId);
    return (result.affected ?? 0) > 0;
  }

  async reorderBlocks(versionId: string, blockIds: string[]): Promise<TemplateBlock[]> {
    for (let i = 0; i < blockIds.length; i++) {
      await this.blockRepository.update(blockIds[i], { position: i });
    }
    return this.getBlocks(versionId);
  }

  // ============================================
  // Template Library (WO-O4O-TEMPLATE-LIBRARY)
  // ============================================

  async searchTemplates(filters: TemplateSearchFilters): Promise<{ templates: Template[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.templateRepository.createQueryBuilder('template');
    qb.andWhere('template.status = :status', { status: TemplateStatus.PUBLISHED });

    if (filters.type) {
      qb.andWhere('template.type = :type', { type: filters.type });
    }
    if (filters.authorUserId) {
      qb.andWhere('template.authorUserId = :authorUserId', { authorUserId: filters.authorUserId });
    }
    if (filters.keyword) {
      qb.andWhere('(template.title ILIKE :keyword OR template.description ILIKE :keyword)', {
        keyword: `%${filters.keyword}%`,
      });
    }
    if (filters.tag) {
      qb.andWhere(
        `template.id IN (
          SELECT tm."templateId" FROM lms_template_tag_map tm
          INNER JOIN lms_template_tags t ON t.id = tm."tagId"
          WHERE t.slug = :tag
        )`,
        { tag: filters.tag },
      );
    }
    if (filters.category) {
      qb.andWhere(
        `template.id IN (
          SELECT cm."templateId" FROM lms_template_category_map cm
          INNER JOIN lms_template_categories c ON c.id = cm."categoryId"
          WHERE c.slug = :category
        )`,
        { category: filters.category },
      );
    }

    qb.orderBy('template.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [templates, total] = await qb.getManyAndCount();
    return { templates, total };
  }

  async getTemplatePreview(id: string): Promise<{
    template: Template;
    version: TemplateVersion | null;
    blocks: TemplateBlock[];
  } | null> {
    const template = await this.getTemplate(id);
    if (!template) return null;

    let version: TemplateVersion | null = null;
    let blocks: TemplateBlock[] = [];

    if (template.currentVersionId) {
      version = await this.versionRepository.findOne({ where: { id: template.currentVersionId } });
    } else {
      version = await this.versionRepository.findOne({
        where: { templateId: id },
        order: { versionNumber: 'DESC' },
      });
    }

    if (version) {
      blocks = await this.getBlocks(version.id);
    }

    return { template, version, blocks };
  }

  // Tag Management

  async listTags(): Promise<TemplateTag[]> {
    return this.tagRepository.find({ order: { name: 'ASC' } });
  }

  async createTag(data: { name: string; slug: string }): Promise<TemplateTag> {
    const tag = this.tagRepository.create(data);
    return this.tagRepository.save(tag);
  }

  async addTagToTemplate(templateId: string, tagId: string): Promise<void> {
    const map = this.tagMapRepository.create({ templateId, tagId });
    await this.tagMapRepository.save(map);
  }

  async removeTagFromTemplate(templateId: string, tagId: string): Promise<void> {
    await this.tagMapRepository.delete({ templateId, tagId });
  }

  async getTemplateTags(templateId: string): Promise<TemplateTag[]> {
    const maps = await this.tagMapRepository.find({ where: { templateId } });
    if (maps.length === 0) return [];
    const tagIds = maps.map(m => m.tagId);
    return this.tagRepository.createQueryBuilder('tag')
      .where('tag.id IN (:...tagIds)', { tagIds })
      .orderBy('tag.name', 'ASC')
      .getMany();
  }

  // Category Management

  async listCategories(): Promise<TemplateCategory[]> {
    return this.categoryRepository.find({ order: { name: 'ASC' } });
  }

  async createCategory(data: { name: string; slug: string }): Promise<TemplateCategory> {
    const category = this.categoryRepository.create(data);
    return this.categoryRepository.save(category);
  }

  async addCategoryToTemplate(templateId: string, categoryId: string): Promise<void> {
    const map = this.categoryMapRepository.create({ templateId, categoryId });
    await this.categoryMapRepository.save(map);
  }

  async removeCategoryFromTemplate(templateId: string, categoryId: string): Promise<void> {
    await this.categoryMapRepository.delete({ templateId, categoryId });
  }

  async getTemplateCategories(templateId: string): Promise<TemplateCategory[]> {
    const maps = await this.categoryMapRepository.find({ where: { templateId } });
    if (maps.length === 0) return [];
    const categoryIds = maps.map(m => m.categoryId);
    return this.categoryRepository.createQueryBuilder('category')
      .where('category.id IN (:...categoryIds)', { categoryIds })
      .orderBy('category.name', 'ASC')
      .getMany();
  }
}
