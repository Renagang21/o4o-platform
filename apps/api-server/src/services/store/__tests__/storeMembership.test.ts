/**
 * Store Membership — 접근 결정과 초대/수락/해제 계약
 *
 * WO-O4O-STORE-BUSINESS-ENROLLMENT-AND-MEMBER-ACCESS-V1 §22
 * 정책 정본: `docs/baseline/O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md`
 *
 * 고정하는 것
 *   M1 Owner 판정은 기존 경로 그대로다 — 이 모듈이 owner 를 새로 만들지 않는다
 *   M2 Store Member('staff')는 자기 매장만 본다. 'invited' 는 아무 접근도 없다
 *   M3 업종 경계 — 조직이 그 서비스에 연결돼 있지 않으면 접근이 아니다
 *   M4 쓰기(초대 · 해제)는 Owner 전용이고, 조직은 **요청이 고르지 않는다**
 *   M5 수락은 초대받은 본인만 · 초대가 없으면 membership 을 만들지 않는다
 *   M6 owner · admin · manager 행은 이 경로로 바뀌지 않는다
 */
import {
  STORE_INVITED_ROLE,
  STORE_STAFF_ROLE,
  StoreMemberError,
  acceptStoreInvitation,
  inviteStoreMember,
  listMyInvitations,
  listStoreMembers,
  removeStoreMember,
  resolveStoreAccessLevel,
} from '../store-membership.service.js';

// ── 기존 Owner 판정 · linkage 는 각자의 spec 이 본다. 여기서는 경계만 본다. ────────
const ownerMock = jest.fn();
const linkedMock = jest.fn();
const hasAnyRoleMock = jest.fn();
const assignRoleMock = jest.fn();
const removeRoleMock = jest.fn();
jest.mock('../../../utils/store-owner.utils.js', () => ({
  isStoreOwner: (...args: unknown[]) => ownerMock(...args),
}));
jest.mock('../../../utils/store-organization.resolver.js', () => ({
  isOrganizationLinkedToService: (...args: unknown[]) => linkedMock(...args),
  STORE_SERVICE_ORG_LINKAGE: {
    kpa: { enrollmentCodes: ['kpa-society'], slugKeys: ['kpa'] },
    cosmetics: { enrollmentCodes: ['k-cosmetics'], slugKeys: ['k-cosmetics'] },
    'pharmacy-hub': { enrollmentCodes: ['pharmacy-hub'], slugKeys: ['pharmacy-hub'] },
    'cafe24-b2b': { enrollmentCodes: ['cafe24-b2b'], slugKeys: ['cafe24-b2b'] },
  },
}));
jest.mock('../../../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: {
    hasAnyRole: (...args: unknown[]) => hasAnyRoleMock(...args),
    assignRole: (...args: unknown[]) => assignRoleMock(...args),
    removeRole: (...args: unknown[]) => removeRoleMock(...args),
  },
}));

const ORG_A = '11111111-1111-4111-8111-111111111111';
const ORG_B = '22222222-2222-4222-8222-222222222222';
const OWNER = 'owner-1';
const STAFF = 'staff-1';
const OUTSIDER = 'outsider-1';

type Row = Record<string, any>;

