/**
 * WO-O4O-ROLE-ASSIGNMENT-CONTRACT-CONSISTENCY-AUDIT-AND-HARDENING-V1 (3)
 *
 * 비활성 '유령' `role_assignments` 행이 있어도 재부여가 안전해야 한다.
 *
 * `unique_active_role_per_user` 는 UNIQUE(user_id, role, **is_active**) 라서
 * 같은 (user, role) 에 활성 1행 + 비활성 1행이 공존할 수 있다.
 * 조건 없는 조회는 어느 행을 집을지 비결정적이고, 비활성 행을 집어 되살리면
 * 이미 있는 활성 행과 충돌해 23505 로 실패한다.
 * → 활성 행 우선, 없을 때만 비활성 행 복원.
 */

const mockRepository = {
  findOne: jest.fn(),
  create: jest.fn((v: any) => ({ ...v })),
  save: jest.fn(async (v: any) => v),
};

jest.mock('../../../../database/connection.js', () => ({
  AppDataSource: { getRepository: () => mockRepository },
}));

jest.mock('../../utils/role-cache.js', () => ({
  invalidateRoles: jest.fn(),
}));

import { RoleAssignmentService } from '../role-assignment.service.js';

const USER = 'user-1';
const ROLE = 'platform:super_admin';

describe('assignRole — 비활성 유령 행이 있어도 안전하게 재부여한다', () => {
  beforeEach(() => {
    mockRepository.findOne.mockReset();
    mockRepository.save.mockClear();
    mockRepository.create.mockClear();
  });

  it('활성 행을 먼저 조회한다(비활성 행을 되살려 중복 활성 행을 만들지 않는다)', async () => {
    const activeRow = { id: 'active-row', userId: USER, role: ROLE, isActive: true };
    mockRepository.findOne.mockResolvedValueOnce(activeRow);

    const service = new RoleAssignmentService();
    const saved = await service.assignRole({ userId: USER, role: ROLE });

    expect(mockRepository.findOne).toHaveBeenCalledTimes(1);
    expect(mockRepository.findOne).toHaveBeenCalledWith({
      where: { userId: USER, role: ROLE, isActive: true },
    });
    expect(saved).toBe(activeRow);
    expect(saved.isActive).toBe(true);
    // 새 행을 만들지 않는다
    expect(mockRepository.create).not.toHaveBeenCalled();
  });

  it('활성 행이 없으면 비활성 행을 복원한다(삭제·신규 INSERT 없음)', async () => {
    const inactiveRow = { id: 'inactive-row', userId: USER, role: ROLE, isActive: false };
    mockRepository.findOne
      .mockResolvedValueOnce(null) // 활성 조회
      .mockResolvedValueOnce(inactiveRow); // 비활성 조회

    const service = new RoleAssignmentService();
    const saved = await service.assignRole({ userId: USER, role: ROLE });

    expect(mockRepository.findOne).toHaveBeenNthCalledWith(2, {
      where: { userId: USER, role: ROLE, isActive: false },
    });
    expect(saved).toBe(inactiveRow);
    expect(saved.isActive).toBe(true);
    expect(mockRepository.create).not.toHaveBeenCalled();
  });

  it('활성·비활성 어느 행도 없으면 새로 만든다(기존 동작)', async () => {
    mockRepository.findOne.mockResolvedValue(null);

    const service = new RoleAssignmentService();
    const saved = await service.assignRole({ userId: USER, role: ROLE, assignedBy: 'admin-1' });

    expect(mockRepository.create).toHaveBeenCalledTimes(1);
    expect(saved).toMatchObject({ userId: USER, role: ROLE, isActive: true, assignedBy: 'admin-1' });
  });

  it('조회 대상 (user, role) 은 원문 문자열 그대로다 — 임의 정규화 없음', async () => {
    mockRepository.findOne.mockResolvedValue(null);

    const service = new RoleAssignmentService();
    await service.assignRole({ userId: USER, role: 'supplier' });

    for (const call of mockRepository.findOne.mock.calls) {
      expect(call[0].where.role).toBe('supplier');
    }
    expect(mockRepository.create.mock.calls[0][0].role).toBe('supplier');
  });
});
