/**
 * WO-O4O-KPA-PROFILE-WRITE-JSONB-CONCAT-CONVERGENCE-V1
 *
 * 본인 프로필 수정(`PATCH /auth/me/profile`)의 `users."businessInfo"` write 를 고정한다.
 *
 * 회귀 대상:
 *   W-1  read → 병합 → **전체 재저장**. SELECT 와 UPDATE 사이에 다른 경로(운영자 콘솔 등)가
 *        저장한 키가 이번 요청이 손대지 않았는데도 스냅샷 값으로 덮였다.
 *   W-4  `storeAddress` 를 최상위 키로 **통째로 교체**했다. 클라이언트가 일부 하위 키만
 *        보내면 나머지 하위 키가 사라졌다.
 *
 * 판정 계약:
 *   - 병합용 사전 SELECT 가 없다 (DB 가 단일 statement 안에서 병합).
 *   - 허용 목록(allowedFields) 필터와 기존 write 계약은 그대로다.
 *   - 모든 write 는 기존대로 하나의 transaction 안에서 나간다.
 */

const mockTransaction = jest.fn();

// BaseController 는 `@o4o/types` 를 끌어온다. 이 로컬 환경에서는 workspace 심볼릭 링크가
// Node 로 해석되지 않으므로, 검증 대상(businessInfo write)과 무관한 응답 헬퍼는 대체한다.
jest.mock('../../../../common/base.controller.js', () => ({
  BaseController: class {
    static ok = jest.fn((res: any, data: any) => res.json({ success: true, data }));
    static error = jest.fn((res: any, message: string, status = 500) =>
      res.status(status).json({ success: false, error: message }));
    static unauthorized = jest.fn((res: any, message: string) =>
      res.status(401).json({ success: false, error: message }));
  },
}));

jest.mock('../../../../database/connection.js', () => ({
  AppDataSource: { transaction: (cb: any) => mockTransaction(cb) },
}));

jest.mock('../../../../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../services/role-assignment.service.js', () => ({
  roleAssignmentService: { getRoleNames: jest.fn().mockResolvedValue([]) },
}));

jest.mock('../auth-helpers.js', () => ({
  derivePharmacistQualification: jest.fn().mockResolvedValue({
    pharmacistFunction: 'pharmacy', pharmacistRole: null, isStoreOwner: false,
  }),
}));

import { AuthAccountController } from '../auth-account.controller.js';

const USER_ID = '22222222-3333-4444-8555-666666666666';

type Call = { sql: string; params: any[] };

function runController(body: Record<string, any>) {
  const calls: Call[] = [];
  mockTransaction.mockImplementation(async (cb: any) =>
    cb({
      query: async (sql: string, params: any[] = []) => {
        calls.push({ sql: String(sql).replace(/\s+/g, ' ').trim(), params });
        return [];
      },
    }),
  );

  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);

  const req: any = { user: { id: USER_ID }, body };
  return AuthAccountController.updateProfile(req, res).then(() => ({ calls, res }));
}

const bizWrite = (calls: Call[]) => {
  const call = calls.find((c) => /^UPDATE users\s+SET "businessInfo"/i.test(c.sql));
  if (!call) return null;
  return {
    sql: call.sql,
    payloads: call.params
      .filter((p) => typeof p === 'string' && p.startsWith('{'))
      .map((p) => JSON.parse(p as string)),
  };
};

beforeEach(() => jest.clearAllMocks());

describe('PATCH /auth/me/profile — businessInfo 부분 갱신', () => {
  it('W-1 회귀: 병합용 사전 SELECT 가 사라지고 부분 갱신 표현식으로 나간다', async () => {
    const { calls } = await runController({
      activityType: 'pharmacy_employee',
      businessInfo: { businessName: 'NEW-NAME' },
    });

    expect(calls.filter((c) => /^SELECT "businessInfo" FROM users/i.test(c.sql))).toEqual([]);

    const w = bizWrite(calls)!;
    expect(w.sql).toContain('"businessInfo"::jsonb');
    expect(w.payloads).toEqual([{ businessName: 'NEW-NAME' }]);
  });

  it('W-4 회귀: storeAddress 는 통째로 교체하지 않고 하위 키만 병합한다', async () => {
    const { calls } = await runController({
      activityType: 'pharmacy_owner',
      businessInfo: { storeAddress: { detailAddress: 'NEW-DETAIL' } },
    });

    const w = bizWrite(calls)!;
    expect(w.sql).toContain("'{storeAddress}'");
    expect(w.sql).toContain(`"businessInfo"::jsonb -> 'storeAddress'`);
    expect(w.payloads).toEqual([{ detailAddress: 'NEW-DETAIL' }]);
  });

  it('최상위와 storeAddress 를 함께 보내면 각각 부분 갱신된다', async () => {
    const { calls } = await runController({
      activityType: 'pharmacy_owner',
      businessInfo: {
        businessName: 'NEW-NAME',
        storeAddress: { zipCode: '02000', baseAddress: 'BASE', detailAddress: 'DETAIL' },
      },
    });

    const w = bizWrite(calls)!;
    expect(w.payloads).toEqual([
      { businessName: 'NEW-NAME' },
      { zipCode: '02000', baseAddress: 'BASE', detailAddress: 'DETAIL' },
    ]);
  });

  it('허용 목록 밖 키는 기존 계약대로 무시한다 (회귀)', async () => {
    const { calls } = await runController({
      activityType: 'pharmacy_employee',
      businessInfo: { businessName: 'NEW-NAME', hackedField: 'x', role: 'admin' },
    });

    expect(bizWrite(calls)!.payloads).toEqual([{ businessName: 'NEW-NAME' }]);
  });

  it('businessInfo 가 없으면 write 자체가 없다 (회귀)', async () => {
    const { calls } = await runController({ activityType: 'pharmacy_employee' });

    expect(bizWrite(calls)).toBeNull();
    // 직역 SSOT write 는 그대로 나간다
    expect(calls.some((c) => /INSERT INTO kpa_pharmacist_profiles/i.test(c.sql))).toBe(true);
  });

  it('storeAddress 가 객체가 아니면 기존 계약대로 최상위 값으로 저장한다', async () => {
    const { calls } = await runController({
      activityType: 'pharmacy_owner',
      businessInfo: { storeAddress: null },
    });

    const w = bizWrite(calls)!;
    expect(w.sql).not.toContain("'{storeAddress}'");
    expect(w.payloads).toEqual([{ storeAddress: null }]);
  });

  it('모든 write 는 하나의 transaction 안에서 나간다 (기존 원자성 계약)', async () => {
    await runController({
      activityType: 'pharmacy_employee',
      businessInfo: { businessName: 'NEW-NAME' },
    });

    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });
});
