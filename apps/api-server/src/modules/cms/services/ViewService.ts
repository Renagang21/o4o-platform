import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { BaseService } from '../../../common/base.service.js';
import { View } from '../entities/View.js';
import logger from '../../../utils/logger.js';

/**
 * CreateViewRequest
 * Matches cms_views table structure from cms-core
 */
export interface CreateViewRequest {
  organizationId: string;
  slug: string;
  name: string;
  description?: string;
  type?: string;
  templateId?: string;
  cptType?: string;
  query?: Record<string, any>;
  layout?: Record<string, any>;
  filters?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface UpdateViewRequest extends Partial<Omit<CreateViewRequest, 'organizationId'>> {
  isActive?: boolean;
  sortOrder?: number;
}

export interface ViewFilters {
  organizationId?: string;
  type?: string;
  isActive?: boolean;
  cptType?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class ViewService extends BaseService<View> {
  private static instance: ViewService;
  private viewRepository: Repository<View>;

  constructor() {
    const viewRepository = AppDataSource.getRepository(View);
    super(viewRepository);
    this.viewRepository = viewRepository;
  }

  static getInstance(): ViewService {
    if (!ViewService.instance) {
      ViewService.instance = new ViewService();
    }
    return ViewService.instance;
  }

  // CRUD Operations
  async createView(data: CreateViewRequest): Promise<View> {
    // Validate slug uniqueness within organization
    const existing = await this.viewRepository.findOne({
      where: { organizationId: data.organizationId, slug: data.slug }
    });
    if (existing) {
      throw new Error(`View with slug '${data.slug}' already exists`);
    }

    const view = this.viewRepository.create({
      ...data,
      type: data.type || 'list',
      query: data.query || {},
      layout: data.layout || {},
      filters: data.filters || {},
      metadata: data.metadata || {},
      isActive: true,
      sortOrder: 0
    });

    const saved = await this.viewRepository.save(view);

    logger.info(`[CMS] View created: ${saved.slug}`, { id: saved.id, type: saved.type });

    return saved;
  }

  async getView(id: string): Promise<View | null> {
    return this.viewRepository.findOne({ where: { id } });
  }

  async getViewBySlug(slug: string, organizationId?: string): Promise<View | null> {
    const where: any = { slug };
    if (organizationId) {
      where.organizationId = organizationId;
    }
    return this.viewRepository.findOne({ where });
  }

  async listViews(filters: ViewFilters = {}): Promise<{ views: View[]; total: number }> {
    try {
      const { organizationId, type, isActive, cptType, search, page = 1, limit = 20 } = filters;

      const query = this.viewRepository.createQueryBuilder('view');

      if (organizationId) {
        query.andWhere('view.organizationId = :organizationId', { organizationId });
      }

      if (type) {
        query.andWhere('view.type = :type', { type });
      }

      if (isActive !== undefined) {
        query.andWhere('view.isActive = :isActive', { isActive });
      }

      if (cptType) {
        query.andWhere('view.cptType = :cptType', { cptType });
      }

      if (search) {
        query.andWhere('(view.name ILIKE :search OR view.description ILIKE :search OR view.slug ILIKE :search)', {
          search: `%${search}%`
        });
      }

      query
        .orderBy('view.sortOrder', 'ASC')
        .addOrderBy('view.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

      const [views, total] = await query.getManyAndCount();

      return { views, total };
    } catch (error: any) {
      logger.error('[ViewService.listViews] Error', { error: error.message });
      // Return empty result instead of throwing - graceful fallback
      return { views: [], total: 0 };
    }
  }

  async updateView(id: string, data: UpdateViewRequest): Promise<View> {
    const view = await this.getView(id);
    if (!view) {
      throw new Error(`View not found: ${id}`);
    }

    // Validate slug uniqueness if changed
    if (data.slug && data.slug !== view.slug) {
      const existing = await this.viewRepository.findOne({
        where: { organizationId: view.organizationId, slug: data.slug }
      });
      if (existing) {
        throw new Error(`View with slug '${data.slug}' already exists`);
      }
    }

    Object.assign(view, data);
    const updated = await this.viewRepository.save(view);

    logger.info(`[CMS] View updated: ${updated.slug}`, { id: updated.id });

    return updated;
  }

  async deleteView(id: string): Promise<boolean> {
    const result = await this.viewRepository.delete(id);
    return result.affected ? result.affected > 0 : false;
  }

  async activateView(id: string): Promise<View> {
    return this.updateView(id, { isActive: true });
  }

  async archiveView(id: string): Promise<View> {
    return this.updateView(id, { isActive: false });
  }

  // Get layout configuration from view
  getComponentsInView(viewId: string): Promise<any[]> {
    return this.getView(viewId).then(view => {
      if (!view || !view.layout) return [];
      // Return layout components if available
      return view.layout.components || [];
    });
  }

  // View Cloning
  async cloneView(viewId: string, newSlug: string, newName?: string): Promise<View> {
    const original = await this.getView(viewId);
    if (!original) {
      throw new Error(`View not found: ${viewId}`);
    }

    // Check if new slug is unique within organization
    const existing = await this.viewRepository.findOne({
      where: { organizationId: original.organizationId, slug: newSlug }
    });
    if (existing) {
      throw new Error(`View with slug '${newSlug}' already exists`);
    }

    const cloned = this.viewRepository.create({
      organizationId: original.organizationId,
      slug: newSlug,
      name: newName || `${original.name} (Copy)`,
      description: original.description,
      type: original.type,
      templateId: original.templateId,
      cptType: original.cptType,
      query: JSON.parse(JSON.stringify(original.query)),
      layout: JSON.parse(JSON.stringify(original.layout)),
      filters: JSON.parse(JSON.stringify(original.filters)),
      metadata: JSON.parse(JSON.stringify(original.metadata)),
      isActive: false,
      sortOrder: original.sortOrder
    });

    const saved = await this.viewRepository.save(cloned);

    logger.info(`[CMS] View cloned: ${original.slug} → ${saved.slug}`, {
      originalId: viewId,
      clonedId: saved.id
    });

    return saved;
  }

  // Get Views by CPT type
  async getViewsForCPT(cptType: string, organizationId?: string): Promise<View[]> {
    const where: any = { cptType, isActive: true };
    if (organizationId) {
      where.organizationId = organizationId;
    }
    return this.viewRepository.find({
      where,
      order: { sortOrder: 'ASC', createdAt: 'DESC' }
    });
  }

  // Preview View
  async previewView(slug: string, organizationId?: string): Promise<{ view: View; renderData: any } | null> {
    const view = await this.getViewBySlug(slug, organizationId);

    if (!view) {
      return null;
    }

    // Generate mock/sample data for preview
    const renderData = {
      meta: {
        title: `Preview: ${view.name}`,
        description: view.description || 'View template preview',
        slug: view.slug,
      },
      layout: view.layout,
      query: view.query,
      filters: view.filters,
    };

    logger.info(`[CMS] Previewing view: ${view.slug}`, { viewId: view.id });

    return { view, renderData };
  }
}
