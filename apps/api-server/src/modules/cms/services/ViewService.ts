import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { BaseService } from '../../../common/base.service.js';
import { View, ViewType, ViewStatus, type ViewSchema } from '../entities/View.js';
import logger from '../../../utils/logger.js';

export interface CreateViewRequest {
  slug: string;
  name: string;
  description?: string;
  type: ViewType;
  schema: ViewSchema;
  postTypeSlug?: string;
  tags?: string[];
}

export interface UpdateViewRequest extends Partial<CreateViewRequest> {
  status?: ViewStatus;
}

export interface ViewFilters {
  type?: ViewType;
  status?: ViewStatus;
  postTypeSlug?: string;
  search?: string;
  tags?: string[];
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
    // Validate slug uniqueness
    const existing = await this.viewRepository.findOne({ where: { slug: data.slug } });
    if (existing) {
      throw new Error(`View with slug '${data.slug}' already exists`);
    }

    // Validate ViewRenderer compatibility
    const validationResult = this.validateViewSchema(data.schema);
    if (!validationResult.valid) {
      throw new Error(`Invalid View schema: ${validationResult.error}`);
    }

    const view = this.viewRepository.create({
      ...data,
      status: ViewStatus.DRAFT
    });

    const saved = await this.viewRepository.save(view);

    logger.info(`[CMS] View created: ${saved.slug}`, { id: saved.id, type: saved.type });

    return saved;
  }

  async getView(id: string): Promise<View | null> {
    return this.viewRepository.findOne({ where: { id } });
  }

  async getViewBySlug(slug: string): Promise<View | null> {
    return this.viewRepository.findOne({ where: { slug } });
  }

  async listViews(filters: ViewFilters = {}): Promise<{ views: View[]; total: number }> {
    const { type, status, postTypeSlug, search, tags, page = 1, limit = 20 } = filters;

    const query = this.viewRepository.createQueryBuilder('view');

    if (type) {
      query.andWhere('view.type = :type', { type });
    }

    if (status) {
      query.andWhere('view.status = :status', { status });
    }

    if (postTypeSlug) {
      query.andWhere('view.postTypeSlug = :postTypeSlug', { postTypeSlug });
    }

    if (search) {
      query.andWhere('(view.name ILIKE :search OR view.description ILIKE :search OR view.slug ILIKE :search)', {
        search: `%${search}%`
      });
    }

    if (tags && tags.length > 0) {
      query.andWhere('view.tags && :tags', { tags });
    }

    query
      .orderBy('view.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [views, total] = await query.getManyAndCount();

    return { views, total };
  }

  async updateView(id: string, data: UpdateViewRequest): Promise<View> {
    const view = await this.getView(id);
    if (!view) {
      throw new Error(`View not found: ${id}`);
    }

    // Validate slug uniqueness if changed
    if (data.slug && data.slug !== view.slug) {
      const existing = await this.viewRepository.findOne({ where: { slug: data.slug } });
      if (existing) {
        throw new Error(`View with slug '${data.slug}' already exists`);
      }
    }

    // Validate schema if changed
    if (data.schema) {
      const validationResult = this.validateViewSchema(data.schema);
      if (!validationResult.valid) {
        throw new Error(`Invalid View schema: ${validationResult.error}`);
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
    return this.updateView(id, { status: ViewStatus.ACTIVE });
  }

  async archiveView(id: string): Promise<View> {
    return this.updateView(id, { status: ViewStatus.ARCHIVED });
  }

  // ViewRenderer Compatibility
  validateViewSchema(schema: ViewSchema): { valid: boolean; error?: string } {
    if (!schema.version) {
      return { valid: false, error: 'Schema version is required' };
    }

    if (schema.version !== '2.0') {
      return { valid: false, error: `Unsupported schema version: ${schema.version}. Expected 2.0` };
    }

    if (!schema.components || schema.components.length === 0) {
      return { valid: false, error: 'Schema must have at least one component' };
    }

    // Validate each component
    for (const component of schema.components) {
      if (!component.id || !component.type) {
        return { valid: false, error: 'Each component must have id and type' };
      }
    }

    return { valid: true };
  }

  // Component Extraction
  getComponentsInView(viewId: string): Promise<any[]> {
    return this.getView(viewId).then(view => {
      if (!view) return [];

      const components: any[] = [];

      const extractComponents = (componentArray: any[]) => {
        componentArray.forEach(comp => {
          components.push(comp);
          if (comp.children) {
            extractComponents(comp.children);
          }
          if (comp.slots) {
            Object.values(comp.slots).forEach((slotComponents: any) => {
              extractComponents(slotComponents);
            });
          }
        });
      };

      extractComponents(view.schema.components);

      return components;
    });
  }

  // View Cloning
  async cloneView(viewId: string, newSlug: string, newName?: string): Promise<View> {
    const original = await this.getView(viewId);
    if (!original) {
      throw new Error(`View not found: ${viewId}`);
    }

    // Check if new slug is unique
    const existing = await this.viewRepository.findOne({ where: { slug: newSlug } });
    if (existing) {
      throw new Error(`View with slug '${newSlug}' already exists`);
    }

    const cloned = this.viewRepository.create({
      slug: newSlug,
      name: newName || `${original.name} (Copy)`,
      description: original.description,
      type: original.type,
      schema: JSON.parse(JSON.stringify(original.schema)), // Deep clone
      postTypeSlug: original.postTypeSlug,
      tags: original.tags ? [...original.tags] : undefined,
      status: ViewStatus.DRAFT
    });

    const saved = await this.viewRepository.save(cloned);

    logger.info(`[CMS] View cloned: ${original.slug} → ${saved.slug}`, {
      originalId: viewId,
      clonedId: saved.id
    });

    return saved;
  }

  // Get Views by CPT
  async getViewsForCPT(postTypeSlug: string): Promise<View[]> {
    return this.viewRepository.find({
      where: { postTypeSlug, status: ViewStatus.ACTIVE },
      order: { createdAt: 'DESC' }
    });
  }

  // Preview View (for frontend preview without requiring a Page)
  async previewView(slug: string): Promise<{ view: View; renderData: any } | null> {
    const view = await this.viewRepository.findOne({ where: { slug } });

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
      content: {
        // Sample content for preview
        title: 'Sample Title',
        subtitle: 'This is a preview with sample data',
        text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      },
      schema: view.schema,
    };

    logger.info(`[CMS] Previewing view: ${view.slug}`, { viewId: view.id });

    return { view, renderData };
  }
}
