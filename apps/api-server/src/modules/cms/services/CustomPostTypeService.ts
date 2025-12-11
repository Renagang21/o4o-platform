import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { BaseService } from '../../../common/base.service.js';
import { CustomPostType, CPTStatus } from '../entities/CustomPostType.js';
import logger from '../../../utils/logger.js';

export interface CreateCPTRequest {
  slug: string;
  name: string;
  icon: string;
  description?: string;
  schema?: any;
  isPublic?: boolean;
  isHierarchical?: boolean;
  supportedFeatures?: string[];
  organizationId?: string;
}

export interface UpdateCPTRequest extends Partial<CreateCPTRequest> {
  status?: CPTStatus;
  isActive?: boolean;
}

export interface CPTFilters {
  status?: CPTStatus;
  isPublic?: boolean;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  organizationId?: string;
}

// Default organization ID for backward compatibility
const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000000';

export class CustomPostTypeService extends BaseService<CustomPostType> {
  private static instance: CustomPostTypeService;
  private cptRepository: Repository<CustomPostType>;

  constructor() {
    const cptRepository = AppDataSource.getRepository(CustomPostType);
    super(cptRepository);
    this.cptRepository = cptRepository;
  }

  static getInstance(): CustomPostTypeService {
    if (!CustomPostTypeService.instance) {
      CustomPostTypeService.instance = new CustomPostTypeService();
    }
    return CustomPostTypeService.instance;
  }

  // CRUD Operations
  async createCPT(data: CreateCPTRequest): Promise<CustomPostType> {
    const organizationId = data.organizationId || DEFAULT_ORG_ID;

    // Validate slug uniqueness within organization
    const existing = await this.cptRepository.findOne({
      where: { slug: data.slug, organizationId }
    });
    if (existing) {
      throw new Error(`CPT with slug '${data.slug}' already exists`);
    }

    const cpt = this.cptRepository.create({
      slug: data.slug,
      name: data.name,
      singularLabel: data.name,
      pluralLabel: data.name + 's',
      description: data.description,
      icon: data.icon,
      isPublic: data.isPublic ?? true,
      hierarchical: data.isHierarchical ?? false,
      supports: data.supportedFeatures || ['title', 'editor'],
      organizationId,
      isActive: false, // Start as draft (inactive)
    });

    const saved = await this.cptRepository.save(cpt);

    logger.info(`[CMS] CustomPostType created: ${saved.slug}`, { id: saved.id });

    return saved;
  }

  async getCPT(id: string): Promise<CustomPostType | null> {
    return this.cptRepository.findOne({ where: { id } });
  }

  async getCPTBySlug(slug: string, organizationId?: string): Promise<CustomPostType | null> {
    const where: any = { slug };
    if (organizationId) {
      where.organizationId = organizationId;
    }
    return this.cptRepository.findOne({ where });
  }

  async listCPTs(filters: CPTFilters = {}): Promise<{ cpts: CustomPostType[]; total: number }> {
    const { status, isPublic, isActive, search, page = 1, limit = 20, organizationId } = filters;

    const query = this.cptRepository.createQueryBuilder('cpt');

    // Map legacy status to isActive
    if (status) {
      if (status === CPTStatus.ACTIVE) {
        query.andWhere('cpt."isActive" = :isActive', { isActive: true });
      } else if (status === CPTStatus.ARCHIVED || status === CPTStatus.DRAFT) {
        query.andWhere('cpt."isActive" = :isActive', { isActive: false });
      }
    }

    if (isActive !== undefined) {
      query.andWhere('cpt."isActive" = :isActive', { isActive });
    }

    if (isPublic !== undefined) {
      query.andWhere('cpt."isPublic" = :isPublic', { isPublic });
    }

    if (organizationId) {
      query.andWhere('cpt."organizationId" = :organizationId', { organizationId });
    }

    if (search) {
      query.andWhere('(cpt.name ILIKE :search OR cpt.description ILIKE :search)', {
        search: `%${search}%`
      });
    }

    query
      .orderBy('cpt."createdAt"', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [cpts, total] = await query.getManyAndCount();

    return { cpts, total };
  }

  async updateCPT(id: string, data: UpdateCPTRequest): Promise<CustomPostType> {
    const cpt = await this.getCPT(id);
    if (!cpt) {
      throw new Error(`CPT not found: ${id}`);
    }

    // Validate slug uniqueness if changed
    if (data.slug && data.slug !== cpt.slug) {
      const existing = await this.cptRepository.findOne({
        where: { slug: data.slug, organizationId: cpt.organizationId }
      });
      if (existing) {
        throw new Error(`CPT with slug '${data.slug}' already exists`);
      }
    }

    // Map legacy status to isActive
    if (data.status) {
      data.isActive = data.status === CPTStatus.ACTIVE;
    }

    Object.assign(cpt, data);
    const updated = await this.cptRepository.save(cpt);

    logger.info(`[CMS] CustomPostType updated: ${updated.slug}`, { id: updated.id });

    return updated;
  }

  async deleteCPT(id: string): Promise<boolean> {
    const result = await this.cptRepository.delete(id);
    return result.affected ? result.affected > 0 : false;
  }

  async activateCPT(id: string): Promise<CustomPostType> {
    return this.updateCPT(id, { isActive: true });
  }

  async archiveCPT(id: string): Promise<CustomPostType> {
    return this.updateCPT(id, { isActive: false });
  }

  // Helper methods for Posts using this CPT
  async getPostCount(cptId: string): Promise<number> {
    // TODO: Query Post entity when implemented
    return 0;
  }
}
