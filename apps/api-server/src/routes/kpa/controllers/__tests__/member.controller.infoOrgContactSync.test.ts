/**
 * WO-O4O-KPA-ACTIVITY-TYPE-PHARMACY-OWNER-ORGANIZATION-CONTACT-ALIGNMENT-V1
 *
 * PATCH /kpa/members/:id/info 에서 activity_type 을 `pharmacy_owner` 로 바꿔
 * organization 을 생성·연결하는 경로의 **주소 · 약국 전화 초기화 계약**을 고정한다.
 *
 * 승인 경로(PATCH /:id/status)와 동일한 계약을 공유한다
 *   (선행 commit 192086556 · `planKpaOrganizationContactSync` 재사용).
 *
 * 고정 항목:
 *   - 신규 organization 은 resolver 결과로 초기화된다 (canonical → legacy → 구조화 fallback).
 *   - 기존 organization 의 유효한 값은 덮어쓰지 않고, 비어 있는 항목만 키 단위로 보완한다.
 *   - 대표 전화(businessInfo.phone)는 약국 전화로 승격되지 않는다.
 *   - pharmacy_owner 전이가 아닌 요청은 organizations 를 건드리지 않는다.
 *   - 연락처 동기화 실패는 권한 부여 · 응답 · transaction 계약을 바꾸지 않는다.
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
import { organizationOpsService } from '../../../../modules/organization/services/organization-ops.service.js';
import { roleAssignmentService } from '../../../../modules/auth/services/role-assignment.service.js';

const MEMBER_ID = '11111111-2222-4333-8444-555555555555';
const USER_ID = '22222222-3333-4444-8555-666666666666';
const OPERATOR_ID = '99999999-8888-4777-8666-555555555555';

type Call = { sql: string; params: any[] };

const norm = (sql: string) => String(sql).replace(/\s+/g, ' ').trim();

interface HarnessOptions {
  /** 회원의 이전 activity_type (기본: pharmacy_employee → 전이 발생) */
  prevActivityType?: string;
  businessInfo?: any;
  /** organization 연락처 SELECT 응답 (미지정 = 신규 생성 직후 · 전 컬럼 비어 있음) */
  orgRow?: any;
  failOn?: RegExp;
}

