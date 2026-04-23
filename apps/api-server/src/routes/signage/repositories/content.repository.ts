import { DataSource, Repository } from 'typeorm';
import {
  SignageContentBlock,
  SignageLayoutPreset,
  SignageAiGenerationLog,
} from '@o4o-apps/digital-signage-core/entities';
import type {
  ContentBlockQueryDto,
  LayoutPresetQueryDto,
  ScopeFilter,
} from '../dto/index.js';

export class SignageContentRepository {
  private contentBlockRepo: Repository<SignageContentBlock>;
  private layoutPresetRepo: Repository<SignageLayoutPreset>;
  private aiGenerationLogRepo: Repository<SignageAiGenerationLog>;

  constructor(private dataSource: DataSource) {
    this.contentBlockRepo = dataSource.getRepository(SignageContentBlock);
    this.layoutPresetRepo = dataSource.getRepository(SignageLayoutPreset);
    this.aiGenerationLogRepo = dataSource.getRepository(SignageAiGenerationLog);
  }

  // ========== Content Block Methods ==========

  async findContentBlockById(id: string, scope: ScopeFilter): Promise<SignageContentBlock | null> {
    return this.contentBlockRepo.findOne({
      where: {
        id,
        serviceKey: scope.serviceKey,
        ...(scope.organizationId && { organizationId: scope.organizationId }),
      },
    });
  }

  async findContentBlocks(
    query: ContentBlockQueryDto,
    scope: ScopeFilter,
  ): Promise<{ data: SignageContentBlock[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.contentBlockRepo.createQueryBuilder('block');

    qb.where('block.serviceKey = :serviceKey', { serviceKey: scope.serviceKey });
    if (scope.organizationId) {
      qb.andWhere('block.organizationId = :organizationId', {
        organizationId: scope.organizationId,
      });
    }

    qb.andWhere('block.deletedAt IS NULL');

    if (query.blockType) {
      qb.andWhere('block.blockType = :blockType', { blockType: query.blockType });
    }
    if (query.status) {
      qb.andWhere('block.status = :status', { status: query.status });
    }
    if (query.search) {
      qb.andWhere('(block.name ILIKE :search OR block.description ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(`block.${sortBy}`, sortOrder);

    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async createContentBlock(data: Partial<SignageContentBlock>): Promise<SignageContentBlock> {
    const block = this.contentBlockRepo.create(data);
    return this.contentBlockRepo.save(block);
  }

  async updateContentBlock(
    id: string,
    data: Partial<SignageContentBlock>,
    scope: ScopeFilter,
  ): Promise<SignageContentBlock | null> {
    const block = await this.findContentBlockById(id, scope);
    if (!block) return null;

    Object.assign(block, data);
    return this.contentBlockRepo.save(block);
  }

  async softDeleteContentBlock(id: string, scope: ScopeFilter): Promise<boolean> {
    const result = await this.contentBlockRepo.update(
      {
        id,
        serviceKey: scope.serviceKey,
        ...(scope.organizationId && { organizationId: scope.organizationId }),
      },
      { deletedAt: new Date() },
    );
    return (result.affected || 0) > 0;
  }

  // ========== Layout Preset Methods ==========

  async findLayoutPresetById(id: string, serviceKey?: string): Promise<SignageLayoutPreset | null> {
    return this.layoutPresetRepo.findOne({
      where: {
        id,
        ...(serviceKey && { serviceKey }),
      },
    });
  }

  async findLayoutPresets(
    query: LayoutPresetQueryDto,
    serviceKey?: string,
  ): Promise<{ data: SignageLayoutPreset[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.layoutPresetRepo.createQueryBuilder('preset');

    if (serviceKey) {
      qb.where('(preset.serviceKey = :serviceKey OR preset.serviceKey IS NULL)', { serviceKey });
    }

    qb.andWhere('preset.deletedAt IS NULL');

    if (query.isSystem !== undefined) {
      qb.andWhere('preset.isSystem = :isSystem', { isSystem: query.isSystem });
    }
    if (query.isActive !== undefined) {
      qb.andWhere('preset.isActive = :isActive', { isActive: query.isActive });
    }
    if (query.search) {
      qb.andWhere('(preset.name ILIKE :search OR preset.description ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const sortBy = query.sortBy || 'sortOrder';
    const sortOrder = query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(`preset.${sortBy}`, sortOrder);

    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async createLayoutPreset(data: Partial<SignageLayoutPreset>): Promise<SignageLayoutPreset> {
    const preset = this.layoutPresetRepo.create(data);
    return this.layoutPresetRepo.save(preset);
  }

  async updateLayoutPreset(
    id: string,
    data: Partial<SignageLayoutPreset>,
  ): Promise<SignageLayoutPreset | null> {
    const preset = await this.layoutPresetRepo.findOne({ where: { id } });
    if (!preset) return null;

    Object.assign(preset, data);
    return this.layoutPresetRepo.save(preset);
  }

  async softDeleteLayoutPreset(id: string): Promise<boolean> {
    const result = await this.layoutPresetRepo.update(id, { deletedAt: new Date() });
    return (result.affected || 0) > 0;
  }

  // ========== AI Generation Log Methods ==========

  async createAiGenerationLog(data: Partial<SignageAiGenerationLog>): Promise<SignageAiGenerationLog> {
    const log = this.aiGenerationLogRepo.create(data);
    return this.aiGenerationLogRepo.save(log);
  }

  async findAiGenerationLogs(
    scope: ScopeFilter,
    limit: number = 20,
  ): Promise<SignageAiGenerationLog[]> {
    return this.aiGenerationLogRepo.find({
      where: {
        serviceKey: scope.serviceKey,
        ...(scope.organizationId && { organizationId: scope.organizationId }),
      },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