/** organization_members · users 를 메모리로 둔 가짜 DataSource. SQL 모양으로 분기한다. */
function makeDs(seed: { members?: Row[]; users?: Row[] } = {}) {
  const members: Row[] = seed.members ?? [];
  const users: Row[] = seed.users ?? [];
  const sql: string[] = [];

  const query = jest.fn(async (q: string, p: any[] = []) => {
    const s = q.replace(/\s+/g, ' ').trim();
    sql.push(s);

    if (s.startsWith('SELECT organization_id, role FROM organization_members')) {
      return members
        .filter((m) => m.user_id === p[0] && m.left_at == null && m.role === p[1])
        .map((m) => ({ organization_id: m.organization_id, role: m.role }));
    }
    if (s.startsWith('SELECT om.user_id, u.email')) {
      return members
        .filter((m) => m.organization_id === p[0] && m.left_at == null)
        .map((m) => {
          const u = users.find((x) => x.id === m.user_id) ?? {};
          return { user_id: m.user_id, email: u.email ?? '', name: u.name ?? null, role: m.role, joined_at: new Date() };
        });
    }
    if (s.startsWith('SELECT id FROM users WHERE lower(email)')) {
      return users.filter((u) => String(u.email).toLowerCase() === p[0]).map((u) => ({ id: u.id }));
    }
    if (s.startsWith('SELECT role, left_at FROM organization_members')) {
      return members
        .filter((m) => m.organization_id === p[0] && m.user_id === p[1])
        .map((m) => ({ role: m.role, left_at: m.left_at ?? null }));
    }
    if (s.startsWith('SELECT role FROM organization_members')) {
      return members
        .filter((m) => m.organization_id === p[0] && m.user_id === p[1] && m.left_at == null)
        .map((m) => ({ role: m.role }));
    }
    if (s.startsWith('SELECT 1 FROM organization_members om')) {
      // 해제 뒤 "같은 서비스에 남은 매장이 있나" — 가짜에서는 linkage 를 참으로 보고 관계만 센다.
      return members.filter((m) => m.user_id === p[0] && m.left_at == null && m.role === p[1]).slice(0, 1).map(() => ({ ok: 1 }));
    }
    if (s.startsWith('SELECT om.organization_id, o.name')) {
      return members
        .filter((m) => m.user_id === p[0] && m.left_at == null && m.role === p[1])
        .map((m) => ({ organization_id: m.organization_id, name: '테스트 매장' }));
    }
    if (s.startsWith('INSERT INTO organization_members')) {
      const [organization_id, user_id, role] = p;
      const hit = members.find((m) => m.organization_id === organization_id && m.user_id === user_id);
      if (hit) Object.assign(hit, { role, left_at: null });
      else members.push({ organization_id, user_id, role, left_at: null });
      return [];
    }
    if (s.startsWith('UPDATE organization_members SET role =')) {
      const [organization_id, user_id, nextRole, fromRole] = p;
      // 가짜 DB 가 **SQL 을 그대로 해석**한다. user_id 조건을 코드에서 몰래 걸면, 질의에서
      // 그 조건이 빠져도 테스트가 통과해 "남의 초대 수락"을 못 잡는다(실제로 변이 검사에서 드러났다).
      const matchesUser = /user_id = \$2/.test(s);
      const hit = members.find(
        (m) =>
          m.organization_id === organization_id &&
          (!matchesUser || m.user_id === user_id) &&
          m.left_at == null &&
          m.role === fromRole,
      );
      if (!hit) return [[], 0];
      hit.role = nextRole;
      return [[{ organization_id }], 1];
    }
    if (s.startsWith('UPDATE organization_members SET left_at')) {
      const [organization_id, user_id, roles] = p;
      for (const m of members) {
        if (m.organization_id === organization_id && m.user_id === user_id && m.left_at == null && roles.includes(m.role)) {
          m.left_at = new Date();
        }
      }
      return [];
    }
    throw new Error(`unexpected SQL: ${s}`);
  });

  return { ds: { query } as any, members, sql };
}

const asOwnerOf = (organizationId: string) =>
  ownerMock.mockResolvedValue({ isOwner: true, organizationId, memberRole: 'owner', resolution: 'resolved' });
const asNotOwner = () =>
  ownerMock.mockResolvedValue({ isOwner: false, organizationId: null, memberRole: '', resolution: 'none' });

beforeEach(() => {
  ownerMock.mockReset();
  linkedMock.mockReset();
  hasAnyRoleMock.mockReset();
  assignRoleMock.mockReset();
  removeRoleMock.mockReset();
  linkedMock.mockResolvedValue(true);
  // 기본은 "role 을 가진 사용자" — role 자체의 계약은 아래 M7 이 따로 본다.
  hasAnyRoleMock.mockResolvedValue(true);
  assignRoleMock.mockResolvedValue({});
  removeRoleMock.mockResolvedValue(true);
});

const expectCode = async (p: Promise<unknown>, code: string) => {
  await expect(p).rejects.toMatchObject({ code } as Partial<StoreMemberError>);
};

