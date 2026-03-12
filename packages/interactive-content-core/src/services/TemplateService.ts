import { DataSource, Repository } from 'typeorm';
import { Template, TemplateType, TemplateStatus, TemplateVisibility } from '../entities/templates/Template.js';
import { TemplateVersion, TemplateVersionStatus } from '../entities/templates/TemplateVersion.js';
import { TemplateBlock } from '../entities/templates/TemplateBlock.js';
import { TemplateTag } from '../entities/templates/TemplateTag.js';
import { TemplateTagMap } from '../entities/templates/TemplateTagMap.js';
import { TemplateCategory } from '../entities/templates/TemplateCategory.js';
import { TemplateCategoryMap } from '../entities/templates/TemplateCategoryMap.js';

/**
 * TemplateService
 *
 * 템플릿 엔진 서비스
 * - Template CRUD
 * - Version 관리
 * - Block 관리
 * - Publishing
 */
export class TemplateService {
  private templateRepository!: Repository<Template>;
  private versionRepository!: Repository<TemplateVersion>;
  private blockRepository!: Repository<TemplateBlock>;
  private tagRepository!: Repository<TemplateTag>;
  private tagMapRepository!: Repository<TemplateTagMap>;
  private categoryRepository!: Repository<TemplateCategory>;
  private categoryMapRepository!: Repository<TemplateCategoryMap>;
  private initialized = false;

  constructor(private dataSource?: DataSource) {
    if (dataSource) {
      this.initRepositories(dataSource);
    }
  }

  /**
   * Initialize with DataSource
   */
  initService(dataSource: DataSource): void {
    this.initRepositories(dataSource);
  }

