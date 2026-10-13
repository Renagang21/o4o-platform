import { RetiredServiceError } from '../../../middleware/retired-service.middleware.js';
/**
 * WO-O4O-SERVICE-MEMBERSHIP-REJECTION-CROSS-SERVICE-ISOLATION-V1
 *
 * 서비스 운영자의 회원 상태 변경이 **users 공통 계정을 건드리지 않는지** 고정한다.
 *
 * 회귀 대상 (감사 브랜치 a2661ac28 의 CROSS_SERVICE_RISK):
 *   반려 경로가 `UPDATE users SET status=$1, "isActive"=false` 를 스코프 없이 실행해
 *   한 서비스 운영자의 조치가 그 사용자의 **다른 서비스 로그인과 진행 중 세션까지** 끊었다.
 *   (requireAuth 가 매 요청 users.isActive 를 검사한다.)
 *
 * 판정 계약: 비활성화 방향(반려·중지)에서는 users 를 대상으로 하는 SQL 이 **한 번도** 나가지 않는다.
 */

const mockQuery = jest.fn();
const mockApprovalService = {
  approveMembership: jest.fn(),
  rejectMembership: jest.fn(),
  suspendMembership: jest.fn(),
  reactivateMembership: jest.fn(),
};

jest.mock('../../../database/connection.js', () => ({
  AppDataSource: {
    // false 로 두면 컨트롤러의 getActionLogService() 가 ActionLogService 를 만들지 않는다.
    isInitialized: false,
    query: (...args: any[]) => mockQuery(...args),
    getRepository: jest.fn(),
  },
}));

jest.mock('../../../services/approval/MembershipApprovalService.js', () => ({
  MembershipApprovalService: jest.fn().mockImplementation(() => mockApprovalService),
  StoreOwnerBusinessInfoRequiredError: class extends Error {},
}));

jest.mock('../../../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: { removeRole: jest.fn(), assignRole: jest.fn(), getRoleNames: jest.fn() },
}));

jest.mock('../../../modules/auth/services/role.service.js', () => ({
  roleService: {},
}));

import { MembershipConsoleController } from '../MembershipConsoleController.js';

const USER_ID = '11111111-2222-4333-8444-555555555555';
const OPERATOR_ID = '99999999-8888-4777-8666-555555555555';

/** 이 테스트에서 "다른 서비스에 영향" 을 뜻하는 SQL 판정식. */
function usersWrites(): string[] {
  return mockQuery.mock.calls
    .map(([sql]) => String(sql).replace(/\s+/g, ' ').trim())
    .filter((sql) => /^UPDATE\s+users\b/i.test(sql));
}

function makeReq(status: string, overrides: Record<string, any> = {}) {
  return {
    params: { userId: USER_ID },
    body: { status, ...(overrides.body ?? {}) },
    user: { id: OPERATOR_ID },
    serviceScope: { isPlatformAdmin: false, serviceKeys: ['pharmacy-hub'] },
    ...overrides,
  } as any;
}

function makeRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

/**
 * @param membershipIds  `SELECT id FROM service_memberships` 가 돌려줄 대상 목록
 * @param inScope        checkServiceBoundary 통과 여부
 */
function primeQuery(membershipIds: string[], inScope = true) {
  mockQuery.mockImplementation((sql: string) => {
    const s = String(sql).replace(/\s+/g, ' ').trim();
    if (/^SELECT 1 FROM service_memberships/i.test(s)) return Promise.resolve(inScope ? [{ ok: 1 }] : []);
    if (/^SELECT id(?:, service_key, role)? FROM service_memberships/i.test(s)) {
      return Promise.resolve(membershipIds.map((id) => ({ id })));
    }
    return Promise.resolve([]);
  });
}

