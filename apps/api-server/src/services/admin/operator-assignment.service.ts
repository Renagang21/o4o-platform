/** Candidate search for explicit user selection. Legacy immediate grants are rejected;
 * service-operator-invitation.service is the mailbox-proof/acceptance owner.
 */
import type { DataSource } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import { User } from '../../modules/auth/entities/User.js';
import { LinkedAccount } from '../../entities/LinkedAccount.js';
import { type MembershipPolicy } from './service-membership-ensure.js';
import { resolveOperatorRole } from '../../config/operator-role-catalog.js';

export type OperatorAssignmentRejectCode =
  | 'USER_NOT_FOUND'
  | 'GOOGLE_LINK_REQUIRED'
  | 'OPERATOR_INVITATION_REQUIRED';

const STATUS_BY_CODE: Record<OperatorAssignmentRejectCode, number> = {
  USER_NOT_FOUND: 404,
  OPERATOR_INVITATION_REQUIRED: 409,
  GOOGLE_LINK_REQUIRED: 409,
};

const MESSAGE_BY_CODE: Record<OperatorAssignmentRejectCode, string> = {
  USER_NOT_FOUND: '대상 사용자를 찾을 수 없습니다.',
  OPERATOR_INVITATION_REQUIRED: '운영 권한은 이메일 초대의 확인·수락 후에만 부여됩니다.',
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
   * Google 연결이 없는 사용자도 숨기지 않고 `hasGoogleLink:false` 참고값으로 보여준다
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

  /** Legacy callers must migrate to email invitation + authenticated acceptance. */
  async assign(input: {
    userId: string;
    serviceKey?: string | null;
    role: string;
    assignedBy?: string | null;
  }): Promise<OperatorAssignmentResult> {
    resolveOperatorRole(input.role, input.serviceKey ?? null);

    throw new OperatorAssignmentError('OPERATOR_INVITATION_REQUIRED');
  }
}

export const operatorAssignmentService = new OperatorAssignmentService();
