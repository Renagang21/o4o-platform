/**
 * 운영자 초대 — WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1 §7~§14
 *
 * 관리자가 **미가입자**를 서비스·역할과 함께 초대하고, 수신자가 **Google 계정으로** 수락하면
 * 그 시점에 users.id 가 확정되어 role_assignments · service_memberships 가 만들어진다.
 *
 * 불변식(이 파일이 지키는 것):
 *   - 초대 생성은 `operator_invitations` 한 행만 쓴다. users / linked_accounts / memberships /
 *     roles / credentials write 0.
 *   - raw token 은 DB 에 저장하지 않고 로그에도 남기지 않는다. 저장은 sha256 hex 만.
 *   - email 은 Identity Key 가 아니라 **수락 조건**이다. email 로 기존 계정을 자동 병합하지 않는다.
 *   - 비밀번호·임시 비밀번호를 만들지 않는다. `service_credentials` 를 쓰지 않는다.
 *   - 수락은 단일 트랜잭션 + `SELECT … FOR UPDATE` 로 직렬화하며 멱등이다.
 */
import { createHash, randomBytes } from 'crypto';
import type { DataSource, EntityManager } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import { OperatorInvitation } from '../../entities/OperatorInvitation.js';
import { User } from '../../modules/auth/entities/User.js';
import { LinkedAccount } from '../../entities/LinkedAccount.js';
import { roleAssignmentService } from '../../modules/auth/services/role-assignment.service.js';
import { googleIdentityService, type VerifiedGoogleIdentity } from '../auth/google-identity.service.js';
import { googleAuthService, type GoogleSignupConsents } from '../auth/google-auth.service.js';
import { ensureServiceMembershipsForRoles, type MembershipPolicy } from './service-membership-ensure.js';
import { resolveOperatorRole } from '../../config/operator-role-catalog.js';
import { getServiceName, getServiceOrigin, REPRESENTATIVE_ENTRY_SERVICE_KEY } from '../../config/service-catalog.js';
import { emailService } from '../email.service.js';
import logger from '../../utils/logger.js';

/** 초대 유효기간 — 7일. 만료된 초대는 자동 삭제하지 않고 만료로 거절한다(이력 보존). */
export const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type OperatorInvitationRejectCode =
  | 'INVITATION_NOT_FOUND'
  | 'INVITATION_EXPIRED'
  | 'INVITATION_ALREADY_ACCEPTED'
  | 'INVITATION_CANCELLED'
  | 'INVITATION_DUPLICATE'
  | 'INVITATION_EMAIL_MISMATCH'
  | 'INVITATION_IDENTITY_CONFLICT'
  | 'GOOGLE_EMAIL_UNVERIFIED'
  | 'GOOGLE_EMAIL_MISSING'
  | 'CONSENT_REQUIRED'
  | 'EMAIL_IN_USE'
  | 'INVALID_EMAIL';

const STATUS_BY_CODE: Record<OperatorInvitationRejectCode, number> = {
  INVITATION_NOT_FOUND: 404,
  INVITATION_EXPIRED: 410,
  INVITATION_ALREADY_ACCEPTED: 409,
  INVITATION_CANCELLED: 409,
  INVITATION_DUPLICATE: 409,
  INVITATION_EMAIL_MISMATCH: 403,
  INVITATION_IDENTITY_CONFLICT: 409,
  GOOGLE_EMAIL_UNVERIFIED: 403,
  GOOGLE_EMAIL_MISSING: 400,
  CONSENT_REQUIRED: 400,
  EMAIL_IN_USE: 409,
  INVALID_EMAIL: 400,
};

