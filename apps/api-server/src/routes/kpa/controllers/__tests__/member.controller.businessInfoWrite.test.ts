/**
 * WO-O4O-KPA-PROFILE-WRITE-JSONB-CONCAT-CONVERGENCE-V1
 *
 * KPA 운영자 회원정보 수정(`PATCH /kpa/members/:id/info`)의
 * `users."businessInfo"` write 를 고정한다.
 *
 * 회귀 대상:
 *   W-1  read → 병합 → **전체 재저장** (`SET "businessInfo" = $1::jsonb` 에 스냅샷 전체).
 *        SELECT 와 UPDATE 사이에 다른 경로가 저장한 키가 스냅샷 값으로 덮였다.
 *   W-3  `metadata` 를 통째로 다시 만들어 넣어, 이 경로가 모르는 형제 키
 *        (본인 마이페이지가 쓰는 `metadata.workplace`)가 사라질 수 있었다.
 *
 * 판정 계약:
 *   - write 는 컬럼 현재값을 참조하는 **부분 갱신 표현식**이다.
 *   - 파라미터에는 이번 요청이 명시한 키만 담긴다.
 *   - `metadata` 는 중첩 부분 갱신 (`jsonb_set` + 하위 concat) 으로 나간다.
 *   - 기존 원자성 계약(단일 transaction)과 주소 합성 결과는 그대로다.
 */

const mockApprovalService = {
  approveMembership: jest.fn(),
  suspendMembership: jest.fn().mockResolvedValue(null),
  withdrawMembership: jest.fn().mockResolvedValue(null),
  reactivateMembership: jest.fn().mockResolvedValue(null),
};

jest.mock('../../../../services/approval/MembershipApprovalService.js', () => ({
  MembershipApprovalService: jest.fn().mockImplementation(() => mockApprovalService),
}));

jest.mock('../../../../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: { assignRole: jest.fn(), removeRole: jest.fn(), getRoleNames: jest.fn() },
}));

jest.mock('../../../../services/email.service.js', () => ({
  emailService: { isServiceAvailable: () => false },
}));

