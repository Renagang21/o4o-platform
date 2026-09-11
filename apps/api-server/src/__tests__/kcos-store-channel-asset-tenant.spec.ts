/**
 * WO-O4O-KCOS-STORE-CHANNEL-ASSET-TENANT-CANONICAL-CLOSURE-V1
 *
 * K-Cosmetics 가 KPA 전용 자산 통제 축(`/store-assets` · `kpa_store_asset_controls`)에
 * 더 이상 의존하지 않음을 소스 계약으로 고정한다.
 *
 *   §1 backend  — cosmetics.routes 가 createStoreAssetControlController 를 마운트/import 하지 않는다
 *   §2 backend  — KPA 마운트는 그대로다 (KPA 회귀 아님)
 *   §3 frontend — web-k-cosmetics 에 /store-assets 호출·storeAssetControlApi 가 없다
 *   §4 frontend — StoreChannelsPage 는 자산 통제 3함수를 주입하지 않는다
 *   §5 view     — StoreChannelsView 의 자산 통제 축은 optional 이고, 없으면 listAssets 를 부르지 않는다
 *
 * DB·서버를 띄우지 않는다. raw-source 계약 + 순수 로직만 검사한다.
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const REPO = join(__dirname, '..', '..', '..', '..');
const read = (rel: string) => readFileSync(join(REPO, rel), 'utf-8');
const codeLines = (s: string) =>
  s.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');

describe('§1 backend — cosmetics 는 KPA 자산 통제 컨트롤러를 마운트하지 않는다', () => {
  const src = codeLines(read('apps/api-server/src/routes/cosmetics/cosmetics.routes.ts'));
  it('createStoreAssetControlController import 0', () => {
    expect(src).not.toMatch(/createStoreAssetControlController/);
  });
  it("router.use('/store-assets') 0", () => {
    expect(src).not.toMatch(/router\.use\(\s*'\/store-assets'/);
  });
});

describe('§2 backend — KPA 마운트는 변경되지 않았다', () => {
  const src = codeLines(read('apps/api-server/src/routes/kpa/kpa.routes.ts'));
  it("kpa.routes 는 여전히 '/store-assets' 를 마운트한다", () => {
    expect(src).toMatch(/router\.use\(\s*'\/store-assets',\s*createStoreAssetControlController\(/);
  });
  it('store-asset-control.controller 는 여전히 KPA 계약이다', () => {
    const c = codeLines(read('apps/api-server/src/routes/o4o-store/controllers/store-asset-control.controller.ts'));
    expect(c).toMatch(/isStoreOwner\(dataSource,\s*userId,\s*'kpa'\)/);
    expect(c).toMatch(/kpa_store_asset_controls/);
  });
});

describe('§3 frontend — web-k-cosmetics 에 자산 통제 호출이 없다', () => {
  const api = codeLines(read('services/web-k-cosmetics/src/api/assetSnapshot.ts'));
  it('storeAssetControlApi · /cosmetics/store-assets 0', () => {
    expect(api).not.toMatch(/storeAssetControlApi/);
    expect(api).not.toMatch(/\/store-assets/);
  });
  it('assetSnapshotApi(copy/list · /cosmetics/assets) 는 유지된다', () => {
    expect(api).toMatch(/assetSnapshotApi/);
    expect(api).toMatch(/\/cosmetics\/assets/);
  });
  it('StoreAssetsPage 는 redirect-only 다', () => {
    const p = codeLines(read('services/web-k-cosmetics/src/pages/store/StoreAssetsPage.tsx'));
    expect(p).toMatch(/<Navigate to="\/store\/library\/contents" replace \/>/);
    expect(p).not.toMatch(/storeAssetControlApi|StoreAssetsView/);
  });
});

describe('§4 frontend — StoreChannelsPage 는 자산 통제 축을 주입하지 않는다', () => {
  const p = codeLines(read('services/web-k-cosmetics/src/pages/store/StoreChannelsPage.tsx'));
  it('listAssets / updateAssetPublishStatus / updateAssetChannelMap 주입 0', () => {
    expect(p).not.toMatch(/\blistAssets\s*:/);
    expect(p).not.toMatch(/\bupdateAssetPublishStatus\s*:/);
    expect(p).not.toMatch(/\bupdateAssetChannelMap\s*:/);
    expect(p).not.toMatch(/storeAssetControlApi/);
  });
  it('채널 탭·상태·제품 노출 계약(A~D)은 그대로 주입한다', () => {
    for (const k of ['fetchChannelOverviewWithCode', 'fetchChannelOverview', 'createChannel', 'fetchChannelProducts', 'addProductToChannel']) {
      expect(p).toMatch(new RegExp('\\b' + k + '\\s*:'));
    }
  });
});

describe('§5 view — StoreChannelsView 자산 통제 축은 optional 이다', () => {
  const v = read('packages/store-ui-core/src/components/channels/StoreChannelsView.tsx');
  it('StoreChannelsApi 의 세 함수가 optional(?) 로 선언됐다', () => {
    expect(v).toMatch(/listAssets\?:\s*\(params/);
    expect(v).toMatch(/updateAssetPublishStatus\?:\s*\(/);
    expect(v).toMatch(/updateAssetChannelMap\?:\s*\(/);
  });
  it('listAssets 미주입이면 호출하지 않는다 (fetchData 분기)', () => {
    expect(v).toMatch(/api\.listAssets\s*\n?\s*\?\s*api\.listAssets\(\{ limit: 200 \}\)/);
  });
  it('자산 통제 KPI · [E] 리스트 · "전체 자산 보기" 는 hasAssetControl 로 게이트된다', () => {
    expect((v.match(/hasAssetControl/g) || []).length).toBeGreaterThanOrEqual(4);
    expect(v).toMatch(/\{!hasAssetControl \? null : currentTab\.assetKey \?/);
  });
  it('StoreChannelsView 의 소비처는 K-Cosmetics 1곳뿐이다 (KPA 는 자체 페이지)', () => {
    expect(existsSync(join(REPO, 'services/web-k-cosmetics/src/pages/store/StoreChannelsPage.tsx'))).toBe(true);
    const kpa = read('services/web-kpa-society/src/pages/pharmacy/StoreChannelsPage.tsx');
    expect(kpa).not.toMatch(/StoreChannelsView/);
  });
});
