/**
 * WO-O4O-KCOS-STORE-CONTENTS-WRAPPER-AND-DEAD-ASSET-MOUNT-CLOSURE-V1
 *
 * K-Cosmetics /store-contents 의 tenant scope 계약 + dead asset mount 제거를 회귀 고정한다.
 *
 *   결함: cosmetics.routes.ts 가 /store-contents 에 공통(KPA 하드와이어) 컨트롤러를 마운트해
 *         KCos 화면이 사용자의 **KPA 조직** 콘텐츠를 돌려줬다.
 *
 *   §1 route  — KCos /store-contents 는 KCos wrapper 를 마운트하고 공통 컨트롤러를 import 하지 않는다
 *   §2 org    — wrapper 는 isStoreOwner('cosmetics') 만 쓴다. KPA fallback(kpa_members) 없음
 *               같은 userId 라도 KCos 요청은 KCos 조직으로만 해석된다 (실제 핸들러 실행)
 *   §3 mounts — KCos /published-assets · Neture /store-assets dead mount 가 없다
 *   §4 KPA    — KPA · PH 컨트롤러·라우트는 변경되지 않았다 (회귀 아님을 소스로 고정)
 *   §5 core   — 공용 store-content.service 에 serviceKey 분기가 없다
 *
 * DB 는 붙이지 않는다.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

jest.mock('../utils/store-owner.utils.js', () => ({
  isStoreOwner: jest.fn(),
}));
jest.mock('../services/store/store-content.service.js', () => ({
  listStoreContents: jest.fn(),
  createDirectContent: jest.fn(),
  getDirectContent: jest.fn(),
  updateDirectContent: jest.fn(),
  deleteDirectContent: jest.fn(),
}));

import { isStoreOwner } from '../utils/store-owner.utils.js';
import { listStoreContents, createDirectContent } from '../services/store/store-content.service.js';
import { createCosmeticsStoreContentController } from '../routes/o4o-store/controllers/cosmetics-store-content.controller.js';

const SRC = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf-8');
const stripComments = (s: string) =>
  s
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
    .join('\n');

const KCOS_ORG = 'e3d14288-5de5-4fe9-8326-044b36bb741d';
const USER = '6967ebe0-2f87-4cab-809b-8c7190493cef';

// ─────────────────────────────────────────────────────────────────────────────
describe('§1 route — KCos /store-contents 마운트가 KCos wrapper 로 바뀌었다', () => {
  const src = stripComments(read('routes/cosmetics/cosmetics.routes.ts'));

  it('/store-contents 에 createCosmeticsStoreContentController 를 마운트한다', () => {
    expect(src).toMatch(/router\.use\(\s*'\/store-contents'\s*,\s*createCosmeticsStoreContentController\(/);
  });

  it('공통(KPA 하드와이어) createStoreContentController 를 import 하지 않는다', () => {
    expect(src).not.toMatch(/createStoreContentController/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('§2 org — wrapper 는 KCos 조직만 해석한다', () => {
  const ctrlSrc = stripComments(read('routes/o4o-store/controllers/cosmetics-store-content.controller.ts'));

  it("isStoreOwner 를 serviceKey='cosmetics' 로만 호출한다", () => {
    expect(ctrlSrc).toMatch(/isStoreOwner\(dataSource,\s*userId,\s*'cosmetics'\)/);
    expect(ctrlSrc).not.toMatch(/'kpa'/);
  });

  it('kpa_members(KpaMember) fallback 이 없다', () => {
    expect(ctrlSrc).not.toMatch(/KpaMember|kpa_members/);
  });

  /** express Router 를 직접 실행한다 — 핸들러 하나를 꺼내 req/res 를 흉내낸다. */
  function handlerFor(method: 'get' | 'post', path: string) {
    const router: any = createCosmeticsStoreContentController({} as any, ((_req: any, _res: any, next: any) => next()) as any);
    const layer = router.stack.find((l: any) => l.route?.path === path && l.route.methods[method]);
    if (!layer) throw new Error(`route not found: ${method} ${path}`);
    const handlers = layer.route.stack.map((s: any) => s.handle);
    return handlers[handlers.length - 1];
  }
  function mockRes() {
    const res: any = { statusCode: 200 };
    res.status = jest.fn((c: number) => { res.statusCode = c; return res; });
    res.json = jest.fn((b: unknown) => { res.body = b; return res; });
    return res;
  }

  beforeEach(() => jest.clearAllMocks());

  it('GET / — 같은 userId 라도 KCos 조직으로만 목록을 조회한다', async () => {
    (isStoreOwner as jest.Mock).mockResolvedValue({ isOwner: true, organizationId: KCOS_ORG });
    (listStoreContents as jest.Mock).mockResolvedValue([]);
    const res = mockRes();
    await handlerFor('get', '/')({ user: { id: USER } } as any, res);
    expect(isStoreOwner).toHaveBeenCalledWith({}, USER, 'cosmetics');
    expect(listStoreContents).toHaveBeenCalledWith({}, KCOS_ORG);
    expect(res.body).toEqual({ success: true, data: [] });
  });

  it('GET / — KCos 조직이 없으면 403 NO_ORG (KPA 조직으로 대체하지 않는다)', async () => {
    (isStoreOwner as jest.Mock).mockResolvedValue({ isOwner: false, organizationId: null });
    const res = mockRes();
    await handlerFor('get', '/')({ user: { id: USER } } as any, res);
    expect(res.statusCode).toBe(403);
    expect(res.body.error.code).toBe('NO_ORG');
    expect(listStoreContents).not.toHaveBeenCalled();
  });

  it('POST / — cosmetics:store_owner 가 아니면 403 STORE_OWNER_REQUIRED', async () => {
    (isStoreOwner as jest.Mock).mockResolvedValue({ isOwner: false, organizationId: KCOS_ORG });
    const res = mockRes();
    await handlerFor('post', '/')({ user: { id: USER }, body: { title: 'x' } } as any, res);
    expect(res.statusCode).toBe(403);
    expect(res.body.error.code).toBe('STORE_OWNER_REQUIRED');
    expect(createDirectContent).not.toHaveBeenCalled();
  });

  it('POST / — 통과 시 공용 service 를 KCos 조직으로 호출한다', async () => {
    (isStoreOwner as jest.Mock).mockResolvedValue({ isOwner: true, organizationId: KCOS_ORG });
    (createDirectContent as jest.Mock).mockResolvedValue({ ok: true, data: { id: 'c1' } });
    const res = mockRes();
    await handlerFor('post', '/')({ user: { id: USER }, body: { title: 'x' } } as any, res);
    expect(createDirectContent).toHaveBeenCalledWith({}, KCOS_ORG, USER, { title: 'x' });
    expect(res.statusCode).toBe(201);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('§3 mounts — dead asset mount 가 제거됐다', () => {
  it('KCos 는 /published-assets 를 마운트하지 않는다', () => {
    const src = stripComments(read('routes/cosmetics/cosmetics.routes.ts'));
    expect(src).not.toMatch(/published-assets|createPublishedAssetsController/);
  });

  it('Neture 는 /store-assets 를 마운트하지 않는다', () => {
    const src = stripComments(read('routes/neture/neture.routes.ts'));
    expect(src).not.toMatch(/'\/store-assets'|createStoreAssetControlController/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('§4 KPA · PH — 기존 컨트롤러·라우트는 변경되지 않았다', () => {
  it('공통 store-content.controller.ts 는 여전히 KPA 계약이다', () => {
    const src = stripComments(read('routes/o4o-store/controllers/store-content.controller.ts'));
    expect(src).toMatch(/isStoreOwner\(dataSource,\s*userId,\s*'kpa'\)/);
    expect(src).toMatch(/KpaMember/);
  });

  it('kpa.routes.ts 는 여전히 공통 컨트롤러 + /published-assets + /store-assets 를 마운트한다', () => {
    const src = stripComments(read('routes/kpa/kpa.routes.ts'));
    expect(src).toMatch(/router\.use\(\s*'\/store-contents'\s*,\s*createStoreContentController\(/);
    expect(src).toMatch(/router\.use\(\s*'\/published-assets'\s*,\s*createPublishedAssetsController\(/);
    expect(src).toMatch(/router\.use\(\s*'\/store-assets'\s*,\s*createStoreAssetControlController\(/);
    expect(src).not.toMatch(/createCosmeticsStoreContentController/);
  });

  it('PH 는 여전히 자체 wrapper 로 공용 service 를 호출한다', () => {
    const src = stripComments(read('controllers/pharmacy-hub/PharmacyHubStoreContentController.ts'));
    expect(src).toMatch(/resolvePharmacyHubStoreOrganization/);
    expect(src).toMatch(/services\/store\/store-content\.service\.js/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('§5 core — 공용 service 에 serviceKey 분기가 없다', () => {
  it('store-content.service.ts 는 serviceKey · kpa/cosmetics 리터럴을 모른다', () => {
    const src = stripComments(read('services/store/store-content.service.ts'));
    expect(src).not.toMatch(/serviceKey|'cosmetics'|'kpa'/);
  });
});
