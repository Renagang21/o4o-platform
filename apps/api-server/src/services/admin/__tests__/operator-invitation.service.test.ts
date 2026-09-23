/**
 * 운영자 초대 계약 — WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1 §7~§14 · §21
 *
 * 여기서 고정하는 것은 "초대가 동작한다" 가 아니라 **초대가 무엇을 하지 않는가** 다.
 *   - 생성: operator_invitations 1행 외 write 0 · raw token 미저장(sha256 만)
 *   - 수락: email 일치 + email_verified 만이 조건이고, email 로 기존 계정을 자동 병합하지 않는다
 *   - 어떤 경로에서도 users.password · service_credentials 를 만들지 않는다
 */
import 'reflect-metadata';

const assignRoleMock = jest.fn(async () => ({}));

jest.mock('../../../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../../database/connection.js', () => ({
  AppDataSource: { getRepository: jest.fn(), transaction: jest.fn() },
}));
jest.mock('../../../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: { assignRole: (...args: unknown[]) => assignRoleMock(...(args as [])) },
}));
jest.mock('../../auth/google-identity.service.js', () => ({
  googleIdentityService: { verifyGoogleIdToken: jest.fn() },
}));
jest.mock('../../auth/google-auth.service.js', () => ({
  googleAuthService: { createGoogleUser: jest.fn() },
}));
jest.mock('../../email.service.js', () => ({
  emailService: { sendOperatorInvitationEmail: jest.fn(async () => ({ success: true })) },
}));

import {
  OperatorInvitationService,
  OperatorInvitationError,
  INVITATION_TTL_MS,
  hashInvitationToken,
  normalizeInvitationEmail,
} from '../operator-invitation.service.js';
import { OperatorRoleContractError } from '../../../config/operator-role-catalog.js';

// ─── in-memory 저장소 stub ───────────────────────────────────────────────────

interface Row {
  id: string;
  invitedEmail: string;
  serviceKey: string;
  role: string;
  tokenHash: string;
  status: string;
  expiresAt: Date;
  invitedByUserId: string | null;
  acceptedUserId: string | null;
  acceptedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
}

class FakeQueryBuilder {
  private clauses: string[] = [];
  private params: Record<string, any> = {};
  locks: string[] = [];

  constructor(private readonly rows: Row[]) {}

  private add(sql: string, params?: Record<string, any>) {
    this.clauses.push(sql);
    Object.assign(this.params, params ?? {});
    return this;
  }
  where(sql: string, params?: Record<string, any>) { return this.add(sql, params); }
  andWhere(sql: string, params?: Record<string, any>) { return this.add(sql, params); }
  orderBy() { return this; }
  limit() { return this; }
  setLock(mode: string) { this.locks.push(mode); return this; }

  private matches(row: Row): boolean {
    return this.clauses.every((c) => {
      if (c.includes('lower(i.invited_email)')) return normalizeInvitationEmail(row.invitedEmail) === this.params.email;
      if (c.includes('i.service_key')) return row.serviceKey === this.params.serviceKey;
      if (c.includes('i.role')) return row.role === this.params.role;
      if (c.includes("status = 'pending'")) return row.status === 'pending';
      if (c.includes('i.token_hash')) return row.tokenHash === this.params.tokenHash;
      if (c.includes('i.status = :status')) return row.status === this.params.status;
      throw new Error(`테스트 stub 이 모르는 조건: ${c}`);
    });
  }
  async getOne() { return this.rows.find((r) => this.matches(r)) ?? null; }
  async getMany() { return this.rows.filter((r) => this.matches(r)); }
}

class FakeInvitationRepo {
  readonly builders: FakeQueryBuilder[] = [];
  private seq = 0;
  constructor(readonly rows: Row[]) {}

  createQueryBuilder(_alias: string) {
    const qb = new FakeQueryBuilder(this.rows);
    this.builders.push(qb);
    return qb as any;
  }
  async findOne({ where }: any) {
    return (
      this.rows.find((r) =>
        Object.entries(where).every(([k, v]) => (r as any)[k] === v),
      ) ?? null
    );
  }
  create(obj: any) { return { ...obj }; }
  async save(row: any) {
    if (!row.id) {
      row.id = `inv-${++this.seq}`;
      row.createdAt = new Date();
      this.rows.push(row);
    }
    return row;
  }
}

