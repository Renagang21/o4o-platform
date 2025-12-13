import { DataSource, Repository } from 'typeorm';
import { Display } from '../../entities/Display.entity.js';
import {
  CreateDisplayDto,
  UpdateDisplayDto,
  ListQueryOptions,
} from '../../dto/index.js';

/**
 * DisplayService
 *
 * 디스플레이 관리 서비스 (CRUD)
 */
export class DisplayService {
  private repo: Repository<Display>;

  constructor(private dataSource: DataSource) {
    this.repo = dataSource.getRepository(Display);
  }

  /**
   * 디스플레이 생성
   */
  async create(dto: CreateDisplayDto): Promise<Display> {
    const entity = this.repo.create({
      ...dto,
      status: dto.status ?? 'offline',
      isActive: dto.isActive ?? true,
      metadata: dto.metadata ?? {},
    });
    return await this.repo.save(entity);
  }

  /**
   * ID로 조회
   */
  async findById(id: string): Promise<Display | null> {
    return await this.repo.findOne({
      where: { id },
      relations: ['slots'],
    });
  }

  /**
   * 디바이스 코드로 조회
   */
  async findByDeviceCode(deviceCode: string): Promise<Display | null> {
    return await this.repo.findOne({
      where: { deviceCode },
      relations: ['slots'],
    });
  }

  /**
   * 목록 조회
   */
  async findList(options?: ListQueryOptions): Promise<{ items: Display[]; total: number }> {
    const qb = this.repo.createQueryBuilder('d');

    if (options?.organizationId) {
      qb.andWhere('d.organizationId = :organizationId', {
        organizationId: options.organizationId,
      });
    }

    if (options?.isActive !== undefined) {
      qb.andWhere('d.isActive = :isActive', { isActive: options.isActive });
    }

    qb.orderBy('d.createdAt', 'DESC');

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
  async update(id: string, dto: UpdateDisplayDto): Promise<Display> {
    const entity = await this.findById(id);
    if (!entity) {
      throw new Error(`Display "${id}" not found`);
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
      throw new Error(`Display "${id}" not found`);
    }
    entity.isActive = false;
    await this.repo.save(entity);
  }

  /**
   * 활성화/비활성화
   */
  async setActive(id: string, isActive: boolean): Promise<Display> {
    const entity = await this.findById(id);
    if (!entity) {
      throw new Error(`Display "${id}" not found`);
    }
    entity.isActive = isActive;
    return await this.repo.save(entity);
  }

  /**
   * 상태 변경
   */
  async setStatus(id: string, status: string): Promise<Display> {
    const entity = await this.findById(id);
    if (!entity) {
      throw new Error(`Display "${id}" not found`);
    }
    entity.status = status;
    return await this.repo.save(entity);
  }

  /**
   * 하트비트 업데이트
   */
  async updateHeartbeat(id: string): Promise<Display> {
    const entity = await this.findById(id);
    if (!entity) {
      throw new Error(`Display "${id}" not found`);
    }
    entity.lastHeartbeat = new Date();
    entity.status = 'online';
    return await this.repo.save(entity);
  }
}
