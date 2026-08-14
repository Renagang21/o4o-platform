/**
 * WO-O4O-KPA-APPROVAL-ORGANIZATION-CONTACT-WRITE-ALIGNMENT-V1
 *
 * PATCH /kpa/members/:id/status 의 organization 주소·약국 전화 동기화 계약을 고정한다.
 *
 * 고정 항목:
 *   - pending → active (pharmacy_owner) 승인만 organization 연락처를 건드린다.
 *   - suspended → active 재활성화는 organizations 에 **아무것도 쓰지 않는다** (검증 8).
 *   - 기존 유효 값은 승인만으로 덮어쓰지 않는다 (검증 7).
 *   - organization 동기화 실패는 승인 transaction 을 되돌리지 않는다 (검증 10 · 후처리 경계).
 *
 * 모든 값은 개인정보가 아닌 합성 문자열이다.
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
    // WO-O4O-KPA-STORE-ORGANIZATION-ENROLLMENT-CANONICALIZATION-V1:
    //   canonical provisioning helper 가 service enrollment 까지 수행한다.
    enrollService: jest.fn().mockResolvedValue(undefined),
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

type Call = { sql: string; params: any[] };

const norm = (sql: string) => String(sql).replace(/\s+/g, ' ').trim();

interface HarnessOptions {
  status?: string;
  businessInfo?: any;
  /** 승인 시점의 organizations row (연락처 SELECT 응답) */
  orgRow?: any;
  /** 이 정규식에 걸리는 SQL 은 실패시킨다 */
  failOn?: RegExp;
}

function makeHarness(options: HarnessOptions = {}) {
  const calls: Call[] = [];
  const state = { txStarted: 0, txCommitted: 0, txRolledBack: 0 };

  const member = {
    id: MEMBER_ID,
    user_id: USER_ID,
    status: options.status ?? 'pending',
    identity_status: 'active',
    membership_type: 'pharmacist',
    activity_type: 'pharmacy_owner',
    license_number: 'L-1',
    pharmacy_name: 'TEST-PHARMACY',
    pharmacy_address: null,
    university_name: null,
    student_year: null,
  };

  const businessInfo = options.businessInfo ?? { businessNumber: '123-45-67890' };

  const runQuery = async (sql: string, params: any[] = []) => {
    const n = norm(sql);
    calls.push({ sql: n, params });
    if (options.failOn && options.failOn.test(n)) throw new Error('INJECTED_FAILURE');
    if (/SELECT "businessInfo" FROM users/i.test(n)) return [{ businessInfo }];
    if (/SELECT address, address_detail, phone FROM organizations/i.test(n)) {
      return options.orgRow === undefined ? [{ address: null, address_detail: null, phone: null }] : [options.orgRow];
    }
    if (/SELECT email, name FROM users/i.test(n)) return [{ email: null, name: null }];
    return [];
  };

  const entityName = (e: any) => (typeof e === 'string' ? e : e?.name ?? String(e));
  const manager = {
    query: (sql: string, params?: any[]) => runQuery(sql, params ?? []),
    findOne: async (entity: any) => (entityName(entity) === 'KpaMember' ? member : null),
    save: async (_entity: any, value: any) => value,
    create: (_entity: any, value: any) => value,
  };

  const dataSource: any = {
    getRepository: (e: any) => ({
      findOne: async () => (entityName(e) === 'KpaMember' ? member : null),
      save: async (v: any) => v,
      create: (v: any) => v,
    }),
    query: (sql: string, params?: any[]) => runQuery(sql, params ?? []),
    transaction: async (cb: any) => {
      state.txStarted += 1;
      try {
        const r = await cb(manager);
        state.txCommitted += 1;
        return r;
      } catch (e) {
        state.txRolledBack += 1;
        throw e;
      }
    },
  };

  return { dataSource, calls, state, member };
}

async function patchStatus(h: ReturnType<typeof makeHarness>, newStatus: string) {
  const router: any = createMemberController(
    h.dataSource,
    ((_r: any, _s: any, next: any) => next()) as any,
    (() => (_r: any, _s: any, next: any) => next()) as any,
  );
  const layer = router.stack.find((l: any) => l.route?.path === '/:id/status' && l.route?.methods?.patch);
  const stack = layer.route.stack;
  const handler = stack[stack.length - 1].handle;

  const res: any = { status: jest.fn(() => res), json: jest.fn(() => res) };
  await handler(
    { params: { id: MEMBER_ID }, body: { status: newStatus }, user: { id: OPERATOR_ID, roles: ['kpa:operator'] } } as any,
    res,
  );
  return res;
}

/** organizations 연락처 UPDATE (주소/전화) 호출만 골라낸다. */
const contactUpdates = (calls: Call[]) =>
  calls.filter((c) => /^UPDATE organizations SET address =/i.test(c.sql));

/** organizations 를 대상으로 하는 모든 write */
const orgWrites = (calls: Call[]) =>
  calls.filter((c) => /^(UPDATE|INSERT INTO|DELETE FROM) organizations\b/i.test(c.sql));

beforeEach(() => jest.clearAllMocks());