const MESSAGE_BY_CODE: Record<OperatorInvitationRejectCode, string> = {
  INVITATION_NOT_FOUND: '유효하지 않은 초대입니다.',
  INVITATION_EXPIRED: '초대가 만료되었습니다. 관리자에게 재전송을 요청하세요.',
  INVITATION_ALREADY_ACCEPTED: '이미 수락된 초대입니다.',
  INVITATION_CANCELLED: '취소된 초대입니다.',
  INVITATION_DUPLICATE: '같은 이메일·서비스·역할로 대기 중인 초대가 이미 있습니다. 재전송을 사용하세요.',
  INVITATION_EMAIL_MISMATCH: '초대받은 이메일과 다른 Google 계정입니다.',
  INVITATION_IDENTITY_CONFLICT: '해당 이메일로 이미 다른 계정이 존재합니다. 관리자에게 문의하세요.',
  GOOGLE_EMAIL_UNVERIFIED: '이메일이 확인되지 않은 Google 계정입니다.',
  GOOGLE_EMAIL_MISSING: 'Google 계정에서 이메일을 확인할 수 없습니다.',
  CONSENT_REQUIRED: '이용약관·개인정보 처리방침 동의가 필요합니다.',
  EMAIL_IN_USE: '이미 사용 중인 이메일입니다.',
  INVALID_EMAIL: '이메일 형식이 올바르지 않습니다.',
};

export class OperatorInvitationError extends Error {
  readonly statusCode: number;
  constructor(readonly code: OperatorInvitationRejectCode, message?: string) {
    super(message ?? MESSAGE_BY_CODE[code]);
    this.name = 'OperatorInvitationError';
    this.statusCode = STATUS_BY_CODE[code];
  }
}

/**
 * 비교용 정규화 — **trim + lowercase 만** 한다 (§12).
 * gmail dot 제거 · `+alias` 제거 같은 canonicalization 은 서로 다른 사람을 같은 사람으로 만들 수 있어 금지다.
 */
export function normalizeInvitationEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashInvitationToken(rawToken: string): string {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex');
}

/** 사용자에게 한 번만 전달되는 raw token. 반환 후 어디에도 저장·로깅하지 않는다. */
function generateRawToken(): string {
  return randomBytes(32).toString('base64url');
}

export interface OperatorInvitationView {
  id: string;
  invitedEmail: string;
  serviceKey: string;
  serviceName: string;
  role: string;
  status: string;
  expiresAt: Date;
  createdAt: Date;
  acceptedAt: Date | null;
  cancelledAt: Date | null;
}

export interface AcceptResult {
  userId: string;
  serviceKey: string;
  role: string;
  membershipPolicy: MembershipPolicy;
  membershipStatuses: Record<string, string>;
  createdUser: boolean;
  /** 이미 수락된 초대를 같은 Identity 가 다시 수락한 경우(재시도 · 새로고침). */
  idempotent: boolean;
}

export interface OperatorInvitationServiceDeps {
  dataSource?: Pick<DataSource, 'getRepository' | 'transaction'>;
  identity?: Pick<typeof googleIdentityService, 'verifyGoogleIdToken'>;
  /** 초대 메일 발송 — 실패해도 초대 행은 남긴다(재전송으로 복구). */
  sendInvitationEmail?: (to: string, data: {
    acceptUrl: string;
    serviceName: string;
    roleLabel: string;
    expiresAtLabel: string;
  }) => Promise<{ success: boolean; error?: string }>;
  createGoogleUser?: (
    manager: EntityManager,
    identity: VerifiedGoogleIdentity,
    consents: GoogleSignupConsents,
  ) => Promise<User>;
  now?: () => Date;
}

