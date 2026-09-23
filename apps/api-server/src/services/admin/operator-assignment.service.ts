/**
 * 운영자 직접 지정 — WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1 §5·§6
 *
 * **이미 O4O 에 존재하고 Google Identity 가 연결된 사용자**에게 서비스 운영 역할을 부여한다.
 * 지정 대상은 언제나 `userId` 다 — email 로 사람을 찾아 넣지 않는다(email 은 Identity Key 가 아니다).
 *
 * 쓰는 것: `role_assignments` (+ 없을 때만 `service_memberships`).
 * 쓰지 않는 것: `users` · `users.password` · `service_credentials` · `linked_accounts`.
 */
import type { DataSource } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import { User } from '../../modules/auth/entities/User.js';
import { LinkedAccount } from '../../entities/LinkedAccount.js';
import { roleAssignmentService } from '../../modules/auth/services/role-assignment.service.js';
import { ensureServiceMembershipsForRoles, type MembershipPolicy } from './service-membership-ensure.js';
import { resolveOperatorRole } from '../../config/operator-role-catalog.js';

export type OperatorAssignmentRejectCode =
  | 'USER_NOT_FOUND'
  | 'GOOGLE_LINK_REQUIRED';

const STATUS_BY_CODE: Record<OperatorAssignmentRejectCode, number> = {
  USER_NOT_FOUND: 404,
  GOOGLE_LINK_REQUIRED: 409,
};

const MESSAGE_BY_CODE: Record<OperatorAssignmentRejectCode, string> = {
  USER_NOT_FOUND: '대상 사용자를 찾을 수 없습니다.',
  GOOGLE_LINK_REQUIRED: 'Google 계정이 연결되지 않은 사용자입니다. 본인이 Google 연결을 마친 뒤 지정할 수 있습니다.',
};

export class OperatorAssignmentError extends Error {
  readonly statusCode: number;
  constructor(readonly code: OperatorAssignmentRejectCode, message?: string) {
    super(message ?? MESSAGE_BY_CODE[code]);
    this.name = 'OperatorAssignmentError';
    this.statusCode = STATUS_BY_CODE[code];
  }
}

export interface OperatorAssignmentResult {
  userId: string;
  serviceKey: string;
  role: string;
  /** 역할 부여 자체는 멱등이다(이미 있으면 그대로 활성 유지). */
  rolePolicy: 'ASSIGNED';
  membershipPolicy: MembershipPolicy;
  membershipStatuses: Record<string, string>;
}

/** 관리자 검색 결과 — Google 연결 여부까지 함께 준다(연결 없으면 지정 대상이 될 수 없다). */
export interface OperatorCandidate {
  userId: string;
  email: string;
  name: string | null;
  hasGoogleLink: boolean;
}

export class OperatorAssignmentService {
  constructor(private readonly _dataSource?: Pick<DataSource, 'getRepository' | 'transaction'>) {}

  private get dataSource(): Pick<DataSource, 'getRepository' | 'transaction'> {
    return this._dataSource ?? AppDataSource;
  }

  /**
   * 지정 후보 검색 — 관리자가 사람을 **고르기** 위한 목록이다.
   * Google 연결이 없는 사용자도 숨기지 않고 `hasGoogleLink:false` 로 보여준다
   * (숨기면 "검색해도 안 나온다" 는 이유를 알 수 없게 된다).
   */
  async searchCandidates(query: string, limit = 20): Promise<OperatorCandidate[]> {
    const q = (query ?? '').trim();
    if (q.length < 2) return [];
    const rows = await this.dataSource
      .getRepository(User)
      .createQueryBuilder('u')
      .leftJoin(LinkedAccount, 'la', 'la."userId" = u.id AND la.provider = :provider', { provider: 'google' })
      .select(['u.id AS id', 'u.email AS email', 'u.name AS name'])
      .addSelect('la.id IS NOT NULL', 'has_google')
      .where('u.email ILIKE :q OR u.name ILIKE :q', { q: `%${q}%` })
      .orderBy('u.email', 'ASC')
      .limit(Math.min(limit, 50))
      .getRawMany<{ id: string; email: string; name: string | null; has_google: boolean }>();

    return rows.map((r) => ({
      userId: r.id,
      email: r.email,
      name: r.name ?? null,
      hasGoogleLink: r.has_google === true,
    }));
  }

  /**
   * 직접 지정 — `{ userId, serviceKey, role }`.
   * 단일 트랜잭션: 대상 확인 → Google 연결 확인 → role_assignments → service_memberships.
   */
  async assign(input: {
    userId: string;
    serviceKey?: string | null;
    role: string;
    assignedBy?: string | null;
  }): Promise<OperatorAssignmentResult> {
    const { serviceKey, role } = resolveOperatorRole(input.role, input.serviceKey ?? null);

    return this.dataSource.transaction(async (manager) => {
      const user = await manager.getRepository(User).findOne({ where: { id: input.userId } });
      if (!user) throw new OperatorAssignmentError('USER_NOT_FOUND');

      // Identity 계약: 운영자는 Google 로 로그인한다. 연결이 없으면 지정하지 않는다
      // (관리자가 대신 연결하거나 비밀번호를 만들어 주는 경로는 없다).
      const linked = await manager
        .getRepository(LinkedAccount)
        .findOne({ where: { userId: user.id, provider: 'google' } });
      if (!linked) throw new OperatorAssignmentError('GOOGLE_LINK_REQUIRED');

      await roleAssignmentService.assignRole(
        { userId: user.id, role, ...(input.assignedBy && { assignedBy: input.assignedBy }) },
        manager,
      );
      const ensured = await ensureServiceMembershipsForRoles(user.id, [role], manager);

      return {
        userId: user.id,
        serviceKey,
        role,
        rolePolicy: 'ASSIGNED' as const,
        membershipPolicy: ensured.policy,
        membershipStatuses: ensured.existingStatuses,
      };
    });
  }
}

export const operatorAssignmentService = new OperatorAssignmentService();
