/**
 * 커뮤니티 개설·가입 lifecycle — WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §10
 *
 * 고정하는 것
 *   slug 2회 검사 — 신청 시 · 승인 직전. 충돌 시 **임의 주소로 개설하지 않는다**
 *   V4   첫 운영자에게 서비스 전체 역할(`community:admin`/`:operator`)을 주지 않는다
 *   V8   그런데도 자기 커뮤니티를 운영할 수 있다 — 개체 운영자 + **서비스 가입**이 함께 생긴다
 *   가입은 승인형 하나 — 자동 승인하지 않는다
 */
// 저장소 대역은 공통 support 를 쓴다 — 같은 plumbing 을 두 spec 이 각자 갖고 있었다.
import { inMemoryRepository, type Row } from '../../../__tests__/support/in-memory-repository.js';

const db: {
  communities: Row[];
  requests: Row[];
  memberships: Row[];
  serviceMemberships: Row[];
  roleWrites: string[];
} = { communities: [], requests: [], memberships: [], serviceMemberships: [], roleWrites: [] };

let seq = 0;
const uid = () => `id-${++seq}`;

function repoFor(name: string) {
  const list =
    name === 'Community' ? db.communities : name === 'CommunityCreationRequest' ? db.requests : db.memberships;
  return inMemoryRepository(list, uid);
}

const manager = {
  getRepository: (e: { name?: string }) => repoFor(e?.name ?? ''),
  query: async (sql: string, params: any[]) => {
    if (/^\s*SELECT status FROM service_memberships/i.test(sql)) {
      const [userId, serviceKey] = params;
      return db.serviceMemberships
        .filter((r) => r.user_id === userId && r.service_key === serviceKey)
        .map((r) => ({ status: r.status }));
    }
    // service_memberships upsert 만 흉내낸다.
    if (/INSERT INTO service_memberships/i.test(sql)) {
      const [userId, serviceKey] = params;
      const found = db.serviceMemberships.find((r) => r.user_id === userId && r.service_key === serviceKey);
      if (found) found.status = 'active';
      else db.serviceMemberships.push({ user_id: userId, service_key: serviceKey, status: 'active' });
    }
    if (/role_assignments/i.test(sql)) db.roleWrites.push(sql);
    return [];
  },
};

const dataSource = {
  transaction: async <T>(fn: (m: typeof manager) => Promise<T>) => fn(manager),
} as any;

import {
  CommunityLifecycleService,
  CommunityLifecycleError,
  COMMUNITY_SERVICE_KEY,
  maskEmail,
  normalizeSlug,
} from '../community-lifecycle.service.js';

const service = new CommunityLifecycleService(dataSource);
const REQUESTER = 'u-requester';
const REVIEWER = 'u-community-admin';
const JOINER = 'u-joiner';

beforeEach(() => {
  db.communities = [];
  db.requests = [];
  db.memberships = [];
  db.serviceMemberships = [];
  db.roleWrites = [];
  seq = 0;
});

const membershipOf = (userId: string) => db.memberships.find((m) => m.userId === userId);
const serviceMembershipOf = (userId: string) =>
  db.serviceMemberships.find((r) => r.user_id === userId && r.service_key === COMMUNITY_SERVICE_KEY);

describe('slug 규칙', () => {
  it.each(['a', 'a_b', '-abc', 'abc-', 'a b', ''])('형태가 잘못된 slug 는 거절한다: %s', (bad) => {
    expect(() => normalizeSlug(bad)).toThrow(CommunityLifecycleError);
  });

  // 대문자는 **거절이 아니라 정규화**다 — DB 는 소문자만 저장한다(CHECK).
  it.each([
    [' pharm-news ', 'pharm-news'],
    ['Alpha', 'alpha'],
    ['ABC', 'abc'],
  ])('%s 를 %s 로 정규화한다', (raw, expected) => {
    expect(normalizeSlug(raw)).toBe(expected);
  });
});

