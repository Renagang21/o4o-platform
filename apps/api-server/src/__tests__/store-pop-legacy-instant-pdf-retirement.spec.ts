/**
 * WO-O4O-STORE-POP-LEGACY-INSTANT-PDF-RETIREMENT-FINAL-CLOSURE-V1
 *
 * legacy 즉시 PDF POP 축을 제거하고 POP V2 만 매장 POP canonical 로 남긴 최종 상태를 회귀 고정한다.
 *
 *   §1 backend  — `store-pop.controller.ts` 파일·mount·`POST /pharmacy/pop/generate` route 0.
 *                 `pop-generator.service.ts` 는 V2 renderer 의존이므로 보존.
 *   §2 frontend — KPA/KCos legacy `StorePopPage` · `StorePopCreateModal` · `api/storePop.ts` 파일 0.
 *                 `/store/marketing/pop` 은 V2 redirect. 메뉴·가이드 route 는 pop-v2.
 *   §3 package  — `store-ui-core/components/pop`(legacy composer) 0. V2 스타일은 pop-v2 내부로 이관.
 *   §4 preserve — store_pops HUB 축(store-pop.service · pop.controller · operator-pop · PH) 과
 *                 POP V2 · store_execution_assets entity 는 그대로. schema 변경 0.
 *
 * DB 는 붙이지 않는다.
 */
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const SRC = join(__dirname, '..');
const REPO = join(SRC, '..', '..', '..');
const read = (...p: string[]) => readFileSync(join(...p), 'utf-8');
const codeOnly = (s: string) =>
  s
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
    .join('\n');

const KPA = join(REPO, 'services', 'web-kpa-society', 'src');
const KCOS = join(REPO, 'services', 'web-k-cosmetics', 'src');
const PH = join(REPO, 'services', 'web-pharmacy-hub', 'src');
const CORE = join(REPO, 'packages', 'store-ui-core', 'src');
const GUIDE = join(REPO, 'packages', 'shared-space-ui', 'src', 'guide', 'copy');

