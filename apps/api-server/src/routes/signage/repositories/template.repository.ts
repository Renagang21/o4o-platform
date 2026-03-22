import { DataSource, Repository } from 'typeorm';
import {
  SignageTemplate,
  SignageTemplateZone,
} from '@o4o-apps/digital-signage-core/entities';
import type { TemplateQueryDto, ScopeFilter } from '../dto/index.js';

export class SignageTemplateRepository {
  private templateRepo: Repository<SignageTemplate>;
  private templateZoneRepo: Repository<SignageTemplateZone>;

  constructor(private dataSource: DataSource) {
    this.templateRepo = dataSource.getRepository(SignageTemplate);
    this.templateZoneRepo = dataSource.getRepository(SignageTemplateZone);
  }

  async findTemplateById(id: string, scope: ScopeFilter): Promise<SignageTemplate | null> {
    return this.templateRepo.findOne({
      where: {
        id,
        serviceKey: scope.serviceKey,
        ...(scope.organizationId && { organizationId: scope.organizationId }),
      },
      relations: ['zones'],
    });
  }

  async findTemplates(
    query: TemplateQueryDto,
    scope: ScopeFilter,
  ): Promise<{ data: SignageTemplate[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.templateRepo.createQueryBuilder('template');

    qb.where('template.serviceKey = :serviceKey', { serviceKey: scope.serviceKey });
    if (scope.organizationId) {
      qb.andWhere('(template.organizationId = :organizationId OR template.isPublic = true)', {
        organizationId: scope.organizationId,
      });
    }

    qb.andWhere('template.deletedAt IS NULL');

    if (query.status) {
      qb.andWhere('template.status = :status', { status: query.status });
    }
    if (query.isPublic !== undefined) {
      qb.andWhere('template.isPublic = :isPublic', { isPublic: query.isPublic });
    }
    if (query.isSystem !== undefined) {
      qb.andWhere('template.isSystem = :isSystem', { isSystem: query.isSystem });
    }
    if (query.category) {
      qb.andWhere('template.category = :category', { category: query.category });
    }
    if (query.search) {
      qb.andWhere('(template.name ILIKE :search OR template.description ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(`template.${sortBy}`, sortOrder);

    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async createTemplate(data: Partial<SignageTemplate>): Promise<SignageTemplate> {
    const template = this.templateRepo.create(data);
    return this.templateRepo.save(template);
  }

  async updateTemplate(
    id: string,
    data: Partial<SignageTemplate>,
    scope: ScopeFilter,
  ): Promise<SignageTemplate | null> {
    const template = await this.findTemplateById(id, scope);
    if (!template) return null;

    Object.assign(template, data);
    return this.templateRepo.save(template);
  }

  async softDeleteTemplate(id: string, scope: ScopeFilter): Promise<boolean> {
    const result = await this.templateRepo.update(
      {
        id,
        serviceKey: scope.serviceKey,
        ...(scope.organizationId && { organizationId: scope.organizationId }),
      },
      { deletedAt: new Date() },
    );
    return (result.affected || 0) > 0;
  }

  // ========== Template Zone Methods ==========

  async findTemplateZones(templateId: string): Promise<SignageTemplateZone[]> {
    return this.templateZoneRepo.find({
      where: { templateId },
      order: { sortOrder: 'ASC' },
    });
  }

  async findTemplateZoneById(id: string): Promise<SignageTemplateZone | null> {
    return this.templateZoneRepo.findOne({ where: { id } });
  }

  async createTemplateZone(data: Partial<SignageTemplateZone>): Promise<SignageTemplateZone> {
    const zone = this.templateZoneRepo.create(data);
    return this.templateZoneRepo.save(zone);
  }

  async updateTemplateZone(
    id: string,
    data: Partial<SignageTemplateZone>,
  ): Promise<SignageTemplateZone | null> {
    const zone = await this.templateZoneRepo.findOne({ where: { id } });
    if (!zone) return null;

    Object.assign(zone, data);
    return this.templateZoneRepo.save(zone);
  }

  async deleteTemplateZone(id: string): Promise<boolean> {
    const result = await this.templateZoneRepo.delete(id);
    return (result.affected || 0) > 0;
  }

  async getMaxZoneSortOrder(templateId: string): Promise<number> {
    const result = await this.templateZoneRepo
      .createQueryBuilder('zone')
      .select('MAX(zone.sortOrder)', 'max')
      .where('zone.templateId = :templateId', { templateId })
      .getRawOne();
    return result?.max || 0;
  }
}
