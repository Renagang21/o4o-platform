/**
 * WO-O4O-KCOS-STORE-CHANNEL-ASSET-TENANT-CANONICAL-CLOSURE-V1
 *
 * K-Cosmetics 가 KPA 전용 자산 통제 축(`/store-assets` · `kpa_store_asset_controls`)에
 * 더 이상 의존하지 않음을 소스 계약으로 고정한다.
 *
 *   §1 backend  — cosmetics.routes 가 createStoreAssetControlController 를 마운트/import 하지 않는다 (→ PHASE1B: 라우터 자체 제거)
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

describe('§1 backend — cosmetics 라우터는 제거됐다 (WO-O4O-KCOSMETICS-RETIREMENT-PHASE1B-STORE-API-ADMIN-V1)', () => {
  it('routes/cosmetics/cosmetics.routes.ts 없음 → KPA 자산 통제 컨트롤러 마운트 0', () => {
    expect(existsSync(join(REPO, 'apps/api-server/src/routes/cosmetics/cosmetics.routes.ts'))).toBe(false);
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

// §3 · §4 (web-k-cosmetics 앱 소스 단언)은 앱 퇴역 삭제로 제거했다 —
//   WO-O4O-KCOSMETICS-RETIREMENT-PHASE1A-WEB-APP-AND-DEPLOY-TARGET-V1. backend · 공통 View 계약은 유지.

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
  it('StoreChannelsView 의 앱 소비처는 0이다 (K-Cosmetics 매장 화면 퇴역 · KPA 는 자체 페이지)', () => {
    // 마지막 소비처였던 web-store 의 K-Cosmetics 매장 화면은 WO-O4O-KCOSMETICS-RETIREMENT-PHASE1B-STORE-API-ADMIN-V1 에서 제거됐다.
    //   View 본체(store-ui-core) 정리는 후속 후보다(공통 모듈 — 이번 범위 밖).
    expect(existsSync(join(REPO, 'services/web-store/src/services/kcos/pages/store/StoreChannelsPage.tsx'))).toBe(false);
    const kpa = read('services/web-kpa-society/src/pages/pharmacy/StoreChannelsPage.tsx');
    expect(kpa).not.toMatch(/StoreChannelsView/);
  });
});
