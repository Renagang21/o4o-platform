import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { BaseService } from '../../../common/base.service.js';
import {
  StoreContent,
  StoreContentStatus,
  StoreContentBlock,
  StoreContentBlockType,
  Template,
  TemplateVersion,
  TemplateBlock,
} from '@o4o/interactive-content-core/entities';
import { generateQrDataUrl } from '../../../services/qr-print.service.js';
import logger from '../../../utils/logger.js';

/**
 * StoreContentService
 * LMS Module - Store Content Copy (WO-O4O-STORE-CONTENT-COPY)
 */

export interface CopyTemplateRequest {
  templateId: string;
  storeId: string;
}

export interface UpdateStoreContentRequest {
  title?: string;
  description?: string;
  status?: StoreContentStatus;
  shareImage?: string;
  isPublic?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateStoreContentBlockRequest {
  content?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface StoreContentFilters {
  storeId: string;
  status?: StoreContentStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export class StoreContentService extends BaseService<StoreContent> {
  private static instance: StoreContentService;
  private storeContentRepository: Repository<StoreContent>;
  private storeContentBlockRepository: Repository<StoreContentBlock>;
  private templateRepository: Repository<Template>;
  private versionRepository: Repository<TemplateVersion>;
  private blockRepository: Repository<TemplateBlock>;

  constructor() {
    const storeContentRepository = AppDataSource.getRepository(StoreContent);
    super(storeContentRepository);
    this.storeContentRepository = storeContentRepository;
    this.storeContentBlockRepository = AppDataSource.getRepository(StoreContentBlock);
    this.templateRepository = AppDataSource.getRepository(Template);
    this.versionRepository = AppDataSource.getRepository(TemplateVersion);
    this.blockRepository = AppDataSource.getRepository(TemplateBlock);
  }

  static getInstance(): StoreContentService {
    if (!StoreContentService.instance) {
      StoreContentService.instance = new StoreContentService();
    }
    return StoreContentService.instance;
  }

  // ============================================
  // Template Copy (핵심 기능)
  // ============================================

  async copyTemplateToStore(data: CopyTemplateRequest): Promise<StoreContent | null> {
    const { templateId, storeId } = data;

    // 1. Template 조회
    const template = await this.templateRepository.findOne({
      where: { id: templateId },
    });
    if (!template) {
      logger.warn('[StoreContentService.copyTemplateToStore] Template not found', { templateId });
      return null;
    }
    if (!template.currentVersionId) {
      logger.warn('[StoreContentService.copyTemplateToStore] Template has no published version', { templateId });
      return null;
    }

    // 2. TemplateVersion 조회
    const version = await this.versionRepository.findOne({
      where: { id: template.currentVersionId },
    });
    if (!version) {
      logger.warn('[StoreContentService.copyTemplateToStore] TemplateVersion not found', {
        templateId,
        versionId: template.currentVersionId,
      });
      return null;
    }

    // 3. StoreContent 생성 (slug 자동 생성)
    const slug = this.generateSlug(template.title);
    const storeContent = this.storeContentRepository.create({
      templateId: template.id,
      templateVersionId: version.id,
      storeId,
      title: template.title,
      description: template.description,
      slug,
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

    logger.info('[StoreContentService.copyTemplateToStore] Template copied to store', {
      templateId,
      storeId,
      storeContentId: savedContent.id,
      blockCount: templateBlocks.length,
    });

    return savedContent;
  }

  // ============================================
  // StoreContent CRUD
  // ============================================

  async getStoreContent(id: string): Promise<StoreContent | null> {
    return this.storeContentRepository.findOne({ where: { id } });
  }

  async listStoreContents(filters: StoreContentFilters): Promise<{ items: StoreContent[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.storeContentRepository.createQueryBuilder('sc');
    qb.andWhere('sc.storeId = :storeId', { storeId: filters.storeId });

    if (filters.status) {
      qb.andWhere('sc.status = :status', { status: filters.status });
    }
    if (filters.search) {
      qb.andWhere('(sc.title ILIKE :search OR sc.description ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    qb.orderBy('sc.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async updateStoreContent(id: string, data: UpdateStoreContentRequest): Promise<StoreContent | null> {
    const storeContent = await this.getStoreContent(id);
    if (!storeContent) return null;

    Object.assign(storeContent, data);
    return this.storeContentRepository.save(storeContent);
  }

  async deleteStoreContent(id: string): Promise<boolean> {
    // Delete blocks first
    await this.storeContentBlockRepository.delete({ storeContentId: id });

    const result = await this.storeContentRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  // ============================================
  // Block Management
  // ============================================

  async getBlocks(storeContentId: string): Promise<StoreContentBlock[]> {
    return this.storeContentBlockRepository.find({
      where: { storeContentId },
      order: { position: 'ASC' },
    });
  }

  async updateBlock(blockId: string, data: UpdateStoreContentBlockRequest): Promise<StoreContentBlock | null> {
    const block = await this.storeContentBlockRepository.findOne({ where: { id: blockId } });
    if (!block) return null;

    Object.assign(block, data);
    return this.storeContentBlockRepository.save(block);
  }

  // ============================================
  // Content Usage (WO-O4O-STORE-CONTENT-USAGE)
  // ============================================

  private generateSlug(title: string): string {
    const base = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\u3131-\u318E\u3200-\u321E\uAC00-\uD7AF\s-]/g, '')
      .replace(/[\s]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120);
    const suffix = Date.now().toString(36);
    return `${base}-${suffix}`;
  }

  private getBaseUrl(): string {
    return process.env.API_BASE_URL || process.env.FRONTEND_URL || 'https://api.neture.co.kr';
  }

  private getContentUrl(slug: string): string {
    return `${this.getBaseUrl()}/api/v1/lms/content/${slug}`;
  }

  /**
   * Generate SNS share payload
   */
  async generateSNSContent(id: string): Promise<{
    title: string;
    description: string;
    image: string | null;
    shareUrl: string;
  } | null> {
    const content = await this.getStoreContent(id);
    if (!content || !content.slug) return null;

    // Find first image block for SNS preview
    let image: string | null = content.shareImage || null;
    if (!image) {
      const blocks = await this.getBlocks(id);
      const imageBlock = blocks.find(b => b.blockType === 'image');
      if (imageBlock && imageBlock.content?.url) {
        image = imageBlock.content.url;
      }
    }

    return {
      title: content.title,
      description: content.description || '',
      image,
      shareUrl: this.getContentUrl(content.slug),
    };
  }

  /**
   * Generate POP display payload with QR
   */
  async generatePOPContent(id: string): Promise<{
    title: string;
    description: string;
    image: string | null;
    qrDataUrl: string;
  } | null> {
    const content = await this.getStoreContent(id);
    if (!content || !content.slug) return null;

    const contentUrl = this.getContentUrl(content.slug);
    const qrDataUrl = await generateQrDataUrl(contentUrl);

    // Find first image block
    let image: string | null = content.shareImage || null;
    if (!image) {
      const blocks = await this.getBlocks(id);
      const imageBlock = blocks.find(b => b.blockType === 'image');
      if (imageBlock && imageBlock.content?.url) {
        image = imageBlock.content.url;
      }
    }

    return {
      title: content.title,
      description: content.description || '',
      image,
      qrDataUrl,
    };
  }

  /**
   * Generate QR code for store content
   */
  async generateQRCode(id: string): Promise<{
    qrImage: string;
    contentUrl: string;
  } | null> {
    const content = await this.getStoreContent(id);
    if (!content || !content.slug) return null;

    const contentUrl = this.getContentUrl(content.slug);
    const qrImage = await generateQrDataUrl(contentUrl);

    return { qrImage, contentUrl };
  }

  /**
   * Get public content by slug (no auth required)
   */
  async getPublicContent(slug: string): Promise<{
    content: StoreContent;
    blocks: StoreContentBlock[];
  } | null> {
    const content = await this.storeContentRepository.findOne({
      where: { slug, isPublic: true, status: StoreContentStatus.ACTIVE },
    });
    if (!content) return null;

    const blocks = await this.getBlocks(content.id);
    return { content, blocks };
  }
}
