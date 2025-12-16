import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { BaseService } from '../../../common/base.service.js';
import { Page, PageStatus, type PageVersion } from '../entities/Page.js';
import { ViewService } from './ViewService.js';
import logger from '../../../utils/logger.js';

export interface CreatePageRequest {
  slug: string;
  title: string;
  viewId?: string;
  content: Record<string, any>;
  siteId?: string;
  tags?: string[];
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
    ogImage?: string;
    noIndex?: boolean;
  };
}

export interface UpdatePageRequest extends Partial<CreatePageRequest> {
  status?: PageStatus;
  scheduledAt?: Date;
}

export interface PageFilters {
  status?: PageStatus;
  siteId?: string;
  viewId?: string;
  search?: string;
  tags?: string[];
  page?: number;
  limit?: number;
}

export class PageService extends BaseService<Page> {
  private static instance: PageService;
  private pageRepository: Repository<Page>;
  private viewService: ViewService;

  constructor() {
    const pageRepository = AppDataSource.getRepository(Page);
    super(pageRepository);
    this.pageRepository = pageRepository;
    this.viewService = ViewService.getInstance();
  }

  static getInstance(): PageService {
    if (!PageService.instance) {
      PageService.instance = new PageService();
    }
    return PageService.instance;
  }

  // CRUD Operations
  async createPage(data: CreatePageRequest): Promise<Page> {
    // Validate slug uniqueness
    const existing = await this.pageRepository.findOne({ where: { slug: data.slug } });
    if (existing) {
      throw new Error(`Page with slug '${data.slug}' already exists`);
    }

    // Validate View if provided
    if (data.viewId) {
      const view = await this.viewService.getView(data.viewId);
      if (!view) {
        throw new Error(`View not found: ${data.viewId}`);
      }
      if (!view.isActive) {
        throw new Error('Selected View is not active');
      }
    }

    const page = this.pageRepository.create({
      ...data,
      status: PageStatus.DRAFT,
      currentVersion: 1,
      versions: []
    });

    const saved = await this.pageRepository.save(page);

    logger.info(`[CMS] Page created: ${saved.slug}`, { id: saved.id });

    return saved;
  }

  async getPage(id: string): Promise<Page | null> {
    return this.pageRepository.findOne({
      where: { id },
      relations: ['view']
    });
  }

  async getPageBySlug(slug: string): Promise<Page | null> {
    return this.pageRepository.findOne({
      where: { slug },
      relations: ['view']
    });
  }

