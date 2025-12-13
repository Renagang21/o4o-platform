import { DataSource, Repository } from 'typeorm';
import { MediaList } from '../../entities/MediaList.entity.js';
import {
  CreateMediaListDto,
  UpdateMediaListDto,
  ListQueryOptions,
} from '../../dto/index.js';

/**
 * MediaListService
 *
 * 미디어 리스트 관리 서비스 (CRUD)
 */
export class MediaListService {
  private repo: Repository<MediaList>;

  constructor(private dataSource: DataSource) {
    this.repo = dataSource.getRepository(MediaList);
  }

  /**
   * 미디어 리스트 생성
   */
  async create(dto: CreateMediaListDto): Promise<MediaList> {
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
  async findById(id: string): Promise<MediaList | null> {
    return await this.repo.findOne({
      where: { id },
      relations: ['items', 'items.mediaSource'],
    });
  }

  /**
   * 목록 조회
   */
  async findList(options?: ListQueryOptions): Promise<{ items: MediaList[]; total: number }> {
    const qb = this.repo.createQueryBuilder('ml');

    if (options?.organizationId) {
      qb.andWhere('ml.organizationId = :organizationId', {
        organizationId: options.organizationId,
      });
    }

    if (options?.isActive !== undefined) {
      qb.andWhere('ml.isActive = :isActive', { isActive: options.isActive });
    }

    qb.orderBy('ml.createdAt', 'DESC');

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
  async update(id: string, dto: UpdateMediaListDto): Promise<MediaList> {
    const entity = await this.findById(id);
    if (!entity) {
      throw new Error(`MediaList "${id}" not found`);
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
      throw new Error(`MediaList "${id}" not found`);
    }
    entity.isActive = false;
    await this.repo.save(entity);
  }

  /**
   * 활성화/비활성화
   */
  async setActive(id: string, isActive: boolean): Promise<MediaList> {
    const entity = await this.findById(id);
    if (!entity) {
      throw new Error(`MediaList "${id}" not found`);
    }
    entity.isActive = isActive;
    return await this.repo.save(entity);
  }
}
