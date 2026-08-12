/**
 * WO-O4O-BUSINESSINFO-JSON-COLUMN-CONCAT-RUNTIME-FAILURE-FIX-V1
 *
 * GlycoPharm / K-Cosmetics 마이페이지 사업자 정보 수정의 `users."businessInfo"` write 를 고정한다.
 *
 * 회귀 대상:
 *   `COALESCE("businessInfo", '{}'::jsonb) || $2::jsonb` 는 컬럼 실제 타입이 **json** 이라
 *   프로덕션에서 항상 실패했다 (`COALESCE could not convert type jsonb to json`).
 *   두 서비스의 사업자 정보 수정이 늘 500 이었다.
 *
 * 판정 계약:
 *   - 읽기는 `"businessInfo"::jsonb` 명시 캐스트, 최종은 `::json` 복귀.
 *   - 요청이 보낸 키만 patch 로 나가고 나머지 키는 건드리지 않는다.
 *   - 응답 계약(projection)과 권한 가드(403)는 그대로다.
 *   - 두 서비스는 서로의 키를 쓰지 않는다 (경계 유지).
 */

const mockIsStoreOwner = jest.fn();

jest.mock('../../../../utils/store-owner.utils.js', () => ({
  isStoreOwner: (...args: any[]) => mockIsStoreOwner(...args),
  createRequireStoreOwner: jest.fn(),
}));

jest.mock('../../services/glycopharm-member.service.js', () => ({
  GlycopharmMemberService: jest.fn().mockImplementation(() => ({ getMyMembership: jest.fn() })),
}));

import { createGlycopharmMypageController } from '../mypage.controller.js';

const USER_ID = '22222222-3333-4444-8555-666666666666';

type Call = { sql: string; params: any[] };

function makeHarness(options: { failOnWrite?: boolean } = {}) {
  const calls: Call[] = [];
  const dataSource: any = {
    query: async (sql: string, params: any[] = []) => {
      const n = String(sql).replace(/\s+/g, ' ').trim();
      calls.push({ sql: n, params });
      if (options.failOnWrite && /^UPDATE users/i.test(n)) throw new Error('INJECTED_FAILURE');
      if (/^SELECT "businessInfo" FROM users/i.test(n)) {
        return [{ businessInfo: { businessNumber: '111-22-33333', sentinelRoot: 'KEEP-ME' } }];
      }
      return [];
    },
    getRepository: () => ({ find: jest.fn(), findOne: jest.fn() }),
  };

  const router: any = createGlycopharmMypageController(
    dataSource,
    ((_req: any, _res: any, next: any) => next()) as any,
  );
  const layer = router.stack.find(
    (l: any) => l.route?.path === '/business-info' && l.route?.methods?.patch,
  );
  const stack = layer.route.stack;
  return { handler: stack[stack.length - 1].handle, calls };
}

function makeRes() {
  const res: any = { statusCode: 200 };
  res.status = jest.fn((c: number) => { res.statusCode = c; return res; });
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const req = (body: Record<string, any>) => ({ user: { id: USER_ID }, body }) as any;

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

beforeEach(() => {
  jest.clearAllMocks();
  mockIsStoreOwner.mockResolvedValue({ isOwner: true });
});

describe('PATCH /glycopharm/mypage/business-info — json 컬럼 안전 갱신', () => {
  it('회귀: COALESCE(jsonb) 대신 명시 캐스트를 쓴다 (프로덕션 500 해소)', async () => {
    const h = makeHarness();
    const res = makeRes();

    await h.handler(req({ businessName: 'NEW-NAME' }), res);

    const w = bizWrite(h.calls)!;
    expect(w.sql).toContain('"businessInfo"::jsonb');
    expect(w.sql).toContain('::json');
    // 실패하던 형태가 사라졌다
    expect(w.sql).not.toMatch(/COALESCE\(\s*"businessInfo"\s*,/i);
    expect(res.status).not.toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('요청이 보낸 키만 patch 로 나간다 (나머지 키 보존)', async () => {
    const h = makeHarness();
    await h.handler(req({ businessType: '도소매', businessItem: '의약품' }), makeRes());

    const w = bizWrite(h.calls)!;
    expect(w.payloads).toEqual([{ businessType: '도소매', businessItem: '의약품' }]);
    expect(w.payloads[0]).not.toHaveProperty('sentinelRoot');
    expect(w.payloads[0]).not.toHaveProperty('businessNumber');
  });

  it('응답 projection 계약은 그대로다 (저장 후 재조회 값 반환)', async () => {
    const h = makeHarness();
    const res = makeRes();

    await h.handler(req({ businessName: 'NEW-NAME' }), res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data).toEqual(expect.objectContaining({
      businessRegistrationNumber: '111-22-33333',
    }));
  });

  it('권한 가드는 그대로다 — 경영자가 아니면 403 이고 write 가 없다', async () => {
    mockIsStoreOwner.mockResolvedValue({ isOwner: false });
    const h = makeHarness();
    const res = makeRes();

    await h.handler(req({ businessName: 'X' }), res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(bizWrite(h.calls)).toBeNull();
  });

  it('검증 오류는 그대로 400 이고 write 가 없다 (회귀)', async () => {
    const h = makeHarness();
    const res = makeRes();

    await h.handler(req({ taxInvoiceEmail: 'not-an-email' }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(bizWrite(h.calls)).toBeNull();
  });

  it('변경 키가 없으면 write 자체가 없다 (회귀)', async () => {
    const h = makeHarness();
    const res = makeRes();

    await h.handler(req({}), res);

    expect(bizWrite(h.calls)).toBeNull();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: null }));
  });

  it('write 실패는 삼켜지지 않는다 — 500 으로 관측된다', async () => {
    const h = makeHarness({ failOnWrite: true });
    const res = makeRes();

    await h.handler(req({ businessName: 'NEW-NAME' }), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});