describe('개설 신청 — 검사 1회차', () => {
  it('신청을 pending 으로 만든다', async () => {
    const r = await service.requestCreation({ requesterUserId: REQUESTER, desiredSlug: 'alpha', name: 'Alpha' });
    expect(r.status).toBe('pending');
    expect(r.desiredSlug).toBe('alpha');
  });

  it('이미 개설된 slug 는 409 로 즉시 알린다', async () => {
    db.communities.push({ id: 'c1', slug: 'alpha', status: 'active' });
    await expect(
      service.requestCreation({ requesterUserId: REQUESTER, desiredSlug: 'alpha', name: 'A' }),
    ).rejects.toMatchObject({ code: 'SLUG_TAKEN', statusCode: 409 });
  });

  it('pending 신청이 잡고 있는 slug 도 거절한다', async () => {
    await service.requestCreation({ requesterUserId: REQUESTER, desiredSlug: 'alpha', name: 'A' });
    await expect(
      service.requestCreation({ requesterUserId: 'other', desiredSlug: 'alpha', name: 'A2' }),
    ).rejects.toMatchObject({ code: 'SLUG_TAKEN' });
  });
});

describe('개설 승인 — 검사 2회차', () => {
  it('승인하면 커뮤니티가 생기고 신청자가 첫 운영자가 된다', async () => {
    const r = await service.requestCreation({ requesterUserId: REQUESTER, desiredSlug: 'alpha', name: 'Alpha' });
    const out = await service.approveCreation({ requestId: r.id, reviewerUserId: REVIEWER });

    expect(out.outcome).toBe('created');
    const m = membershipOf(REQUESTER)!;
    expect({ role: m.role, status: m.status }).toEqual({ role: 'operator', status: 'active' });
    expect(r.status).toBe('approved');
  });

  it('V8 첫 운영자에게 **서비스 가입**도 함께 만든다 (자기 커뮤니티 진입이 막히지 않는다)', async () => {
    const r = await service.requestCreation({ requesterUserId: REQUESTER, desiredSlug: 'alpha', name: 'Alpha' });
    await service.approveCreation({ requestId: r.id, reviewerUserId: REVIEWER });

    expect(serviceMembershipOf(REQUESTER)).toMatchObject({ service_key: 'community', status: 'active' });
  });

  it('V4 / V8-b 서비스 전체 역할은 부여하지 않는다', async () => {
    const r = await service.requestCreation({ requesterUserId: REQUESTER, desiredSlug: 'alpha', name: 'Alpha' });
    await service.approveCreation({ requestId: r.id, reviewerUserId: REVIEWER });

    // role_assignments 에 아무 write 도 나가지 않는다 — 개체 역할만으로 운영한다.
    expect(db.roleWrites).toEqual([]);
  });

  it('승인 직전 선점되면 개설하지 않고 slug_conflict 로 돌린다 (임의 주소 개설 금지)', async () => {
    const r = await service.requestCreation({ requesterUserId: REQUESTER, desiredSlug: 'alpha', name: 'Alpha' });
    // 그 사이 누군가 같은 주소를 차지했다.
    db.communities.push({ id: 'c-existing', slug: 'alpha', status: 'active' });

    const out = await service.approveCreation({ requestId: r.id, reviewerUserId: REVIEWER });

    expect(out).toEqual({ outcome: 'slug_conflict', slug: 'alpha' });
    expect(r.status).toBe('slug_conflict');
    expect(r.reason).toMatch(/새 주소로 다시 신청/);
    // 새 커뮤니티를 만들지 않았다(기존 1개 그대로).
    expect(db.communities).toHaveLength(1);
    expect(membershipOf(REQUESTER)).toBeUndefined();
  });

  it('이미 처리된 신청은 409', async () => {
    const r = await service.requestCreation({ requesterUserId: REQUESTER, desiredSlug: 'alpha', name: 'Alpha' });
    await service.approveCreation({ requestId: r.id, reviewerUserId: REVIEWER });
    await expect(
      service.approveCreation({ requestId: r.id, reviewerUserId: REVIEWER }),
    ).rejects.toMatchObject({ code: 'REQUEST_NOT_PENDING' });
  });
});