describe('M1·M2 접근 결정', () => {
  it('Owner 는 기존 판정을 그대로 통과한다 — 이 모듈이 owner 를 만들지 않는다', async () => {
    asOwnerOf(ORG_A);
    const { ds, sql } = makeDs();
    const access = await resolveStoreAccessLevel(ds, OWNER, 'kpa');
    expect(access).toMatchObject({ level: 'owner', organizationId: ORG_A });
    // owner 가 확정되면 member 조회로 내려가지 않는다.
    expect(sql.filter((q) => q.includes('FROM organization_members'))).toHaveLength(0);
  });

  it("'staff' 는 member · 'invited' 는 none — 수락 전에는 매장이 보이지 않는다", async () => {
    asNotOwner();
    const staff = makeDs({ members: [{ organization_id: ORG_A, user_id: STAFF, role: STORE_STAFF_ROLE, left_at: null }] });
    await expect(resolveStoreAccessLevel(staff.ds, STAFF, 'kpa')).resolves.toMatchObject({
      level: 'member',
      organizationId: ORG_A,
    });

    const invited = makeDs({ members: [{ organization_id: ORG_A, user_id: STAFF, role: STORE_INVITED_ROLE, left_at: null }] });
    await expect(resolveStoreAccessLevel(invited.ds, STAFF, 'kpa')).resolves.toMatchObject({ level: 'none' });
  });

  it('소속이 없으면 none — membership 없이 매장에 들어오지 못한다', async () => {
    asNotOwner();
    const { ds } = makeDs();
    await expect(resolveStoreAccessLevel(ds, OUTSIDER, 'kpa')).resolves.toEqual({
      level: 'none',
      organizationId: null,
      memberRole: null,
    });
  });

  it('나간 구성원(left_at)은 none 이다', async () => {
    asNotOwner();
    const { ds } = makeDs({
      members: [{ organization_id: ORG_A, user_id: STAFF, role: STORE_STAFF_ROLE, left_at: new Date() }],
    });
    await expect(resolveStoreAccessLevel(ds, STAFF, 'kpa')).resolves.toMatchObject({ level: 'none' });
  });
});

describe('M2·M3 격리', () => {
  it('다른 매장 id 를 선택 힌트로 줘도 자기 매장 밖으로 나가지 않는다', async () => {
    asNotOwner();
    const { ds } = makeDs({ members: [{ organization_id: ORG_A, user_id: STAFF, role: STORE_STAFF_ROLE, left_at: null }] });
    // ORG_B 를 요청해도 후보에 없으므로 ORG_B 로 해석되지 않는다.
    const access = await resolveStoreAccessLevel(ds, STAFF, 'kpa', ORG_B);
    expect(access.organizationId).not.toBe(ORG_B);
    expect(access).toMatchObject({ level: 'member', organizationId: ORG_A });
  });

  it('업종 경계 — 조직이 그 서비스에 연결돼 있지 않으면 접근이 아니다', async () => {
    asNotOwner();
    linkedMock.mockResolvedValue(false);
    const { ds } = makeDs({ members: [{ organization_id: ORG_A, user_id: STAFF, role: STORE_STAFF_ROLE, left_at: null }] });
    await expect(resolveStoreAccessLevel(ds, STAFF, 'cosmetics')).resolves.toMatchObject({ level: 'none' });
    expect(linkedMock).toHaveBeenCalledWith(expect.anything(), ORG_A, 'cosmetics');
  });
});

