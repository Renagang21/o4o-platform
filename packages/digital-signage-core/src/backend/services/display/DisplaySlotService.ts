import { DataSource, Repository } from 'typeorm';
import { DisplaySlot } from '../../entities/DisplaySlot.entity.js';
import {
  CreateDisplaySlotDto,
  UpdateDisplaySlotDto,
} from '../../dto/index.js';

/**
 * DisplaySlotService
 *
 * 디스플레이 슬롯 관리 서비스 (CRUD)
 */
export class DisplaySlotService {
  private repo: Repository<DisplaySlot>;

  constructor(private dataSource: DataSource) {
    this.repo = dataSource.getRepository(DisplaySlot);
  }

  /**
   * 디스플레이 슬롯 생성
   */
  async create(dto: CreateDisplaySlotDto): Promise<DisplaySlot> {
    const entity = this.repo.create({
      ...dto,
      positionX: dto.positionX ?? 0,
      positionY: dto.positionY ?? 0,
      zIndex: dto.zIndex ?? 0,
      isActive: dto.isActive ?? true,
      metadata: dto.metadata ?? {},
    });
    return await this.repo.save(entity);
  }

  /**
   * ID로 조회
   */
  async findById(id: string): Promise<DisplaySlot | null> {
    return await this.repo.findOne({
      where: { id },
      relations: ['display'],
    });
  }

  /**
   * 디스플레이 ID로 조회
   */
  async findByDisplayId(displayId: string): Promise<DisplaySlot[]> {
    return await this.repo.find({
      where: { displayId, isActive: true },
      order: { zIndex: 'ASC' },
    });
  }

  /**
   * 업데이트
   */
  async update(id: string, dto: UpdateDisplaySlotDto): Promise<DisplaySlot> {
    const entity = await this.findById(id);
    if (!entity) {
      throw new Error(`DisplaySlot "${id}" not found`);
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
      throw new Error(`DisplaySlot "${id}" not found`);
    }
    entity.isActive = false;
    await this.repo.save(entity);
  }

  /**
   * 활성화/비활성화
   */
  async setActive(id: string, isActive: boolean): Promise<DisplaySlot> {
    const entity = await this.findById(id);
    if (!entity) {
      throw new Error(`DisplaySlot "${id}" not found`);
    }
    entity.isActive = isActive;
    return await this.repo.save(entity);
  }
}