describe('가입 — 승인형 하나', () => {
  it('가입 신청은 pending 이며 자동 승인하지 않는다', async () => {
    const m = await service.requestJoin({ communityId: 'c1', userId: JOINER });
    expect(m.status).toBe('pending');
    expect(m.role).toBe('member');
    // 승인 전에는 서비스 가입도 만들지 않는다.
    expect(serviceMembershipOf(JOINER)).toBeUndefined();
  });

  it('중복 신청은 409', async () => {
    await service.requestJoin({ communityId: 'c1', userId: JOINER });
    await expect(service.requestJoin({ communityId: 'c1', userId: JOINER })).rejects.toMatchObject({
      code: 'ALREADY_MEMBER',
    });
  });

  it('승인하면 active + 서비스 가입이 생긴다', async () => {
    const m = await service.requestJoin({ communityId: 'c1', userId: JOINER });
    const approved = await service.approveJoin({
      communityId: 'c1',
      membershipId: m.id,
      reviewerUserId: REVIEWER,
    });
    expect(approved.status).toBe('active');
    expect(approved.role).toBe('member');
    expect(serviceMembershipOf(JOINER)).toMatchObject({ status: 'active' });
  });

  it('다른 커뮤니티의 membershipId 로 승인하려 하면 404 (개체 간 월권 차단)', async () => {
    const m = await service.requestJoin({ communityId: 'c1', userId: JOINER });
    await expect(
      service.approveJoin({ communityId: 'c-other', membershipId: m.id, reviewerUserId: REVIEWER }),
    ).rejects.toMatchObject({ code: 'MEMBERSHIP_NOT_FOUND' });
  });
});

describe('정지(suspended) 회원을 승인 경로가 되살리지 않는다', () => {
  const suspend = (userId: string) =>
    db.serviceMemberships.push({ user_id: userId, service_key: COMMUNITY_SERVICE_KEY, status: 'suspended' });

  it('가입 승인 — 신청자의 커뮤니티 서비스 이용이 정지면 409, 가입은 pending 으로 남는다', async () => {
    const m = await service.requestJoin({ communityId: 'c1', userId: JOINER });
    suspend(JOINER);
    await expect(
      service.approveJoin({ communityId: 'c1', membershipId: m.id, reviewerUserId: REVIEWER }),
    ).rejects.toMatchObject({ code: 'SERVICE_MEMBERSHIP_SUSPENDED', statusCode: 409 });
    expect(serviceMembershipOf(JOINER)!.status).toBe('suspended');
    expect(membershipOf(JOINER)!.status).toBe('pending');
  });

  it('정지 회원의 가입 신청은 거절할 수 있다 (심사가 막히지 않는다)', async () => {
    const m = await service.requestJoin({ communityId: 'c1', userId: JOINER });
    suspend(JOINER);
    const out = await service.rejectJoin({ communityId: 'c1', membershipId: m.id, reviewerUserId: REVIEWER });
    expect(out.status).toBe('rejected');
    expect(serviceMembershipOf(JOINER)!.status).toBe('suspended');
  });

  it('탈퇴(withdrawn) 뒤 재가입은 승인으로 다시 active 가 된다 — 막는 것은 정지뿐', async () => {
    db.serviceMemberships.push({ user_id: JOINER, service_key: COMMUNITY_SERVICE_KEY, status: 'withdrawn' });
    const m = await service.requestJoin({ communityId: 'c1', userId: JOINER });
    await service.approveJoin({ communityId: 'c1', membershipId: m.id, reviewerUserId: REVIEWER });
    expect(serviceMembershipOf(JOINER)!.status).toBe('active');
  });

  it('개설 승인 — 신청자가 정지면 커뮤니티·첫 운영자를 만들지 않는다', async () => {
    const r = await service.requestCreation({ requesterUserId: REQUESTER, desiredSlug: 'alpha', name: 'Alpha' });
    suspend(REQUESTER);
    await expect(service.approveCreation({ requestId: r.id, reviewerUserId: REVIEWER })).rejects.toMatchObject({
      code: 'SERVICE_MEMBERSHIP_SUSPENDED',
    });
    expect(db.communities).toEqual([]);
    expect(membershipOf(REQUESTER)).toBeUndefined();
    expect(r.status).toBe('pending');
  });
});

