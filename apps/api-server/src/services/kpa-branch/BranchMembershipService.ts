/**
 * BranchMembershipService
 * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1 §3
 *
 * 분회 소속 원장의 유일한 write 경로다.
 *
 * 불변식:
 *   1) 과거 기록을 삭제하거나 덮어쓰지 않는다. 전출은 status='left' + left_at 마감이며
 *      전입은 언제나 새 행 INSERT 다 (동일 분회 재전입 포함).
 *   2) 한 회원의 active 행은 최대 1개. DB 부분 UNIQUE(UQ_branch_memberships_active_user)가
 *      최종 방어선이고, 애플리케이션은 트랜잭션 안에서 전출→전입 순서를 강제한다.
 *   3) role 을 여기서 다루지 않는다 (4축 분리). RBAC 는 role_assignments 담당이다.
 */
import type { DataSource, EntityManager } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import { BranchMembership } from '../../routes/kpa-branch/entities/branch-membership.entity.js';

export class BranchMembershipConflictError extends Error {
  code = 'BRANCH_MEMBERSHIP_CONFLICT';
}

export class BranchMembershipService {
  constructor(private readonly ds: DataSource = AppDataSource) {}

  /** 현재(active) 소속 1건. 없으면 null. */
  async getCurrent(userId: string): Promise<BranchMembership | null> {
    return this.ds.getRepository(BranchMembership).findOne({
      where: { user_id: userId, status: 'active' },
    });
  }

  /** 전체 이력 (최신순). 전출·재전입이 모두 별도 행으로 남는다. */
  async getHistory(userId: string): Promise<BranchMembership[]> {
    return this.ds.getRepository(BranchMembership).find({
      where: { user_id: userId },
      order: { joined_at: 'DESC', created_at: 'DESC' },
    });
  }

  /** 분회 회원 목록. status 미지정 시 active 만. */
  async listByBranch(
    organizationId: string,
    options: { status?: 'active' | 'left' | 'all'; limit?: number; offset?: number } = {},
  ): Promise<{ items: BranchMembership[]; total: number }> {
    const { status = 'active', limit = 50, offset = 0 } = options;
    const qb = this.ds
      .getRepository(BranchMembership)
      .createQueryBuilder('bm')
      .where('bm.organization_id = :organizationId', { organizationId });
    if (status !== 'all') qb.andWhere('bm.status = :status', { status });
    const [items, total] = await qb
      .orderBy('bm.joined_at', 'DESC')
      .skip(offset)
      .take(Math.min(limit, 200))
      .getManyAndCount();
    return { items, total };
  }

  /**
   * 전입 (가입 / 다른 분회에서 이동).
   * 기존 active 소속이 있으면 같은 트랜잭션에서 먼저 전출 처리한다.
   * 동일 분회로의 재전입도 새 행을 만든다 — 이력이 누적된다.
   */
  async join(params: {
    userId: string;
    organizationId: string;
    reason?: string | null;
    note?: string | null;
    /** 발령일. 미지정이면 처리 시각. 전출 마감일과 전입일이 같은 값으로 기록된다. */
    effectiveDate?: Date | null;
    /** 분회 회비구분 — 분회별 속성이므로 새 소속 행에만 기록한다 (이전 분회 행은 그대로) */
    feeCategory?: string | null;
  }): Promise<BranchMembership> {
    const effectiveAt = params.effectiveDate ?? new Date();
    return this.ds.transaction(async (manager: EntityManager) => {
      const repo = manager.getRepository(BranchMembership);
      const current = await repo
        .createQueryBuilder('bm')
        .setLock('pessimistic_write')
        .where('bm.user_id = :userId AND bm.status = :status', {
          userId: params.userId,
          status: 'active',
        })
        .getOne();

      if (current) {
        if (current.organization_id === params.organizationId) {
          throw new BranchMembershipConflictError('이미 해당 분회 소속입니다.');
        }
        if (effectiveAt.getTime() < new Date(current.joined_at).getTime()) {
          throw new BranchMembershipConflictError('발령일이 직전 소속의 가입일보다 앞설 수 없습니다.');
        }
        await repo.update(current.id, {
          status: 'left',
          left_at: effectiveAt,
          transfer_reason: params.reason ?? '분회 이동',
        });
      }

      const created = repo.create({
        user_id: params.userId,
        organization_id: params.organizationId,
        status: 'active',
        joined_at: effectiveAt,
        left_at: null,
        transfer_reason: params.reason ?? null,
        note: params.note ?? null,
        fee_category: params.feeCategory ?? null,
        workplace_name: null,
        workplace_address: null,
      });
      return repo.save(created);
    });
  }

  /**
   * 전출. 대상 행을 마감만 하고 삭제하지 않는다.
   * organizationId 를 함께 받아 다른 분회 운영자가 남의 회원을 마감하지 못하게 한다.
   */
  async leave(params: {
    userId: string;
    organizationId: string;
    reason?: string | null;
    /** 전출일. 미지정이면 처리 시각. */
    effectiveDate?: Date | null;
  }): Promise<BranchMembership> {
    const effectiveAt = params.effectiveDate ?? new Date();
    return this.ds.transaction(async (manager: EntityManager) => {
      const repo = manager.getRepository(BranchMembership);
      const current = await repo
        .createQueryBuilder('bm')
        .setLock('pessimistic_write')
        .where('bm.user_id = :userId AND bm.organization_id = :organizationId AND bm.status = :status', {
          userId: params.userId,
          organizationId: params.organizationId,
          status: 'active',
        })
        .getOne();
      if (!current) {
        throw new BranchMembershipConflictError('해당 분회의 활성 소속이 없습니다.');
      }
      if (effectiveAt.getTime() < new Date(current.joined_at).getTime()) {
        throw new BranchMembershipConflictError('전출일이 가입일보다 앞설 수 없습니다.');
      }
      await repo.update(current.id, {
        status: 'left',
        left_at: effectiveAt,
        transfer_reason: params.reason ?? null,
      });
      return repo.findOneOrFail({ where: { id: current.id } });
    });
  }

  /**
   * 운영자용 소속 이력.
   *
   * **tenant 경계**: 요청 분회에 (현재든 과거든) 소속 행이 있는 회원만 열람할 수 있다.
   * 그 조건을 통과하면 이력 전체(타 분회 구간 포함)를 준다 — 전출입 판단에 직전·다음
   * 소속이 필요하기 때문이다. 아무 userId 나 넣어 전국 이력을 조회하는 경로가 되지 않도록
   * 소속 확인을 먼저 하고, 없으면 존재 여부를 알려주지 않는 404 로 끝낸다.
   */
  async getHistoryForBranch(
    userId: string,
    organizationId: string,
  ): Promise<Array<BranchMembership & { organization_name: string | null; organization_slug: string | null }>> {
    const belongs = await this.ds.getRepository(BranchMembership).findOne({
      where: { user_id: userId, organization_id: organizationId },
    });
    if (!belongs) return [];

    return this.ds.query(
      `SELECT bm.*, o.name AS organization_name, o.slug AS organization_slug
         FROM branch_memberships bm
         LEFT JOIN kpa_organizations o ON o.id = bm.organization_id
        WHERE bm.user_id = $1
        ORDER BY bm.joined_at ASC, bm.created_at ASC`,
      [userId],
    );
  }
}

export const branchMembershipService = new BranchMembershipService();
