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
  schema: any;
  isPublic?: boolean;
  isHierarchical?: boolean;
  supportedFeatures?: string[];
}

export interface UpdateCPTRequest extends Partial<CreateCPTRequest> {
  status?: CPTStatus;
}

export interface CPTFilters {
  status?: CPTStatus;
  isPublic?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

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
    // Validate slug uniqueness
    const existing = await this.cptRepository.findOne({ where: { slug: data.slug } });
    if (existing) {
      throw new Error(`CPT with slug '${data.slug}' already exists`);
    }

    const cpt = this.cptRepository.create({
      ...data,
      status: CPTStatus.DRAFT
    });

    const saved = await this.cptRepository.save(cpt);

    logger.info(`[CMS] CustomPostType created: ${saved.slug}`, { id: saved.id });

    return saved;
  }

  async getCPT(id: string): Promise<CustomPostType | null> {
    return this.cptRepository.findOne({ where: { id } });
  }

  async getCPTBySlug(slug: string): Promise<CustomPostType | null> {
    return this.cptRepository.findOne({ where: { slug } });
  }

  async listCPTs(filters: CPTFilters = {}): Promise<{ cpts: CustomPostType[]; total: number }> {
    const { status, isPublic, search, page = 1, limit = 20 } = filters;

    const query = this.cptRepository.createQueryBuilder('cpt');

    if (status) {
      query.andWhere('cpt.status = :status', { status });
    }

    if (isPublic !== undefined) {
      query.andWhere('cpt.isPublic = :isPublic', { isPublic });
    }

    if (search) {
      query.andWhere('(cpt.name ILIKE :search OR cpt.description ILIKE :search)', {
        search: `%${search}%`
      });
    }

    query
      .orderBy('cpt.createdAt', 'DESC')
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
      const existing = await this.cptRepository.findOne({ where: { slug: data.slug } });
      if (existing) {
        throw new Error(`CPT with slug '${data.slug}' already exists`);
      }
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
    return this.updateCPT(id, { status: CPTStatus.ACTIVE });
  }

  async archiveCPT(id: string): Promise<CustomPostType> {
    return this.updateCPT(id, { status: CPTStatus.ARCHIVED });
  }

  // Helper methods for Posts using this CPT
  async getPostCount(cptId: string): Promise<number> {
    // TODO: Query Post entity when implemented
    return 0;
  }
}
