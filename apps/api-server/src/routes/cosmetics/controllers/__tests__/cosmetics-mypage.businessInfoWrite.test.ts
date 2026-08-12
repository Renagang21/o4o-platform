/**
 * WO-O4O-BUSINESSINFO-JSON-COLUMN-CONCAT-RUNTIME-FAILURE-FIX-V1
 *
 * K-Cosmetics 마이페이지 사업자 정보 수정의 `users."businessInfo"` write 고정.
 * 회귀 대상·판정 계약은 GlycoPharm 쌍둥이 테스트와 동일하다
 * (`routes/glycopharm/controllers/__tests__/mypage.businessInfoWrite.test.ts`).
 *
 * 추가 판정: 두 서비스는 서로의 고유 키를 쓰지 않는다
 *   GlycoPharm = `pharmacyName` / K-Cosmetics = `storeName`.
 */

const mockIsStoreOwner = jest.fn();

jest.mock('../../../../utils/store-owner.utils.js', () => ({
  isStoreOwner: (...args: any[]) => mockIsStoreOwner(...args),
  createRequireStoreOwner: jest.fn(),
}));

import { createCosmeticsMypageController } from '../cosmetics-mypage.controller.js';

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

  const router: any = createCosmeticsMypageController(
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

describe('PATCH /cosmetics/mypage/business-info — json 컬럼 안전 갱신', () => {
  it('회귀: COALESCE(jsonb) 대신 명시 캐스트를 쓴다 (프로덕션 500 해소)', async () => {
    const h = makeHarness();
    const res = makeRes();

    await h.handler(req({ businessName: 'NEW-NAME' }), res);

    const w = bizWrite(h.calls)!;
    expect(w.sql).toContain('"businessInfo"::jsonb');
    expect(w.sql).toContain('::json');
    expect(w.sql).not.toMatch(/COALESCE\(\s*"businessInfo"\s*,/i);
    expect(res.status).not.toHaveBeenCalledWith(500);
  });

  it('요청이 보낸 키만 patch 로 나간다 (나머지 키 보존)', async () => {
    const h = makeHarness();
    await h.handler(req({ storeName: 'NEW-STORE' }), makeRes());

    const w = bizWrite(h.calls)!;
    expect(w.payloads).toEqual([{ storeName: 'NEW-STORE' }]);
    expect(w.payloads[0]).not.toHaveProperty('sentinelRoot');
  });

  it('서비스 경계: K-Cosmetics 는 storeName 을 쓰고 GlycoPharm 의 pharmacyName 을 쓰지 않는다', async () => {
    const h = makeHarness();
    await h.handler(req({ storeName: 'S', pharmacyName: '약국이름' }), makeRes());

    const w = bizWrite(h.calls)!;
    expect(w.payloads[0]).toHaveProperty('storeName', 'S');
    expect(w.payloads[0]).not.toHaveProperty('pharmacyName');
  });

  it('권한 가드는 그대로다 — 경영자가 아니면 403 이고 write 가 없다', async () => {
    mockIsStoreOwner.mockResolvedValue({ isOwner: false });
    const h = makeHarness();
    const res = makeRes();

    await h.handler(req({ storeName: 'X' }), res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(bizWrite(h.calls)).toBeNull();
  });

  it('write 실패는 삼켜지지 않는다 — 500 으로 관측된다', async () => {
    const h = makeHarness({ failOnWrite: true });
    const res = makeRes();

    await h.handler(req({ storeName: 'NEW-STORE' }), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});
