/**
 * WO-O4O-KCOS-LIBRARY-CONTENT-BD-CANONICAL-REALIGNMENT-V1
 *
 * KCos 자료함 '콘텐츠' 탭의 source 계약을 B+D 원장으로 고정한다.
 *
 *   결함: KCos StoreLibraryContentsPage 가 assetSnapshotApi.list({ type: 'content' })
 *         (= /cosmetics/assets → o4o_asset_snapshots · KPA 확장 계층 어휘)를 읽었고,
 *         공통 View 는 handoff origin 을 'snapshot' 으로 고정해 POP V2 resolver 와 어긋났다.
 *
 *   §1 source  — KCos 탭은 B(/cosmetics/store-contents) + D(/cosmetics/store/assets)만 읽는다.
 *                snapshot(/cosmetics/assets · assetSnapshotApi) · kpa_contents 의존 0
 *   §2 origin  — B → 'direct' · D → 'library' 로 POP V2 handoff origin 을 명시한다
 *                (V2 source resolver 어휘와 1:1). 'snapshot' 을 KCos 어댑터가 쓰지 않는다
 *   §3 core    — 공통 StoreLibraryContentsView 는 adapter origin 을 그대로 싣고,
 *                생략 시에만 'snapshot' 으로 되돌아간다(기존 소비처 무변경). serviceKey 분기 0
 *   §4 axis    — /store-assets(채널 통제) 축 · cms/signage snapshot copy 흐름은 손대지 않았다
 *   §5 backend — 이번 WO 는 backend·schema 무변경. resolver 가 'direct'/'library' 를 이미 읽는다
 *
 * raw-source spec — import graph 가 아니라 소스 문자열을 단언한다 (Shared Module Change Rule).
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = join(__dirname, '..');
const REPO = join(SRC, '..', '..', '..');
const read = (...p: string[]) => readFileSync(join(...p), 'utf-8');
const codeOnly = (s: string) => s.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

const KCOS = [REPO, 'services', 'web-k-cosmetics', 'src'];
const CORE_LIB = [REPO, 'packages', 'store-ui-core', 'src', 'components', 'library'];

describe('§1 source — KCos 콘텐츠 탭은 B+D 만 읽는다', () => {
  const page = codeOnly(read(...KCOS, 'pages', 'store', 'StoreLibraryContentsPage.tsx'));

  it('B: getStoreContents (/cosmetics/store-contents) 를 읽는다', () => {
    expect(page).toMatch(/import \{ getStoreContents \} from '\.\.\/\.\.\/api\/storeProductionSources'/);
    const sources = codeOnly(read(...KCOS, 'api', 'storeProductionSources.ts'));
    expect(sources).toMatch(/export async function getStoreContents\(/);
    expect(sources).toMatch(/api\.get\('\/cosmetics\/store-contents'\)/);
  });

  it('D: getStoreExecutionAssets (/cosmetics/store/assets) 를 읽는다', () => {
    expect(page).toMatch(/import \{ getStoreExecutionAssets \} from '\.\.\/\.\.\/api\/storeExecutionAssets'/);
    expect(page).toMatch(/isActive !== false/);
  });

  it('snapshot 계층(assetSnapshotApi · /cosmetics/assets · type=content) 을 읽지 않는다', () => {
    expect(page).not.toMatch(/assetSnapshotApi|\/cosmetics\/assets|type:\s*'content'/);
    expect(page).not.toMatch(/kpa_contents|kpaContent|storeAssetControlApi|\/store-assets/);
  });
});

describe('§2 origin — POP V2 handoff origin 이 원장과 1:1 이다', () => {
  const page = codeOnly(read(...KCOS, 'pages', 'store', 'StoreLibraryContentsPage.tsx'));

  it("B 행은 origin 'direct', D 행은 origin 'library'", () => {
    expect(page).toMatch(/origin:\s*'direct' as const/);
    expect(page).toMatch(/origin:\s*'library' as const/);
  });

  it("KCos 어댑터는 'snapshot' origin 을 만들지 않는다", () => {
    expect(page).not.toMatch(/'snapshot'/);
  });

  it('resolver 어휘와 일치한다 (handoff CONTENT_ORIGINS ⊇ direct · library)', () => {
    const handoff = codeOnly(read(REPO, 'packages', 'store-ui-core', 'src', 'components', 'pop-v2', 'handoff.ts'));
    expect(handoff).toMatch(/CONTENT_ORIGINS[^\n]*=\s*\[[^\]]*'direct'[^\]]*'library'/);
  });
});

describe('§3 core — 공통 View 는 additive 계약만 바뀌었다', () => {
  const view = codeOnly(read(...CORE_LIB, 'StoreLibraryContentsView.tsx'));
  const types = codeOnly(read(...CORE_LIB, 'types.ts'));

  it("origin 은 optional 이고 생략 시 'snapshot' (기존 소비처 동작 유지)", () => {
    expect(types).toMatch(/origin\?:\s*StoreLibraryContentOrigin/);
    expect(types).toMatch(/StoreLibraryContentOrigin = 'snapshot' \| 'direct' \| 'library'/);
    expect(view).toMatch(/origin:\s*item\.origin \?\? 'snapshot'/);
  });

  it('공통 library 컴포넌트에 serviceKey · 서비스명 분기가 없다', () => {
    for (const f of ['StoreLibraryContentsView.tsx', 'StoreLibraryContentRow.tsx', 'libraryHelpers.ts', 'types.ts']) {
      const s = codeOnly(read(...CORE_LIB, f));
      expect(s).not.toMatch(/serviceKey|'cosmetics'|'kpa'|k-cosmetics|pharmacy-hub/);
    }
  });
});

describe('§4 axis — 범위 밖 축은 무변경', () => {
  it('KCos /store-assets 화면은 여전히 storeAssetControlApi 를 쓴다 (채널 통제 축)', () => {
    const s = codeOnly(read(...KCOS, 'pages', 'store', 'StoreAssetsPage.tsx'));
    expect(s).toMatch(/storeAssetControlApi/);
  });

  it('HUB cms · signage copy 는 여전히 assetSnapshotApi.copy 를 쓴다', () => {
    expect(codeOnly(read(...KCOS, 'pages', 'hub', 'HubContentPage.tsx'))).toMatch(/assetSnapshotApi\.copy\(/);
    expect(codeOnly(read(...KCOS, 'pages', 'hub', 'HubSignagePage.tsx'))).toMatch(/assetSnapshotApi\.copy\(/);
  });

  it('cosmetics.routes.ts 마운트는 무변경 (/store-contents wrapper · /store/assets · /store-assets · /assets)', () => {
    const r = codeOnly(read(SRC, 'routes', 'cosmetics', 'cosmetics.routes.ts'));
    expect(r).toMatch(/router\.use\(\s*'\/store-contents'\s*,\s*createCosmeticsStoreContentController\(/);
    expect(r).toMatch(/createStoreExecutionAssetsController\(dataSource,[^)]*'cosmetics'\)/);
    expect(r).toMatch(/router\.use\(\s*'\/store-assets'/);
    expect(r).toMatch(/router\.use\(\s*'\/assets'/);
  });
});

describe('§5 backend — V2 resolver 는 direct · library 를 조직 축으로 읽는다', () => {
  const svc = codeOnly(read(SRC, 'services', 'store', 'pop-v2-source.service.ts'));
  it("'direct' → KpaStoreContent (id, organization_id)", () => {
    expect(svc).toMatch(/origin === 'direct'[\s\S]{0,300}where:\s*\{\s*id,\s*organization_id:\s*organizationId\s*\}/);
  });
  it("'library' → StoreExecutionAsset (id, organizationId)", () => {
    expect(svc).toMatch(/origin === 'library'[\s\S]{0,300}where:\s*\{\s*id,\s*organizationId\s*\}/);
  });
});
