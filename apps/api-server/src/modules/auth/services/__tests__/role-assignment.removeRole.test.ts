/**
 * WO-O4O-ROLE-DATA-CANONICALIZATION-AND-LEGACY-CLEANUP-V1
 *
 * 역할 **해제** 경로가 비활성 쌍둥이 행 때문에 23505 로 실패하지 않아야 한다.
 *
 * 이전 구조: `unique_active_role_per_user UNIQUE (user_id, role, is_active)`
 *   → 같은 (user, role) 에 활성 1 + 비활성 1 이 공존할 수 있고, 활성 행을 내리면
 *     이미 있는 비활성 행과 충돌해 실패했다. `assignRole` 만 우회가 있었고
 *     `removeRole` · `removeAllRoles` 에는 없었다.
 *
 * 현재 구조: `UNIQUE (user_id, role) WHERE is_active` 부분 인덱스 (migration 20270301000000)
 *   → 비활성 행은 몇 개든 공존 가능. 활성 행을 내리는 UPDATE 는 활성 유일성을 줄이는
 *     방향이라 구조적으로 충돌하지 않는다. **행 삭제 없이** 이력이 남는다.
 *
 * 아래 fake 저장소는 새 제약을 그대로 모사한다 — 활성 행이 (user, role) 당 2개가 되려 하면
 * 23505 를 던지고, 비활성 행 중복은 허용한다.
 */

interface Row {
  id: string;
  userId: string;
  role: string;
  isActive: boolean;
  deactivate(): void;
}

const db: Row[] = [];

function makeRow(id: string, userId: string, role: string, isActive: boolean): Row {
  return {
    id,
    userId,
    role,
    isActive,
    deactivate(this: Row) {
      this.isActive = false;
    },
  };
}

const mockRepository = {
  findOne: jest.fn(async ({ where }: any) => {
    const found = db.filter(
      (r) =>
        r.userId === where.userId &&
        (where.role === undefined || r.role === where.role) &&
        r.isActive === where.isActive
    );
    return found[0] ?? null;
  }),
  find: jest.fn(async ({ where }: any) =>
    db.filter((r) => r.userId === where.userId && r.isActive === where.isActive)
  ),
  create: jest.fn((v: any) => ({ ...v })),
  // 새 부분 유니크 인덱스 모사: 활성 행만 (user_id, role) 유일
  save: jest.fn(async (v: any) => {
    const rows: Row[] = Array.isArray(v) ? v : [v];
    for (const row of rows) {
      if (row.isActive) {
        const otherActive = db.filter(
          (r) => r.id !== row.id && r.userId === row.userId && r.role === row.role && r.isActive
        );
        if (otherActive.length > 0) {
          throw new Error(
            'duplicate key value violates unique constraint "ux_role_assignments_user_role_active"'
          );
        }
      }
    }
    return v;
  }),
};

jest.mock('../../../../database/connection.js', () => ({
  AppDataSource: { getRepository: () => mockRepository },
}));

jest.mock('../../utils/role-cache.js', () => ({
  invalidateRoles: jest.fn(),
}));

import { RoleAssignmentService } from '../role-assignment.service.js';
import { invalidateRoles } from '../../utils/role-cache.js';

const USER = 'user-1';
const ROLE = 'platform:super_admin';

beforeEach(() => {
  db.length = 0;
  mockRepository.save.mockClear();
  (invalidateRoles as jest.Mock).mockClear();
});

describe('removeRole — 비활성 쌍둥이가 있어도 해제가 성공한다', () => {
  it('활성 1 + 비활성 1 상태에서 해제해도 23505 가 나지 않는다', async () => {
    db.push(makeRow('active-row', USER, ROLE, true));
    db.push(makeRow('ghost-row', USER, ROLE, false));

    const service = new RoleAssignmentService();
    await expect(service.removeRole(USER, ROLE)).resolves.toBe(true);

    // 활성 행이 내려갔다
    expect(db.find((r) => r.id === 'active-row')!.isActive).toBe(false);
  });

  it('기존 비활성 이력 행을 삭제하지 않는다 (이력 보존)', async () => {
    db.push(makeRow('active-row', USER, ROLE, true));
    db.push(makeRow('ghost-row', USER, ROLE, false));

    const service = new RoleAssignmentService();
    await service.removeRole(USER, ROLE);

    // 두 행 모두 남아 있고 둘 다 비활성이다
    expect(db).toHaveLength(2);
    expect(db.every((r) => !r.isActive)).toBe(true);
    expect(db.map((r) => r.id).sort()).toEqual(['active-row', 'ghost-row']);
  });

  it('활성 행이 없으면 false 를 반환하고 아무것도 바꾸지 않는다', async () => {
    db.push(makeRow('ghost-row', USER, ROLE, false));

    const service = new RoleAssignmentService();
    await expect(service.removeRole(USER, ROLE)).resolves.toBe(false);
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('해제 성공 시 역할 캐시를 무효화한다', async () => {
    db.push(makeRow('active-row', USER, ROLE, true));

    const service = new RoleAssignmentService();
    await service.removeRole(USER, ROLE);

    expect(invalidateRoles).toHaveBeenCalledWith(USER);
  });
});

describe('removeAllRoles — 여러 역할에 쌍둥이가 있어도 전부 해제된다', () => {
  it('쌍둥이가 섞여 있어도 활성 행 전부가 내려간다', async () => {
    db.push(makeRow('a1', USER, 'kpa:admin', true));
    db.push(makeRow('g1', USER, 'kpa:admin', false));
    db.push(makeRow('a2', USER, 'neture:operator', true));
    db.push(makeRow('a3', USER, 'cosmetics:operator', true));

    const service = new RoleAssignmentService();
    const removed = await service.removeAllRoles(USER);

    expect(removed).toBe(3);
    expect(db.filter((r) => r.isActive)).toHaveLength(0);
    // 이력 행은 그대로 4개
    expect(db).toHaveLength(4);
  });
});

describe('해제 후 재부여 — 왕복이 성립한다', () => {
  it('해제 → 재부여 시 비활성 행을 복원하고 활성 중복을 만들지 않는다', async () => {
    db.push(makeRow('active-row', USER, ROLE, true));

    const service = new RoleAssignmentService();
    await service.removeRole(USER, ROLE);
    expect(db.filter((r) => r.isActive)).toHaveLength(0);

    await service.assignRole({ userId: USER, role: ROLE });

    const active = db.filter((r) => r.isActive);
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe('active-row'); // 새 행이 아니라 기존 행 복원
    expect(db).toHaveLength(1);
  });
});
