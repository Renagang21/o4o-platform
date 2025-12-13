import { DataSource, Repository } from 'typeorm';
import { Schedule } from '../../entities/Schedule.entity.js';
import {
  CreateScheduleDto,
  UpdateScheduleDto,
  ListQueryOptions,
} from '../../dto/index.js';

/**
 * ScheduleService
 *
 * 스케줄 관리 서비스 (CRUD)
 */
export class ScheduleService {
  private repo: Repository<Schedule>;

  constructor(private dataSource: DataSource) {
    this.repo = dataSource.getRepository(Schedule);
  }

  /**
   * 스케줄 생성
   */
  async create(dto: CreateScheduleDto): Promise<Schedule> {
    const entity = this.repo.create({
      ...dto,
      priority: dto.priority ?? 0,
      isActive: dto.isActive ?? true,
      metadata: dto.metadata ?? {},
    });
    return await this.repo.save(entity);
  }

  /**
   * ID로 조회
   */
  async findById(id: string): Promise<Schedule | null> {
    return await this.repo.findOne({ where: { id } });
  }

  /**
   * 목록 조회
   */
  async findList(options?: ListQueryOptions): Promise<{ items: Schedule[]; total: number }> {
    const qb = this.repo.createQueryBuilder('s');

    if (options?.organizationId) {
      qb.andWhere('s.organizationId = :organizationId', {
        organizationId: options.organizationId,
      });
    }

    if (options?.isActive !== undefined) {
      qb.andWhere('s.isActive = :isActive', { isActive: options.isActive });
    }

    qb.orderBy('s.priority', 'DESC');
    qb.addOrderBy('s.createdAt', 'DESC');

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
   * 슬롯 ID로 조회
   */
  async findByDisplaySlotId(displaySlotId: string): Promise<Schedule[]> {
    return await this.repo.find({
      where: { displaySlotId, isActive: true },
      order: { priority: 'DESC', startTime: 'ASC' },
    });
  }

  /**
   * 업데이트
   */
  async update(id: string, dto: UpdateScheduleDto): Promise<Schedule> {
    const entity = await this.findById(id);
    if (!entity) {
      throw new Error(`Schedule "${id}" not found`);
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
      throw new Error(`Schedule "${id}" not found`);
    }
    entity.isActive = false;
    await this.repo.save(entity);
  }

  /**
   * 활성화/비활성화
   */
  async setActive(id: string, isActive: boolean): Promise<Schedule> {
    const entity = await this.findById(id);
    if (!entity) {
      throw new Error(`Schedule "${id}" not found`);
    }
    entity.isActive = isActive;
    return await this.repo.save(entity);
  }
}