function makeHarness(options: HarnessOptions = {}) {
  const calls: Call[] = [];
  const state = { txStarted: 0, txCommitted: 0, txRolledBack: 0 };

  const member = {
    id: MEMBER_ID,
    user_id: USER_ID,
    status: 'active',
    identity_status: 'active',
    membership_type: 'pharmacist',
    activity_type: options.prevActivityType ?? 'pharmacy_employee',
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
      return options.orgRow === undefined
        ? [{ address: null, address_detail: null, phone: null }]
        : [options.orgRow];
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

async function patchInfo(h: ReturnType<typeof makeHarness>, body: Record<string, any>) {
  const router: any = createMemberController(
    h.dataSource,
    ((_r: any, _s: any, next: any) => next()) as any,
    (() => (_r: any, _s: any, next: any) => next()) as any,
  );
  const layer = router.stack.find((l: any) => l.route?.path === '/:id/info' && l.route?.methods?.patch);
  const stack = layer.route.stack;
  const handler = stack[stack.length - 1].handle;

  const res: any = { statusCode: 200 };
  res.status = jest.fn((c: number) => { res.statusCode = c; return res; });
  res.json = jest.fn(() => res);

  await handler(
    { params: { id: MEMBER_ID }, body, user: { id: OPERATOR_ID, roles: ['kpa:operator'] } } as any,
    res,
  );
  return res;
}

/** organizations 연락처 UPDATE 만 골라낸다. */
const contactUpdates = (calls: Call[]) =>
  calls.filter((c) => /^UPDATE organizations SET address =/i.test(c.sql));

/** organizations 를 대상으로 하는 모든 write */
const orgWrites = (calls: Call[]) =>
  calls.filter((c) => /^(UPDATE|INSERT INTO|DELETE FROM) organizations\b/i.test(c.sql));

const TO_OWNER = { activity_type: 'pharmacy_owner' };

beforeEach(() => jest.clearAllMocks());

describe('activity_type → pharmacy_owner — 신규 organization 초기화', () => {
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
    await patchInfo(h, TO_OWNER);

    const updates = contactUpdates(h.calls);
    expect(updates).toHaveLength(1);
    const [address, detailJson, phone, orgId] = updates[0].params;
    expect(address).toBe('CANON C2');
    expect(JSON.parse(detailJson)).toEqual({ zipCode: '11111', baseAddress: 'CANON', detailAddress: 'C2' });
    expect(phone).toBe('02-000-0001');
    expect(orgId).toBe('org-1');
  });

  it('legacy 키만 있어도 주소가 organization 에 반영된다', async () => {
    const h = makeHarness({
      businessInfo: {
        businessNumber: '123-45-67890',
        businessAddress: 'LEGACY', businessAddressDetail: 'L2',
        pharmacyPhone: '02-000-0002',
      },
    });
    await patchInfo(h, TO_OWNER);

    const [address, detailJson, phone] = contactUpdates(h.calls)[0].params;
    expect(address).toBe('LEGACY L2');
    expect(JSON.parse(detailJson)).toEqual({ baseAddress: 'LEGACY', detailAddress: 'L2' });
    expect(phone).toBe('02-000-0002');
  });

  it('canonical 이 공백이면 유효한 legacy 값으로 fallback 한다', async () => {
    const h = makeHarness({
      businessInfo: {
        businessNumber: '123-45-67890',
        address: '   ', businessAddress: 'LEGACY',
        metadata: { pharmacy_phone: '' }, pharmacyPhone: '02-000-0002',
      },
    });
    await patchInfo(h, TO_OWNER);

    const [address, detailJson, phone] = contactUpdates(h.calls)[0].params;
    expect(address).toBe('LEGACY');
    expect(JSON.parse(detailJson)).toEqual({ baseAddress: 'LEGACY' });
    expect(phone).toBe('02-000-0002');
  });

  it('같은 요청에서 입력한 주소·약국 전화가 organization 초기화에 반영된다', async () => {
    const h = makeHarness({ businessInfo: { businessNumber: '123-45-67890' } });
    await patchInfo(h, {
      ...TO_OWNER,
      zipCode: '44444', address1: 'NEW-BASE', address2: 'NEW-DETAIL',
      pharmacy_phone: '02-000-0044',
    });

    const [address, detailJson, phone] = contactUpdates(h.calls)[0].params;
    expect(address).toBe('NEW-BASE NEW-DETAIL');
    expect(JSON.parse(detailJson)).toEqual({
      zipCode: '44444', baseAddress: 'NEW-BASE', detailAddress: 'NEW-DETAIL',
    });
    expect(phone).toBe('02-000-0044');
  });

  it('쓸 값이 없으면 연락처 UPDATE 자체를 생략한다', async () => {
    const h = makeHarness({ businessInfo: { businessNumber: '123-45-67890' } });
    await patchInfo(h, TO_OWNER);
    expect(contactUpdates(h.calls)).toHaveLength(0);
  });

  it('대표 전화만 있으면 약국 전화를 만들지 않는다', async () => {
    const h = makeHarness({
      businessInfo: { businessNumber: '123-45-67890', phone: '02-999-9999' },
    });
    await patchInfo(h, TO_OWNER);
    expect(contactUpdates(h.calls)).toHaveLength(0);
  });

  it('연락처 UPDATE 는 기존 값 우선 병합 SQL 을 유지한다 (이중 방어)', async () => {
    const h = makeHarness({
      businessInfo: { businessNumber: '123-45-67890', address: 'CANON' },
    });
    await patchInfo(h, TO_OWNER);

    const sql = contactUpdates(h.calls)[0].sql;
    expect(sql).toContain("address = COALESCE(NULLIF(address, ''), $1)");
    expect(sql).toContain("address_detail = $2::jsonb || COALESCE(address_detail, '{}'::jsonb)");
    expect(sql).toContain("phone = COALESCE(NULLIF(phone, ''), $3)");
  });
});

