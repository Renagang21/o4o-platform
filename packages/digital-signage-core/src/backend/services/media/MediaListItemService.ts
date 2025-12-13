import { DataSource, Repository } from 'typeorm';
import { MediaListItem } from '../../entities/MediaListItem.entity.js';
import {
  CreateMediaListItemDto,
  UpdateMediaListItemDto,
} from '../../dto/index.js';

/**
 * MediaListItemService
 *
 * 미디어 리스트 아이템 관리 서비스 (CRUD)
 */
export class MediaListItemService {
  private repo: Repository<MediaListItem>;

  constructor(private dataSource: DataSource) {
    this.repo = dataSource.getRepository(MediaListItem);
  }

  /**
   * 미디어 리스트 아이템 생성
   */
  async create(dto: CreateMediaListItemDto): Promise<MediaListItem> {
    const entity = this.repo.create({
      ...dto,
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
      metadata: dto.metadata ?? {},
    });
    return await this.repo.save(entity);
  }

  /**
   * ID로 조회
   */
  async findById(id: string): Promise<MediaListItem | null> {
    return await this.repo.findOne({
      where: { id },
      relations: ['mediaSource', 'mediaList'],
    });
  }

  /**
   * 리스트 ID로 조회
   */
  async findByMediaListId(mediaListId: string): Promise<MediaListItem[]> {
    return await this.repo.find({
      where: { mediaListId, isActive: true },
      relations: ['mediaSource'],
      order: { sortOrder: 'ASC' },
    });
  }

  /**
   * 업데이트
   */
  async update(id: string, dto: UpdateMediaListItemDto): Promise<MediaListItem> {
    const entity = await this.findById(id);
    if (!entity) {
      throw new Error(`MediaListItem "${id}" not found`);
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
      throw new Error(`MediaListItem "${id}" not found`);
    }
    entity.isActive = false;
    await this.repo.save(entity);
  }

  /**
   * 순서 변경
   */
  async reorder(mediaListId: string, itemIds: string[]): Promise<void> {
    for (let i = 0; i < itemIds.length; i++) {
      await this.repo.update(itemIds[i], { sortOrder: i });
    }
  }
}
