/**
 * WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 §6 — EmailAuthService 계약
 *
 * 실제 DB/SMTP 없이 가입 → 확인 → 로그인 → 재설정 · 아이디 찾기 계약을 고정한다.
 *  V1 가입은 users 1행 + 비밀번호 수단 1행만 만든다(역할·멤버십 0) · 세션 없음 · 확인 메일 1통
 *  V2 같은 이메일(대소문자 무관)은 거절 — 기존 행을 덮어쓰지 않는다 · 자동 병합 0
 *  V3 확인 전 로그인 거절(EMAIL_NOT_VERIFIED) → 메일 링크 토큰으로 확인 → 로그인 성공
 *  V4 토큰은 해시만 저장 · 1회용 · 만료 · 재발급 시 이전 링크 무효
 *  V5 틀린 비밀번호 · 없는 계정 · Google 전용 계정은 같은 INVALID_CREDENTIALS
 *  V6 관리자 화면 · platform 역할은 비밀번호 세션 거절
 *  V7 세션 토큰에 authMethod='password' claim · refresh family 기록
 *  V8 재설정은 전역 폐기를 **먼저** 하고 새 해시 저장 · 이전 비밀번호 무효
 *  V9 resend / forgot 은 계정 존재 여부와 무관하게 조용하다
 *  V10 아이디 찾기는 정확히 1건일 때만 가린 힌트
 *  V11 정책 위반 · 동의 누락 · 형태 오류는 저장 전에 거절
 *  V12 로그·메일 외 경로에 평문 토큰/비밀번호가 남지 않는다(DB 에는 해시만)
 */

import { EmailAuthService, EmailAuthError, hashToken, type PasswordStore } from '../email-auth.service.js';
import { User } from '../../../entities/User.js';
import { AccountActivity } from '../../../entities/AccountActivity.js';
import { UserStatus } from '../../../types/auth.js';
import * as tokenUtils from '../../../utils/token.utils.js';

type Row = Record<string, any>;

interface Store {
  users: Row[];
  creds: Map<string, string>;
  evt: Row[];
  prt: Row[];
  activities: Row[];
}

let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;

const clone = (s: Store): Store => ({
  users: s.users.map((u) => Object.assign(new User(), u)),
  creds: new Map(s.creds),
  evt: s.evt.map((r) => ({ ...r })),
  prt: s.prt.map((r) => ({ ...r })),
  activities: [...s.activities],
});