describe('승인(pending → active) — organization 연락처 초기화', () => {
  it('canonical 키를 우선해 주소·우편번호·약국 전화를 채운다', async () => {
    const h = makeHarness({
      businessInfo: {
        businessNumber: '123-45-67890',
        address: 'CANON', address2: 'C2', zipCode: '11111',
        businessAddress: 'LEGACY',
        metadata: { pharmacy_phone: '02-000-0001' },
        pharmacyPhone: '02-000-0002',
      },
    });
    await patchStatus(h, 'active');

    const updates = contactUpdates(h.calls);
    expect(updates).toHaveLength(1);
    const [address, detailJson, phone] = updates[0].params;
    expect(address).toBe('CANON C2');
    expect(JSON.parse(detailJson)).toEqual({ zipCode: '11111', baseAddress: 'CANON', detailAddress: 'C2' });
    expect(phone).toBe('02-000-0001');
  });

  it('legacy 키만 있어도 주소가 organization 에 반영된다', async () => {
    const h = makeHarness({
      businessInfo: {
        businessNumber: '123-45-67890',
        businessAddress: 'LEGACY', businessAddressDetail: 'L2',
        pharmacyPhone: '02-000-0002',
      },
    });
    await patchStatus(h, 'active');

    const [address, detailJson, phone] = contactUpdates(h.calls)[0].params;
    expect(address).toBe('LEGACY L2');
    expect(JSON.parse(detailJson)).toEqual({ baseAddress: 'LEGACY', detailAddress: 'L2' });
    expect(phone).toBe('02-000-0002');
  });

  it('대표 전화만 있으면 약국 전화를 만들지 않는다', async () => {
    const h = makeHarness({
      businessInfo: { businessNumber: '123-45-67890', phone: '02-999-9999' },
    });
    await patchStatus(h, 'active');
    expect(contactUpdates(h.calls)).toHaveLength(0);
  });

  it('7) 기존 organization 의 유효한 값은 승인만으로 덮어쓰지 않는다', async () => {
    const h = makeHarness({
      businessInfo: {
        businessNumber: '123-45-67890',
        address: 'CANON', zipCode: '11111', metadata: { pharmacy_phone: '02-000-0001' },
      },
      orgRow: {
        address: 'OPERATOR-EDITED',
        address_detail: { zipCode: '33333', baseAddress: 'OP-BASE', detailAddress: 'OP-DETAIL' },
        phone: '02-777-7777',
      },
    });
    await patchStatus(h, 'active');
    expect(contactUpdates(h.calls)).toHaveLength(0);
  });

  it('기존 organization 에서 비어 있는 항목만 보완한다', async () => {
    const h = makeHarness({
      businessInfo: { businessNumber: '123-45-67890', address: 'CANON', zipCode: '11111' },
      orgRow: { address: 'OPERATOR-EDITED', address_detail: { baseAddress: 'OP-BASE' }, phone: '02-777-7777' },
    });
    await patchStatus(h, 'active');

    const [address, detailJson, phone] = contactUpdates(h.calls)[0].params;
    expect(address).toBeNull();
    expect(JSON.parse(detailJson)).toEqual({ zipCode: '11111' });
    expect(phone).toBeNull();
  });

  it('연락처 UPDATE 는 기존 값 우선 병합 SQL 을 유지한다 (이중 방어)', async () => {
    const h = makeHarness({
      businessInfo: { businessNumber: '123-45-67890', address: 'CANON' },
    });
    await patchStatus(h, 'active');
    const sql = contactUpdates(h.calls)[0].sql;
    expect(sql).toContain("address = COALESCE(NULLIF(address, ''), $1)");
    expect(sql).toContain("address_detail = $2::jsonb || COALESCE(address_detail, '{}'::jsonb)");
    expect(sql).toContain("phone = COALESCE(NULLIF(phone, ''), $3)");
  });
});

describe('재활성화(suspended → active) — organization 무변경', () => {
  it('8) organizations 에 어떤 write 도 발생하지 않는다', async () => {
    const h = makeHarness({
      status: 'suspended',
      businessInfo: {
        businessNumber: '123-45-67890', address: 'CANON', metadata: { pharmacy_phone: '02-000-0001' },
      },
    });
    await patchStatus(h, 'active');
    expect(orgWrites(h.calls)).toEqual([]);
    expect(mockApprovalService.reactivateMembership).toHaveBeenCalled();
  });
});

describe('후처리 경계 — 실패 격리', () => {
  it('10) organization 연락처 write 실패가 승인 transaction 을 되돌리지 않는다', async () => {
    const h = makeHarness({
      businessInfo: { businessNumber: '123-45-67890', address: 'CANON' },
      failOn: /^UPDATE organizations SET address =/i,
    });
    const res = await patchStatus(h, 'active');

    expect(h.state.txCommitted).toBe(1);
    expect(h.state.txRolledBack).toBe(0);
    expect(res.status).not.toHaveBeenCalledWith(500);
    // 승인 자체의 후속 단계(kpa_members.organization_id 연결)는 계속 진행된다.
    expect(h.calls.some((c) => /^UPDATE kpa_members SET organization_id/i.test(c.sql))).toBe(true);
  });
});
