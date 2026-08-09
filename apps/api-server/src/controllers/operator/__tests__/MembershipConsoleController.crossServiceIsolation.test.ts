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
    serviceScope: { isPlatformAdmin: false, serviceKeys: ['glycopharm'] },
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
    if (/^SELECT id FROM service_memberships/i.test(s)) {
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
    mockApprovalService.rejectMembership.mockResolvedValue({ id: 'm1', service_key: 'glycopharm' });
    mockApprovalService.suspendMembership.mockResolvedValue({ suspended: 1 });
    mockApprovalService.approveMembership.mockResolvedValue({ id: 'm1', service_key: 'glycopharm' });
  });

  describe('반려 (rejected)', () => {
    it('해당 서비스 membership 만 반려하고 users 를 건드리지 않는다', async () => {
      primeQuery(['m1']);
      const res = makeRes();

      await controller.updateMemberStatus(makeReq('rejected'), res);

      expect(mockApprovalService.rejectMembership).toHaveBeenCalledTimes(1);
      expect(mockApprovalService.rejectMembership).toHaveBeenCalledWith(
        expect.objectContaining({ membershipId: 'm1', isPlatformAdmin: false, serviceKeys: ['glycopharm'] }),
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
        .filter((c) => /SELECT id FROM service_memberships/i.test(c.sql));

      expect(selects).toHaveLength(1);
      expect(selects[0].sql).toContain('service_key = ANY($2)');
      expect(selects[0].params).toEqual([USER_ID, ['glycopharm']]);
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
        expect(membershipWrites[0].params).toEqual([target, USER_ID, ['glycopharm']]);
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

    it('pending 이 없을 때의 활성화는 suspended 계정을 되살리지 않는다 (status 화이트리스트)', async () => {
      primeQuery([]);
      const res = makeRes();

      await controller.updateMemberStatus(makeReq('approved'), res);

      const writes = usersWrites();
      expect(writes).toHaveLength(1);
      // 활성화 방향만 허용 — 비활성화는 없어야 한다
      expect(writes[0]).not.toMatch(/"isActive" = false/);
      // approveMembership STEP2 와 동일한 화이트리스트 → 'suspended' 제외
      expect(writes[0]).toContain("status IN ('PENDING', 'pending', 'ACTIVE', 'active', 'inactive', 'deleted', 'rejected')");
      expect(writes[0]).not.toContain("'suspended'");
    });
  });

  describe('일괄 처리 (batch-status)', () => {
    it('일괄 반려도 users 를 건드리지 않는다', async () => {
      primeQuery(['m1']);
      const res = makeRes();
      const req = {
        body: { ids: [USER_ID], status: 'rejected' },
        user: { id: OPERATOR_ID },
        serviceScope: { isPlatformAdmin: false, serviceKeys: ['glycopharm'] },
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
        serviceScope: { isPlatformAdmin: false, serviceKeys: ['glycopharm'] },
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
