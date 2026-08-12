/**
 * WO-O4O-BUSINESSINFO-JSON-COLUMN-CONCAT-RUNTIME-FAILURE-FIX-V1
 *
 * KPA 약국 기본 정보 수정(`PUT /pharmacy/info`)의 P2/P4 필드
 * (`businessType` / `businessItem` / `businessEntityType` / `businessStartDate`) write 를 고정한다.
 *
 * 회귀 대상 (사용자 영향이 가장 컸던 경로):
 *   D-1  `COALESCE("businessInfo", '{}'::jsonb)` 가 json 컬럼과 맞지 않아 **항상 실패**했다.
 *   D-2  그 실패를 catch 로 **삼킨 뒤**, 저장 전 값을 다시 읽어 `success: true` 로 반환했다.
 *        → 운영자는 업태·종목·사업자유형·개업일이 저장된 줄 알지만 값은 그대로였다.
 *
 * 판정 계약:
 *   - 읽기 `"businessInfo"::jsonb` 명시 캐스트 + 최종 `::json` 복귀.
 *   - P2/P4 write 실패는 더 이상 삼켜지지 않는다 (asyncHandler 로 전파).
 *   - organizations SSOT write / 응답 계약 / 감사 로그는 그대로다.
 */

jest.mock('@o4o/platform-core/store-identity', () => ({
  StoreSlugService: jest.fn().mockImplementation(() => ({
    findByStoreId: jest.fn().mockResolvedValue({ slug: 'my-pharmacy' }),
  })),
}), { virtual: true });

jest.mock('../../../../utils/store-owner.utils.js', () => ({
  createRequireStoreOwner: () => (_req: any, _res: any, next: any) => next(),
  isStoreOwner: jest.fn(),
}));

import { createPharmacyInfoController } from '../pharmacy-info.controller.js';

const USER_ID = '22222222-3333-4444-8555-666666666666';
const ORG_ID = '33333333-4444-4555-8666-777777777777';

type Call = { sql: string; params: any[] };

function makeHarness(options: { failOnBizWrite?: boolean } = {}) {
  const calls: Call[] = [];
  const org: any = {
    id: ORG_ID, name: '테스트약국', phone: '0212345678',
    business_number: '111-22-33333', address: '서울시', address_detail: null,
    metadata: {},
  };

  const orgRepo = {
    findOne: jest.fn().mockResolvedValue(org),
    save: jest.fn(async (v: any) => v),
  };
  const auditRepo = {
    create: jest.fn((v: any) => v),
    save: jest.fn(async (v: any) => v),
  };

  const dataSource: any = {
    getRepository: (entity: any) => {
      const name = typeof entity === 'string' ? entity : entity?.name ?? String(entity);
      return name.includes('Audit') ? auditRepo : orgRepo;
    },
    query: async (sql: string, params: any[] = []) => {
      const n = String(sql).replace(/\s+/g, ' ').trim();
      calls.push({ sql: n, params });
      if (options.failOnBizWrite && /^UPDATE users/i.test(n)) throw new Error('INJECTED_FAILURE');
      if (/^SELECT "businessInfo" FROM users/i.test(n)) {
        return [{ businessInfo: { businessType: 'OLD-TYPE', sentinelRoot: 'KEEP-ME' } }];
      }
      return [];
    },
  };

  const router: any = createPharmacyInfoController(
    dataSource,
    ((_req: any, _res: any, next: any) => next()) as any,
    'kpa',
  );
  const layer = router.stack.find(
    (l: any) => l.route?.path === '/info' && l.route?.methods?.put,
  );
  const stack = layer.route.stack;
  return { handler: stack[stack.length - 1].handle, calls, orgRepo, auditRepo };
}

function makeRes() {
  const res: any = { statusCode: 200 };
  res.status = jest.fn((c: number) => { res.statusCode = c; return res; });
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

/**
 * asyncHandler 는 promise 를 반환하지 않는다 (`Promise.resolve(fn()).catch(next)` — fire-and-forget).
 * 따라서 호출 후 이벤트 루프를 비워야 실제 동작이 끝난다.
 */
async function invoke(handler: any, request: any, res: any, next: any): Promise<void> {
  handler(request, res, next);
  for (let i = 0; i < 5; i += 1) await new Promise((r) => setImmediate(r));
}

const req = (body: Record<string, any>) => ({
  user: { id: USER_ID, roles: ['kpa:store_owner'] },
  organizationId: ORG_ID,
  body: { name: '테스트약국', ...body },
}) as any;

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

describe('PUT /pharmacy/info — P2/P4 businessInfo write', () => {
  it('D-1 회귀: json 컬럼에 맞는 명시 캐스트를 쓴다', async () => {
    const h = makeHarness();
    const next = jest.fn();

    await invoke(h.handler, req({ businessType: '도소매', businessItem: '의약품' }), makeRes(), next);

    const w = bizWrite(h.calls)!;
    expect(w.sql).toContain('"businessInfo"::jsonb');
    expect(w.sql).toContain('::json');
    expect(w.sql).not.toMatch(/COALESCE\(\s*"businessInfo"\s*,/i);
    expect(next).not.toHaveBeenCalled();
  });

  it('요청이 보낸 P2/P4 키만 patch 로 나간다 (나머지 키 보존)', async () => {
    const h = makeHarness();
    await invoke(h.handler, req({ businessEntityType: 'individual' }), makeRes(), jest.fn());

    const w = bizWrite(h.calls)!;
    expect(w.payloads).toEqual([{ businessEntityType: 'individual' }]);
    expect(w.payloads[0]).not.toHaveProperty('sentinelRoot');
  });

  it('D-2 회귀: write 실패를 삼키고 200 을 반환하지 않는다', async () => {
    const h = makeHarness({ failOnBizWrite: true });
    const res = makeRes();
    const next = jest.fn();

    await invoke(h.handler, req({ businessType: '도소매' }), res, next);

    // asyncHandler 로 전파되어 오류 미들웨어가 처리한다
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'INJECTED_FAILURE' }));
    // 거짓 성공 응답이 나가지 않는다
    expect(res.json).not.toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('P2/P4 키가 없으면 businessInfo write 자체가 없다 (organizations 수정은 그대로)', async () => {
    const h = makeHarness();
    const res = makeRes();

    await invoke(h.handler, req({ phone: '0299998888' }), res, jest.fn());

    expect(bizWrite(h.calls)).toBeNull();
    expect(h.orgRepo.save).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('응답 계약과 감사 로그는 그대로다', async () => {
    const h = makeHarness();
    const res = makeRes();

    await invoke(h.handler, req({ businessType: '도소매' }), res, jest.fn());

    expect(h.auditRepo.save).toHaveBeenCalledTimes(1);
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data).toEqual(expect.objectContaining({
      organizationId: ORG_ID,
      storeSlug: 'my-pharmacy',
    }));
  });
});
