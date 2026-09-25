/**
 * WO-O4O-SERVICE-MEMBERSHIP-TERMINATION-GLOBAL-IDENTITY-DECOUPLING-V1
 *
 * `DELETE /api/v1/operator/members/:userId` 의 **변경 대상 범위** 계약을 고정한다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Authorization capability ≠ Mutation target scope
 *
 *   이전 구현은 대상 범위를 `scope.serviceKeys`(요청자가 **보유한** 서비스 전체)로 정하고,
 *   요청자가 platform admin 이면 서비스 계층에서 **전 서비스로 확대**했다.
 *   결과:
 *     · k-cosmetics 회원 관리의 "탈퇴 처리" 가 그 사용자의 neture · KPA 관계까지 끊었다
 *     · platform admin 의 `serviceKeys` 는 `[]` 이라 fallback 자체가 전 서비스로 열려 있었다
 *     · 두 서비스를 운영하는 사람이 누르면 양쪽이 함께 끊겼다
 *
 *   새 계약: 대상은 **요청이 명시한 `serviceKey` 1개**. 없으면 400(fail-closed),
 *   보유하지 않은 서비스면 403. 요청자 권한으로 범위가 넓어지는 경로는 없다.
 */

const mockDeleteMember = jest.fn(async () => true);

jest.mock('../../../database/connection.js', () => ({
  AppDataSource: {
    isInitialized: false,
    query: jest.fn(),
    getRepository: jest.fn(),
  },
}));

jest.mock('../../../services/approval/MembershipApprovalService.js', () => ({
  MembershipApprovalService: jest.fn().mockImplementation(() => ({
    deleteMember: mockDeleteMember,
  })),
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
const ADMIN_ID = '99999999-8888-4777-8666-555555555555';

type ReqInit = {
  serviceKey?: string;
  mode?: 'soft' | 'hard';
  isPlatformAdmin?: boolean;
  serviceKeys?: string[];
  roles?: string[];
};

function makeReq(init: ReqInit = {}) {
  const { serviceKey, mode = 'soft', isPlatformAdmin = true, serviceKeys = [], roles } = init;
  return {
    params: { userId: USER_ID },
    body: {},
    query: { mode, ...(serviceKey === undefined ? {} : { serviceKey }) },
    user: { id: ADMIN_ID, roles: roles ?? (isPlatformAdmin ? ['platform:super_admin'] : []) },
    serviceScope: { isPlatformAdmin, serviceKeys, rolePrefixes: [] },
  } as any;
}

function makeRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const controller = new MembershipConsoleController();

beforeEach(() => {
  mockDeleteMember.mockClear();
  mockDeleteMember.mockResolvedValue(true);
});

describe('deleteMember — 대상 범위는 명시한 serviceKey 1개', () => {
  it('serviceKey 가 없으면 400 SERVICE_KEY_REQUIRED (삭제를 호출하지 않는다)', async () => {
    const res = makeRes();

    await controller.deleteMember(makeReq({ serviceKey: undefined }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0]).toMatchObject({ success: false, code: 'SERVICE_KEY_REQUIRED' });
    // fail-closed — 전 서비스 fallback 이 없다.
    expect(mockDeleteMember).not.toHaveBeenCalled();
  });

  it("serviceKey='all' 도 거부한다 (일괄 종료 우회 금지)", async () => {
    const res = makeRes();

    await controller.deleteMember(makeReq({ serviceKey: 'all' }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockDeleteMember).not.toHaveBeenCalled();
  });

  it('platform admin 요청도 명시한 서비스 1개만 넘긴다', async () => {
    const res = makeRes();

    await controller.deleteMember(makeReq({ serviceKey: 'neture' }), res);

    expect(mockDeleteMember).toHaveBeenCalledTimes(1);
    expect(mockDeleteMember.mock.calls[0][0]).toMatchObject({
      userId: USER_ID,
      serviceKeys: ['neture'],
      // platform admin 이라도 대상 서비스 membership 경계 검사를 건너뛰지 않는다.
      isPlatformAdmin: false,
      mode: 'soft',
    });
  });

  it('여러 서비스를 보유한 운영자도 명시한 1개만 종료한다 (보유 범위 ≠ 변경 범위)', async () => {
    const res = makeRes();

    await controller.deleteMember(
      makeReq({
        serviceKey: 'k-cosmetics',
        isPlatformAdmin: false,
        serviceKeys: ['k-cosmetics', 'neture'],
      }),
      res,
    );

    expect(mockDeleteMember.mock.calls[0][0]).toMatchObject({ serviceKeys: ['k-cosmetics'] });
  });

  it('보유하지 않은 서비스를 지정하면 403 (삭제를 호출하지 않는다)', async () => {
    const res = makeRes();

    await controller.deleteMember(
      makeReq({ serviceKey: 'neture', isPlatformAdmin: false, serviceKeys: ['k-cosmetics'] }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0]).toMatchObject({ code: 'SERVICE_SCOPE_FORBIDDEN' });
    expect(mockDeleteMember).not.toHaveBeenCalled();
  });

  it('hard mode 도 같은 규칙 — serviceKey 없으면 400', async () => {
    const res = makeRes();

    await controller.deleteMember(makeReq({ mode: 'hard', serviceKey: undefined }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockDeleteMember).not.toHaveBeenCalled();
  });

  it('hard mode + 명시 serviceKey 는 그 서비스만 넘긴다', async () => {
    const res = makeRes();

    await controller.deleteMember(makeReq({ mode: 'hard', serviceKey: 'kpa-society' }), res);

    expect(mockDeleteMember.mock.calls[0][0]).toMatchObject({
      serviceKeys: ['kpa-society'],
      mode: 'hard',
    });
  });

  it('서비스 계층이 거부하면 404 로 전달된다 (성공으로 위장하지 않는다)', async () => {
    mockDeleteMember.mockResolvedValue(false);
    const res = makeRes();

    await controller.deleteMember(makeReq({ serviceKey: 'neture' }), res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
