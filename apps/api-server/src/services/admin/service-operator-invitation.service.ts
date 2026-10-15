import { isLoginEmailShapeValid, normalizeLoginEmail } from '@o4o/auth-utils';
import { createHash, randomBytes } from 'node:crypto';
import type { DataSource, EntityManager } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import { User } from '../../modules/auth/entities/User.js';
import { resolveOperatorRole } from '../../config/operator-role-catalog.js';
import { getServiceOrigin } from '../../config/service-catalog.js';
import { roleAssignmentService } from '../../modules/auth/services/role-assignment.service.js';
import { ensureServiceMembershipsForRoles } from './service-membership-ensure.js';
import { demoAccountService } from '../auth/demo-account.service.js';
import { invalidateRoles } from '../../modules/auth/utils/role-cache.js';

export class ServiceOperatorInvitationError extends Error {
  constructor(
    readonly code: string,
    readonly statusCode = 409,
  ) {
    super(
      (
        {
          FORBIDDEN: '전체관리자의 유효한 지정 권한을 확인할 수 없습니다.',
          INVALID_USER_ID: '대상 계정 식별자가 올바르지 않습니다.',
          USER_NOT_FOUND: '대상 계정을 찾을 수 없습니다.',
          ACCOUNT_INACTIVE:
            '사용할 수 없는 계정입니다. 계정 상태를 확인하세요.',
          INVALID_EMAIL: '초대 이메일 주소를 확인하세요.',
          USER_SELECTION_REQUIRED:
            '이미 가입된 이메일입니다. 사용자 검색에서 대상 계정을 선택하세요.',
          INVITATION_ALREADY_PENDING:
            '확인 대기 중인 초대가 있습니다. 초대 목록에서 재발송 또는 취소하세요.',
          INVALID_INVITATION_ID: '초대 식별자가 올바르지 않습니다.',
          INVITATION_NOT_FOUND: '초대를 찾을 수 없습니다.',
          INVITATION_MAIL_FAILED: '초대 상태는 저장되었지만 메일 발송이 확인되지 않았습니다. 목록을 새로고침하고 1분 후 재발송하거나 취소해 주세요.',
          INVITATION_NOT_PENDING: '이미 수락되거나 취소된 초대입니다.',
          INVITATION_RESEND_TOO_SOON: '재발송은 이전 발송 1분 후 가능합니다.',
          INVALID_OR_EXPIRED_INVITATION:
            '초대가 만료되었거나 취소·처리되었습니다. 메일 링크를 확인하세요.',
          INVITATION_ACCOUNT_MISMATCH:
            '초대받은 계정과 다릅니다. 지정된 계정으로 로그인하세요.',
          OPERATOR_ROLE_REVOKED:
            '운영 권한이 회수되어 확인할 수 없습니다. 전체관리자에게 문의하세요.',
        } as Record<string, string>
      )[code] ?? '초대 요청을 처리할 수 없습니다.',
    );
  }
}
export type OperatorInvite = {
  id: string;
  invited_email: string;
  service_key: string;
  role: string;
  target_user_id: string | null;
  purpose: 'assignment' | 'confirmation';
  status: 'pending' | 'accepted' | 'cancelled';
  expires_at: Date;
  accepted_user_id: string | null;
  invited_by_user_id: string | null;
  created_at: Date;
  updated_at: Date;
  accepted_at: Date | null;
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const fail = (code: string, status = 409): never => {
  throw new ServiceOperatorInvitationError(code, status);
};
const COLUMNS =
  'id,invited_email,service_key,role,target_user_id,purpose,status,expires_at,accepted_user_id,invited_by_user_id,created_at,updated_at,accepted_at';
export type InvitationMailer = (
  to: string,
  url: string,
  role: string,
  confirmation: boolean,
) => Promise<boolean>;

async function defaultMailer(
  to: string,
  url: string,
  role: string,
  confirmation: boolean,
): Promise<boolean> {
  const { emailService } = await import('../email.service.js');
  const action = confirmation ? '기존 운영자 지정 확인' : '운영자 초대 수락';
  const result = await emailService.sendEmail({
    to,
    subject: `[O4O] ${action}`,
    text: `${role} ${action} 요청입니다. 로그인 또는 가입 후 본인 계정과 서비스 역할을 확인하고 수락하세요.\n${url}\n7일 내 사용 가능하며 요청하지 않은 초대는 수락하지 마세요.`,
  });
  return result.success;
}

/** A mailbox proof is never a Google identity lookup or an implicit account merge. */
export class ServiceOperatorInvitationService {
  constructor(
    private readonly db: Pick<
      DataSource,
      'transaction' | 'query'
    > = AppDataSource,
    private readonly sendMail: InvitationMailer = defaultMailer,
    private readonly now = () => new Date(),
  ) {}

  async list(): Promise<Array<OperatorInvite & { expired: boolean }>> {
    return this.db
      .query(`SELECT ${COLUMNS},(status='pending' AND expires_at<=now()) AS expired
      FROM service_operator_invitations ORDER BY created_at DESC LIMIT 200`);
  }

  private async actor(m: EntityManager, id: string): Promise<void> {
    if (!UUID.test(id)) fail('FORBIDDEN', 403);
    const rows = await m.query(
      `SELECT u.id FROM users u JOIN role_assignments ra ON ra.user_id=u.id
      WHERE u.id=$1 AND u."isActive"=true AND u.status IN ('active','approved')
      AND ra.role='platform:super_admin' AND ra.is_active=true AND ra.valid_from<=now()
      AND (ra.valid_until IS NULL OR ra.valid_until>=now()) FOR SHARE OF u,ra`,
      [id],
    );
    if (!rows.length) fail('FORBIDDEN', 403);
  }

  private async target(m: EntityManager, id: string): Promise<User> {
    if (!UUID.test(id)) fail('INVALID_USER_ID', 400);
    const user = await m
      .getRepository(User)
      .findOne({ where: { id }, lock: { mode: 'pessimistic_read' } });
    if (!user) fail('USER_NOT_FOUND', 404);
    if (!user.isActive || !['active', 'approved'].includes(user.status))
      fail('ACCOUNT_INACTIVE', 403);
    await demoAccountService.assertNotDemoAccount(id, m);
    return user;
  }

  private async activeRole(
    m: EntityManager,
    userId: string,
    role: string,
  ): Promise<boolean> {
    const rows = await m.query(
      `SELECT id FROM role_assignments WHERE user_id=$1 AND role=$2
      AND is_active=true AND valid_from<=now() AND (valid_until IS NULL OR valid_until>=now()) FOR SHARE`,
      [userId, role],
    );
    return rows.length > 0;
  }

  private async prepareDelivery(
    m: EntityManager,
    invite: OperatorInvite,
  ): Promise<{ invite: OperatorInvite; url: string | null }> {
    const token = randomBytes(32).toString('hex');
    const expires = new Date(this.now().getTime() + 7 * 86400_000);
    await m.query(
      `UPDATE service_operator_invitations SET token_hash=$2,expires_at=$3,updated_at=$4 WHERE id=$1`,
      [invite.id, hash(token), expires, this.now()],
    );
    // Fixed catalog origin; request Origin/Host/returnUrl never control a mailed link.
    const url = `${getServiceOrigin('neture')}/operator-invite#token=${token}`;
    return { invite: { ...invite, expires_at: expires, updated_at: this.now() }, url };
  }

  private async deliverCommitted(prepared: { invite: OperatorInvite; url: string | null }): Promise<OperatorInvite> {
    const { invite, url } = prepared;
    if (!url) return invite;
    let sent = false;
    try {
      sent = await this.sendMail(
        invite.invited_email,
        url,
        invite.role,
        invite.purpose === 'confirmation',
      );
    } catch {
      /* Do not log mailer errors: transports may include credentials or message bodies. */
    }
    if (!sent) fail('INVITATION_MAIL_FAILED', 503);
    return invite;
  }

  async create(input: {
    email?: string;
    targetUserId?: string;
    serviceKey: string;
    role: string;
    actorId: string;
  }): Promise<OperatorInvite> {
    const resolved = resolveOperatorRole(input.role, input.serviceKey);
    const prepared = await this.db.transaction(async (m) => {
      await this.actor(m, input.actorId);
      const user = input.targetUserId
        ? await this.target(m, input.targetUserId)
        : null;
      const email = normalizeLoginEmail(user ? user.email : input.email);
      if (!isLoginEmailShapeValid(email)) fail('INVALID_EMAIL', 400);
      // Email helps the admin select a person; it never silently selects their identity.
      if (
        !user &&
        (
          await m.query('SELECT id FROM users WHERE lower(email)=$1 LIMIT 1', [
            email,
          ])
        ).length
      ) {
        fail('USER_SELECTION_REQUIRED');
      }
      await m.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [
        hash(`${email}:${resolved.serviceKey}:${resolved.role}`),
      ]);
      // Free the pending-only unique key even when the old row is beyond the list window.
      await m.query(`UPDATE service_operator_invitations SET status='cancelled',updated_at=$4
        WHERE lower(invited_email)=$1 AND service_key=$2 AND role=$3 AND status='pending' AND expires_at<=$4`,
        [email, resolved.serviceKey, resolved.role, this.now()]);
      const pending = await m.query(
        `SELECT id FROM service_operator_invitations
        WHERE lower(invited_email)=$1 AND service_key=$2 AND role=$3 AND status='pending' FOR UPDATE`,
        [email, resolved.serviceKey, resolved.role],
      );
      if (pending.length) fail('INVITATION_ALREADY_PENDING');
      const confirmation =
        user && (await this.activeRole(m, user.id, resolved.role));
      const [invite] = await m.query(
        `INSERT INTO service_operator_invitations
        (invited_email,service_key,role,target_user_id,purpose,invited_by_user_id,token_hash,expires_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING ${COLUMNS}`,
        [
          email,
          resolved.serviceKey,
          resolved.role,
          user?.id ?? null,
          confirmation ? 'confirmation' : 'assignment',
          input.actorId,
          hash(randomBytes(32).toString('hex')),
          this.now(),
        ],
      );
      return this.prepareDelivery(m, invite);
    });
    return this.deliverCommitted(prepared);
  }

  async manage(
    id: string,
    actorId: string,
    action: 'resend' | 'cancel',
  ): Promise<OperatorInvite> {
    if (!UUID.test(id)) fail('INVALID_INVITATION_ID', 400);
    const prepared = await this.db.transaction(async (m) => {
      await this.actor(m, actorId);
      const [invite]: OperatorInvite[] = await m.query(
        `SELECT ${COLUMNS} FROM service_operator_invitations WHERE id=$1 FOR UPDATE`,
        [id],
      );
      if (!invite) fail('INVITATION_NOT_FOUND', 404);
      if (invite.status !== 'pending') fail('INVITATION_NOT_PENDING');
      if (action === 'cancel') {
        await m.query(
          "UPDATE service_operator_invitations SET status='cancelled',updated_at=now() WHERE id=$1",
          [id],
        );
        return { invite: { ...invite, status: 'cancelled' as const }, url: null };
      }
      resolveOperatorRole(invite.role, invite.service_key);
      if (invite.target_user_id) await this.target(m, invite.target_user_id);
      if (this.now().getTime() - new Date(invite.updated_at).getTime() < 60_000)
        fail('INVITATION_RESEND_TOO_SOON', 429);
      await m.query(
        'UPDATE service_operator_invitations SET invited_by_user_id=$2 WHERE id=$1',
        [invite.id, actorId],
      );
      return this.prepareDelivery(m, { ...invite, invited_by_user_id: actorId });
    });
    return this.deliverCommitted(prepared);
  }

  async inspect(
    token: string,
    userId: string,
  ): Promise<{ serviceKey: string; role: string; purpose: string }> {
    if (!/^[a-f0-9]{64}$/.test(token))
      fail('INVALID_OR_EXPIRED_INVITATION', 400);
    const [invite]: OperatorInvite[] = await this.db.query(
      `SELECT ${COLUMNS} FROM service_operator_invitations WHERE token_hash=$1`,
      [hash(token)],
    );
    if (
      !invite ||
      invite.status !== 'pending' ||
      new Date(invite.expires_at).getTime() <= this.now().getTime()
    )
      fail('INVALID_OR_EXPIRED_INVITATION', 400);
    if (invite.target_user_id && invite.target_user_id !== userId)
      fail('INVITATION_ACCOUNT_MISMATCH', 403);
    return {
      serviceKey: invite.service_key,
      role: invite.role,
      purpose: invite.purpose,
    };
  }

  async accept(
    token: string,
    userId: string,
  ): Promise<{
    serviceKey: string;
    role: string;
    purpose: string;
    membershipPolicy?: string;
    membershipStatuses?: Record<string, string>;
  }> {
    if (!/^[a-f0-9]{64}$/.test(token))
      fail('INVALID_OR_EXPIRED_INVITATION', 400);
    const result = await this.db.transaction(async (m) => {
      const [invite]: OperatorInvite[] = await m.query(
        `SELECT ${COLUMNS} FROM service_operator_invitations WHERE token_hash=$1 FOR UPDATE`,
        [hash(token)],
      );
      if (!invite || invite.status === 'cancelled')
        fail('INVALID_OR_EXPIRED_INVITATION', 400);
      if (invite.target_user_id && invite.target_user_id !== userId)
        fail('INVITATION_ACCOUNT_MISMATCH', 403);
      if (invite.status === 'accepted') {
        if (invite.accepted_user_id !== userId)
          fail('INVITATION_ACCOUNT_MISMATCH', 403);
        return {
          serviceKey: invite.service_key,
          role: invite.role,
          purpose: invite.purpose,
        };
      }
      if (new Date(invite.expires_at).getTime() <= this.now().getTime())
        fail('INVALID_OR_EXPIRED_INVITATION', 400);
      const user = await this.target(m, userId);
      resolveOperatorRole(invite.role, invite.service_key);
      // The inviter must still have authority at the instant of acceptance.
      await this.actor(m, invite.invited_by_user_id ?? '');
      let ensured;
      if (invite.purpose === 'confirmation') {
        if (!(await this.activeRole(m, user.id, invite.role)))
          fail('OPERATOR_ROLE_REVOKED');
      } else {
        await roleAssignmentService.assignRole(
          {
            userId: user.id,
            role: invite.role,
            assignedBy: invite.invited_by_user_id!,
          },
          m,
        );
        ensured = await ensureServiceMembershipsForRoles(
          user.id,
          [invite.role],
          m,
        );
      }
      await m.query(
        `UPDATE service_operator_invitations SET status='accepted',accepted_user_id=$2,accepted_at=now(),updated_at=now() WHERE id=$1`,
        [invite.id, user.id],
      );
      return {
        serviceKey: invite.service_key,
        role: invite.role,
        purpose: invite.purpose,
        ...(ensured && {
          membershipPolicy: ensured.policy,
          membershipStatuses: ensured.existingStatuses,
        }),
      };
    });
    // assignRole clears its cache inside the transaction; clear again after commit.
    invalidateRoles(userId);
    return result;
  }
}
export const serviceOperatorInvitationService =
  new ServiceOperatorInvitationService();