describe('M4 쓰기는 Owner 전용 · 조직은 요청이 고르지 않는다', () => {
  it('Member 는 초대할 수 없다', async () => {
    asNotOwner();
    const { ds } = makeDs({
      members: [{ organization_id: ORG_A, user_id: STAFF, role: STORE_STAFF_ROLE, left_at: null }],
      users: [{ id: OUTSIDER, email: 'new@example.com' }],
    });
    await expectCode(
      inviteStoreMember(ds, { ownerUserId: STAFF, email: 'new@example.com', serviceKey: 'kpa' }),
      'STORE_OWNER_REQUIRED',
    );
    expect(ds.query).not.toHaveBeenCalledWith(expect.stringContaining('INSERT INTO organization_members'), expect.anything());
  });

  it('Owner 가 초대하면 다른 매장이 아니라 **자기 매장**에 생긴다', async () => {
    asOwnerOf(ORG_A);
    const { ds, members } = makeDs({ users: [{ id: OUTSIDER, email: 'New@Example.com' }] });

    // 요청이 ORG_B 를 가리켜도 해석된 조직(ORG_A)에만 쓴다.
    const r = await inviteStoreMember(ds, {
      ownerUserId: OWNER,
      email: 'new@example.com',
      serviceKey: 'kpa',
      preferredOrganizationId: ORG_B,
    });

    expect(r).toMatchObject({ organizationId: ORG_A, userId: OUTSIDER, role: STORE_INVITED_ROLE });
    expect(members).toEqual([
      expect.objectContaining({ organization_id: ORG_A, user_id: OUTSIDER, role: STORE_INVITED_ROLE }),
    ]);
  });

  it('가입하지 않은 주소는 거절한다 — 초대가 계정을 만들지 않는다', async () => {
    asOwnerOf(ORG_A);
    const { ds, members } = makeDs({ users: [] });
    await expectCode(inviteStoreMember(ds, { ownerUserId: OWNER, email: 'nobody@example.com' }), 'USER_NOT_FOUND');
    expect(members).toEqual([]);
  });

  it('이미 활성 구성원이면 거절하고, 초대 대기 재초대는 멱등이다', async () => {
    asOwnerOf(ORG_A);
    const seeded = makeDs({
      members: [{ organization_id: ORG_A, user_id: OUTSIDER, role: 'manager', left_at: null }],
      users: [{ id: OUTSIDER, email: 'new@example.com' }],
    });
    await expectCode(inviteStoreMember(seeded.ds, { ownerUserId: OWNER, email: 'new@example.com' }), 'ALREADY_MEMBER');
    expect(seeded.members[0].role).toBe('manager'); // 기존 역할을 덮어쓰지 않는다

    const pending = makeDs({
      members: [{ organization_id: ORG_A, user_id: OUTSIDER, role: STORE_INVITED_ROLE, left_at: null }],
      users: [{ id: OUTSIDER, email: 'new@example.com' }],
    });
    await expect(
      pending.ds.query ? inviteStoreMember(pending.ds, { ownerUserId: OWNER, email: 'new@example.com' }) : null,
    ).resolves.toMatchObject({ role: STORE_INVITED_ROLE });
  });

  it('자기 자신은 초대하지 않는다', async () => {
    asOwnerOf(ORG_A);
    const { ds } = makeDs({ users: [{ id: OWNER, email: 'owner@example.com' }] });
    await expectCode(inviteStoreMember(ds, { ownerUserId: OWNER, email: 'owner@example.com' }), 'SELF_INVITE_FORBIDDEN');
  });
});

describe('M5 수락은 받은 본인만', () => {
  it('초대가 있으면 staff 로 바뀐다', async () => {
    const { ds, members } = makeDs({
      members: [{ organization_id: ORG_A, user_id: STAFF, role: STORE_INVITED_ROLE, left_at: null }],
    });
    await expect(acceptStoreInvitation(ds, { userId: STAFF, organizationId: ORG_A })).resolves.toMatchObject({
      role: STORE_STAFF_ROLE,
    });
    expect(members[0].role).toBe(STORE_STAFF_ROLE);
  });

  it('남의 초대는 수락되지 않는다 — 그리고 membership 을 새로 만들지 않는다', async () => {
    const { ds, members } = makeDs({
      members: [{ organization_id: ORG_A, user_id: STAFF, role: STORE_INVITED_ROLE, left_at: null }],
    });
    await expectCode(acceptStoreInvitation(ds, { userId: OUTSIDER, organizationId: ORG_A }), 'INVITATION_NOT_FOUND');
    expect(members).toHaveLength(1);
    expect(members[0].user_id).toBe(STAFF);
  });

  it('초대가 없으면 아무 것도 만들지 않는다 — 수락이 가입 경로가 되지 않는다', async () => {
    const { ds, members } = makeDs();
    await expectCode(acceptStoreInvitation(ds, { userId: OUTSIDER, organizationId: ORG_A }), 'INVITATION_NOT_FOUND');
    expect(members).toEqual([]);
  });

  it('내가 받은 초대만 목록에 나온다', async () => {
    const { ds } = makeDs({
      members: [
        { organization_id: ORG_A, user_id: STAFF, role: STORE_INVITED_ROLE, left_at: null },
        { organization_id: ORG_B, user_id: OUTSIDER, role: STORE_INVITED_ROLE, left_at: null },
      ],
    });
    await expect(listMyInvitations(ds, STAFF)).resolves.toEqual([
      { organizationId: ORG_A, organizationName: '테스트 매장' },
    ]);
  });
});