function pendingRow(overrides: Partial<Row> = {}): Row {
  return {
    id: 'inv-seed',
    invitedEmail: 'Invitee@Example.com',
    serviceKey: 'pharmacy-hub',
    role: 'pharmacy-hub:operator',
    tokenHash: hashInvitationToken('seed-token'),
    status: 'pending',
    expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
    invitedByUserId: 'admin-1',
    acceptedUserId: null,
    acceptedAt: null,
    cancelledAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

/** users / linked_accounts / service_memberships / service_credentials 의 write 를 전부 기록한다. */
interface Writes {
  users: any[];
  memberships: any[];
  credentials: any[];
  linkedAccounts: any[];
}

function makeHarness(opts: {
  rows?: Row[];
  linked?: { userId: string } | null;
  userByEmail?: any;
  identity?: any;
  sendResult?: { success: boolean; error?: string };
  sendThrows?: Error;
} = {}) {
  const rows = opts.rows ?? [];
  const repo = new FakeInvitationRepo(rows);
  const writes: Writes = { users: [], memberships: [], credentials: [], linkedAccounts: [] };

  const repoFor = (target: any) => {
    const name = typeof target === 'string' ? target : target?.name;
    if (name === 'OperatorInvitation') return repo as any;
    if (name === 'LinkedAccount') {
      return {
        findOne: jest.fn(async () => opts.linked ?? null),
        create: (o: any) => ({ ...o }),
        save: jest.fn(async (o: any) => { writes.linkedAccounts.push(o); return o; }),
      };
    }
    if (name === 'ServiceMembership') {
      return {
        findOne: jest.fn(async () => null),
        create: (o: any) => ({ ...o }),
        save: jest.fn(async (o: any) => { writes.memberships.push(o); return o; }),
      };
    }
    if (name === 'ServiceCredential') {
      return {
        findOne: jest.fn(async () => null),
        create: (o: any) => ({ ...o }),
        save: jest.fn(async (o: any) => { writes.credentials.push(o); return o; }),
      };
    }
    // User
    return {
      findOne: jest.fn(async () => opts.userByEmail ?? null),
      create: (o: any) => ({ ...o }),
      save: jest.fn(async (o: any) => { writes.users.push(o); return o; }),
    };
  };

  const manager = { getRepository: repoFor };
  const dataSource = {
    getRepository: repoFor,
    transaction: jest.fn(async (cb: any) => cb(manager)),
  } as any;

  const sendInvitationEmail = jest.fn(async () => {
    if (opts.sendThrows) throw opts.sendThrows;
    return opts.sendResult ?? { success: true };
  });
  const createGoogleUser = jest.fn(async () => {
    const u = { id: 'new-user-1' };
    writes.users.push(u);
    return u as any;
  });
  const verifyGoogleIdToken = jest.fn(async () =>
    opts.identity ?? { sub: 'google-sub-1', email: 'invitee@example.com', emailVerified: true },
  );

  const service = new OperatorInvitationService({
    dataSource,
    identity: { verifyGoogleIdToken } as any,
    sendInvitationEmail,
    createGoogleUser,
  });

  return { service, repo, rows, writes, dataSource, sendInvitationEmail, createGoogleUser, verifyGoogleIdToken };
}

const ACCEPT = { token: 'seed-token', idToken: 'google-id-token' };

beforeEach(() => jest.clearAllMocks());

// ─── 생성 ────────────────────────────────────────────────────────────────────

describe('create — 초대 생성', () => {
  it('operator_invitations 1행만 쓰고 users/membership/credential write 는 0이다', async () => {
    const h = makeHarness();
    const r = await h.service.create({
      email: 'invitee@example.com',
      serviceKey: 'pharmacy-hub',
      role: 'pharmacy-hub:operator',
      invitedByUserId: 'admin-1',
    });

    expect(h.rows).toHaveLength(1);
    expect(h.writes).toEqual({ users: [], memberships: [], credentials: [], linkedAccounts: [] });
    expect(r.invitation.status).toBe('pending');
    expect(r.emailSent).toBe(true);
  });

  it('raw token 을 저장하지 않는다 — 저장값은 sha256 hex 뿐이고 응답에도 없다', async () => {
    const h = makeHarness();
    const r = await h.service.create({
      email: 'invitee@example.com',
      serviceKey: 'pharmacy-hub',
      role: 'pharmacy-hub:operator',
      invitedByUserId: 'admin-1',
    });

    const acceptUrl: string = h.sendInvitationEmail.mock.calls[0][1].acceptUrl;
    const rawToken = decodeURIComponent(new URL(acceptUrl).searchParams.get('token')!);

    expect(h.rows[0].tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(h.rows[0].tokenHash).toBe(hashInvitationToken(rawToken));
    expect(h.rows[0].tokenHash).not.toBe(rawToken);
    expect(JSON.stringify(r)).not.toContain(rawToken);
  });

  it('수락 URL 의 origin 은 service catalog 에서만 온다 (open redirect 금지)', async () => {
    const h = makeHarness();
    expect(h.service.buildAcceptUrl('t')).toMatch(/^https:\/\/[^/]+\/operator-invitations\/accept\?token=t$/);
  });

  it('메일이 실패해도 초대 행은 남긴다(재전송으로 복구)', async () => {
    const h = makeHarness({ sendResult: { success: false, error: 'smtp down' } });
    const r = await h.service.create({
      email: 'invitee@example.com',
      serviceKey: 'pharmacy-hub',
      role: 'pharmacy-hub:operator',
      invitedByUserId: 'admin-1',
    });
    expect(h.rows).toHaveLength(1);
    expect(r.emailSent).toBe(false);
    expect(r.emailError).toBe('smtp down');
  });

  it('동일 (email·service·role) pending 초대가 있으면 INVITATION_DUPLICATE (대소문자 무시)', async () => {
    const h = makeHarness({ rows: [pendingRow()] });
    await expect(
      h.service.create({
        email: 'INVITEE@example.com',
        serviceKey: 'pharmacy-hub',
        role: 'pharmacy-hub:operator',
        invitedByUserId: 'admin-1',
      }),
    ).rejects.toMatchObject({ code: 'INVITATION_DUPLICATE', statusCode: 409 });
    expect(h.rows).toHaveLength(1);
  });

  it('allowlist 밖 role · platform:super_admin 은 초대할 수 없다', async () => {
    const h = makeHarness();
    for (const role of ['platform:super_admin', 'user', 'kpa:owner']) {
      await expect(
        h.service.create({ email: 'x@example.com', serviceKey: 'kpa-society', role, invitedByUserId: 'admin-1' }),
      ).rejects.toBeInstanceOf(OperatorRoleContractError);
    }
    expect(h.rows).toHaveLength(0);
  });

  it('이메일 형식이 아니면 role 판정 전에 거절한다', async () => {
    const h = makeHarness();
    await expect(
      h.service.create({ email: 'not-an-email', serviceKey: 'pharmacy-hub', role: 'pharmacy-hub:operator', invitedByUserId: null }),
    ).rejects.toMatchObject({ code: 'INVALID_EMAIL' });
    expect(h.sendInvitationEmail).not.toHaveBeenCalled();
  });
});

// ─── 재전송 · 취소 ───────────────────────────────────────────────────────────

describe('resend / cancel', () => {
  it('재전송은 새 행을 만들지 않고 같은 행의 token 을 회전시킨다(이전 링크 무효)', async () => {
    const row = pendingRow();
    const before = row.tokenHash;
    const h = makeHarness({ rows: [row] });

    await h.service.resend(row.id);

    expect(h.rows).toHaveLength(1);
    expect(row.tokenHash).not.toBe(before);
    expect(h.sendInvitationEmail).toHaveBeenCalledTimes(1);
  });

  it('수락·취소된 초대는 재전송하지 않는다', async () => {
    const h = makeHarness({ rows: [pendingRow({ id: 'a', status: 'accepted' }), pendingRow({ id: 'c', status: 'cancelled' })] });
    await expect(h.service.resend('a')).rejects.toMatchObject({ code: 'INVITATION_ALREADY_ACCEPTED' });
    await expect(h.service.resend('c')).rejects.toMatchObject({ code: 'INVITATION_CANCELLED' });
  });

  it('취소는 초대 상태만 바꾸고 이미 부여된 권한을 회수하지 않는다', async () => {
    const row = pendingRow();
    const h = makeHarness({ rows: [row] });

    const v = await h.service.cancel(row.id);

    expect(v.status).toBe('cancelled');
    expect(assignRoleMock).not.toHaveBeenCalled();
    expect(h.writes.users).toHaveLength(0);
    expect(h.writes.memberships).toHaveLength(0);
    // 이미 수락된 초대는 취소 대상이 아니다(권한 회수는 revoke 경로 소관).
    row.status = 'accepted';
    await expect(h.service.cancel(row.id)).rejects.toMatchObject({ code: 'INVITATION_ALREADY_ACCEPTED' });
  });

  it('없는 초대는 404', async () => {
    const h = makeHarness();
    await expect(h.service.cancel('nope')).rejects.toMatchObject({ code: 'INVITATION_NOT_FOUND', statusCode: 404 });
  });
});

// ─── preview ─────────────────────────────────────────────────────────────────

describe('preview — 로그인 전 최소 정보', () => {
  it('토큰이 맞으면 서비스·역할만 돌려준다(token·hash 미노출)', async () => {
    const h = makeHarness({ rows: [pendingRow()] });
    const v = await h.service.preview('seed-token');
    expect(v).toMatchObject({ serviceKey: 'pharmacy-hub', role: 'pharmacy-hub:operator' });
    expect(JSON.stringify(v)).not.toContain('seed-token');
  });

  it('틀린 토큰 · 만료 · 취소를 구분해 거절한다', async () => {
    const h = makeHarness({ rows: [pendingRow({ expiresAt: new Date(Date.now() - 1000) })] });
    await expect(h.service.preview('wrong')).rejects.toMatchObject({ code: 'INVITATION_NOT_FOUND' });
    await expect(h.service.preview('seed-token')).rejects.toMatchObject({ code: 'INVITATION_EXPIRED', statusCode: 410 });
  });
});

// ─── 수락 ────────────────────────────────────────────────────────────────────

describe('accept — Google 검증 후에만 부여한다', () => {
  it('기존 Google 사용자는 user 를 만들지 않고 role·membership 만 받는다', async () => {
    const row = pendingRow();
    const h = makeHarness({ rows: [row], linked: { userId: 'user-9' } });

    const r = await h.service.accept(ACCEPT);

    expect(r).toMatchObject({ userId: 'user-9', serviceKey: 'pharmacy-hub', createdUser: false, idempotent: false });
    expect(h.writes.users).toHaveLength(0);
    expect(h.writes.credentials).toHaveLength(0);
    expect(h.writes.memberships).toHaveLength(1);
    expect(assignRoleMock).toHaveBeenCalledWith({ userId: 'user-9', role: 'pharmacy-hub:operator' }, expect.anything());
    expect(row.status).toBe('accepted');
    expect(row.acceptedUserId).toBe('user-9');
  });

  it('초대 행은 FOR UPDATE 로 잠근 뒤 처리한다(동시 수락 직렬화)', async () => {
    const h = makeHarness({ rows: [pendingRow()], linked: { userId: 'user-9' } });
    await h.service.accept(ACCEPT);
    expect(h.dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(h.repo.builders.some((b) => b.locks.includes('pessimistic_write'))).toBe(true);
  });

  it('Google 검증은 트랜잭션 밖에서 먼저 한다 — 실패하면 트랜잭션을 열지 않는다', async () => {
    const h = makeHarness({ rows: [pendingRow()], identity: { sub: 's', email: 'invitee@example.com', emailVerified: false } });
    await expect(h.service.accept(ACCEPT)).rejects.toMatchObject({ code: 'GOOGLE_EMAIL_UNVERIFIED', statusCode: 403 });
    expect(h.dataSource.transaction).not.toHaveBeenCalled();
  });

  it('Google 계정에 email 이 없으면 거절한다', async () => {
    const h = makeHarness({ rows: [pendingRow()], identity: { sub: 's', email: null, emailVerified: true } });
    await expect(h.service.accept(ACCEPT)).rejects.toMatchObject({ code: 'GOOGLE_EMAIL_MISSING' });
  });

  it('초대받은 이메일과 다른 Google 계정이면 INVITATION_EMAIL_MISMATCH', async () => {
    const h = makeHarness({
      rows: [pendingRow()],
      linked: { userId: 'user-9' },
      identity: { sub: 's', email: 'someone.else@example.com', emailVerified: true },
    });
    await expect(h.service.accept(ACCEPT)).rejects.toMatchObject({ code: 'INVITATION_EMAIL_MISMATCH', statusCode: 403 });
    expect(assignRoleMock).not.toHaveBeenCalled();
  });

  it('email 비교는 trim+lowercase 만 한다 — dot·+alias 를 같은 사람으로 보지 않는다', async () => {
    expect(normalizeInvitationEmail('  Invitee@Example.COM ')).toBe('invitee@example.com');
    expect(normalizeInvitationEmail('in.vitee+op@example.com')).toBe('in.vitee+op@example.com');

    const h = makeHarness({
      rows: [pendingRow({ invitedEmail: 'invitee@example.com' })],
      identity: { sub: 's', email: 'in.vitee+op@example.com', emailVerified: true },
    });
    await expect(h.service.accept(ACCEPT)).rejects.toMatchObject({ code: 'INVITATION_EMAIL_MISMATCH' });
  });

  it('같은 email 의 기존 계정이 있어도 자동 병합하지 않는다 (INVITATION_IDENTITY_CONFLICT)', async () => {
    const h = makeHarness({
      rows: [pendingRow()],
      linked: null,
      userByEmail: { id: 'legacy-user', email: 'invitee@example.com' },
    });
    await expect(h.service.accept({ ...ACCEPT, consents: { terms: true, privacy: true } as any }))
      .rejects.toMatchObject({ code: 'INVITATION_IDENTITY_CONFLICT', statusCode: 409 });
    expect(assignRoleMock).not.toHaveBeenCalled();
    expect(h.createGoogleUser).not.toHaveBeenCalled();
  });

  it('신규 Identity 는 약관·개인정보 동의가 있어야 생성한다', async () => {
    const h = makeHarness({ rows: [pendingRow()], linked: null });
    await expect(h.service.accept(ACCEPT)).rejects.toMatchObject({ code: 'CONSENT_REQUIRED' });
    expect(h.createGoogleUser).not.toHaveBeenCalled();
  });

  it('신규 Identity 생성은 기존 Google 가입 경로(createGoogleUser)를 재사용한다 — 비밀번호 생성 0', async () => {
    const h = makeHarness({ rows: [pendingRow()], linked: null });
    const r = await h.service.accept({ ...ACCEPT, consents: { terms: true, privacy: true } as any });
    expect(h.createGoogleUser).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ userId: 'new-user-1', createdUser: true });
    expect(h.writes.credentials).toHaveLength(0);
  });

  it('만료된 초대는 수락되지 않는다', async () => {
    const h = makeHarness({ rows: [pendingRow({ expiresAt: new Date(Date.now() - 1) })], linked: { userId: 'user-9' } });
    await expect(h.service.accept(ACCEPT)).rejects.toMatchObject({ code: 'INVITATION_EXPIRED' });
    expect(assignRoleMock).not.toHaveBeenCalled();
  });

  it('취소된 초대는 수락되지 않는다', async () => {
    const h = makeHarness({ rows: [pendingRow({ status: 'cancelled' })], linked: { userId: 'user-9' } });
    await expect(h.service.accept(ACCEPT)).rejects.toMatchObject({ code: 'INVITATION_CANCELLED' });
  });

  it('같은 Identity 의 재수락은 멱등이고, 다른 사람의 재사용은 거절한다', async () => {
    const accepted = pendingRow({ status: 'accepted', acceptedUserId: 'user-9' });

    const same = makeHarness({ rows: [accepted], linked: { userId: 'user-9' } });
    const r = await same.service.accept(ACCEPT);
    expect(r).toMatchObject({ userId: 'user-9', idempotent: true, membershipPolicy: 'NOT_APPLICABLE' });
    expect(assignRoleMock).not.toHaveBeenCalled();

    const other = makeHarness({ rows: [accepted], linked: { userId: 'user-other' } });
    await expect(other.service.accept(ACCEPT)).rejects.toMatchObject({ code: 'INVITATION_ALREADY_ACCEPTED' });
  });

  it('토큰이 틀리면 부여하지 않는다', async () => {
    const h = makeHarness({ rows: [pendingRow()], linked: { userId: 'user-9' } });
    await expect(h.service.accept({ ...ACCEPT, token: 'forged' })).rejects.toBeInstanceOf(OperatorInvitationError);
    expect(assignRoleMock).not.toHaveBeenCalled();
  });
});
