/**
 * IR-O4O-SERVICE-MEMBER-PASSWORD-AND-ROLE-CONSUMER-INTEGRITY-AUDIT-V1 (FIX-1)
 *
 * `PUT /api/v1/users/:id` 가 **비밀번호를 다루지 않는다**는 계약을 고정한다.
 *
 * 회귀 대상:
 *   이전 구현은 body 에서 password 를 destructure 하지 않아 **조용히 무시**했다.
 *   admin-dashboard 사용자 편집 화면(`/users/:id/edit`)이 password 를 함께 보냈으므로
 *   화면은 "User updated successfully" 를 띄우지만 users.password 도 service_credentials 도
 *   바뀌지 않는 "성공했는데 안 바뀜" 상태가 됐다.
 *   (로그인은 `credentialHash ?? user.password` 이므로 L1 만 써도 무효인 계정이 있다.)
 *
 * 판정 계약 — AdminUserController.updateUser 와 동일하다:
 *   1) password 가 오면 400 `PASSWORD_NOT_ALLOWED_HERE` 로 명시적 거부
 *   2) 그때 users 저장·역할 변경이 일어나지 않는다
 *   3) password 없는 일반 정보 수정은 기존대로 동작한다
 */

const mockUserRepo = {
  findOne: jest.fn(),
  save: jest.fn(),
};

jest.mock('../../repositories/UserRepository.js', () => ({
  UserRepository: jest.fn(() => mockUserRepo),
}));

jest.mock('../../database/connection.js', () => ({
  AppDataSource: {
    isInitialized: true,
    getRepository: jest.fn(() => mockUserRepo),
    query: jest.fn(async () => []),
  },
}));

jest.mock('../../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockRemoveAllRoles = jest.fn();
const mockAssignRoles = jest.fn();
jest.mock('../../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: {
    removeAllRoles: (...args: unknown[]) => mockRemoveAllRoles(...args),
    assignRoles: (...args: unknown[]) => mockAssignRoles(...args),
    getRoleNames: jest.fn(async () => []),
  },
}));

import { UserManagementController } from '../UserManagementController.js';

const controller = new UserManagementController();

const USER_ID = '11111111-2222-4333-8444-555555555555';

function makeRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const existingUser = () => ({
  id: USER_ID,
  email: 'target@example.test',
  firstName: '길동',
  lastName: '홍',
  password: 'hashed:OLD',
  status: 'active',
  toPublicData: () => ({ id: USER_ID, email: 'target@example.test' }),
});

describe('PUT /users/:id — 비밀번호 계약', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserRepo.findOne.mockResolvedValue(existingUser());
    mockUserRepo.save.mockImplementation(async (u: any) => u);
  });

  it('password 가 오면 400 PASSWORD_NOT_ALLOWED_HERE 로 명시적으로 거부한다', async () => {
    const req: any = { params: { id: USER_ID }, body: { password: 'NewPw12345' } };
    const res = makeRes();

    await controller.updateUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, code: 'PASSWORD_NOT_ALLOWED_HERE' }),
    );
  });

  it('거부 시 users 저장도 역할 변경도 하지 않는다', async () => {
    const req: any = {
      params: { id: USER_ID },
      body: { password: 'NewPw12345', firstName: '변경', roles: ['user'] },
    };
    const res = makeRes();

    await controller.updateUser(req, res);

    expect(mockUserRepo.save).not.toHaveBeenCalled();
    expect(mockRemoveAllRoles).not.toHaveBeenCalled();
    expect(mockAssignRoles).not.toHaveBeenCalled();
  });

  it('password 없는 일반 정보 수정은 기존대로 동작한다', async () => {
    const req: any = { params: { id: USER_ID }, body: { firstName: '변경' } };
    const res = makeRes();

    await controller.updateUser(req, res);

    expect(mockUserRepo.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
