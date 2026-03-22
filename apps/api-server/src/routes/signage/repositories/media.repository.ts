import { DataSource, Repository } from 'typeorm';
import { SignageMedia } from '@o4o-apps/digital-signage-core/entities';
import type { MediaQueryDto, ScopeFilter } from '../dto/index.js';

export class SignageMediaRepository {
  private mediaRepo: Repository<SignageMedia>;

  constructor(private dataSource: DataSource) {
    this.mediaRepo = dataSource.getRepository(SignageMedia);
  }

  async findMediaById(id: string, scope: ScopeFilter): Promise<SignageMedia | null> {
    return this.mediaRepo.findOne({
      where: {
        id,
        serviceKey: scope.serviceKey,
        ...(scope.organizationId && { organizationId: scope.organizationId }),
      },
    });
  }

  async findMedia(
    query: MediaQueryDto,
    scope: ScopeFilter,
  ): Promise<{ data: SignageMedia[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.mediaRepo.createQueryBuilder('media');

    qb.where('media.serviceKey = :serviceKey', { serviceKey: scope.serviceKey });
    if (scope.organizationId) {
      qb.andWhere('media.organizationId = :organizationId', {
        organizationId: scope.organizationId,
      });
    }

    qb.andWhere('media.deletedAt IS NULL');

    if (query.mediaType) {
      qb.andWhere('media.mediaType = :mediaType', { mediaType: query.mediaType });
    }
    if (query.sourceType) {
      qb.andWhere('media.sourceType = :sourceType', { sourceType: query.sourceType });
    }
    if (query.status) {
      qb.andWhere('media.status = :status', { status: query.status });
    }
    if (query.category) {
      qb.andWhere('media.category = :category', { category: query.category });
    }
    if (query.tags && query.tags.length > 0) {
      qb.andWhere('media.tags && :tags', { tags: query.tags });
    }
    if (query.search) {
      qb.andWhere('(media.name ILIKE :search OR media.description ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(`media.${sortBy}`, sortOrder);

    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async createMedia(data: Partial<SignageMedia>): Promise<SignageMedia> {
    const media = this.mediaRepo.create(data);
    return this.mediaRepo.save(media);
  }

  async updateMedia(
    id: string,
    data: Partial<SignageMedia>,
    scope: ScopeFilter,
  ): Promise<SignageMedia | null> {
    const media = await this.findMediaById(id, scope);
    if (!media) return null;

    Object.assign(media, data);
    return this.mediaRepo.save(media);
  }

  async softDeleteMedia(id: string, scope: ScopeFilter): Promise<boolean> {
    const result = await this.mediaRepo.update(
      {
        id,
        serviceKey: scope.serviceKey,
        ...(scope.organizationId && { organizationId: scope.organizationId }),
      },
      { deletedAt: new Date() },
    );
    return (result.affected || 0) > 0;
  }

  async findMediaLibrary(
    scope: ScopeFilter,
    mediaType?: string,
    category?: string,
    search?: string,
    limit: number = 50,
  ): Promise<{
    platform: SignageMedia[];
    organization: SignageMedia[];
  }> {
    const baseQuery = (qb: any) => {
      qb.where('media.deletedAt IS NULL');
      qb.andWhere('media.status = :status', { status: 'active' });
      if (mediaType) {
        qb.andWhere('media.mediaType = :mediaType', { mediaType });
      }
      if (category) {
        qb.andWhere('media.category = :category', { category });
      }
      if (search) {
        qb.andWhere('(media.name ILIKE :search OR media.description ILIKE :search)', {
          search: `%${search}%`,
        });
      }
      qb.orderBy('media.createdAt', 'DESC');
      qb.take(limit);
    };

    const platformQb = this.mediaRepo.createQueryBuilder('media');
    platformQb.where('media.serviceKey = :serviceKey', { serviceKey: scope.serviceKey });
    platformQb.andWhere('media.organizationId IS NULL');
    baseQuery(platformQb);
    const platform = await platformQb.getMany();

    let organization: SignageMedia[] = [];
    if (scope.organizationId) {
      const orgQb = this.mediaRepo.createQueryBuilder('media');
      orgQb.where('media.serviceKey = :serviceKey', { serviceKey: scope.serviceKey });
      orgQb.andWhere('media.organizationId = :organizationId', {
        organizationId: scope.organizationId,
      });
      baseQuery(orgQb);
      organization = await orgQb.getMany();
    }

    return { platform, organization };
  }
}
