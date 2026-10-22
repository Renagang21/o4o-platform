import { User } from '../../entities/User.js';
import { resolveAccountAccess } from '../../common/auth/account-access.policy.js';
import {
  hasPlatformRole,
  PASSWORD_SESSION_NOT_ALLOWED_CODE,
} from '../../common/auth/password-session.policy.js';
import {
  normalizeLoginEmail,
  isLoginEmailShapeValid,
  checkPasswordPolicy,
  PASSWORD_POLICY_MESSAGES,
  maskLoginEmail,
} from '@o4o/auth-utils';
import {
  normalizePhoneDigits,
  isPhoneShapeValid,
} from '../../common/auth/phone-shape.js';
import {
  demoAccountService,
  DEMO_ACCOUNT_FORBIDDEN_CODE,
} from './demo-account.service.js';
import {
  EmailAuthError,
  EmailAuthRequestMeta,
  RESET_TOKEN_TTL_MS,
  TokenKind,
  resolveMailLinkOrigin,
  Queryable,
  MailSender,
  PasswordStore,
  EmailAuthServiceDeps,
  renderResetMailHtml,
} from './email-auth.shared.js';
import type { EntityManager } from 'typeorm';

interface EmailRecoveryContext {
  dataSource: () => NonNullable<EmailAuthServiceDeps['dataSource']>;
  passwords: PasswordStore;
  now: () => Date;
  readRoles: (id: string) => Promise<string[]>;
  revokeAllSessions: (id: string, manager?: EntityManager) => Promise<void>;
  findUserByLoginEmail: (email: string) => Promise<User | null>;
  sendTokenMail: (
    kind: TokenKind,
    user: User,
    ttl: number,
    deliver: (plain: string) => Promise<{ success: boolean }>,
  ) => Promise<boolean>;
  consumeToken: (
    kind: TokenKind,
    token: string,
    manager: Queryable,
  ) => Promise<{ user_id: string; email: string } | null>;
  mailer: () => Promise<MailSender>;
}

/** Password recovery and credential changes preserve the caller's transaction and security dependencies. */
export class EmailAuthRecovery {
  constructor(private readonly context: EmailRecoveryContext) {}
  async requestPasswordReset(
    rawEmail: string,
    meta: EmailAuthRequestMeta,
  ): Promise<void> {
    const email = normalizeLoginEmail(rawEmail);
    if (!isLoginEmailShapeValid(email)) return;
    const user = await this.context.findUserByLoginEmail(email);
    if (!user || resolveAccountAccess(user.status) === 'blocked') return;
    // Demo 계정: 비밀번호가 고정이고 메일을 받지 않는다 — 토큰·메일을 만들지 않는다.
    //   응답은 기존 일반 안내 그대로다(여기서 다른 문구를 내면 Demo 여부가 드러난다).
    if (
      await demoAccountService.isDemoAccount(user.id, this.context.dataSource())
    )
      return;
    // 관리자는 비밀번호 수단을 쓰지 않는다 — 재설정으로 새 수단을 만들게 하지 않는다.
    if (hasPlatformRole(await this.context.readRoles(user.id))) return;
    // 2026-10-01 정책 변경 (PR #257 Codex 재리뷰 P1): forgot/reset 은 **이미 비밀번호 수단이 있는 계정의 복구**에만 쓴다.
    //   비밀번호가 없는 계정(Google 전용 등)은 주소가 확인돼 있어도 메일 · 토큰을 만들지 않는다 —
    //   메일함 접근만으로 새 로그인 수단을 만들 수 없다. 첫 비밀번호 추가는 로그인 상태의 `POST /auth/password` 뿐.
    //   (종전 S1-CLOSURE 는 "확인된 주소면 재설정으로 첫 수단 추가 허용"이었다 — 이 줄로 대체.)
    //   다른 조용한 return 과 같은 결과 — 발송 여부로 계정 존재를 추론할 수 없다.
    if (!(await this.context.passwords.hasPassword(user.id))) return;

    await this.context.sendTokenMail('reset', user, RESET_TOKEN_TTL_MS, async plain => {
      const resetUrl = `${resolveMailLinkOrigin(meta.sessionServiceKey ?? null)}/reset-password#token=${encodeURIComponent(plain)}`;
      const mailer = await this.context.mailer();
      return mailer.sendEmail({
        to: user.email,
        subject: '[O4O] 비밀번호 재설정 안내',
        html: renderResetMailHtml(resetUrl, this.context.now().getFullYear()),
      });
    });
  }

