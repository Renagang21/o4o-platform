/**
 * WO-O4O-KCOSMETICS-RETIREMENT-PHASE1B-STORE-API-ADMIN-V1
 *
 * 운영 종료된 K-Cosmetics 는 범용 가입 API(`POST /auth/services/k-cosmetics/join`)로
 * 새 membership 을 만들지 않는다 — catalog joinEnabled=false → 400 JOIN_DISABLED, DB 질의 0.
 */

const mockQuery = jest.fn();

// BaseController 는 `@o4o/types` 를 끌어온다 — 응답 헬퍼만 대체한다 (auth-account.businessInfoWrite.test 와 같은 이유).
jest.mock('../../../../common/base.controller.js', () => ({
  BaseController: class {
    static ok = jest.fn((res: any, data: any) => res.status(200).json({ success: true, data }));
    static error = jest.fn((res: any, message: string, status = 500, code?: string) =>
      res.status(status).json({ success: false, error: message, code }));
  },
}));

jest.mock('../../../../database/connection.js', () => ({
  AppDataSource: { query: (...args: unknown[]) => mockQuery(...args) },
}));

jest.mock('../../services/role-assignment.service.js', () => ({
  roleAssignmentService: { getRoleNames: jest.fn().mockResolvedValue([]) },
}));

jest.mock('../../../../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { HandoffController } from '../handoff.controller.js';

function makeRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('HandoffController.joinService — 종료 서비스 가입 차단', () => {
  beforeEach(() => mockQuery.mockReset());

  it('k-cosmetics 가입 요청은 400 JOIN_DISABLED 이고 service_memberships 를 조회 · 생성하지 않는다', async () => {
    const req: any = { user: { id: 'user-1' }, params: { serviceKey: 'k-cosmetics' }, body: {} };
    const res = makeRes();
    await HandoffController.joinService(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, code: 'JOIN_DISABLED' }));
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