describe('M6 해제는 이 모듈이 만든 역할만 건드린다', () => {
  it('staff 해제는 행을 지우지 않고 left_at 을 세운다', async () => {
    asOwnerOf(ORG_A);
    const { ds, members } = makeDs({
      members: [{ organization_id: ORG_A, user_id: STAFF, role: STORE_STAFF_ROLE, left_at: null }],
    });
    await removeStoreMember(ds, { ownerUserId: OWNER, targetUserId: STAFF });
    expect(members).toHaveLength(1);
    expect(members[0].left_at).toBeInstanceOf(Date);
  });

  it('owner · manager 행은 이 경로로 해제되지 않는다', async () => {
    asOwnerOf(ORG_A);
    for (const role of ['owner', 'admin', 'manager']) {
      const { ds, members } = makeDs({
        members: [{ organization_id: ORG_A, user_id: OUTSIDER, role, left_at: null }],
      });
      await expectCode(removeStoreMember(ds, { ownerUserId: OWNER, targetUserId: OUTSIDER }), 'CANNOT_MODIFY_OWNER');
      expect(members[0].left_at).toBeNull(); // 해제되지 않았다(seed 그대로)
    }
  });

  it('Member 는 해제할 수 없다', async () => {
    asNotOwner();
    const { ds } = makeDs({ members: [{ organization_id: ORG_A, user_id: STAFF, role: STORE_STAFF_ROLE, left_at: null }] });
    await expectCode(removeStoreMember(ds, { ownerUserId: STAFF, targetUserId: OUTSIDER }), 'STORE_OWNER_REQUIRED');
  });
});

describe('목록', () => {
  it('Owner 는 초대 대기까지 본다 — status 로 구분된다', async () => {
    asOwnerOf(ORG_A);
    const { ds } = makeDs({
      members: [
        { organization_id: ORG_A, user_id: OWNER, role: 'owner', left_at: null },
        { organization_id: ORG_A, user_id: STAFF, role: STORE_STAFF_ROLE, left_at: null },
        { organization_id: ORG_A, user_id: OUTSIDER, role: STORE_INVITED_ROLE, left_at: null },
      ],
      users: [
        { id: OWNER, email: 'owner@example.com', name: '대표' },
        { id: STAFF, email: 'staff@example.com', name: '직원' },
        { id: OUTSIDER, email: 'new@example.com', name: null },
      ],
    });
    const { organizationId, members } = await listStoreMembers(ds, OWNER, 'kpa');
    expect(organizationId).toBe(ORG_A);
    expect(members.map((m) => [m.role, m.status])).toEqual([
      ['owner', 'active'],
      [STORE_STAFF_ROLE, 'active'],
      [STORE_INVITED_ROLE, 'invited'],
    ]);
  });

  it('Member 는 구성원 목록을 보지 못한다', async () => {
    asNotOwner();
    const { ds } = makeDs({ members: [{ organization_id: ORG_A, user_id: STAFF, role: STORE_STAFF_ROLE, left_at: null }] });
    await expectCode(listStoreMembers(ds, STAFF, 'kpa'), 'STORE_OWNER_REQUIRED');
  });
});

/**
 * M7 인가는 role 이 한다 — `O4O-IDENTITY-ARCHITECTURE-V3` §7
 *   Relationship 행(organization_members)은 **조건**일 뿐이고, 권한은 role_assignments 가 준다.
 *   PR #277 1차 구현이 관계 행만으로 접근을 줬고(리뷰 P1) 그것을 바로잡은 계약이다.
 */