function makeHarness(opts: { roles?: Record<string, string[]>; now?: Date } = {}) {
  let store: Store = { users: [], creds: new Map(), evt: [], prt: [], activities: [] };
  const sql: Array<{ q: string; p: unknown[] }> = [];
  const nowRef = { t: opts.now ?? new Date('2026-09-30T00:00:00Z') };

  const tokenTable = (q: string) => (q.includes('email_verification_tokens') ? store.evt : store.prt);
  const live = (r: Row) => r.consumed_at == null && r.expires_at > nowRef.t;

  const query = jest.fn(async (q: string, p: any[] = []) => {
    sql.push({ q, p });
    const s = q.replace(/\s+/g, ' ').trim();
    if (s.startsWith('SELECT id FROM users WHERE lower(email)')) {
      return store.users.filter((u) => u.email.toLowerCase() === p[0]).slice(0, 2).map((u) => ({ id: u.id }));
    }
    if (s.startsWith('SELECT id, "isEmailVerified" FROM users')) {
      return store.users
        .filter((u) => u.email.toLowerCase() === p[0])
        .slice(0, 2)
        .map((u) => ({ id: u.id, isEmailVerified: u.isEmailVerified }));
    }
    if (s.startsWith('DELETE FROM')) {
      const t = tokenTable(s);
      const keep = t.filter((r) => !(r.user_id === p[0] && (r.consumed_at != null || r.expires_at < nowRef.t)));
      t.splice(0, t.length, ...keep);
      return [];
    }
    if (s.includes('SET consumed_at = now() WHERE user_id')) {
      tokenTable(s).filter((r) => r.user_id === p[0] && r.consumed_at == null).forEach((r) => (r.consumed_at = nowRef.t));
      return [];
    }
    if (s.startsWith('INSERT INTO email_verification_tokens')) {
      store.evt.push({ user_id: p[0], email: p[1], token_hash: p[2], expires_at: p[3], consumed_at: null });
      return [];
    }
    if (s.startsWith('INSERT INTO password_reset_tokens')) {
      store.prt.push({ user_id: p[0], token_hash: p[1], expires_at: p[2], consumed_at: null });
      return [];
    }
    if (s.includes('WHERE token_hash = $1')) {
      const t = tokenTable(s);
      const hit = t.find((r) => r.token_hash === p[0] && live(r));
      if (!hit) return [[], 0];
      hit.consumed_at = nowRef.t;
      return [[{ user_id: hit.user_id, email: hit.email ?? '' }], 1];
    }
    if (s.startsWith('SELECT u.email FROM users u JOIN user_password_credentials')) {
      return store.users
        .filter((u) => store.creds.has(u.id) && String(u.phone ?? '').replace(/\D/g, '') === p[0] && u.name === p[1])
        .slice(0, 2)
        .map((u) => ({ email: u.email }));
    }
    throw new Error(`unexpected SQL: ${s}`);
  });

  const repoFor = (entity: unknown) => {
    if (entity === AccountActivity) {
      return {
        create: (d: Row) => ({ ...d }),
        save: jest.fn(async (r: Row) => (store.activities.push(r), r)),
      };
    }
    if (entity !== User) throw new Error('unexpected repository');
    return {
      findOne: jest.fn(async ({ where }: { where: Row }) => store.users.find((u) => u.id === where.id) ?? null),
      create: (d: Row) => Object.assign(new User(), d),
      save: jest.fn(async (u: Row) => {
        if (store.users.some((x) => x !== u && x.email === u.email)) {
          throw Object.assign(new Error('dup'), { code: '23505' });
        }
        if (!u.id) u.id = uuid();
        if (!store.users.includes(u)) store.users.push(u);
        return u;
      }),
      update: jest.fn(async ({ id }: Row, patch: Row) => {
        const u = store.users.find((x) => x.id === id);
        if (u) Object.assign(u, patch);
      }),
    };
  };

  const manager = { query, getRepository: repoFor };
  const dataSource = {
    query,
    getRepository: repoFor,
    transaction: jest.fn(async (cb: (m: any) => Promise<any>) => {
      const snapshot = clone(store);
      try {
        return await cb(manager);
      } catch (e) {
        store = snapshot;
        throw e;
      }
    }),
  };

  // 비밀번호 수단 — 서비스 계약만 본다(해시 자체는 passwordCredentialService.test 가 본다).
  const passwords: PasswordStore = {
    hasPassword: jest.fn(async (id: string) => store.creds.has(id)),
    setPassword: jest.fn(async (id: string, plain: string) => {
      store.creds.set(id, `fakehash:${hashToken(plain)}`);
    }),
    verifyPassword: jest.fn(async (id: string | null, plain: string) => {
      if (!id) return false;
      return store.creds.get(id) === `fakehash:${hashToken(plain)}`;
    }),
  };

  const mails: Array<{ to: string; subject: string; template?: string; data?: any; html?: string }> = [];
  const mailer = { sendEmail: jest.fn(async (m: any) => (mails.push(m), { success: true })) };

  const revoked: string[] = [];
  const order: string[] = [];
  const revokeAllSessions = jest.fn(async (id: string) => {
    revoked.push(id);
    order.push('revoke');
  });
  (passwords.setPassword as jest.Mock).mockImplementation(async (id: string, plain: string) => {
    order.push('setPassword');
    store.creds.set(id, `fakehash:${hashToken(plain)}`);
  });

  const roles = opts.roles ?? {};
  const service = new EmailAuthService({
    dataSource: dataSource as any,
    passwords,
    mailer,
    revokeAllSessions,
    readRoles: async (id) => roles[id] ?? [],
    issueSession: async (user, key) => ({
      tokens: tokenUtils.generateTokens(user, roles[user.id] ?? [], 'neture.co.kr', [], null, key, null, 'password'),
      roles: roles[user.id] ?? [],
      memberships: [],
    }),
    now: () => nowRef.t,
  });

  const lastLinkToken = (path: string) => {
    const m = [...mails].reverse().find((x) => (x.data?.verifyUrl ?? x.html ?? '').includes(path));
    const src: string = m?.data?.verifyUrl ?? m?.html ?? '';
    const match = src.match(new RegExp(`${path}\\?token=([A-Za-z0-9_%-]+)`));
    return match ? decodeURIComponent(match[1]) : '';
  };

  return {
    service,
    get store() {
      return store;
    },
    sql,
    mails,
    mailer,
    passwords,
    revoked,
    order,
    nowRef,
    lastLinkToken,
    addUser(u: Partial<Row>) {
      const row = Object.assign(new User(), {
        id: uuid(),
        status: UserStatus.ACTIVE,
        isActive: true,
        isEmailVerified: true,
        ...u,
      });
      store.users.push(row);
      return row;
    },
  };
}