  private initRepositories(dataSource: DataSource): void {
    this.templateRepository = dataSource.getRepository(Template);
    this.versionRepository = dataSource.getRepository(TemplateVersion);
    this.blockRepository = dataSource.getRepository(TemplateBlock);
    this.tagRepository = dataSource.getRepository(TemplateTag);
    this.tagMapRepository = dataSource.getRepository(TemplateTagMap);
    this.categoryRepository = dataSource.getRepository(TemplateCategory);
    this.categoryMapRepository = dataSource.getRepository(TemplateCategoryMap);
    this.initialized = true;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('TemplateService not initialized. Call initService(dataSource) first.');
    }
  }

  // ============================================
  // Template CRUD
  // ============================================

  /**
   * Create a new template
   */
  async createTemplate(data: Partial<Template>): Promise<Template> {
    this.ensureInitialized();
    const template = this.templateRepository.create(data);
    return this.templateRepository.save(template);
  }

  /**
   * Find template by ID
   */
  async findById(id: string): Promise<Template | null> {
    this.ensureInitialized();
    return this.templateRepository.findOne({ where: { id } });
  }

  /**
   * List templates with optional filters
   */
  async list(options: {
    type?: TemplateType;
    status?: TemplateStatus;
    visibility?: TemplateVisibility;
    organizationId?: string;
    serviceKey?: string;
    authorUserId?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ items: Template[]; total: number }> {
    this.ensureInitialized();

    const {
      type,
      status,
      visibility,
      organizationId,
      serviceKey,
      authorUserId,
      search,
      page = 1,
      limit = 20,
    } = options;

    const qb = this.templateRepository.createQueryBuilder('template');

    if (type) {
      qb.andWhere('template.type = :type', { type });
    }
    if (status) {
      qb.andWhere('template.status = :status', { status });
    }
    if (visibility) {
      qb.andWhere('template.visibility = :visibility', { visibility });
    }
    if (organizationId) {
      qb.andWhere('template.organizationId = :organizationId', { organizationId });
    }
    if (serviceKey) {
      qb.andWhere('template.serviceKey = :serviceKey', { serviceKey });
    }
    if (authorUserId) {
      qb.andWhere('template.authorUserId = :authorUserId', { authorUserId });
    }
    if (search) {
      qb.andWhere('(template.title ILIKE :search OR template.description ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    qb.orderBy('template.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  /**
   * Update template
   */
  async update(id: string, data: Partial<Template>): Promise<Template | null> {
    this.ensureInitialized();
    await this.templateRepository.update(id, data);
    return this.findById(id);
  }

  /**
   * Delete template
   */
  async delete(id: string): Promise<boolean> {
    this.ensureInitialized();
    const result = await this.templateRepository.delete(id);
    return result.affected !== 0;
  }

  // ============================================
  // Version Management
  // ============================================

  /**
   * Create a new version for a template
   */
  async createVersion(
    templateId: string,
    data?: Partial<TemplateVersion>,
  ): Promise<TemplateVersion | null> {
    this.ensureInitialized();

    const template = await this.findById(templateId);
    if (!template) return null;

    // Get the latest version number
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

  /**
   * Get all versions for a template
   */
  async getVersions(templateId: string): Promise<TemplateVersion[]> {
    this.ensureInitialized();
    return this.versionRepository.find({
      where: { templateId },
      order: { versionNumber: 'DESC' },
    });
  }

  /**
   * Get a specific version
   */
  async getVersion(versionId: string): Promise<TemplateVersion | null> {
    this.ensureInitialized();
    return this.versionRepository.findOne({ where: { id: versionId } });
  }

  /**
   * Publish a version and update the template's currentVersionId
   */
  async publishVersion(
    templateId: string,
    versionId: string,
  ): Promise<Template | null> {
    this.ensureInitialized();

    const template = await this.findById(templateId);
    if (!template) return null;

    const version = await this.versionRepository.findOne({
      where: { id: versionId, templateId },
    });
    if (!version) return null;

    // Publish the version
    version.publish();
    await this.versionRepository.save(version);

    // Update template's current version and status
    template.currentVersionId = versionId;
    template.publish();
    return this.templateRepository.save(template);
  }

  // ============================================
  // Block Management
  // ============================================

  /**
   * Add a block to a version
   */
  async addBlock(
    versionId: string,
    data: Partial<TemplateBlock>,
  ): Promise<TemplateBlock> {
    this.ensureInitialized();

    // Get the max position
    const lastBlock = await this.blockRepository.findOne({
      where: { templateVersionId: versionId },
      order: { position: 'DESC' },
    });

    const position = lastBlock ? lastBlock.position + 1 : 0;

    const block = this.blockRepository.create({
      ...data,
      templateVersionId: versionId,
      position,
    });

    return this.blockRepository.save(block);
  }

  /**
   * Get blocks for a version
   */
  async getBlocks(versionId: string): Promise<TemplateBlock[]> {
    this.ensureInitialized();
    return this.blockRepository.find({
      where: { templateVersionId: versionId },
      order: { position: 'ASC' },
    });
  }

  /**
   * Update a block
   */
  async updateBlock(
    blockId: string,
    data: Partial<TemplateBlock>,
  ): Promise<TemplateBlock | null> {
    this.ensureInitialized();
    await this.blockRepository.update(blockId, data);
    return this.blockRepository.findOne({ where: { id: blockId } });
  }

  /**
   * Remove a block
   */
  async removeBlock(blockId: string): Promise<boolean> {
    this.ensureInitialized();
    const result = await this.blockRepository.delete(blockId);
    return result.affected !== 0;
  }

  /**
   * Reorder blocks
   */
  async reorderBlocks(
    versionId: string,
    blockIds: string[],
  ): Promise<TemplateBlock[]> {
    this.ensureInitialized();

    for (let i = 0; i < blockIds.length; i++) {
      await this.blockRepository.update(blockIds[i], { position: i });
    }

    return this.getBlocks(versionId);
  }

  // ============================================
  // Publishing
  // ============================================

  /**
   * Publish template (publishes latest draft version)
   */
  async publish(templateId: string): Promise<Template | null> {
    this.ensureInitialized();

    const template = await this.findById(templateId);
    if (!template) return null;

    // Find the latest draft version
    const draftVersion = await this.versionRepository.findOne({
      where: { templateId, status: TemplateVersionStatus.DRAFT },
      order: { versionNumber: 'DESC' },
    });

    if (draftVersion) {
      return this.publishVersion(templateId, draftVersion.id);
    }

    // If no draft version, just publish the template
    template.publish();
    return this.templateRepository.save(template);
  }

  /**
   * Archive template
   */
  async archive(templateId: string): Promise<Template | null> {
    this.ensureInitialized();

    const template = await this.findById(templateId);
    if (!template) return null;

    template.archive();
    return this.templateRepository.save(template);
  }
  // ============================================
  // Template Library (WO-O4O-TEMPLATE-LIBRARY)
  // ============================================

  /**
   * Search templates with tag/category filters
   */
  async searchTemplates(options: {
    type?: TemplateType;
    tag?: string;
    category?: string;
    keyword?: string;
    authorUserId?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ items: Template[]; total: number }> {
    this.ensureInitialized();

    const { type, tag, category, keyword, authorUserId, page = 1, limit = 20 } = options;

    const qb = this.templateRepository.createQueryBuilder('template');

    // Only published templates in library search
    qb.andWhere('template.status = :status', { status: TemplateStatus.PUBLISHED });

    if (type) {
      qb.andWhere('template.type = :type', { type });
    }
    if (authorUserId) {
      qb.andWhere('template.authorUserId = :authorUserId', { authorUserId });
    }
    if (keyword) {
      qb.andWhere('(template.title ILIKE :keyword OR template.description ILIKE :keyword)', {
        keyword: `%${keyword}%`,
      });
    }
    if (tag) {
      qb.andWhere(
        `template.id IN (
          SELECT tm."templateId" FROM lms_template_tag_map tm
          INNER JOIN lms_template_tags t ON t.id = tm."tagId"
          WHERE t.slug = :tag
        )`,
        { tag },
      );
    }
    if (category) {
      qb.andWhere(
        `template.id IN (
          SELECT cm."templateId" FROM lms_template_category_map cm
          INNER JOIN lms_template_categories c ON c.id = cm."categoryId"
          WHERE c.slug = :category
        )`,
        { category },
      );
    }

    qb.orderBy('template.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  /**
   * Get template preview (template + latest version + blocks)
   */
  async getTemplatePreview(templateId: string): Promise<{
    template: Template;
    version: TemplateVersion | null;
    blocks: TemplateBlock[];
  } | null> {
    this.ensureInitialized();

    const template = await this.findById(templateId);
    if (!template) return null;

    let version: TemplateVersion | null = null;
    let blocks: TemplateBlock[] = [];

    // Use currentVersionId if available, else latest version
    if (template.currentVersionId) {
      version = await this.getVersion(template.currentVersionId);
    } else {
      version = await this.versionRepository.findOne({
        where: { templateId },
        order: { versionNumber: 'DESC' },
      });
    }

    if (version) {
      blocks = await this.getBlocks(version.id);
    }

    return { template, version, blocks };
  }

  // ============================================
  // Tag Management
  // ============================================

  /**
   * List all tags
   */
  async listTags(): Promise<TemplateTag[]> {
    this.ensureInitialized();
    return this.tagRepository.find({ order: { name: 'ASC' } });
  }

  /**
   * Create a tag
   */
  async createTag(data: { name: string; slug: string }): Promise<TemplateTag> {
    this.ensureInitialized();
    const tag = this.tagRepository.create(data);
    return this.tagRepository.save(tag);
  }

  /**
   * Add tag to template
   */
  async addTagToTemplate(templateId: string, tagId: string): Promise<void> {
    this.ensureInitialized();
    const map = this.tagMapRepository.create({ templateId, tagId });
    await this.tagMapRepository.save(map);
  }

  /**
   * Remove tag from template
   */
  async removeTagFromTemplate(templateId: string, tagId: string): Promise<void> {
    this.ensureInitialized();
    await this.tagMapRepository.delete({ templateId, tagId });
  }

  /**
   * Get tags for template
   */
  async getTemplateTags(templateId: string): Promise<TemplateTag[]> {
    this.ensureInitialized();
    const maps = await this.tagMapRepository.find({ where: { templateId } });
    if (maps.length === 0) return [];
    const tagIds = maps.map(m => m.tagId);
    return this.tagRepository.createQueryBuilder('tag')
      .where('tag.id IN (:...tagIds)', { tagIds })
      .orderBy('tag.name', 'ASC')
      .getMany();
  }

  // ============================================
  // Category Management
  // ============================================

  /**
   * List all categories
   */
  async listCategories(): Promise<TemplateCategory[]> {
    this.ensureInitialized();
    return this.categoryRepository.find({ order: { name: 'ASC' } });
  }

  /**
   * Create a category
   */
  async createCategory(data: { name: string; slug: string }): Promise<TemplateCategory> {
    this.ensureInitialized();
    const category = this.categoryRepository.create(data);
    return this.categoryRepository.save(category);
  }

  /**
   * Add category to template
   */
  async addCategoryToTemplate(templateId: string, categoryId: string): Promise<void> {
    this.ensureInitialized();
    const map = this.categoryMapRepository.create({ templateId, categoryId });
    await this.categoryMapRepository.save(map);
  }

  /**
   * Remove category from template
   */
  async removeCategoryFromTemplate(templateId: string, categoryId: string): Promise<void> {
    this.ensureInitialized();
    await this.categoryMapRepository.delete({ templateId, categoryId });
  }

  /**
   * Get categories for template
   */
  async getTemplateCategories(templateId: string): Promise<TemplateCategory[]> {
    this.ensureInitialized();
    const maps = await this.categoryMapRepository.find({ where: { templateId } });
    if (maps.length === 0) return [];
    const categoryIds = maps.map(m => m.categoryId);
    return this.categoryRepository.createQueryBuilder('category')
      .where('category.id IN (:...categoryIds)', { categoryIds })
      .orderBy('category.name', 'ASC')
      .getMany();
  }
}

// Singleton instance for service registration
let templateServiceInstance: TemplateService | null = null;

export function getTemplateService(): TemplateService {
  if (!templateServiceInstance) {
    templateServiceInstance = new TemplateService();
  }
  return templateServiceInstance;
}

export function initTemplateService(dataSource: DataSource): TemplateService {
  const service = getTemplateService();
  service.initService(dataSource);
  return service;
}