// ─────────────────────────────────────────────────────────────────────────────
describe('§1 backend — legacy generate 축 제거', () => {
  it('store-pop.controller.ts 는 존재하지 않는다', () => {
    expect(existsSync(join(SRC, 'routes', 'o4o-store', 'controllers', 'store-pop.controller.ts'))).toBe(false);
  });

  it('KPA / cosmetics / pharmacy-hub route 에 createStorePopController mount 가 없다', () => {
    for (const f of ['kpa/kpa.routes.ts', 'cosmetics/cosmetics.routes.ts', 'pharmacy-hub/pharmacy-hub.routes.ts']) {
      expect(codeOnly(read(SRC, 'routes', f))).not.toMatch(/createStorePopController|store-pop\.controller/);
    }
  });

  it("어떤 controller 도 '/pharmacy/pop/generate' · '/pharmacy/pop/source/supplier-items' 를 등록하지 않는다", () => {
    const dir = join(SRC, 'routes', 'o4o-store', 'controllers');
    for (const f of readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name)) {
      expect(codeOnly(read(dir, f))).not.toMatch(/pharmacy\/pop\/(generate|source\/supplier-items)/);
    }
  });

  it('pop-generator.service.ts 는 POP V2 renderer 의존으로 보존된다', () => {
    expect(existsSync(join(SRC, 'services', 'pop-generator.service.ts'))).toBe(true);
    expect(read(SRC, 'services', 'store', 'pop-v2-renderer.service.ts')).toMatch(
      /import \{ generatePopPdf[^}]*\} from '\.\.\/pop-generator\.service\.js'/,
    );
  });

  it('POP V2 controller mount 는 KPA / cosmetics / pharmacy-hub 3곳 그대로다', () => {
    expect(codeOnly(read(SRC, 'routes', 'kpa', 'kpa.routes.ts'))).toMatch(/createStorePopV2Controller\(dataSource,\s*coreRequireAuth as any,\s*'kpa'\)/);
    expect(codeOnly(read(SRC, 'routes', 'cosmetics', 'cosmetics.routes.ts'))).toMatch(/createStorePopV2Controller\(dataSource,\s*coreRequireAuth as any,\s*'cosmetics'\)/);
    expect(codeOnly(read(SRC, 'routes', 'pharmacy-hub', 'pharmacy-hub.routes.ts'))).toMatch(/createStorePopV2Controller\(/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('§2 frontend — legacy page/component/api 제거 · old route redirect', () => {
  const kpaApp = codeOnly(read(KPA, 'App.tsx'));
  const kcosApp = codeOnly(read(KCOS, 'App.tsx'));
  const phApp = codeOnly(read(PH, 'App.tsx'));

  it('KPA legacy 파일 3개가 존재하지 않는다', () => {
    expect(existsSync(join(KPA, 'pages', 'pharmacy', 'StorePopPage.tsx'))).toBe(false);
    expect(existsSync(join(KPA, 'components', 'store', 'StorePopCreateModal.tsx'))).toBe(false);
    expect(existsSync(join(KPA, 'api', 'storePop.ts'))).toBe(false);
  });

  it('KCos legacy StorePopPage 가 존재하지 않는다 (StorePopStaffPage · StorePopV2Page 는 유지)', () => {
    expect(existsSync(join(KCOS, 'pages', 'store', 'StorePopPage.tsx'))).toBe(false);
    expect(existsSync(join(KCOS, 'pages', 'store', 'StorePopStaffPage.tsx'))).toBe(true);
    expect(existsSync(join(KCOS, 'pages', 'store', 'StorePopV2Page.tsx'))).toBe(true);
  });

  it('KPA / KCos `marketing/pop` 은 V2 redirect 이고 `pop` 단축 route 도 V2 로 간다', () => {
    for (const app of [kpaApp, kcosApp]) {
      expect(app).toMatch(/path="marketing\/pop"\s+element=\{<Navigate to="\/store\/marketing\/pop-v2" replace \/>\}/);
      expect(app).toMatch(/path="pop"\s+element=\{<Navigate to="\/store\/marketing\/pop-v2" replace \/>\}/);
      expect(app).not.toMatch(/<StorePopPage \/>|StorePopPage'\)/);
      expect(app).toMatch(/path="marketing\/pop-v2"\s+element=\{<StorePopV2Page \/>\}/);
    }
  });

  it('KCos HUB POP 사본 동선(`marketing/pop/library` → StorePopStaffPage) 은 그대로다', () => {
    expect(kcosApp).toMatch(/path="marketing\/pop\/library"\s+element=\{<StorePopStaffPage \/>\}/);
  });

  it('PH 는 legacy 축이 처음부터 없었고 무변경이다', () => {
    expect(phApp).not.toMatch(/StorePopPage|marketing\/pop"/);
  });

  it('프론트 어디에도 legacy generate endpoint 호출이 없다', () => {
    const walk = (dir: string, out: string[] = []): string[] => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p, out);
        else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
      }
      return out;
    };
    const hits = [KPA, KCOS, PH]
      .flatMap((d) => walk(d))
      .filter((f) => /pharmacy\/pop\/(generate|source\/supplier-items)/.test(codeOnly(readFileSync(f, 'utf-8'))));
    expect(hits).toEqual([]);
  });

  it('매장 메뉴 KPA · KCos 블록의 POP 항목은 pop-v2 다', () => {
    const menu = codeOnly(read(CORE, 'config', 'storeMenuConfig.ts'));
    expect(menu).not.toMatch(/subPath: '\/marketing\/pop'/);
    expect((menu.match(/subPath: '\/marketing\/pop-v2'/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it('가이드 copy 의 POP route 는 pop-v2 다 (KPA · KCos)', () => {
    for (const f of ['kpa.ts', 'k-cosmetics.ts']) {
      const src = codeOnly(read(GUIDE, f));
      expect(src).not.toMatch(/'\/store\/marketing\/pop'/);
      expect(src).toMatch(/'\/store\/marketing\/pop-v2'/);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('§3 package — legacy POP composer 제거', () => {
  it('store-ui-core/components/pop 디렉터리가 없고 index 도 export 하지 않는다', () => {
    expect(existsSync(join(CORE, 'components', 'pop'))).toBe(false);
    const idx = codeOnly(read(CORE, 'index.ts'));
    expect(idx).not.toMatch(/'\.\/components\/pop'/);
    expect(idx).toMatch(/'\.\/components\/pop-v2'/);
    expect(idx).toMatch(/'\.\/components\/pop-staff'/);
    expect(idx).not.toMatch(/CANONICAL_STORE_POP_ROUTE|buildLocalProductPopState/);
  });

  it('pop-v2 view 는 자체 popV2Styles 만 쓰고 ../pop 을 참조하지 않는다', () => {
    for (const f of ['StorePopV2EditorView.tsx', 'StorePopV2ListView.tsx']) {
      const src = codeOnly(read(CORE, 'components', 'pop-v2', f));
      expect(src).not.toMatch(/from '\.\.\/pop\//);
      expect(src).toMatch(/from '\.\/popV2Styles'/);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('§4 preserve — store_pops HUB 축 · V2 · historical entity · schema', () => {
  it('store_pops 축(store-pop.service · pop.controller · operator-pop · PH controller) 은 그대로다', () => {
    expect(existsSync(join(SRC, 'services', 'store', 'store-pop.service.ts'))).toBe(true);
    expect(existsSync(join(SRC, 'routes', 'o4o-store', 'controllers', 'pop.controller.ts'))).toBe(true);
    expect(existsSync(join(SRC, 'routes', 'o4o-store', 'controllers', 'operator-pop.controller.ts'))).toBe(true);
    expect(existsSync(join(SRC, 'controllers', 'pharmacy-hub', 'PharmacyHubStorePopController.ts'))).toBe(true);
    expect(read(SRC, 'routes', 'o4o-store', 'controllers', 'pop.controller.ts')).toMatch(/store-pop\.service\.js/);
  });

  it('store_execution_assets entity 는 보존된다 (historical POP 산출물 row 의 매핑)', () => {
    expect(existsSync(join(SRC, 'routes', 'platform', 'entities', 'store-execution-asset.entity.ts'))).toBe(true);
  });

  it('POP V2 Core(handoff · document · renderer · source) 파일이 모두 있다', () => {
    expect(existsSync(join(CORE, 'components', 'pop-v2', 'handoff.ts'))).toBe(true);
    for (const f of ['pop-v2-document.service.ts', 'pop-v2-renderer.service.ts', 'pop-v2-source.service.ts']) {
      expect(existsSync(join(SRC, 'services', 'store', f))).toBe(true);
    }
    expect(existsSync(join(SRC, 'routes', 'o4o-store', 'controllers', 'store-pop-v2.controller.ts'))).toBe(true);
  });
});
