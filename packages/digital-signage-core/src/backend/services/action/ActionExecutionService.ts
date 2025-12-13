import { DataSource, Repository } from 'typeorm';
import { ActionExecution } from '../../entities/ActionExecution.entity.js';

/**
 * ActionExecutionService
 *
 * 액션 실행 조회 서비스 (조회 전용)
 *
 * 주의: Work Order Phase 4-A 규칙에 따라
 * - 외부에서 create/update API 제공 금지
 * - list/get by id 조회만 허용
 * - 생성/변경은 Phase 4.5에서 구현
 */
export class ActionExecutionService {
  private repo: Repository<ActionExecution>;

  constructor(private dataSource: DataSource) {
    this.repo = dataSource.getRepository(ActionExecution);
  }

  /**
   * ID로 조회
   */
  async findById(id: string): Promise<ActionExecution | null> {
    return await this.repo.findOne({ where: { id } });
  }

  /**
   * 목록 조회
   */
  async findList(options?: {
    organizationId?: string;
    displayId?: string;
    displaySlotId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: ActionExecution[]; total: number }> {
    const qb = this.repo.createQueryBuilder('ae');

    if (options?.organizationId) {
      qb.andWhere('ae.organizationId = :organizationId', {
        organizationId: options.organizationId,
      });
    }

    if (options?.displayId) {
      qb.andWhere('ae.displayId = :displayId', {
        displayId: options.displayId,
      });
    }

    if (options?.displaySlotId) {
      qb.andWhere('ae.displaySlotId = :displaySlotId', {
        displaySlotId: options.displaySlotId,
      });
    }

    if (options?.status) {
      qb.andWhere('ae.status = :status', { status: options.status });
    }

    qb.orderBy('ae.createdAt', 'DESC');

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
   * 디스플레이별 최근 실행 조회
   */
  async findRecentByDisplayId(
    displayId: string,
    limit: number = 10
  ): Promise<ActionExecution[]> {
    return await this.repo.find({
      where: { displayId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * 슬롯별 최근 실행 조회
   */
  async findRecentBySlotId(
    displaySlotId: string,
    limit: number = 10
  ): Promise<ActionExecution[]> {
    return await this.repo.find({
      where: { displaySlotId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