  async resetPassword(plainToken: string, newPassword: string): Promise<void> {
    const violations = checkPasswordPolicy(newPassword);
    if (violations.length > 0) {
      throw new EmailAuthError(
        'PASSWORD_POLICY_VIOLATION',
        violations.map((v) => PASSWORD_POLICY_MESSAGES[v]).join(' '),
        {
          violations,
        },
      );
    }
    await this.context.dataSource().transaction(async (manager) => {
      const row = await this.context.consumeToken('reset', plainToken, manager);
      if (!row) throw new EmailAuthError('INVALID_OR_EXPIRED_TOKEN');
      if (await demoAccountService.isDemoAccount(row.user_id, manager))
        throw new EmailAuthError(DEMO_ACCOUNT_FORBIDDEN_CODE);
      if (hasPlatformRole(await this.context.readRoles(row.user_id)))
        throw new EmailAuthError(PASSWORD_SESSION_NOT_ALLOWED_CODE);
      // Reset can only replace an existing credential, never add the first password.
      if (!(await this.context.passwords.hasPassword(row.user_id, manager)))
        throw new EmailAuthError('INVALID_OR_EXPIRED_TOKEN');
      await this.storePasswordAndRevoke(row.user_id, newPassword, manager);
      await manager
        .getRepository(User)
        .update({ id: row.user_id }, { isEmailVerified: true });
    });
  }

  async setPasswordForUser(
    userId: string,
    input: { currentPassword?: string; newPassword: string },
  ): Promise<void> {
    // Demo 계정의 비밀번호는 공개 credential 이고 고정이다 — 로그인했더라도 바꿀 수 없다.
    //   막지 않으면 공개 비밀번호를 아는 사람이 체험 계정을 사유화할 수 있다.
    if (
      await demoAccountService.isDemoAccount(userId, this.context.dataSource())
    )
      throw new EmailAuthError(DEMO_ACCOUNT_FORBIDDEN_CODE);
    if (hasPlatformRole(await this.context.readRoles(userId)))
      throw new EmailAuthError(PASSWORD_SESSION_NOT_ALLOWED_CODE);

    const violations = checkPasswordPolicy(input.newPassword);
    if (violations.length > 0) {
      throw new EmailAuthError(
        'PASSWORD_POLICY_VIOLATION',
        violations.map((v) => PASSWORD_POLICY_MESSAGES[v]).join(' '),
        {
          violations,
        },
      );
    }
    await this.context.dataSource().transaction(async (manager) => {
      await manager.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [
        userId,
      ]);
      if (await this.context.passwords.hasPassword(userId, manager)) {
        if (!input.currentPassword)
          throw new EmailAuthError('CURRENT_PASSWORD_REQUIRED');
        if (
          !(await this.context.passwords.verifyPassword(
            userId,
            input.currentPassword,
            manager,
          ))
        ) {
          throw new EmailAuthError('CURRENT_PASSWORD_MISMATCH');
        }
      }
      await this.storePasswordAndRevoke(userId, input.newPassword, manager);
    });
  }

  /** Password, reset links and session generation share one commit or rollback. */
  private async storePasswordAndRevoke(userId: string, plain: string, manager: EntityManager): Promise<void> {
    await this.context.passwords.setPassword(userId, plain, manager);
    await manager.query(
      `UPDATE password_reset_tokens SET consumed_at = now() WHERE user_id = $1 AND consumed_at IS NULL`, [userId],
    );
    await this.context.revokeAllSessions(userId, manager);
  }

  async getPasswordStatus(
    userId: string,
  ): Promise<{ hasPassword: boolean; canManage: boolean }> {
    const forbidden =
      (await demoAccountService.isDemoAccount(
        userId,
        this.context.dataSource(),
      )) || hasPlatformRole(await this.context.readRoles(userId));
    return {
      hasPassword: await this.context.passwords.hasPassword(userId),
      canManage: !forbidden,
    };
  }

  async findLoginId(input: {
    name: string;
    phone: string;
  }): Promise<{ found: boolean; maskedEmail: string | null }> {
    const name = (input.name ?? '').trim();
    const phone = normalizePhoneDigits(input.phone);
    if (name.length === 0 || !isPhoneShapeValid(phone))
      return { found: false, maskedEmail: null };

    const rows: Array<{ email: string }> = await this.context
      .dataSource()
      .query(
        `SELECT u.email
         FROM users u
         JOIN user_password_credentials c ON c.user_id = u.id
        WHERE regexp_replace(coalesce(u.phone, ''), '\\D', '', 'g') = $1
          AND u.name = $2
        LIMIT 2`,
        [phone, name],
      );
    if (rows.length !== 1) return { found: false, maskedEmail: null };
    const masked = maskLoginEmail(rows[0].email);
    return masked
      ? { found: true, maskedEmail: masked }
      : { found: false, maskedEmail: null };
  }
}