describe('M7 Role ∧ Relationship', () => {
  it('관계 행이 있어도 role 이 없으면 접근이 아니다', async () => {
    asNotOwner();
    hasAnyRoleMock.mockResolvedValue(false);
    const { ds } = makeDs({ members: [{ organization_id: ORG_A, user_id: STAFF, role: STORE_STAFF_ROLE, left_at: null }] });
    await expect(resolveStoreAccessLevel(ds, STAFF, 'kpa')).resolves.toMatchObject({ level: 'none' });
    expect(hasAnyRoleMock).toHaveBeenCalledWith(STAFF, ['kpa:store_member']);
  });

  it('role 이 있어도 관계 행이 없으면 접근이 아니다', async () => {
    asNotOwner();
    hasAnyRoleMock.mockResolvedValue(true);
    const { ds } = makeDs({ members: [] });
    await expect(resolveStoreAccessLevel(ds, STAFF, 'kpa')).resolves.toMatchObject({ level: 'none' });
  });

  it('수락이 role 을 발급한다 — 조직이 등록된 서비스만', async () => {
    const { ds } = makeDs({
      members: [{ organization_id: ORG_A, user_id: STAFF, role: STORE_INVITED_ROLE, left_at: null }],
    });
    linkedMock.mockImplementation(async (_ds: unknown, _org: string, key: string) => key === 'kpa');

    const r = await acceptStoreInvitation(ds, { userId: STAFF, organizationId: ORG_A });

    expect(r.services).toEqual(['kpa']);
    expect(assignRoleMock).toHaveBeenCalledTimes(1);
    expect(assignRoleMock).toHaveBeenCalledWith(expect.objectContaining({ userId: STAFF, role: 'kpa:store_member' }));
  });

  it('현재 매장에 PH 과거 linkage가 함께 남아도 PH role을 새로 발급하지 않는다', async () => {
    const { ds } = makeDs({ members: [{ organization_id: ORG_A, user_id: STAFF, role: STORE_INVITED_ROLE, left_at: null }] });
    linkedMock.mockImplementation(async (_ds: unknown, _org: string, key: string) => key === 'kpa' || key === 'pharmacy-hub');
    const result = await acceptStoreInvitation(ds, { userId: STAFF, organizationId: ORG_A });
    expect(result.services).toEqual(['kpa']);
    expect(assignRoleMock).toHaveBeenCalledTimes(1);
    expect(assignRoleMock).toHaveBeenCalledWith(expect.objectContaining({ role: 'kpa:store_member' }));
  });

  it('PH 전용 초대는 관계·role을 새로 활성화하지 않는다', async () => {
    const { ds, sql } = makeDs({ members: [{ organization_id: ORG_A, user_id: STAFF, role: STORE_INVITED_ROLE, left_at: null }] });
    linkedMock.mockImplementation(async (_ds: unknown, _org: string, key: string) => key === 'pharmacy-hub');
    await expectCode(acceptStoreInvitation(ds, { userId: STAFF, organizationId: ORG_A }), 'STORE_NOT_RESOLVED');
    expect(sql.some((query: string) => query.startsWith('UPDATE'))).toBe(false);
    expect(assignRoleMock).not.toHaveBeenCalled();
  });

  it('기존 PH staff 관계도 PH 매장 권한을 열지 않는다', async () => {
    const { ds } = makeDs({ members: [{ organization_id: ORG_A, user_id: STAFF, role: STORE_STAFF_ROLE, left_at: null }] });
    expect(await resolveStoreAccessLevel(ds, STAFF, 'pharmacy-hub')).toEqual({ level: 'none', organizationId: null, memberRole: null });
  });

  it('PH member role만 남으면 서비스 중립 매장 접근도 허용하지 않는다', async () => {
    asNotOwner();
    const { ds } = makeDs({ members: [{ organization_id: ORG_A, user_id: STAFF, role: STORE_STAFF_ROLE, left_at: null }] });
    hasAnyRoleMock.mockImplementation(async (_user: string, roles: string[]) => roles.includes('pharmacy-hub:store_member'));
    expect((await resolveStoreAccessLevel(ds, STAFF)).level).toBe('none');
  });

  it('초대가 없으면 role 도 발급되지 않는다', async () => {
    const { ds } = makeDs();
    await expectCode(acceptStoreInvitation(ds, { userId: OUTSIDER, organizationId: ORG_A }), 'INVITATION_NOT_FOUND');
    expect(assignRoleMock).not.toHaveBeenCalled();
  });

  it('해제는 남은 매장이 없을 때만 role 을 회수한다', async () => {
    asOwnerOf(ORG_A);
    linkedMock.mockImplementation(async (_ds: unknown, _org: string, key: string) => key === 'kpa');

    // 이 매장 하나뿐 → 회수한다.
    const only = makeDs({ members: [{ organization_id: ORG_A, user_id: STAFF, role: STORE_STAFF_ROLE, left_at: null }] });
    await removeStoreMember(only.ds, { ownerUserId: OWNER, targetUserId: STAFF });
    expect(removeRoleMock).toHaveBeenCalledWith(STAFF, 'kpa:store_member');

    // 다른 매장에 아직 남아 있으면 → 회수하지 않는다(그쪽 접근까지 끊지 않는다).
    removeRoleMock.mockClear();
    const two = makeDs({
      members: [
        { organization_id: ORG_A, user_id: STAFF, role: STORE_STAFF_ROLE, left_at: null },
        { organization_id: ORG_B, user_id: STAFF, role: STORE_STAFF_ROLE, left_at: null },
      ],
    });
    await removeStoreMember(two.ds, { ownerUserId: OWNER, targetUserId: STAFF });
    expect(removeRoleMock).not.toHaveBeenCalled();
  });
});