  async listPages(filters: PageFilters = {}): Promise<{ pages: Page[]; total: number }> {
    const { status, siteId, viewId, search, tags, page = 1, limit = 20 } = filters;

    const query = this.pageRepository.createQueryBuilder('page');

    if (status) {
      query.andWhere('page.status = :status', { status });
    }

    if (siteId) {
      query.andWhere('page.siteId = :siteId', { siteId });
    }

    if (viewId) {
      query.andWhere('page.viewId = :viewId', { viewId });
    }

    if (search) {
      query.andWhere('(page.title ILIKE :search OR page.slug ILIKE :search)', {
        search: `%${search}%`
      });
    }

    if (tags && tags.length > 0) {
      query.andWhere('page.tags && :tags', { tags });
    }

    query
      .orderBy('page.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [pages, total] = await query.getManyAndCount();

    return { pages, total };
  }

  async updatePage(id: string, data: UpdatePageRequest): Promise<Page> {
    const page = await this.getPage(id);
    if (!page) {
      throw new Error(`Page not found: ${id}`);
    }

    // Validate slug uniqueness if changed
    if (data.slug && data.slug !== page.slug) {
      const existing = await this.pageRepository.findOne({ where: { slug: data.slug } });
      if (existing) {
        throw new Error(`Page with slug '${data.slug}' already exists`);
      }
    }

    // Validate View if changed
    if (data.viewId && data.viewId !== page.viewId) {
      const view = await this.viewService.getView(data.viewId);
      if (!view) {
        throw new Error(`View not found: ${data.viewId}`);
      }
      if (!view.isActive) {
        throw new Error('Selected View is not active');
      }
    }

    Object.assign(page, data);
    const updated = await this.pageRepository.save(page);

    logger.info(`[CMS] Page updated: ${updated.slug}`, { id: updated.id });

    return updated;
  }

  async deletePage(id: string): Promise<boolean> {
    const result = await this.pageRepository.delete(id);
    return result.affected ? result.affected > 0 : false;
  }

  // Publishing Workflow
  async publishPage(id: string, publishedBy: string): Promise<Page> {
    const page = await this.getPage(id);
    if (!page) {
      throw new Error(`Page not found: ${id}`);
    }

    page.publish(publishedBy);
    const published = await this.pageRepository.save(page);

    logger.info(`[CMS] Page published: ${published.slug}`, {
      id: published.id,
      publishedBy,
      version: published.currentVersion
    });

    return published;
  }

  async schedulePage(id: string, scheduledAt: Date): Promise<Page> {
    const page = await this.getPage(id);
    if (!page) {
      throw new Error(`Page not found: ${id}`);
    }

    page.schedule(scheduledAt);
    const scheduled = await this.pageRepository.save(page);

    logger.info(`[CMS] Page scheduled: ${scheduled.slug}`, {
      id: scheduled.id,
      scheduledAt: scheduledAt.toISOString()
    });

    return scheduled;
  }

  async draftPage(id: string): Promise<Page> {
    return this.updatePage(id, { status: PageStatus.DRAFT });
  }

  async archivePage(id: string): Promise<Page> {
    return this.updatePage(id, { status: PageStatus.ARCHIVED });
  }

  // Version Management
  async getVersionHistory(pageId: string): Promise<PageVersion[]> {
    const page = await this.getPage(pageId);
    if (!page) {
      throw new Error(`Page not found: ${pageId}`);
    }

    return page.versions || [];
  }

  async revertToVersion(pageId: string, versionNumber: number): Promise<Page> {
    const page = await this.getPage(pageId);
    if (!page) {
      throw new Error(`Page not found: ${pageId}`);
    }

    const success = page.revertToVersion(versionNumber);
    if (!success) {
      throw new Error(`Version ${versionNumber} not found`);
    }

    const reverted = await this.pageRepository.save(page);

    logger.info(`[CMS] Page reverted to version ${versionNumber}: ${reverted.slug}`, {
      id: reverted.id,
      versionNumber
    });

    return reverted;
  }

  // Frontend Rendering
  async renderPage(slug: string): Promise<{ page: Page; view: any; renderData: any } | null> {
    const page = await this.getPageBySlug(slug);
    if (!page || !page.isPublished()) {
      return null;
    }

    let view = null;
    let renderData = page.content;

    if (page.viewId) {
      view = await this.viewService.getView(page.viewId);
      if (view && view.isCompatibleWithViewRenderer()) {
        renderData = {
          ...page.content,
          viewSchema: view.schema,
          pageMeta: {
            title: page.seo?.title || page.title,
            description: page.seo?.description,
            keywords: page.seo?.keywords,
            ogImage: page.seo?.ogImage
          }
        };
      }
    }

    return { page, view, renderData };
  }

  // Get published pages for sitemap
  async getPublishedPages(siteId?: string): Promise<Page[]> {
    const query = this.pageRepository.createQueryBuilder('page')
      .where('page.status = :status', { status: PageStatus.PUBLISHED });

    if (siteId) {
      query.andWhere('page.siteId = :siteId', { siteId });
    }

    return query
      .orderBy('page.publishedAt', 'DESC')
      .getMany();
  }

  // Process scheduled pages (should be run by cron job)
  async processScheduledPages(): Promise<number> {
    const now = new Date();

    const scheduledPages = await this.pageRepository
      .createQueryBuilder('page')
      .where('page.status = :status', { status: PageStatus.SCHEDULED })
      .andWhere('page.scheduledAt <= :now', { now })
      .getMany();

    let publishedCount = 0;

    for (const page of scheduledPages) {
      try {
        await this.publishPage(page.id, 'system:scheduler');
        publishedCount++;
      } catch (error: any) {
        logger.error(`[CMS] Failed to publish scheduled page: ${page.slug}`, {
          error: error.message,
          pageId: page.id
        });
      }
    }

    if (publishedCount > 0) {
      logger.info(`[CMS] Published ${publishedCount} scheduled pages`);
    }

    return publishedCount;
  }
}
