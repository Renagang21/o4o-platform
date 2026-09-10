/**
 * WO-O4O-KCOS-LIBRARY-ORGANIZATION-SCOPE-AND-SNAPSHOT-ROUTE-CLOSURE-V1
 *
 * K-Cosmetics 자료함(asset snapshot)의 tenant scope 계약을 회귀 고정한다.
 *
 *   결함: cosmetics.routes.ts 가 /assets 에 KPA 전용 컨트롤러를 마운트해
 *         KCos 자료함이 사용자의 **KPA 조직** 스냅샷을 돌려줬다.
 *
 *   §1 route  — /assets 는 KCos 컨트롤러를 마운트하고 KPA 컨트롤러를 import 하지 않는다
 *   §2 org    — KCos organizationId 만 해석한다. KPA fallback(kpa_members) 없음
 *   §3 source — resolver 는 KCos serviceKey 만 통과시킨다. kpa_contents 경로 없음
 *   §4 KPA    — KPA 컨트롤러는 변경되지 않았다 (회귀 아님을 소스로 고정)
 *
 * DB 는 붙이지 않는다.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

jest.mock('../utils/store-owner.utils.js', () => ({
  isStoreOwner: jest.fn(),
}));
// dist 가 ESM 이라 ts-jest 가 변환하지 못한다. 이 spec 은 팩토리 자체를 실행하지 않고
// org 해석·resolver·소스 계약만 검사하므로 팩토리는 stub 으로 충분하다.
jest.mock('@o4o/asset-copy-core', () => ({
  createAssetCopyController: jest.fn(() => ({})),
}), { virtual: true });

import { isStoreOwner } from '../utils/store-owner.utils.js';
import {
  resolveCosmeticsOrgId,
  COSMETICS_ASSET_SNAPSHOT_ROLES,
  COSMETICS_ASSET_SNAPSHOT_TYPES,
} from '../routes/o4o-store/controllers/cosmetics-asset-snapshot.controller.js';
import {
  CosmeticsAssetResolver,
  COSMETICS_CMS_SERVICE_KEYS,
  COSMETICS_SIGNAGE_SERVICE_KEY,
  COSMETICS_SOURCE_SERVICE,
} from '../modules/asset-snapshot/resolvers/cosmetics-asset.resolver.js';

const SRC = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf-8');
/**
 * 주석 줄만 걷어낸다. 블록 주석을 정규식으로 지우면 route glob 문자열('/*') 을 주석 시작으로
 * 오인해 파일 뒷부분을 통째로 삼킨다 — 줄 단위로 `//` · `*` · `/*` 로 시작하는 줄만 버린다.
 */
const stripComments = (s: string) =>
  s
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
    .join('\n');

const KCOS_ORG = 'e3d14288-5de5-4fe9-8326-044b36bb741d';
const KPA_ORG = '9c87f46b-57a1-4afe-80bd-60782c49ce96';
const USER = '6967ebe0-2f87-4cab-809b-8c7190493cef';