describe('MembershipConsoleController — 서비스 운영자 조치의 users 격리', () => {
  let controller: MembershipConsoleController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new MembershipConsoleController();
    mockApprovalService.rejectMembership.mockResolvedValue({ id: 'm1', service_key: 'pharmacy-hub' });
    mockApprovalService.suspendMembership.mockResolvedValue({ suspended: 1 });
    mockApprovalService.approveMembership.mockResolvedValue({ id: 'm1', service_key: 'pharmacy-hub' });
    // 기본값 = 되살릴 suspended/withdrawn membership 없음
    mockApprovalService.reactivateMembership.mockResolvedValue(null);
  });

  describe('반려 (rejected)', () => {
    it('해당 서비스 membership 만 반려하고 users 를 건드리지 않는다', async () => {
      primeQuery(['m1']);
      const res = makeRes();

      await controller.updateMemberStatus(makeReq('rejected'), res);

      expect(mockApprovalService.rejectMembership).toHaveBeenCalledTimes(1);
      expect(mockApprovalService.rejectMembership).toHaveBeenCalledWith(
        expect.objectContaining({ membershipId: 'm1', isPlatformAdmin: false, serviceKeys: ['pharmacy-hub'] }),
      );
      // 회귀 핵심: users 전역 write 0건
      expect(usersWrites()).toEqual([]);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('membership 조회를 운영자 serviceKeys 로 한정한다 (다른 서비스 membership 미접촉)', async () => {
      primeQuery(['m1']);
      await controller.updateMemberStatus(makeReq('rejected'), makeRes());

      const selects = mockQuery.mock.calls
        .map(([sql, params]) => ({ sql: String(sql).replace(/\s+/g, ' '), params }))
        .filter((c) => /SELECT id(?:, service_key, role)? FROM service_memberships/i.test(c.sql));

      expect(selects).toHaveLength(1);
      expect(selects[0].sql).toContain('service_key = ANY($2)');
      expect(selects[0].params).toEqual([USER_ID, ['pharmacy-hub']]);
    });

    it('스코프 안에 반려 대상이 없으면 404 이며 users 를 건드리지 않는다', async () => {
      primeQuery([]);
      const res = makeRes();

      await controller.updateMemberStatus(makeReq('rejected'), res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(usersWrites()).toEqual([]);
    });
  });

  describe('이용 중지 (suspended) — 기존 계약 회귀 방지', () => {
    it('suspendMembership 에 위임하고 users 를 건드리지 않는다', async () => {
      primeQuery([]);
      const res = makeRes();

      await controller.updateMemberStatus(makeReq('suspended'), res);

      expect(mockApprovalService.suspendMembership).toHaveBeenCalledTimes(1);
      expect(usersWrites()).toEqual([]);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('탈퇴·가입신청 되돌림 (membership 축 전이)', () => {
    it.each(['withdrawn', 'pending'])(
      '%s 는 service_memberships 만 스코프 안에서 바꾸고 users 를 건드리지 않는다',
      async (target) => {
        // UPDATE ... RETURNING → pg driver 의 [rows, rowCount] 형태
        mockQuery.mockImplementation((sql: string) => {
          const s = String(sql).replace(/\s+/g, ' ').trim();
          if (/^SELECT 1 FROM service_memberships/i.test(s)) return Promise.resolve([{ ok: 1 }]);
          if (/^UPDATE service_memberships/i.test(s)) return Promise.resolve([[{ id: 'm1' }], 1]);
          return Promise.resolve([]);
        });
        const res = makeRes();

        await controller.updateMemberStatus(makeReq(target), res);

        expect(usersWrites()).toEqual([]);
        const membershipWrites = mockQuery.mock.calls
          .map(([sql, params]) => ({ sql: String(sql).replace(/\s+/g, ' '), params }))
          .filter((c) => /^UPDATE service_memberships/i.test(c.sql.trim()));
        expect(membershipWrites).toHaveLength(1);
        expect(membershipWrites[0].sql).toContain('service_key = ANY($3)');
        expect(membershipWrites[0].params).toEqual([target, USER_ID, ['pharmacy-hub']]);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      },
    );

    it('스코프 안에 대상 membership 이 없으면 404 이며 users 를 건드리지 않는다', async () => {
      mockQuery.mockImplementation((sql: string) => {
        const s = String(sql).replace(/\s+/g, ' ').trim();
        if (/^SELECT 1 FROM service_memberships/i.test(s)) return Promise.resolve([{ ok: 1 }]);
        if (/^UPDATE service_memberships/i.test(s)) return Promise.resolve([[], 0]);
        return Promise.resolve([]);
      });
      const res = makeRes();

      await controller.updateMemberStatus(makeReq('withdrawn'), res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(usersWrites()).toEqual([]);
    });
  });

  describe('허용되지 않는 상태', () => {
    it.each(['deleted', 'inactive', 'DROP'])(
      '%s 는 400 으로 막고 users 에 기록하지 않는다',
      async (bad) => {
        primeQuery([]);
        const res = makeRes();

        await controller.updateMemberStatus(makeReq(bad), res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({ success: false, code: 'INVALID_MEMBER_STATUS' }),
        );
        expect(usersWrites()).toEqual([]);
      },
    );
  });

  describe('승인 (approved/active)', () => {
    it('pending membership 이 있으면 approveMembership 에 위임하고 컨트롤러가 users 를 직접 쓰지 않는다', async () => {
      primeQuery(['m1']);
      const res = makeRes();

      await controller.updateMemberStatus(makeReq('approved'), res);

      expect(mockApprovalService.approveMembership).toHaveBeenCalledTimes(1);
      expect(usersWrites()).toEqual([]);
    });

    it('pending 이 없고 suspended membership 이 있으면 reactivateMembership 에 위임한다', async () => {
      // WO-O4O-OPERATOR-CROSSSERVICE-MEMBER-LIFECYCLE-AND-ROLE-SERVICEKEY-CONTRACT-FIX-V1 (D3)
      //   회귀 대상: suspended → active 가 200 을 주면서 아무것도 바꾸지 않던 결함.
      primeQuery([]);
      mockApprovalService.reactivateMembership.mockResolvedValue({
        reactivatedMemberships: 1, reactivatedRoles: ['pharmacy-hub:pharmacy'], userId: USER_ID,
      });
      const res = makeRes();

      await controller.updateMemberStatus(makeReq('approved'), res);

      expect(mockApprovalService.reactivateMembership).toHaveBeenCalledWith(
        expect.objectContaining({ userId: USER_ID, isPlatformAdmin: false, serviceKeys: ['pharmacy-hub'] }),
      );
      // canonical 경로가 처리했으므로 컨트롤러가 users 를 직접 쓰지 않는다
      expect(usersWrites()).toEqual([]);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('되살릴 membership 이 없을 때의 활성화는 suspended 계정을 되살리지 않는다 (status 화이트리스트)', async () => {
      primeQuery([]);
      const res = makeRes();

      await controller.updateMemberStatus(makeReq('approved'), res);

      expect(usersWrites()).toEqual([]);
    });
  });

  describe('일괄 처리 (batch-status)', () => {
    it('일괄 반려도 users 를 건드리지 않는다', async () => {
      primeQuery(['m1']);
      const res = makeRes();
      const req = {
        body: { ids: [USER_ID], status: 'rejected' },
        user: { id: OPERATOR_ID },
        serviceScope: { isPlatformAdmin: false, serviceKeys: ['pharmacy-hub'] },
      } as any;

      await controller.batchUpdateStatus(req, res);

      expect(mockApprovalService.rejectMembership).toHaveBeenCalledTimes(1);
      expect(usersWrites()).toEqual([]);
    });

    it('일괄 반려 대상이 없으면 skipped 로 보고하고 users 를 건드리지 않는다', async () => {
      primeQuery([]);
      const res = makeRes();
      const req = {
        body: { ids: [USER_ID], status: 'rejected' },
        user: { id: OPERATOR_ID },
        serviceScope: { isPlatformAdmin: false, serviceKeys: ['pharmacy-hub'] },
      } as any;

      await controller.batchUpdateStatus(req, res);

      expect(usersWrites()).toEqual([]);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            results: expect.arrayContaining([
              expect.objectContaining({ status: 'skipped', error: 'No memberships found to reject' }),
            ]),
          }),
        }),
      );
    });
  });
});

it('ID-only approval reports retirement as 410 instead of a server failure',async()=>{
 mockApprovalService.approveMembership.mockRejectedValueOnce(new RetiredServiceError());
 const request:any={body:{},params:{membershipId:'membership'},user:{id:'actor'},serviceScope:{isPlatformAdmin:true,serviceKeys:[]}};
 const response=makeRes();
 await new MembershipConsoleController().approveMembership(request,response);
 expect(response.status).toHaveBeenCalledWith(410);
 expect(response.json).toHaveBeenCalledWith(expect.objectContaining({code:'SERVICE_RETIRED'}));
});

 describe('retired memberships in user approval', () => {
  it.each(['pharmacy-hub', 'k-cosmetics', 'cosmetics'].flatMap(key => [[key, false], [key, true]]))('filters %s before approving current services (retired first=%s)', async (retiredKey, retiredFirst) => {
    jest.clearAllMocks();
    const rows = [{ id: 'live', service_key: 'neture', role: 'pharmacy' }, { id: 'retired', service_key: retiredKey, role: 'pharmacy' }];
    if (retiredFirst) rows.reverse();
    mockQuery.mockImplementation(async (sql: string) => /SELECT id, service_key, role FROM service_memberships/.test(sql) ? rows : /SELECT 1 FROM service_memberships/.test(sql) ? [{ ok: 1 }] : []);
    mockApprovalService.approveMembership.mockResolvedValue({ id: 'live' });
    await new MembershipConsoleController().updateMemberStatus(makeReq('approved', { body: { status: 'approved', serviceKey: 'neture' }, serviceScope: { isPlatformAdmin: true, serviceKeys: [] } }), makeRes());
    expect(mockApprovalService.approveMembership).toHaveBeenCalledTimes(1);
    expect(mockApprovalService.approveMembership).toHaveBeenCalledWith(expect.objectContaining({ membershipId: 'live' }));
  });
  it.each(['pharmacy-hub', 'k-cosmetics', 'cosmetics'])('refuses %s-only approval before any approval transaction', async retiredKey => {
    jest.clearAllMocks();
    mockQuery.mockImplementation(async (sql: string) => /SELECT id, service_key, role FROM service_memberships/.test(sql) ? [{ id: 'retired', service_key: retiredKey }] : /SELECT 1 FROM service_memberships/.test(sql) ? [{ ok: 1 }] : []);
    const res = makeRes();
    await new MembershipConsoleController().updateMemberStatus(makeReq('approved', { body: { status: 'approved', serviceKey: 'neture' }, serviceScope: { isPlatformAdmin: true, serviceKeys: [] } }), res);
    expect(res.status).toHaveBeenCalledWith(410);
    expect(mockApprovalService.approveMembership).not.toHaveBeenCalled();
  });
});


// Extraction must preserve endpoint results and sequential Core calls, not private method names.
describe('same membership operation, distinct single/batch outcomes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApprovalService.rejectMembership.mockReset();
    mockApprovalService.approveMembership.mockReset();
    mockApprovalService.reactivateMembership.mockReset();
    primeQuery(['m1', 'm2']);
  });

  function request(batch: boolean, status = 'rejected') {
    return makeReq(status, {
      body: { status, serviceKey: 'neture', reason: 'FIXTURE-REASON', ...(batch ? { ids: [USER_ID] } : {}) },
      serviceScope: { isPlatformAdmin: false, serviceKeys: ['neture'] },
      memberAdminServiceKeys: ['neture'],
    });
  }

  it.each([false, true])('반려는 순차 처리하고 한 건만 반영되어도 기존 성공 결과를 유지한다 (batch=%s)', async batch => {
    const completed: string[] = [];
    mockApprovalService.rejectMembership.mockImplementation(async ({ membershipId }) => {
      if (membershipId === 'm2') expect(completed).toEqual(['m1']);
      await Promise.resolve();
      completed.push(membershipId);
      return membershipId === 'm2' ? { id: membershipId } : null;
    });
    const res = makeRes();
    const controller = new MembershipConsoleController();
    await (batch ? controller.batchUpdateStatus : controller.updateMemberStatus)(request(batch), res);
    expect(completed).toEqual(['m1', 'm2']);
    expect(mockApprovalService.rejectMembership).toHaveBeenNthCalledWith(1, {
      membershipId: 'm1', reason: 'FIXTURE-REASON', adminServiceKeys: ['neture'],
      isPlatformAdmin: false, serviceKeys: ['neture'],
    });
    expect(res.json).toHaveBeenCalledWith(batch
      ? { success: true, data: { results: [{ id: USER_ID, status: 'success' }] } }
      : { success: true, message: 'User status updated to rejected' });
    expect(usersWrites()).toEqual([]);
  });

  it.each([false, true])('조회 대상은 있으나 Core 반영이 0건이면 단건 404/일괄 skipped를 유지한다 (batch=%s)', async batch => {
    mockApprovalService.rejectMembership.mockResolvedValue(null);
    const res = makeRes();
    const controller = new MembershipConsoleController();
    await (batch ? controller.batchUpdateStatus : controller.updateMemberStatus)(request(batch), res);
    expect(mockApprovalService.rejectMembership).toHaveBeenCalledTimes(2);
    if (batch) {
      expect(res.json).toHaveBeenCalledWith({ success: true, data: { results: [
        { id: USER_ID, status: 'skipped', error: 'No memberships found to reject' },
      ] } });
    } else {
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'No memberships found to reject' });
    }
  });

  it('일괄 Core 실패는 해당 항목만 failed로 남기고 다음 회원을 처리한다', async () => {
    const secondId = '22222222-3333-4444-8555-666666666666';
    mockApprovalService.rejectMembership.mockRejectedValueOnce(new Error('fixture reject failure'))
      .mockResolvedValue({ id: 'accepted' });
    const req = request(true);
    req.body.ids = [USER_ID, secondId];
    const res = makeRes();
    await new MembershipConsoleController().batchUpdateStatus(req, res);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { results: [
      { id: USER_ID, status: 'failed', error: 'fixture reject failure' },
      { id: secondId, status: 'success' },
    ] } });
    expect(mockApprovalService.rejectMembership).toHaveBeenCalledTimes(3);
    expect(usersWrites()).toEqual([]);
  });

  it('단건 Core 실패는 500이며 다음 membership을 처리하지 않는다', async () => {
    mockApprovalService.rejectMembership.mockRejectedValueOnce(new Error('fixture reject failure'));
    const res = makeRes();
    await new MembershipConsoleController().updateMemberStatus(request(false), res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    expect(mockApprovalService.rejectMembership).toHaveBeenCalledTimes(1);
    expect(usersWrites()).toEqual([]);
  });

  it.each([false, true])('승인 조회는 동일 서비스와 상태 조건을 유지한다 (batch=%s)', async batch => {
    const res = makeRes();
    const controller = new MembershipConsoleController();
    await (batch ? controller.batchUpdateStatus : controller.updateMemberStatus)(request(batch, 'approved'), res);
    const selects = mockQuery.mock.calls.filter(([sql]) => /^SELECT id, service_key, role/.test(sql));
    expect(selects).toHaveLength(1);
    expect(selects[0][0]).toContain("status IN ('pending', 'rejected') AND service_key = ANY($2)");
    expect(selects[0][1]).toEqual([USER_ID, ['neture']]);
    expect(mockApprovalService.approveMembership.mock.calls.map(([arg]) => arg.membershipId)).toEqual(['m1', 'm2']);
    expect(usersWrites()).toEqual([]);
  });
});
