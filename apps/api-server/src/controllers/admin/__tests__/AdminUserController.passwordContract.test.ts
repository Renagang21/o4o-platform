/**
 * WO-O4O-ADMIN-OPERATORS-SERVICE-PASSWORD-WRITE-CONTRACT-FIX-V1
 *
 * `PUT /api/v1/admin/users/:id` 가 **비밀번호를 다루지 않는다**는 계약을 고정한다.
 *
 * 회귀 대상:
 *   이전 구현은 `user.password = await hashPassword(password)` 로 users.password(L1) 만 갱신했다.
 *   로그인은 service_credentials(L2) 가 있으면 users.password 를 보지 않으므로
 *   (auth-login.service.ts: `credentialHash ?? user.password`),
 *   credential 보유 계정은 성공 응답만 받고 **실제 로그인 비밀번호가 바뀌지 않았다**.
 *
 * 판정 계약:
 *   1) password 가 오면 400 `PASSWORD_NOT_ALLOWED_HERE` 로 **명시적 거부** (조용한 무시 금지)
 *   2) 그때 users 저장이 일어나지 않는다
 *   3) password 없는 일반 정보 수정은 기존대로 동작한다
 */

const mockUserRepo = {
  findOne: jest.fn(),
  save: jest.fn(),
};

jest.mock('../../../database/connection.js', () => ({
  AppDataSource: {
    isInitialized: true,
    getRepository: jest.fn(() => mockUserRepo),
    query: jest.fn(async () => []),
  },
}));

jest.mock('../../../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: {
    removeAllRoles: jest.fn(),
    assignRole: jest.fn(),
    getRoleNames: jest.fn(async () => []),
  },
}));

const mockHashPassword = jest.fn(async (pw: string) => `hashed:${pw}`);
jest.mock('../../../utils/auth.utils.js', () => ({
  hashPassword: (pw: string) => mockHashPassword(pw),
  comparePassword: jest.fn(async () => true),
}));

import { AdminUserController } from '../AdminUserController.js';

// updateUser 는 static 이 아니라 인스턴스 화살표 프로퍼티다.
const controller = new AdminUserController();

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
  name: '홍길동',
  password: 'hashed:OLD',
  status: 'active',
  isActive: true,
  toPublicData: () => ({ id: USER_ID, email: 'target@example.test' }),
});

describe('PUT /admin/users/:id — 비밀번호 계약', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserRepo.findOne.mockResolvedValue(existingUser());
    mockUserRepo.save.mockImplementation(async (u: any) => u);
  });

  it('password 가 오면 400 PASSWORD_NOT_ALLOWED_HERE 로 명시적으로 거부한다', async () => {
    const req: any = { params: { id: USER_ID }, body: { password: 'NewPw12345!' } };
    const res = makeRes();

    await controller.updateUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, code: 'PASSWORD_NOT_ALLOWED_HERE' }),
    );
  });

  it('거부 시 users 를 저장하지 않고 해싱도 하지 않는다', async () => {
    const req: any = { params: { id: USER_ID }, body: { password: 'NewPw12345!', firstName: '변경' } };
    const res = makeRes();

    await controller.updateUser(req, res);

    expect(mockUserRepo.save).not.toHaveBeenCalled();
    expect(mockHashPassword).not.toHaveBeenCalled();
  });

  it('빈 문자열 password 도 거부한다 (조용한 통과 금지)', async () => {
    const req: any = { params: { id: USER_ID }, body: { password: '' } };
    const res = makeRes();

    await controller.updateUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockUserRepo.save).not.toHaveBeenCalled();
  });

  it('password 없는 일반 정보 수정은 정상 동작하고 users.password 를 건드리지 않는다', async () => {
    const req: any = {
      params: { id: USER_ID },
      body: { firstName: '변경', lastName: '이름', name: '이름변경' },
    };
    const res = makeRes();

    await controller.updateUser(req, res);

    expect(mockUserRepo.save).toHaveBeenCalledTimes(1);
    const saved = mockUserRepo.save.mock.calls[0][0];
    expect(saved.firstName).toBe('변경');
    // 비밀번호 해시는 원본 그대로
    expect(saved.password).toBe('hashed:OLD');
    expect(mockHashPassword).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
