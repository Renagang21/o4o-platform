import { DataSource, Repository } from 'typeorm';
import { StoreContent, StoreContentStatus } from '../entities/store/StoreContent.js';
import { StoreContentBlock, StoreContentBlockType } from '../entities/store/StoreContentBlock.js';
import { Template, TemplateStatus } from '../entities/templates/Template.js';
import { TemplateVersion } from '../entities/templates/TemplateVersion.js';
import { TemplateBlock } from '../entities/templates/TemplateBlock.js';

/**
 * StoreContentService
 *
 * Template → Store Copy → StoreContent 서비스
 * - Template 복사 (copyTemplateToStore)
 * - StoreContent CRUD
 * - Block 수정
 */
export class StoreContentService {
  private storeContentRepository!: Repository<StoreContent>;
  private storeContentBlockRepository!: Repository<StoreContentBlock>;
  private templateRepository!: Repository<Template>;
  private versionRepository!: Repository<TemplateVersion>;
  private blockRepository!: Repository<TemplateBlock>;
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
    this.storeContentRepository = dataSource.getRepository(StoreContent);
    this.storeContentBlockRepository = dataSource.getRepository(StoreContentBlock);
    this.templateRepository = dataSource.getRepository(Template);
    this.versionRepository = dataSource.getRepository(TemplateVersion);
    this.blockRepository = dataSource.getRepository(TemplateBlock);
    this.initialized = true;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('StoreContentService not initialized. Call initService(dataSource) first.');
    }
  }

  // ============================================
  // Template Copy (핵심 기능)
  // ============================================

  /**
   * Copy a template to a store
   *
   * 1. Template 조회 (published + currentVersionId 확인)
   * 2. TemplateVersion 조회
   * 3. StoreContent 생성
   * 4. TemplateBlock[] → StoreContentBlock[] 복사
   */
  async copyTemplateToStore(
    templateId: string,
    storeId: string,
  ): Promise<StoreContent | null> {
    this.ensureInitialized();

    // 1. Template 조회
    const template = await this.templateRepository.findOne({
      where: { id: templateId },
    });
    if (!template) return null;
    if (!template.currentVersionId) return null;

    // 2. TemplateVersion 조회
    const version = await this.versionRepository.findOne({
      where: { id: template.currentVersionId },
    });
    if (!version) return null;

    // 3. StoreContent 생성
    const storeContent = this.storeContentRepository.create({
      templateId: template.id,
      templateVersionId: version.id,
      storeId,
      title: template.title,
      description: template.description,
      status: StoreContentStatus.DRAFT,
      metadata: { copiedFrom: { templateId: template.id, versionNumber: version.versionNumber } },
    });
    const savedContent = await this.storeContentRepository.save(storeContent);

    // 4. TemplateBlock[] → StoreContentBlock[] 복사
    const templateBlocks = await this.blockRepository.find({
      where: { templateVersionId: version.id },
      order: { position: 'ASC' },
    });

    for (const block of templateBlocks) {
      const storeBlock = this.storeContentBlockRepository.create({
        storeContentId: savedContent.id,
        blockType: block.blockType as unknown as StoreContentBlockType,
        content: block.content,
        position: block.position,
        metadata: block.metadata,
      });
      await this.storeContentBlockRepository.save(storeBlock);
    }

    return savedContent;
  }

  // ============================================
  // StoreContent CRUD
  // ============================================

  /**
   * Find StoreContent by ID
   */
  async findById(id: string): Promise<StoreContent | null> {
    this.ensureInitialized();
    return this.storeContentRepository.findOne({ where: { id } });
  }

  /**
   * Get store contents for a store with optional filters
   */
  async getStoreContents(options: {
    storeId: string;
    status?: StoreContentStatus;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: StoreContent[]; total: number }> {
    this.ensureInitialized();

    const { storeId, status, search, page = 1, limit = 20 } = options;

    const qb = this.storeContentRepository.createQueryBuilder('sc');
    qb.andWhere('sc.storeId = :storeId', { storeId });

    if (status) {
      qb.andWhere('sc.status = :status', { status });
    }
    if (search) {
      qb.andWhere('(sc.title ILIKE :search OR sc.description ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    qb.orderBy('sc.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  /**
   * Update StoreContent
   */
  async updateStoreContent(
    id: string,
    data: Partial<Pick<StoreContent, 'title' | 'description' | 'status' | 'metadata'>>,
  ): Promise<StoreContent | null> {
    this.ensureInitialized();
    await this.storeContentRepository.update(id, data);
    return this.findById(id);
  }

  /**
   * Delete StoreContent and its blocks
   */
  async deleteStoreContent(id: string): Promise<boolean> {
    this.ensureInitialized();

    // Delete blocks first
    await this.storeContentBlockRepository.delete({ storeContentId: id });

    const result = await this.storeContentRepository.delete(id);
    return result.affected !== 0;
  }

  // ============================================
  // Block Management
  // ============================================

  /**
   * Get blocks for a store content
   */
  async getBlocks(storeContentId: string): Promise<StoreContentBlock[]> {
    this.ensureInitialized();
    return this.storeContentBlockRepository.find({
      where: { storeContentId },
      order: { position: 'ASC' },
    });
  }

  /**
   * Update a block
   */
  async updateBlock(
    blockId: string,
    data: Partial<Pick<StoreContentBlock, 'content' | 'metadata'>>,
  ): Promise<StoreContentBlock | null> {
    this.ensureInitialized();
    await this.storeContentBlockRepository.update(blockId, data);
    return this.storeContentBlockRepository.findOne({ where: { id: blockId } });
  }

  // ============================================
  // Content Usage (WO-O4O-STORE-CONTENT-USAGE)
  // ============================================

  /**
   * Find StoreContent by slug
   */
  async findBySlug(slug: string): Promise<StoreContent | null> {
    this.ensureInitialized();
    return this.storeContentRepository.findOne({ where: { slug } });
  }

  /**
   * Get public content by slug (isPublic + ACTIVE only)
   */
  async getPublicContent(slug: string): Promise<{
    content: StoreContent;
    blocks: StoreContentBlock[];
  } | null> {
    this.ensureInitialized();

    const content = await this.storeContentRepository.findOne({
      where: { slug, isPublic: true, status: StoreContentStatus.ACTIVE },
    });
    if (!content) return null;

    const blocks = await this.storeContentBlockRepository.find({
      where: { storeContentId: content.id },
      order: { position: 'ASC' },
    });

    return { content, blocks };
  }
}

// Singleton instance for service registration
let storeContentServiceInstance: StoreContentService | null = null;

export function getStoreContentService(): StoreContentService {
  if (!storeContentServiceInstance) {
    storeContentServiceInstance = new StoreContentService();
  }
  return storeContentServiceInstance;
}

export function initStoreContentService(dataSource: DataSource): StoreContentService {
  const service = getStoreContentService();
  service.initService(dataSource);
  return service;
}