describe('가입 심사 화면 조회 — 개체 한정 · 이메일 가림', () => {
  it('이메일은 앞 2자만 남긴다', () => {
    expect(maskEmail('abcdef@example.com')).toBe('ab***@example.com');
    expect(maskEmail('a@x.kr')).toBe('a***@x.kr');
    expect(maskEmail(null)).toBeNull();
    expect(maskEmail('no-at-sign')).toBeNull();
  });

  it('listMembershipsForReview 는 그 커뮤니티를 $1 로 묶고 상태도 binding 한다 (문자열 보간 없음)', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const svc = new CommunityLifecycleService({
      query: async (sql: string, params: unknown[]) => {
        calls.push({ sql, params });
        return [
          {
            id: 'm1',
            user_id: 'u1',
            role: 'member',
            status: 'pending',
            created_at: new Date(0),
            user_name: '홍길동',
            user_email: 'hong@example.com',
            service_status: null,
          },
        ];
      },
    } as any);
    const rows = await svc.listMembershipsForReview({ communityId: 'c1', status: 'pending' });
    expect(calls[0].params).toEqual(['c1', COMMUNITY_SERVICE_KEY, 'pending']);
    expect(calls[0].sql).toMatch(/WHERE cm\.community_id = \$1 AND cm\.status = \$3/);
    expect(calls[0].sql).not.toMatch(/'pending'/);
    expect(rows).toEqual([
      expect.objectContaining({ name: '홍길동', emailMasked: 'ho***@example.com', serviceMembershipStatus: null }),
    ]);
    expect(JSON.stringify(rows)).not.toMatch(/hong@example\.com/);
  });

  it('listOperatedCommunities 는 세션 사용자의 active operator 행 + active 서비스 가입만 본다', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const svc = new CommunityLifecycleService({
      query: async (sql: string, params: unknown[]) => {
        calls.push({ sql, params });
        return [{ id: 'c1', slug: 'alpha', name: 'Alpha', pending_count: 2 }];
      },
    } as any);
    const out = await svc.listOperatedCommunities('u-op');
    expect(out).toEqual([{ id: 'c1', slug: 'alpha', name: 'Alpha', pendingCount: 2 }]);
    const sql = calls[0].sql.replace(/\s+/g, ' ');
    expect(calls[0].params).toEqual(['u-op', COMMUNITY_SERVICE_KEY]);
    expect(sql).toMatch(/cm\.user_id = \$1 AND cm\.status = 'active' AND cm\.role = 'operator' AND c\.status = 'active'/);
    expect(sql).toMatch(/sm\.service_key = \$2 AND sm\.status = 'active'/);
  });
});

describe('거절 — 승인과 같은 주체가, 자격은 만들지 않고', () => {
  it('개설 거절은 사유를 남기고 커뮤니티를 만들지 않는다', async () => {
    const r = await service.requestCreation({ requesterUserId: REQUESTER, desiredSlug: 'alpha', name: 'Alpha' });
    const out = await service.rejectCreation({
      requestId: r.id,
      reviewerUserId: REVIEWER,
      reason: '취지가 기존 커뮤니티와 겹칩니다.',
    });
    expect(out.status).toBe('rejected');
    expect(out.reason).toBe('취지가 기존 커뮤니티와 겹칩니다.');
    expect(db.communities).toHaveLength(0);
    expect(membershipOf(REQUESTER)).toBeUndefined();
  });

  it('거절된 신청을 다시 거절·승인할 수 없다', async () => {
    const r = await service.requestCreation({ requesterUserId: REQUESTER, desiredSlug: 'alpha', name: 'Alpha' });
    await service.rejectCreation({ requestId: r.id, reviewerUserId: REVIEWER, reason: 'no' });
    await expect(
      service.approveCreation({ requestId: r.id, reviewerUserId: REVIEWER }),
    ).rejects.toMatchObject({ code: 'REQUEST_NOT_PENDING' });
  });

  it('가입 거절은 **서비스 가입을 만들지 않는다** (거절이 자격을 주면 안 된다)', async () => {
    const m = await service.requestJoin({ communityId: 'c1', userId: JOINER });
    const out = await service.rejectJoin({ communityId: 'c1', membershipId: m.id, reviewerUserId: REVIEWER });
    expect(out.status).toBe('rejected');
    expect(serviceMembershipOf(JOINER)).toBeUndefined();
  });

  it('다른 커뮤니티의 membershipId 로 거절하려 하면 404', async () => {
    const m = await service.requestJoin({ communityId: 'c1', userId: JOINER });
    await expect(
      service.rejectJoin({ communityId: 'c-other', membershipId: m.id, reviewerUserId: REVIEWER }),
    ).rejects.toMatchObject({ code: 'MEMBERSHIP_NOT_FOUND' });
  });

  it('거절 뒤에는 다시 가입 신청할 수 있다 (영구 차단이 아니다)', async () => {
    const m = await service.requestJoin({ communityId: 'c1', userId: JOINER });
    await service.rejectJoin({ communityId: 'c1', membershipId: m.id, reviewerUserId: REVIEWER });
    const again = await service.requestJoin({ communityId: 'c1', userId: JOINER });
    expect(again.status).toBe('pending');
  });
});
