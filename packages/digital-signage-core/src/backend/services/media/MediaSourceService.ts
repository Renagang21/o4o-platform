import { DataSource, Repository } from 'typeorm';
import { MediaSource } from '../../entities/MediaSource.entity.js';
import {
  CreateMediaSourceDto,
  UpdateMediaSourceDto,
  ListQueryOptions,
} from '../../dto/index.js';

/**
 * MediaSourceService
 *
 * 미디어 소스 관리 서비스 (CRUD)
 */
export class MediaSourceService {
  private repo: Repository<MediaSource>;

  constructor(private dataSource: DataSource) {
    this.repo = dataSource.getRepository(MediaSource);
  }

  /**
   * 미디어 소스 생성
   */
  async create(dto: CreateMediaSourceDto): Promise<MediaSource> {
    const entity = this.repo.create({
      ...dto,
      isActive: dto.isActive ?? true,
      metadata: dto.metadata ?? {},
    });
    return await this.repo.save(entity);
  }

  /**
   * ID로 조회
   */
  async findById(id: string): Promise<MediaSource | null> {
    return await this.repo.findOne({ where: { id } });
  }

  /**
   * 목록 조회
   */
  async findList(options?: ListQueryOptions): Promise<{ items: MediaSource[]; total: number }> {
    const qb = this.repo.createQueryBuilder('ms');

    if (options?.organizationId) {
      qb.andWhere('ms.organizationId = :organizationId', {
        organizationId: options.organizationId,
      });
    }

    if (options?.isActive !== undefined) {
      qb.andWhere('ms.isActive = :isActive', { isActive: options.isActive });
    }

    qb.orderBy('ms.createdAt', 'DESC');

    if (options?.limit) {
      qb.take(options.limit);
    }
    if (options?.offset) {
      qb.skip(options.offset);
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  /**
   * 업데이트
   */
  async update(id: string, dto: UpdateMediaSourceDto): Promise<MediaSource> {
    const entity = await this.findById(id);
    if (!entity) {
      throw new Error(`MediaSource "${id}" not found`);
    }
    Object.assign(entity, dto);
    return await this.repo.save(entity);
  }

  /**
   * 삭제 (soft delete)
   */
  async delete(id: string): Promise<void> {
    const entity = await this.findById(id);
    if (!entity) {
      throw new Error(`MediaSource "${id}" not found`);
    }
    entity.isActive = false;
    await this.repo.save(entity);
  }

  /**
   * 활성화/비활성화
   */
  async setActive(id: string, isActive: boolean): Promise<MediaSource> {
    const entity = await this.findById(id);
    if (!entity) {
      throw new Error(`MediaSource "${id}" not found`);
    }
    entity.isActive = isActive;
    return await this.repo.save(entity);
  }
}