// ─────────────────────────────────────────────────────────────────────────────
describe('§1 route — /assets 마운트가 KCos 컨트롤러로 바뀌었다', () => {
  const src = stripComments(read('routes/cosmetics/cosmetics.routes.ts'));

  it('/assets 에 createCosmeticsAssetSnapshotController 를 마운트한다', () => {
    expect(src).toMatch(/router\.use\(\s*'\/assets'\s*,\s*createCosmeticsAssetSnapshotController\(/);
  });

  it('KPA 전용 createAssetSnapshotController 를 더 이상 import 하지 않는다', () => {
    expect(src).not.toMatch(/\bcreateAssetSnapshotController\b/);
    // 'cosmetics-asset-snapshot.controller.js' 와 구분하기 위해 경로 구분자를 앞에 둔다.
    expect(src).not.toMatch(/\/asset-snapshot\.controller\.js/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('§2 org — KCos organizationId 만 해석한다', () => {
  beforeEach(() => jest.mocked(isStoreOwner).mockReset());

  it("isStoreOwner 를 serviceKey='cosmetics' 로만 부른다", async () => {
    jest.mocked(isStoreOwner).mockResolvedValue({ isStoreOwner: true, organizationId: KCOS_ORG } as any);
    const ds: any = { getRepository: jest.fn(), query: jest.fn() };
    const org = await resolveCosmeticsOrgId(ds, USER);
    expect(org).toBe(KCOS_ORG);
    expect(isStoreOwner).toHaveBeenCalledTimes(1);
    expect(jest.mocked(isStoreOwner).mock.calls[0][2]).toBe('cosmetics');
  });

  it('KCos store_owner 가 아니면 null — KPA 조직으로 대신 채우지 않는다', async () => {
    jest.mocked(isStoreOwner).mockResolvedValue({ isStoreOwner: false, organizationId: null } as any);
    const ds: any = { getRepository: jest.fn(), query: jest.fn() };
    const org = await resolveCosmeticsOrgId(ds, USER);
    expect(org).toBeNull();
    // KPA fallback 경로(kpa_members repository / raw query) 를 전혀 밟지 않는다.
    expect(ds.getRepository).not.toHaveBeenCalled();
    expect(ds.query).not.toHaveBeenCalled();
  });

  it("같은 사용자가 KPA 조직도 갖고 있어도 'kpa' 로 조회하지 않는다", async () => {
    jest.mocked(isStoreOwner).mockImplementation(async (_ds: any, _u: string, svc?: string) =>
      svc === 'kpa'
        ? ({ isStoreOwner: true, organizationId: KPA_ORG } as any)
        : ({ isStoreOwner: false, organizationId: null } as any),
    );
    const org = await resolveCosmeticsOrgId({} as any, USER);
    expect(org).toBeNull();
    for (const c of jest.mocked(isStoreOwner).mock.calls) expect(c[2]).not.toBe('kpa');
  });

  it('컨트롤러 소스에 KPA 심볼이 없다 (KpaMember · resolveKpaOrgId · kpa_members)', () => {
    const src = stripComments(read('routes/o4o-store/controllers/cosmetics-asset-snapshot.controller.ts'));
    expect(src).not.toMatch(/KpaMember|resolveKpaOrgId|kpa_members|'kpa'/);
  });

  it('role allowlist 는 cosmetics:* 만이고, asset type allowlist 는 KPA 와 같은 7종이다', () => {
    for (const r of COSMETICS_ASSET_SNAPSHOT_ROLES) expect(r.startsWith('cosmetics:')).toBe(true);
    expect([...COSMETICS_ASSET_SNAPSHOT_TYPES].sort()).toEqual(
      ['blog', 'cms', 'content', 'pop', 'qr', 'resource', 'signage'],
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('§3 source — resolver 는 KCos 자산만 통과시킨다', () => {
  function makeDs(opts: { cmsRow?: any; signageRows?: any[] } = {}) {
    const findOne = jest.fn(async () => opts.cmsRow ?? null);
    const ds: any = {
      getRepository: jest.fn(() => ({ findOne })),
      query: jest.fn(async () => opts.signageRows ?? []),
      findOne,
    };
    return ds;
  }

  it('cms 는 KCos serviceKey 집합으로만 조회한다 (kpa · kpa-society 없음)', async () => {
    const ds = makeDs({ cmsRow: null });
    await new CosmeticsAssetResolver(ds).resolve('cms-1', 'cms');
    const where = (ds.findOne.mock.calls[0][0] as any).where;
    expect(where.status).toBe('published');
    // TypeORM In() 은 { _type: 'in', _value: [...] } 형태다.
    const keys: string[] = where.serviceKey?._value ?? where.serviceKey;
    expect([...keys].sort()).toEqual([...COSMETICS_CMS_SERVICE_KEYS].sort());
    expect(keys).not.toContain('kpa');
    expect(keys).not.toContain('kpa-society');
  });

  it("signage 는 serviceKey='k-cosmetics' 를 바인딩하고 HUB 공유 3원천만 허용한다", async () => {
    const ds = makeDs({ signageRows: [] });
    await new CosmeticsAssetResolver(ds).resolve('media-1', 'signage');
    const [sql, params] = ds.query.mock.calls[0];
    expect(params).toEqual(['media-1', COSMETICS_SIGNAGE_SERVICE_KEY]);
    expect(String(sql)).toContain('"serviceKey" = $2');
    expect(String(sql)).toContain("\"source\" IN ('hq', 'supplier', 'community')");
    expect(String(sql)).toContain("\"scope\" = 'global'");
    expect(String(sql)).not.toContain('kpa-society');
  });

  it("content(kpa_contents) 는 KCos 에 원장이 없으므로 조회 없이 null", async () => {
    const ds = makeDs();
    const r = await new CosmeticsAssetResolver(ds).resolve('c-1', 'content');
    expect(r).toBeNull();
    expect(ds.query).not.toHaveBeenCalled();
    expect(ds.getRepository).not.toHaveBeenCalled();
  });

  it("복사본의 sourceService 는 'cosmetics' 로 기록된다", async () => {
    const ds = makeDs({
      cmsRow: { id: 'cms-1', title: 'T', type: 'article', summary: null, body: '<p/>', imageUrl: null, linkUrl: null, linkText: null, metadata: null },
    });
    const r = await new CosmeticsAssetResolver(ds).resolve('cms-1', 'cms');
    expect(r?.sourceService).toBe(COSMETICS_SOURCE_SERVICE);
    expect(r?.sourceService).not.toBe('kpa');
  });

  it('resolver 소스에 kpa_contents 조회가 없다', () => {
    const src = stripComments(read('modules/asset-snapshot/resolvers/cosmetics-asset.resolver.ts'));
    expect(src).not.toMatch(/kpa_contents|kpa-society|'kpa'/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('§4 KPA — KPA 컨트롤러·라우트는 변경되지 않았다', () => {
  it('asset-snapshot.controller.ts 는 여전히 KPA 계약이다', () => {
    const src = stripComments(read('routes/o4o-store/controllers/asset-snapshot.controller.ts'));
    expect(src).toMatch(/sourceService:\s*'kpa'/);
    expect(src).toMatch(/resolveOrgId:\s*resolveKpaOrgId/);
    expect(src).toMatch(/isStoreOwner\(dataSource,\s*userId,\s*'kpa'\)/);
  });

  it('kpa.routes.ts 는 여전히 KPA 컨트롤러를 마운트한다', () => {
    const src = stripComments(read('routes/kpa/kpa.routes.ts'));
    expect(src).toMatch(/createAssetSnapshotController\(/);
    expect(src).not.toMatch(/createCosmeticsAssetSnapshotController/);
  });
});
