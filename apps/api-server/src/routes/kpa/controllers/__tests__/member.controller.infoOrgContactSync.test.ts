/** KPA profile changes must not provision Store pharmacy access. */
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

describe('KPA activity profile is independent of Store pharmacy approval', () => {
  it.each(['pharmacy_employee', 'pharmacy_owner'])('%s profile updates never create a store or owner role', async (prevActivityType) => {
    const h = makeHarness({ prevActivityType, businessInfo: { businessNumber: '123-45-67890', address: 'SYNTHETIC' } });
    const res = await patchInfo(h, TO_OWNER);
    expect(res.statusCode).toBe(200);
    expect(h.member.activity_type).toBe('pharmacy_owner');
    expect(orgWrites(h.calls)).toEqual([]);
    expect(organizationOpsService.ensureOrganization).not.toHaveBeenCalled();
    expect(roleAssignmentService.assignRole).not.toHaveBeenCalled();
    expect(h.state.txRolledBack).toBe(0);
  });
});