function toView(row: OperatorInvitation): OperatorInvitationView {
  return {
    id: row.id,
    invitedEmail: row.invitedEmail,
    serviceKey: row.serviceKey,
    serviceName: getServiceName(row.serviceKey),
    role: row.role,
    status: row.status,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    acceptedAt: row.acceptedAt,
    cancelledAt: row.cancelledAt,
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class OperatorInvitationService {
  private readonly _dataSource?: Pick<DataSource, 'getRepository' | 'transaction'>;
  private readonly identity: Pick<typeof googleIdentityService, 'verifyGoogleIdToken'>;
  private readonly sendInvitationEmail: NonNullable<OperatorInvitationServiceDeps['sendInvitationEmail']>;
  private readonly createGoogleUser: NonNullable<OperatorInvitationServiceDeps['createGoogleUser']>;
  private readonly now: () => Date;

  constructor(deps: OperatorInvitationServiceDeps = {}) {
    this._dataSource = deps.dataSource;
    this.identity = deps.identity ?? googleIdentityService;
    this.sendInvitationEmail =
      deps.sendInvitationEmail ?? ((to, data) => emailService.sendOperatorInvitationEmail(to, data));
    this.createGoogleUser =
      deps.createGoogleUser
      ?? ((manager, identity, consents) => googleAuthService.createGoogleUser(manager, identity, consents));
    this.now = deps.now ?? (() => new Date());
  }

  private get dataSource(): Pick<DataSource, 'getRepository' | 'transaction'> {
    return this._dataSource ?? AppDataSource;
  }

  /** 수락 페이지 URL — base 는 service catalog(대표 진입)에서만 온다. 요청 값으로 만들지 않는다(open redirect 금지). */
  buildAcceptUrl(rawToken: string): string {
    const origin = getServiceOrigin(REPRESENTATIVE_ENTRY_SERVICE_KEY) ?? 'https://neture.co.kr';
    return `${origin}/operator-invitations/accept?token=${encodeURIComponent(rawToken)}`;
  }

  /**
   * 초대 생성 — `operator_invitations` 1행만 쓴다.
   * 반환되는 raw token 은 메일 발송에만 쓰고 응답·로그에 넣지 않는다.
   */
  async create(input: {
    email: string;
    serviceKey?: string | null;
    role: string;
    invitedByUserId: string | null;
  }): Promise<{ invitation: OperatorInvitationView; emailSent: boolean; emailError?: string }> {
    const email = input.email?.trim() ?? '';
    if (!EMAIL_RE.test(email)) {
      throw new OperatorInvitationError('INVALID_EMAIL');
    }
    const { serviceKey, role } = resolveOperatorRole(input.role, input.serviceKey ?? null);

    const repo = this.dataSource.getRepository(OperatorInvitation);
    const normalized = normalizeInvitationEmail(email);

    const duplicate = await repo
      .createQueryBuilder('i')
      .where('lower(i.invited_email) = :email', { email: normalized })
      .andWhere('i.service_key = :serviceKey', { serviceKey })
      .andWhere('i.role = :role', { role })
      .andWhere("i.status = 'pending'")
      .getOne();
    if (duplicate) {
      throw new OperatorInvitationError('INVITATION_DUPLICATE');
    }

    const rawToken = generateRawToken();
    const expiresAt = new Date(this.now().getTime() + INVITATION_TTL_MS);
    const saved = await repo.save(
      repo.create({
        invitedEmail: email,
        serviceKey,
        role,
        tokenHash: hashInvitationToken(rawToken),
        status: 'pending',
        expiresAt,
        invitedByUserId: input.invitedByUserId,
        acceptedUserId: null,
        acceptedAt: null,
        cancelledAt: null,
      }),
    );

    const delivery = await this.deliver(saved, rawToken);
    return {
      invitation: toView(saved),
      emailSent: delivery.success,
      ...(delivery.error && { emailError: delivery.error }),
    };
  }

  private async deliver(row: OperatorInvitation, rawToken: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.sendInvitationEmail(row.invitedEmail, {
        acceptUrl: this.buildAcceptUrl(rawToken),
        serviceName: getServiceName(row.serviceKey),
        roleLabel: row.role,
        expiresAtLabel: row.expiresAt.toISOString().slice(0, 10),
      });
      if (!result.success) {
        // 실패 사유만 남긴다 — URL·token 은 로그에 넣지 않는다.
        logger.warn('[OperatorInvitation] invitation email not sent', { invitationId: row.id, error: result.error });
      }
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      logger.warn('[OperatorInvitation] invitation email threw', { invitationId: row.id, error: message });
      return { success: false, error: message };
    }
  }

  async list(status?: string): Promise<OperatorInvitationView[]> {
    const repo = this.dataSource.getRepository(OperatorInvitation);
    const qb = repo.createQueryBuilder('i').orderBy('i.created_at', 'DESC').limit(500);
    if (status) qb.where('i.status = :status', { status });
    const rows = await qb.getMany();
    return rows.map(toView);
  }

  /**
   * 재전송 — **방식은 하나다: 같은 행의 token 을 회전시키고 만료를 연장한 뒤 다시 보낸다.**
   * 새 행을 만들지 않으므로 pending 중복이 생기지 않고, 이전 링크는 즉시 무효가 된다.
   */
  async resend(invitationId: string): Promise<{ invitation: OperatorInvitationView; emailSent: boolean; emailError?: string }> {
    const repo = this.dataSource.getRepository(OperatorInvitation);
    const row = await repo.findOne({ where: { id: invitationId } });
    if (!row) throw new OperatorInvitationError('INVITATION_NOT_FOUND');
    if (row.status === 'accepted') throw new OperatorInvitationError('INVITATION_ALREADY_ACCEPTED');
    if (row.status === 'cancelled') throw new OperatorInvitationError('INVITATION_CANCELLED');

    const rawToken = generateRawToken();
    row.tokenHash = hashInvitationToken(rawToken);
    row.expiresAt = new Date(this.now().getTime() + INVITATION_TTL_MS);
    await repo.save(row);

    const delivery = await this.deliver(row, rawToken);
    return {
      invitation: toView(row),
      emailSent: delivery.success,
      ...(delivery.error && { emailError: delivery.error }),
    };
  }

  /**
   * 취소 — 초대 행의 상태만 바꾼다.
   * 이미 수락된 초대를 취소해 **권한을 회수하지 않는다**(users/role/membership 을 건드리지 않는다).
   * 역할 회수는 기존 revoke 경로가 담당한다.
   */
  async cancel(invitationId: string): Promise<OperatorInvitationView> {
    const repo = this.dataSource.getRepository(OperatorInvitation);
    const row = await repo.findOne({ where: { id: invitationId } });
    if (!row) throw new OperatorInvitationError('INVITATION_NOT_FOUND');
    if (row.status === 'accepted') throw new OperatorInvitationError('INVITATION_ALREADY_ACCEPTED');
    if (row.status === 'cancelled') return toView(row); // 멱등
    row.status = 'cancelled';
    row.cancelledAt = this.now();
    await repo.save(row);
    return toView(row);
  }

  /** 수락 페이지가 로그인 전에 보여줄 최소 정보. 토큰이 맞아야만 응답한다. */
  async preview(rawToken: string): Promise<{
    invitedEmail: string;
    serviceKey: string;
    serviceName: string;
    role: string;
    expiresAt: Date;
  }> {
    const repo = this.dataSource.getRepository(OperatorInvitation);
    const row = await repo.findOne({ where: { tokenHash: hashInvitationToken(rawToken ?? '') } });
    if (!row) throw new OperatorInvitationError('INVITATION_NOT_FOUND');
    if (row.status === 'cancelled') throw new OperatorInvitationError('INVITATION_CANCELLED');
    if (row.status === 'accepted') throw new OperatorInvitationError('INVITATION_ALREADY_ACCEPTED');
    if (row.expiresAt.getTime() <= this.now().getTime()) throw new OperatorInvitationError('INVITATION_EXPIRED');
    return {
      invitedEmail: row.invitedEmail,
      serviceKey: row.serviceKey,
      serviceName: getServiceName(row.serviceKey),
      role: row.role,
      expiresAt: row.expiresAt,
    };
  }

  /**
   * 수락 — Google ID token 검증 → 초대 행 잠금 → Identity 확정 → 역할·membership 부여.
   *
   * 순서가 계약이다: Google 검증은 트랜잭션 **밖**에서 한다(네트워크 대기로 행을 잠그지 않는다).
   * 그 다음 행을 `FOR UPDATE` 로 잠그고 나머지를 한 트랜잭션에서 끝낸다.
   */
  async accept(input: { token: string; idToken: string; consents?: GoogleSignupConsents }): Promise<AcceptResult> {
    const identity = await this.identity.verifyGoogleIdToken(input.idToken);
    if (!identity.email) throw new OperatorInvitationError('GOOGLE_EMAIL_MISSING');
    if (identity.emailVerified !== true) throw new OperatorInvitationError('GOOGLE_EMAIL_UNVERIFIED');

    const tokenHash = hashInvitationToken(input.token ?? '');
    const googleEmail = normalizeInvitationEmail(identity.email);

    return this.dataSource.transaction(async (manager) => {
      const row = await manager
        .getRepository(OperatorInvitation)
        .createQueryBuilder('i')
        .setLock('pessimistic_write')
        .where('i.token_hash = :tokenHash', { tokenHash })
        .getOne();
      if (!row) throw new OperatorInvitationError('INVITATION_NOT_FOUND');
      if (row.status === 'cancelled') throw new OperatorInvitationError('INVITATION_CANCELLED');

      // 초대받은 이메일과 Google 이 검증한 이메일이 같아야 한다. 비교는 trim+lowercase 만.
      if (normalizeInvitationEmail(row.invitedEmail) !== googleEmail) {
        throw new OperatorInvitationError('INVITATION_EMAIL_MISMATCH');
      }

      const linkedRepo = manager.getRepository(LinkedAccount);
      const linked = await linkedRepo.findOne({ where: { provider: 'google', providerId: identity.sub } });

      if (row.status === 'accepted') {
        // 같은 Identity 의 재시도면 성공으로 돌려준다(멱등). 다른 사람이면 거절한다.
        if (linked && linked.userId === row.acceptedUserId) {
          return {
            userId: linked.userId,
            serviceKey: row.serviceKey,
            role: row.role,
            membershipPolicy: 'NOT_APPLICABLE' as MembershipPolicy,
            membershipStatuses: {},
            createdUser: false,
            idempotent: true,
          };
        }
        throw new OperatorInvitationError('INVITATION_ALREADY_ACCEPTED');
      }
      if (row.expiresAt.getTime() <= this.now().getTime()) {
        throw new OperatorInvitationError('INVITATION_EXPIRED');
      }

      let userId: string;
      let createdUser = false;
      if (linked) {
        userId = linked.userId;
      } else {
        // 미가입 Google Identity — 같은 email 의 기존 계정이 있어도 **자동 병합하지 않는다**.
        const existingByEmail = await manager.getRepository(User).findOne({ where: { email: identity.email } });
        if (existingByEmail) {
          throw new OperatorInvitationError('INVITATION_IDENTITY_CONFLICT');
        }
        if (!input.consents?.terms || !input.consents?.privacy) {
          throw new OperatorInvitationError('CONSENT_REQUIRED');
        }
        const created = await this.createGoogleUser(manager, identity, input.consents);
        userId = created.id;
        createdUser = true;
      }

      await roleAssignmentService.assignRole({ userId, role: row.role }, manager);
      const ensured = await ensureServiceMembershipsForRoles(userId, [row.role], manager);

      row.status = 'accepted';
      row.acceptedUserId = userId;
      row.acceptedAt = this.now();
      await manager.getRepository(OperatorInvitation).save(row);

      return {
        userId,
        serviceKey: row.serviceKey,
        role: row.role,
        membershipPolicy: ensured.policy,
        membershipStatuses: ensured.existingStatuses,
        createdUser,
        idempotent: false,
      };
    });
  }
}

export const operatorInvitationService = new OperatorInvitationService();