const META = { ipAddress: '127.0.0.1', userAgent: 'jest', sessionServiceKey: 'neture' };
const GOOD_PW = 'abcd1234!';
const signupInput = (over: Partial<Record<string, any>> = {}) => ({
  email: 'New.User@Example.com',
  password: GOOD_PW,
  name: '홍길동',
  phone: '010-1234-5678',
  consents: { terms: true, privacy: true },
  ...META,
  ...over,
});

async function expectCode(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toMatchObject({ code });
}

describe('EmailAuthService', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-email-auth';
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret-email-auth';
  });

  describe('V1 가입', () => {
    it('users 1행 + 수단 1행, 이메일은 정규화, 미확인 상태, 세션 없음, 확인 메일 1통', async () => {
      const h = makeHarness();
      const res = await h.service.signup(signupInput());
      expect(res).toEqual({ maskedEmail: 'n***@e***.com', mailSent: true });
      expect(res).not.toHaveProperty('tokens');

      expect(h.store.users).toHaveLength(1);
      const u = h.store.users[0];
      expect(u.email).toBe('new.user@example.com');
      expect(u.phone).toBe('01012345678');
      expect(u.isEmailVerified).toBe(false);
      expect(u.password).toBeUndefined();
      expect(h.store.creds.size).toBe(1);

      expect(h.mails).toHaveLength(1);
      expect(h.mails[0].template).toBe('email-verification');
      expect(h.mails[0].data.verifyUrl).toMatch(/\/verify-email\?token=/);
    });

    it('역할·멤버십·조직 테이블을 건드리지 않는다', async () => {
      const h = makeHarness();
      await h.service.signup(signupInput());
      const touched = h.sql.map((x) => x.q).join('\n');
      expect(touched).not.toMatch(/role_assignments|service_memberships|organization_members/);
    });
  });

  describe('V2 중복 이메일', () => {
    it('Google 로 가입한 같은 이메일(대소문자 다름) → EMAIL_IN_USE, 기존 행 불변, 수단 추가 0', async () => {
      const h = makeHarness();
      const g = h.addUser({ email: 'new.user@example.com', name: '기존' });
      await expectCode(h.service.signup(signupInput()), 'EMAIL_IN_USE');
      expect(h.store.users).toHaveLength(1);
      expect(h.store.users[0]).toMatchObject({ id: g.id, name: '기존', isEmailVerified: true });
      expect(h.store.creds.size).toBe(0);
      expect(h.mails).toHaveLength(0);
    });

    it('확인 대기 중인 이메일가입 → EMAIL_PENDING_VERIFICATION, 비밀번호를 덮어쓰지 않는다', async () => {
      const h = makeHarness();
      await h.service.signup(signupInput());
      const before = [...h.store.creds.values()][0];
      await expectCode(h.service.signup(signupInput({ password: 'other999#' })), 'EMAIL_PENDING_VERIFICATION');
      expect([...h.store.creds.values()][0]).toBe(before);
      expect(h.store.users).toHaveLength(1);
    });

    it('동시 가입 race(unique 위반) → EMAIL_IN_USE, 트랜잭션 롤백으로 수단이 남지 않는다', async () => {
      const h = makeHarness();
      h.addUser({ email: 'new.user@example.com' });
      // 선조회는 비었다고 보고 insert 에서 충돌하게 만든다
      const q = (h.service as any)._dataSource.query as jest.Mock;
      const orig = q.getMockImplementation()!;
      q.mockImplementation(async (s: string, p: any[]) =>
        s.includes('"isEmailVerified" FROM users') ? [] : orig(s, p),
      );
      await expectCode(h.service.signup(signupInput()), 'EMAIL_IN_USE');
      expect(h.store.creds.size).toBe(0);
    });
  });

  describe('V3 확인 → 로그인', () => {
    it('확인 전 로그인은 EMAIL_NOT_VERIFIED, 링크 토큰으로 확인 후 로그인 성공', async () => {
      const h = makeHarness();
      await h.service.signup(signupInput());
      await expectCode(h.service.login({ email: 'new.user@example.com', password: GOOD_PW, ...META }), 'EMAIL_NOT_VERIFIED');

      const token = h.lastLinkToken('/verify-email');
      expect(token.length).toBeGreaterThan(20);
      await expect(h.service.verifyEmail(token)).resolves.toEqual({ maskedEmail: 'n***@e***.com' });
      expect(h.store.users[0].isEmailVerified).toBe(true);

      const s = await h.service.login({ email: ' NEW.USER@example.com ', password: GOOD_PW, ...META });
      expect(s.isNewUser).toBe(false);
      expect(s.user.id).toBe(h.store.users[0].id);
      expect(s.user).not.toHaveProperty('password');
    });

    it('토큰 발급 뒤 주소가 바뀌면 옛 링크는 확인하지 못한다', async () => {
      const h = makeHarness();
      await h.service.signup(signupInput());
      const token = h.lastLinkToken('/verify-email');
      h.store.users[0].email = 'changed@example.com';
      await expectCode(h.service.verifyEmail(token), 'INVALID_OR_EXPIRED_TOKEN');
      expect(h.store.users[0].isEmailVerified).toBe(false);
    });
  });

  describe('V4 토큰', () => {
    it('DB 에는 해시만 — 평문 토큰이 어떤 SQL 파라미터에도 없다', async () => {
      const h = makeHarness();
      await h.service.signup(signupInput());
      const token = h.lastLinkToken('/verify-email');
      expect(h.store.evt[0].token_hash).toBe(hashToken(token));
      expect(JSON.stringify(h.sql.map((x) => x.p))).not.toContain(token);
    });

    it('1회용 — 두 번째 사용은 INVALID_OR_EXPIRED_TOKEN', async () => {
      const h = makeHarness();
      await h.service.signup(signupInput());
      const token = h.lastLinkToken('/verify-email');
      await h.service.verifyEmail(token);
      await expectCode(h.service.verifyEmail(token), 'INVALID_OR_EXPIRED_TOKEN');
    });

    it('만료(24h) 뒤에는 거절', async () => {
      const h = makeHarness();
      await h.service.signup(signupInput());
      const token = h.lastLinkToken('/verify-email');
      h.nowRef.t = new Date(h.nowRef.t.getTime() + 24 * 60 * 60 * 1000 + 1);
      await expectCode(h.service.verifyEmail(token), 'INVALID_OR_EXPIRED_TOKEN');
    });

    it('재발송하면 이전 링크는 무효, 새 링크만 유효', async () => {
      const h = makeHarness();
      await h.service.signup(signupInput());
      const first = h.lastLinkToken('/verify-email');
      await h.service.resendVerification('new.user@example.com', META);
      const second = h.lastLinkToken('/verify-email');
      expect(second).not.toBe(first);
      await expectCode(h.service.verifyEmail(first), 'INVALID_OR_EXPIRED_TOKEN');
      await expect(h.service.verifyEmail(second)).resolves.toBeDefined();
    });

    // PR #257 보완 5 — 발송 실패는 계정을 되돌리지 않고, 재발송이 새 링크로 복구한다.
    let h0: ReturnType<typeof makeHarness>;
    it.each([
      ['success:false 응답', () => h0.mailer.sendEmail.mockImplementationOnce(async () => ({ success: false, error: 'smtp down' }))],
      ['예외', () => h0.mailer.sendEmail.mockImplementationOnce(async () => { throw new Error('smtp down'); })],
    ])('발송 실패(%s) → mailSent:false · 계정 유지 · 재발송 링크로 확인 완료', async (_label, failOnce) => {
      h0 = makeHarness();
      failOnce();
      const res = await h0.service.signup(signupInput());
      expect(res.mailSent).toBe(false);
      expect(h0.store.users).toHaveLength(1);
      expect(h0.store.creds.size).toBe(1);
      expect(h0.lastLinkToken('/verify-email')).toBe('');

      await h0.service.resendVerification('new.user@example.com', META);
      const token = h0.lastLinkToken('/verify-email');
      expect(token).not.toBe('');
      await expect(h0.service.verifyEmail(token)).resolves.toBeDefined();
      expect(h0.store.users[0].isEmailVerified).toBe(true);
    });

    it('형태가 아닌 토큰은 DB 를 조회하지 않고 거절', async () => {
      const h = makeHarness();
      const n = h.sql.length;
      await expectCode(h.service.verifyEmail('short'), 'INVALID_OR_EXPIRED_TOKEN');
      expect(h.sql.length).toBe(n);
    });
  });

  describe('V5 같은 실패 응답', () => {
    it('틀린 비밀번호 · 없는 계정 · Google 전용 계정 모두 INVALID_CREDENTIALS 이고 verifyPassword 를 한 번씩 부른다', async () => {
      const h = makeHarness();
      await h.service.signup(signupInput());
      h.store.users[0].isEmailVerified = true;
      h.addUser({ email: 'google.only@example.com' });

      for (const email of ['new.user@example.com', 'nobody@example.com', 'google.only@example.com']) {
        (h.passwords.verifyPassword as jest.Mock).mockClear();
        await expectCode(h.service.login({ email, password: 'wrong1234!', ...META }), 'INVALID_CREDENTIALS');
        expect(h.passwords.verifyPassword).toHaveBeenCalledTimes(1);
      }
    });

    it('정지된 계정은 비밀번호가 맞아도 ACCOUNT_NOT_ACTIVE', async () => {
      const h = makeHarness();
      await h.service.signup(signupInput());
      Object.assign(h.store.users[0], { isEmailVerified: true, status: UserStatus.SUSPENDED });
      await expectCode(h.service.login({ email: 'new.user@example.com', password: GOOD_PW, ...META }), 'ACCOUNT_NOT_ACTIVE');
    });
  });

  describe('V6 관리자 경계', () => {
    it('관리자 화면(origin=admin)은 자격 확인 전에 거절', async () => {
      const h = makeHarness();
      await expectCode(
        h.service.login({ email: 'a@example.com', password: GOOD_PW, ...META, sessionServiceKey: 'admin' }),
        'PASSWORD_SESSION_NOT_ALLOWED',
      );
      expect(h.passwords.verifyPassword).not.toHaveBeenCalled();
    });

    it('platform 역할 사용자는 서비스 화면에서도 비밀번호 세션 거절, family 기록 없음', async () => {
      const h = makeHarness();
      await h.service.signup(signupInput());
      const u = h.store.users[0];
      u.isEmailVerified = true;
      const h2 = makeHarness({ roles: { [u.id]: ['platform:super_admin'] } });
      h2.store.users.push(u);
      h2.store.creds.set(u.id, h.store.creds.get(u.id)!);
      await expectCode(h2.service.login({ email: u.email, password: GOOD_PW, ...META }), 'PASSWORD_SESSION_NOT_ALLOWED');
      expect(u.refreshTokenFamily).toBeUndefined();
    });

    it('platform 역할은 재설정 메일을 받지 않고 비밀번호 설정도 거절', async () => {
      const h = makeHarness();
      const admin = h.addUser({ email: 'admin@example.com' });
      const h2 = makeHarness({ roles: { [admin.id]: ['platform:super_admin'] } });
      h2.store.users.push(admin);
      await h2.service.requestPasswordReset('admin@example.com', META);
      expect(h2.mails).toHaveLength(0);
      await expectCode(h2.service.setPasswordForUser(admin.id, { newPassword: GOOD_PW }), 'PASSWORD_SESSION_NOT_ALLOWED');
      expect(h2.store.creds.size).toBe(0);
    });
  });

  describe('V7 세션', () => {
    it('access/refresh 에 authMethod=password, sub=users.id, refresh family 기록', async () => {
      const h = makeHarness();
      await h.service.signup(signupInput());
      await h.service.verifyEmail(h.lastLinkToken('/verify-email'));
      const s = await h.service.login({ email: 'new.user@example.com', password: GOOD_PW, ...META });

      const access = tokenUtils.verifyAccessToken(s.tokens.accessToken) as any;
      const refresh = tokenUtils.verifyRefreshToken(s.tokens.refreshToken) as any;
      expect(access.authMethod).toBe('password');
      expect(refresh.authMethod).toBe('password');
      expect(access.userId ?? access.sub).toBe(h.store.users[0].id);
      expect(h.store.users[0].refreshTokenFamily).toBe(refresh.tokenFamily);
      expect(h.store.users[0].lastLoginAt).toEqual(h.nowRef.t);
    });
  });

  describe('V8 비밀번호 재설정', () => {
    async function verifiedUser() {
      const h = makeHarness();
      await h.service.signup(signupInput());
      await h.service.verifyEmail(h.lastLinkToken('/verify-email'));
      return h;
    }

    it('메일 링크 → 새 비밀번호, 전역 폐기가 저장보다 먼저, 이전 비밀번호 무효', async () => {
      const h = await verifiedUser();
      h.order.length = 0;
      await h.service.requestPasswordReset('New.User@example.com', META);
      const token = h.lastLinkToken('/reset-password');
      expect(token.length).toBeGreaterThan(20);
      expect(h.store.prt[0].token_hash).toBe(hashToken(token));

      await h.service.resetPassword(token, 'newpass99$');
      expect(h.revoked).toEqual([h.store.users[0].id]);
      expect(h.order).toEqual(['revoke', 'setPassword']);

      await expectCode(h.service.login({ email: 'new.user@example.com', password: GOOD_PW, ...META }), 'INVALID_CREDENTIALS');
      await expect(h.service.login({ email: 'new.user@example.com', password: 'newpass99$', ...META })).resolves.toBeDefined();
      await expectCode(h.service.resetPassword(token, 'again999$'), 'INVALID_OR_EXPIRED_TOKEN');
    });

    it('30분 만료', async () => {
      const h = await verifiedUser();
      await h.service.requestPasswordReset('new.user@example.com', META);
      const token = h.lastLinkToken('/reset-password');
      h.nowRef.t = new Date(h.nowRef.t.getTime() + 30 * 60 * 1000 + 1);
      await expectCode(h.service.resetPassword(token, 'newpass99$'), 'INVALID_OR_EXPIRED_TOKEN');
      expect(h.revoked).toEqual([]);
    });

    it('정책 위반 새 비밀번호는 토큰을 소비하지 않는다', async () => {
      const h = await verifiedUser();
      await h.service.requestPasswordReset('new.user@example.com', META);
      const token = h.lastLinkToken('/reset-password');
      await expectCode(h.service.resetPassword(token, 'short'), 'PASSWORD_POLICY_VIOLATION');
      await expectCode(h.service.resetPassword(token, 'a1!' + 'x'.repeat(70)), 'PASSWORD_POLICY_VIOLATION');
      await expect(h.service.resetPassword(token, 'newpass99$')).resolves.toBeUndefined();
    });

    it('재설정 메일 링크를 연 Google 전용 사용자는 같은 users.id 에 수단이 추가된다(새 계정 0)', async () => {
      const h = makeHarness();
      const g = h.addUser({ email: 'google.only@example.com' });
      await h.service.requestPasswordReset('google.only@example.com', META);
      await h.service.resetPassword(h.lastLinkToken('/reset-password'), 'newpass99$');
      expect(h.store.users).toHaveLength(1);
      expect([...h.store.creds.keys()]).toEqual([g.id]);
    });
  });

  describe('V9 존재 여부 비노출', () => {
    it('없는 주소 · 확인 완료 주소에는 resend 가 메일을 보내지 않고 오류도 없다', async () => {
      const h = makeHarness();
      h.addUser({ email: 'done@example.com' });
      await expect(h.service.resendVerification('nobody@example.com', META)).resolves.toBeUndefined();
      await expect(h.service.resendVerification('done@example.com', META)).resolves.toBeUndefined();
      await expect(h.service.resendVerification('not-an-email', META)).resolves.toBeUndefined();
      expect(h.mails).toHaveLength(0);
    });

    it('forgot 은 없는 주소에 조용하다', async () => {
      const h = makeHarness();
      await expect(h.service.requestPasswordReset('nobody@example.com', META)).resolves.toBeUndefined();
      expect(h.mails).toHaveLength(0);
    });
  });

  describe('V10 아이디 찾기', () => {
    it('이름+휴대전화가 정확히 1건이면 가린 힌트, 하이픈 무관', async () => {
      const h = makeHarness();
      await h.service.signup(signupInput());
      await expect(h.service.findLoginId({ name: '홍길동', phone: '01012345678' })).resolves.toEqual({
        found: true,
        maskedEmail: 'n***@e***.com',
      });
    });

    it('0건 · 2건 · 형태 오류는 found=false', async () => {
      const h = makeHarness();
      await h.service.signup(signupInput());
      await h.service.signup(signupInput({ email: 'second@example.com' }));
      await expect(h.service.findLoginId({ name: '홍길동', phone: '010-1234-5678' })).resolves.toEqual({ found: false, maskedEmail: null });
      await expect(h.service.findLoginId({ name: '없음', phone: '01099998888' })).resolves.toEqual({ found: false, maskedEmail: null });
      await expect(h.service.findLoginId({ name: '홍길동', phone: '12' })).resolves.toEqual({ found: false, maskedEmail: null });
    });
  });

  describe('V11 입력 거절 (저장 전)', () => {
    it.each([
      [{ consents: { terms: true, privacy: false } }, 'CONSENT_REQUIRED'],
      [{ email: 'bad' }, 'INVALID_EMAIL'],
      [{ name: '  ' }, 'INVALID_NAME'],
      [{ phone: '02-123-4567' }, 'INVALID_PHONE'],
      [{ password: 'abcdefgh1' }, 'PASSWORD_POLICY_VIOLATION'],
      [{ password: 'abc!1' }, 'PASSWORD_POLICY_VIOLATION'],
      [{ password: 'abcdef1가' }, 'PASSWORD_POLICY_VIOLATION'],
      [{ password: 'a1!' + 'x'.repeat(70) }, 'PASSWORD_POLICY_VIOLATION'],
      [{ password: 'a1!' + '가'.repeat(24) }, 'PASSWORD_POLICY_VIOLATION'],
    ])('%j → %s', async (over, code) => {
      const h = makeHarness();
      await expectCode(h.service.signup(signupInput(over)), code);
      expect(h.store.users).toHaveLength(0);
      expect(h.store.creds.size).toBe(0);
    });

    it('정책 위반은 위반 항목을 details 로 돌려준다(대소문자 요구 없음)', async () => {
      const h = makeHarness();
      const err: EmailAuthError = await h.service.signup(signupInput({ password: 'ABCDEFGH' })).catch((e) => e);
      expect(err.details).toEqual({ violations: ['no_digit', 'no_symbol'] });
      await expect(h.service.signup(signupInput({ password: 'ABCD123!' }))).resolves.toBeDefined();
    });
  });

  describe('V12 비밀번호 설정 (로그인 사용자)', () => {
    it('수단이 없으면 현재 비밀번호 없이 추가, 있으면 현재 비밀번호 필수·일치', async () => {
      const h = makeHarness();
      const g = h.addUser({ email: 'g@example.com' });
      await expectCode(h.service.setPasswordForUser(g.id, { newPassword: 'a1!' + '가'.repeat(24) }), 'PASSWORD_POLICY_VIOLATION');
      expect(h.store.creds.has(g.id)).toBe(false);
      await h.service.setPasswordForUser(g.id, { newPassword: GOOD_PW });
      expect(h.store.creds.has(g.id)).toBe(true);

      await expectCode(h.service.setPasswordForUser(g.id, { newPassword: 'next999$x' }), 'CURRENT_PASSWORD_REQUIRED');
      await expectCode(
        h.service.setPasswordForUser(g.id, { currentPassword: 'wrong999$', newPassword: 'next999$x' }),
        'CURRENT_PASSWORD_MISMATCH',
      );
      await h.service.setPasswordForUser(g.id, { currentPassword: GOOD_PW, newPassword: 'next999$x' });
      expect(h.revoked).toEqual([]);
    });

    it('어느 경로도 평문 비밀번호를 SQL 파라미터 · 활동 로그에 싣지 않는다', async () => {
      const h = makeHarness();
      await h.service.signup(signupInput());
      await h.service.verifyEmail(h.lastLinkToken('/verify-email'));
      await h.service.login({ email: 'new.user@example.com', password: GOOD_PW, ...META });
      await h.service.login({ email: 'new.user@example.com', password: 'wrong1234!', ...META }).catch(() => {});
      await new Promise((r) => setImmediate(r));
      const dump = JSON.stringify({ sql: h.sql.map((x) => x.p), act: h.store.activities });
      expect(dump).not.toContain(GOOD_PW);
      expect(dump).not.toContain('wrong1234!');
      expect(h.store.activities.length).toBeGreaterThan(0);
      expect(h.store.activities.every((a) => a.email === null)).toBe(true);
    });
  });
});
