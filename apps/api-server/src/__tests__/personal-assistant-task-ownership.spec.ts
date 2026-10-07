/**
 * WO-O4O-PERSONAL-ASSISTANT-PHASE-A-TASK-FOUNDATION-V1 — Task 소유 판정 (요청자 ≠ 소유자)
 *
 *   ① 매장 축 + 매장 확정 → ORGANIZATION (서버가 확정한 조직)
 *   ② 클라이언트가 보낸 organizationId · storeId 는 읽지 않는다 — 다른 조직을 강제할 수 없다
 *   ③ 매장 미확정(ambiguous · 0개) → USER, membership 이 확인된 serviceKey 만 남긴다
 *   ④ membership 없음 → USER · serviceKey null
 *   ⑤ 비-매장 축 → USER, serviceKey 는 active membership 일 때만
 *   ⑥ workScope 없음 → USER · 아무 것도 조회하지 않음
 */

const resolveWorkScopeStoreMock = jest.fn();
const membershipMock = jest.fn();

jest.mock('../utils/work-scope-store-resolution.js', () => ({
  resolveWorkScopeStore: (...a: unknown[]) => resolveWorkScopeStoreMock(...a),
  STORE_SCOPED_WORKSPACES: ['store'],
}));
jest.mock('../utils/service-membership.js', () => ({
  getServiceMembershipStatusFromDb: (...a: unknown[]) => membershipMock(...a),
}));

import { resolveTaskOwnership } from '../services/assistant/task-ownership.js';

const USER = '00000000-0000-4000-8000-000000000001';
const MY_ORG = '00000000-0000-4000-8000-0000000000a1';
const FOREIGN_ORG = '00000000-0000-4000-8000-0000000000f9';
const ds = {} as any;

beforeEach(() => jest.clearAllMocks());

describe('resolveTaskOwnership', () => {
  it('① 매장 확정 → ORGANIZATION', async () => {
    resolveWorkScopeStoreMock.mockResolvedValue({ status: 'resolved', serviceKey: 'kpa-society', organizationId: MY_ORG, reason: null });
    const o = await resolveTaskOwnership(ds, { userId: USER, workScope: { workspace: 'store', serviceKey: 'kpa' } });
    expect(o).toEqual({ scope: 'ORGANIZATION', organizationId: MY_ORG, serviceKey: 'kpa-society' });
    expect(resolveWorkScopeStoreMock).toHaveBeenCalledWith(ds, { userId: USER, serviceKey: 'kpa', workspace: 'store' });
  });

  it('② 클라이언트 organizationId · storeId 는 판정 입력이 아니다', async () => {
    resolveWorkScopeStoreMock.mockResolvedValue({ status: 'resolved', serviceKey: 'kpa-society', organizationId: MY_ORG, reason: null });
    const o = await resolveTaskOwnership(ds, {
      userId: USER,
      workScope: { workspace: 'store', serviceKey: 'kpa', organizationId: FOREIGN_ORG, storeId: FOREIGN_ORG },
    });
    expect(o.organizationId).toBe(MY_ORG);
    expect(JSON.stringify(resolveWorkScopeStoreMock.mock.calls)).not.toContain(FOREIGN_ORG);

    // 서버가 매장을 확정하지 못하면 클라이언트 조직이 있어도 USER 다.
    resolveWorkScopeStoreMock.mockResolvedValue({ status: 'none', serviceKey: 'kpa-society', organizationId: null, reason: 'NO_SERVICE_MEMBERSHIP' });
    const denied = await resolveTaskOwnership(ds, { userId: USER, workScope: { workspace: 'store', serviceKey: 'kpa', organizationId: FOREIGN_ORG } });
    expect(denied).toEqual({ scope: 'USER', organizationId: null, serviceKey: null });
  });

  it('③ 매장 ambiguous → USER (membership 확인된 serviceKey 는 유지)', async () => {
    resolveWorkScopeStoreMock.mockResolvedValue({ status: 'ambiguous', serviceKey: 'kpa-society', organizationId: null, reason: 'MULTIPLE_ACCESSIBLE_STORES' });
    expect(await resolveTaskOwnership(ds, { userId: USER, workScope: { workspace: 'store', serviceKey: 'kpa' } }))
      .toEqual({ scope: 'USER', organizationId: null, serviceKey: 'kpa-society' });
  });

  it('④ membership 없음 → USER · serviceKey null', async () => {
    resolveWorkScopeStoreMock.mockResolvedValue({ status: 'none', serviceKey: 'kpa-society', organizationId: null, reason: 'NO_SERVICE_MEMBERSHIP' });
    expect(await resolveTaskOwnership(ds, { userId: USER, workScope: { workspace: 'store', serviceKey: 'kpa' } }))
      .toEqual({ scope: 'USER', organizationId: null, serviceKey: null });
  });

  it('⑤ 비-매장 축 — serviceKey 는 active membership 일 때만', async () => {
    membershipMock.mockResolvedValue('active');
    expect(await resolveTaskOwnership(ds, { userId: USER, workScope: { workspace: 'home', serviceKey: 'neture' } }))
      .toEqual({ scope: 'USER', organizationId: null, serviceKey: 'neture' });
    membershipMock.mockResolvedValue('none');
    expect(await resolveTaskOwnership(ds, { userId: USER, workScope: { workspace: 'home', serviceKey: 'neture' } }))
      .toEqual({ scope: 'USER', organizationId: null, serviceKey: null });
    expect(resolveWorkScopeStoreMock).not.toHaveBeenCalled();
  });

  it('⑥ workScope 없음 → USER · 조회 0', async () => {
    expect(await resolveTaskOwnership(ds, { userId: USER })).toEqual({ scope: 'USER', organizationId: null, serviceKey: null });
    expect(resolveWorkScopeStoreMock).not.toHaveBeenCalled();
    expect(membershipMock).not.toHaveBeenCalled();
  });
});