describe('activity_type → pharmacy_owner — 기존 organization 보존', () => {
  it('기존 유효 값은 덮어쓰지 않는다', async () => {
    const h = makeHarness({
      businessInfo: {
        businessNumber: '123-45-67890',
        address: 'CANON', address2: 'C2', zipCode: '11111',
        metadata: { pharmacy_phone: '02-000-0001' },
      },
      orgRow: {
        address: 'OPERATOR-EDITED',
        address_detail: { zipCode: '33333', baseAddress: 'OP-BASE', detailAddress: 'OP-DETAIL' },
        phone: '02-777-7777',
      },
    });
    await patchInfo(h, TO_OWNER);
    expect(contactUpdates(h.calls)).toHaveLength(0);
  });

  it('중첩 키 보존 — 기존 baseAddress 는 지키고 비어 있는 zipCode 만 채운다', async () => {
    const h = makeHarness({
      businessInfo: { businessNumber: '123-45-67890', address: 'CANON', zipCode: '11111' },
      orgRow: { address: 'OPERATOR-EDITED', address_detail: { baseAddress: 'OP-BASE' }, phone: '02-777-7777' },
    });
    await patchInfo(h, TO_OWNER);

    const [address, detailJson, phone] = contactUpdates(h.calls)[0].params;
    expect(address).toBeNull();
    expect(JSON.parse(detailJson)).toEqual({ zipCode: '11111' });
    expect(phone).toBeNull();
  });

  it('기존 값이 공백이면 값 부재로 보고 채운다', async () => {
    const h = makeHarness({
      businessInfo: { businessNumber: '123-45-67890', address: 'CANON', metadata: { pharmacy_phone: '02-000-0001' } },
      orgRow: { address: '  ', address_detail: { baseAddress: '' }, phone: '' },
    });
    await patchInfo(h, TO_OWNER);

    const [address, detailJson, phone] = contactUpdates(h.calls)[0].params;
    expect(address).toBe('CANON');
    expect(JSON.parse(detailJson)).toEqual({ baseAddress: 'CANON' });
    expect(phone).toBe('02-000-0001');
  });
});

describe('전이가 아닌 경우 — organizations 무변경', () => {
  it('이미 pharmacy_owner 인 회원의 정보 수정은 organizations 를 건드리지 않는다', async () => {
    const h = makeHarness({
      prevActivityType: 'pharmacy_owner',
      businessInfo: { businessNumber: '123-45-67890', address: 'CANON' },
    });
    await patchInfo(h, { ...TO_OWNER, address1: 'NEW-BASE' });

    expect(orgWrites(h.calls)).toEqual([]);
    expect(organizationOpsService.ensureOrganization).not.toHaveBeenCalled();
  });

  it('다른 activity type 으로의 변경은 organizations 를 건드리지 않는다', async () => {
    const h = makeHarness({
      businessInfo: { businessNumber: '123-45-67890', address: 'CANON' },
    });
    await patchInfo(h, { activity_type: 'hospital' });
    expect(orgWrites(h.calls)).toEqual([]);
  });

  it('직전 회귀: 사업자번호가 없으면 organization 생성도 연락처 write 도 하지 않는다', async () => {
    const h = makeHarness({ businessInfo: { address: 'CANON' } });
    const res = await patchInfo(h, TO_OWNER);

    expect(organizationOpsService.ensureOrganization).not.toHaveBeenCalled();
    expect(orgWrites(h.calls)).toEqual([]);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect((payload.warnings ?? []).join(' ')).toContain('사업자번호');
  });
});

describe('후처리 경계 — 실패 격리', () => {
  it('연락처 write 실패가 권한 부여·응답·transaction 계약을 바꾸지 않는다', async () => {
    const h = makeHarness({
      businessInfo: { businessNumber: '123-45-67890', address: 'CANON' },
      failOn: /^UPDATE organizations SET address =/i,
    });
    const res = await patchInfo(h, TO_OWNER);

    expect(h.state.txCommitted).toBe(1);
    expect(h.state.txRolledBack).toBe(0);
    expect(res.status).not.toHaveBeenCalledWith(500);
    expect(roleAssignmentService.assignRole).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID, role: 'kpa:store_owner' }),
    );
    // 응답에는 권한 부여 실패 경고가 실리지 않는다 (연락처 동기화 실패는 격리된다).
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.warnings).toBeUndefined();
  });

  it('연락처 SELECT 실패도 권한 부여 결과를 error 로 바꾸지 않는다', async () => {
    const h = makeHarness({
      businessInfo: { businessNumber: '123-45-67890', address: 'CANON' },
      failOn: /^SELECT address, address_detail, phone FROM organizations/i,
    });
    const res = await patchInfo(h, TO_OWNER);

    expect(res.status).not.toHaveBeenCalledWith(500);
    expect(roleAssignmentService.assignRole).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID, role: 'kpa:store_owner' }),
    );
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.warnings).toBeUndefined();
  });
});