jest.mock('../../../../services/NotificationService.js', () => ({
  notificationService: { createNotification: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('../../../../modules/organization/services/organization-ops.service.js', () => ({
  organizationOpsService: {
    ensureOrganization: jest.fn().mockResolvedValue({ id: 'org-1' }),
    addMember: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@o4o/platform-core/store-identity', () => ({
  StoreSlugService: jest.fn().mockImplementation(() => ({
    findByStoreId: jest.fn().mockResolvedValue({ slug: 'x' }),
    generateUniqueSlug: jest.fn(),
    reserveSlug: jest.fn(),
  })),
}), { virtual: true });

import { createMemberController } from '../member.controller.js';

const MEMBER_ID = '11111111-2222-4333-8444-555555555555';
const USER_ID = '22222222-3333-4444-8555-666666666666';
const OPERATOR_ID = '99999999-8888-4777-8666-555555555555';

/** 다른 경로가 저장해 둔, 이 경로가 모르는 키들 */
const SENTINEL = {
  businessNumber: '123-45-67890',
  sentinelRoot: 'KEEP-ME',
  representativeName: 'LEGACY-ALIAS',
  metadata: { pharmacy_phone: '02-000-0001', workplace: 'KEEP-META' },
  storeAddress: { zipCode: '01000', baseAddress: 'KEEP-BASE' },
};

type Call = { sql: string; params: any[] };

function makeDataSource() {
  const calls: Call[] = [];
  const saves: any[] = [];
  const member: any = {
    id: MEMBER_ID, user_id: USER_ID, status: 'active', identity_status: 'active',
    membership_type: 'pharmacist', activity_type: 'pharmacy_employee',
    license_number: 'L-1', pharmacy_name: null, pharmacy_address: null,
    university_name: null, student_year: null,
  };

  const runQuery = async (sql: string, params: any[] = []) => {
    calls.push({ sql: String(sql).replace(/\s+/g, ' ').trim(), params });
    if (/SELECT "businessInfo" FROM users/i.test(sql)) return [{ businessInfo: SENTINEL }];
    return [];
  };

  const entityName = (e: any) => (typeof e === 'string' ? e : e?.name ?? String(e));
  const manager = {
    query: (sql: string, params?: any[]) => runQuery(sql, params ?? []),
    findOne: async (entity: any) => (entityName(entity) === 'KpaMember' ? member : null),
    save: async (_entity: any, value: any) => { saves.push(value); return value; },
    create: (_entity: any, value: any) => value,
  };

  const dataSource: any = {
    getRepository: () => ({ findOne: async () => member, save: async (v: any) => v, create: (v: any) => v }),
    query: (sql: string, params?: any[]) => runQuery(sql, params ?? []),
    transaction: async (cb: any) => cb(manager),
  };

  return { dataSource, calls, saves, member };
}

function getHandler(dataSource: any) {
  const router: any = createMemberController(
    dataSource,
    ((_req: any, _res: any, next: any) => next()) as any,
    (() => (_req: any, _res: any, next: any) => next()) as any,
  );
  const layer = router.stack.find((l: any) => l.route?.path === '/:id/info' && l.route?.methods?.patch);
  const stack = layer.route.stack;
  return stack[stack.length - 1].handle;
}

function makeRes() {
  const res: any = { statusCode: 200 };
  res.status = jest.fn((c: number) => { res.statusCode = c; return res; });
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const req = (body: Record<string, any>) => ({
  params: { id: MEMBER_ID },
  body,
  user: { id: OPERATOR_ID, roles: ['kpa:operator'] },
}) as any;

/** businessInfo UPDATE 문과 그 JSON 파라미터 */
function bizWrite(calls: Call[]) {
  const call = calls.find((c) => /^UPDATE users\s+SET "businessInfo"/i.test(c.sql));
  if (!call) return null;
  return {
    sql: call.sql,
    payloads: call.params
      .filter((p) => typeof p === 'string' && p.startsWith('{'))
      .map((p) => JSON.parse(p as string)),
  };
}

beforeEach(() => jest.clearAllMocks());

describe('PATCH /kpa/members/:id/info — businessInfo 부분 갱신', () => {
  it('W-1 회귀: 이번 요청이 명시한 키만 파라미터로 나간다 (스냅샷 되쓰기 없음)', async () => {
    const h = makeDataSource();
    await getHandler(h.dataSource)(req({ address1: 'NEW-ADDR' }), makeRes());

    const w = bizWrite(h.calls)!;
    expect(w.sql).toContain('"businessInfo"::jsonb');
    expect(w.payloads).toEqual([{ address: 'NEW-ADDR' }]);
    // 이 경로가 모르는 키·legacy alias 는 payload 에 들어가지 않는다 (= DB 값 그대로 보존)
    for (const p of w.payloads) {
      expect(p).not.toHaveProperty('sentinelRoot');
      expect(p).not.toHaveProperty('representativeName');
      expect(p).not.toHaveProperty('metadata');
      expect(p).not.toHaveProperty('storeAddress');
    }
  });

  it('W-3 회귀: 약국 전화는 metadata 중첩 부분 갱신으로 나간다 (형제 키 미포함)', async () => {
    const h = makeDataSource();
    await getHandler(h.dataSource)(req({ pharmacy_phone: '02-999-9999' }), makeRes());

    const w = bizWrite(h.calls)!;
    expect(w.sql).toContain('jsonb_set');
    expect(w.sql).toContain("'{metadata}'");
    expect(w.sql).toContain(`"businessInfo"::jsonb -> 'metadata'`);
    // metadata 통째 교체가 아니라 하위 키 하나만
    expect(w.payloads).toEqual([{ pharmacy_phone: '02-999-9999' }]);
    expect(w.payloads[0]).not.toHaveProperty('workplace');
  });

  it('최상위 + 중첩을 함께 보내도 각각 부분 갱신된다', async () => {
    const h = makeDataSource();
    await getHandler(h.dataSource)(
      req({ business_number: '999-88-77777', pharmacy_phone: '02-999-9999' }),
      makeRes(),
    );

    const w = bizWrite(h.calls)!;
    expect(w.payloads).toEqual([
      { businessNumber: '999-88-77777' },
      { pharmacy_phone: '02-999-9999' },
    ]);
  });

  it('빈 문자열은 기존 계약대로 null 로 저장한다 (키 삭제 아님)', async () => {
    const h = makeDataSource();
    await getHandler(h.dataSource)(req({ address1: '', ceoName: '' }), makeRes());

    const w = bizWrite(h.calls)!;
    expect(w.payloads[0]).toEqual({ address: null, ceoName: null });
  });

  it('businessInfo 수정 대상이 없으면 write 자체가 없다', async () => {
    const h = makeDataSource();
    await getHandler(h.dataSource)(req({ name: '홍길동' }), makeRes());

    expect(bizWrite(h.calls)).toBeNull();
  });

  it('주소 합성(kpa_members.pharmacy_address)은 갱신 후 값 기준으로 그대로 동작한다', async () => {
    const h = makeDataSource();
    await getHandler(h.dataSource)(req({ zipCode: '02000', address1: 'NEW-BASE', address2: 'NEW-DETAIL' }), makeRes());

    // prevBiz 에 patch 가 반영된 결과로 합성된다 (DB 병합의 메모리 재현)
    expect(h.saves[0].pharmacy_address).toBe('02000 NEW-BASE NEW-DETAIL');
  });

  it('일부 필드만 수정하면 합성은 기존 저장값과 새 값을 함께 쓴다', async () => {
    const h = makeDataSource();
    // SENTINEL 에는 zipCode/address 가 없고 storeAddress 만 있으므로 새 값만 반영된다
    await getHandler(h.dataSource)(req({ address1: 'ONLY-BASE' }), makeRes());

    expect(h.saves[0].pharmacy_address).toBe('ONLY-BASE');
  });
});
