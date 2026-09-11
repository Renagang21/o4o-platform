/**
 * K-Cosmetics POP V2 Canonical Adoption Contract
 *
 * WO-O4O-KCOS-POP-V2-CANONICAL-ADOPTION-V1
 *
 * 정본: Content → store_pop_documents → POP V2 renderer → PDF/PNG
 *
 * 이 spec 이 고정하는 것
 *   1. KCos 가 **공통 POP V2 Core** 를 serviceKey='cosmetics' 로 mount 한다 (본체 복제 0)
 *   2. 공통 Core(controller · source service)에 **KCos 전용 조건문이 없다** (WO §3 금지 / §14 중지조건 4)
 *   3. legacy 즉시 PDF 축(`POST /pharmacy/pop/generate` · `/store/marketing/pop`)은 당시 보존됐고,
 *      WO-O4O-STORE-POP-LEGACY-INSTANT-PDF-RETIREMENT-FINAL-CLOSURE-V1 에서 제거·V2 redirect 로 은퇴했다 (아래 단언은 그 최종 상태 기준).
 *   4. KCos 프론트는 `createPopV2Api` / 공통 View 를 주입만 한다 — editor 복제·전용 schema 없음 (§3)
 *   5. 매장 메뉴 POP 진입만 V2 로 전환되고 KPA / PH 블록은 무변경 (§13)
 *
 * raw-source spec 이다. import graph 가 아니라 소스 문자열을 단언한다
 * (CLAUDE.md Shared Module Change Rule — 공통 계약 소비처 판정용).
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = join(__dirname, '..');
const REPO = join(SRC, '..', '..', '..');

const read = (...p: string[]) => readFileSync(join(...p), 'utf-8');
/**
 * 주석을 제거해 **실제 코드**만 판정한다 (주석의 서비스명 언급은 허용).
 * 줄 주석을 먼저 지운다 — 이 저장소의 줄 주석에는 `/pharmacy/pop/*` 같은 경로가 흔해서
 * 블록 주석을 먼저 지우면 `/*` 가 열린 것으로 보여 파일 본문을 통째로 삼킨다.
 */
const codeOnly = (s: string) =>
  s.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

describe('KCos POP V2 canonical adoption', () => {
  const cosmeticsRoutes = read(SRC, 'routes', 'cosmetics', 'cosmetics.routes.ts');
  const v2Controller = read(
    SRC, 'routes', 'o4o-store', 'controllers', 'store-pop-v2.controller.ts',
  );
  const v2Source = read(SRC, 'services', 'store', 'pop-v2-source.service.ts');
  const menuConfig = read(
    REPO, 'packages', 'store-ui-core', 'src', 'config', 'storeMenuConfig.ts',
  );
  const kcosApp = read(REPO, 'services', 'web-k-cosmetics', 'src', 'App.tsx');
  const kcosApi = read(REPO, 'services', 'web-k-cosmetics', 'src', 'api', 'popV2.ts');
  const kcosPage = read(
    REPO, 'services', 'web-k-cosmetics', 'src', 'pages', 'store', 'StorePopV2Page.tsx',
  );

  it('cosmetics.routes 가 공통 POP V2 Core 를 cosmetics 로 mount 한다', () => {
    expect(cosmeticsRoutes).toMatch(
      /import \{\s*createStorePopV2Controller\s*\} from '\.\.\/o4o-store\/controllers\/store-pop-v2\.controller\.js'/,
    );
    expect(codeOnly(cosmeticsRoutes)).toMatch(
      /router\.use\(\s*'\/pharmacy\/pop-v2',\s*createStorePopV2Controller\(dataSource,\s*coreRequireAuth as any,\s*'cosmetics'\),?\s*\)/,
    );
  });

  it('legacy 즉시 PDF POP controller 는 은퇴했다 (WO-O4O-STORE-POP-LEGACY-INSTANT-PDF-RETIREMENT-FINAL-CLOSURE-V1)', () => {
    expect(codeOnly(cosmeticsRoutes)).not.toMatch(/createStorePopController/);
  });

  it('공통 POP V2 Core 에 KCos 전용 분기가 없다 (§3 금지 / §14 중지조건 4)', () => {
    // 서비스 → 공개 도메인 매핑 table 의 catalog key 는 KPA/PH 와 동일한 형태의 **선언**이며 분기가 아니다.
    const code = codeOnly(v2Controller).replace(
      /const POP_SERVICE_TO_CATALOG_KEY[\s\S]*?\};/,
      '',
    );
    expect(code).not.toMatch(/'cosmetics'/);
    expect(code).not.toMatch(/k-cosmetics/);
  });

  it('POP V2 source service 는 여전히 service-neutral 이다 (organizationId 경계만)', () => {
    const code = codeOnly(v2Source);
    expect(code).not.toMatch(/serviceKey/);
    expect(code).not.toMatch(/service_key/);
    expect(code).not.toMatch(/cosmetics/);
  });

  it('KCos 프론트 adapter 는 공통 factory 를 주입만 한다 (editor 복제 없음)', () => {
    expect(kcosApi).toMatch(/createPopV2Api\(\{/);
    expect(kcosApi).toMatch(/basePath:\s*BASE/);
    expect(kcosApi).toMatch(/'\/cosmetics\/pharmacy\/pop-v2'/);
    expect(kcosPage).toMatch(/StorePopV2ListView/);
    expect(kcosPage).toMatch(/StorePopV2EditorView/);
    // 문서 schema 를 KCos 가 다시 정의하지 않는다.
    expect(kcosPage).not.toMatch(/interface\s+PopV2Document/);
    expect(kcosApi).not.toMatch(/interface\s+PopV2Document/);
  });

  it('KCos route 는 V2 가 canonical 이고 legacy `marketing/pop` 은 V2 redirect 다 (§4 → 은퇴)', () => {
    expect(kcosApp).toMatch(/path="marketing\/pop-v2"\s+element=\{<StorePopV2Page \/>\}/);
    expect(kcosApp).toMatch(/path="marketing\/pop"\s+element=\{<Navigate to="\/store\/marketing\/pop-v2" replace \/>\}/);
    expect(kcosApp).not.toMatch(/<StorePopPage \/>/);
  });

  it('매장 메뉴는 KCos · KPA 블록이 pop-v2, PH 는 /pop (§13 → KPA 는 은퇴 회차에 전환)', () => {
    const block = (name: string) => {
      const start = menuConfig.indexOf(`export const ${name}`);
      expect(start).toBeGreaterThan(-1);
      const rest = menuConfig.slice(start);
      const end = rest.indexOf('\nexport const ');
      return end === -1 ? rest : rest.slice(0, end);
    };
    expect(codeOnly(block('COSMETICS_STORE_CONFIG'))).toMatch(
      /key: 'pop',\s*label: 'POP',\s*subPath: '\/marketing\/pop-v2'/,
    );
    expect(codeOnly(block('KPA_SOCIETY_STORE_CONFIG'))).toMatch(
      /key: 'pop',\s*label: 'POP',\s*subPath: '\/marketing\/pop-v2'/,
    );
    expect(codeOnly(block('PHARMACY_HUB_STORE_CONFIG'))).toMatch(
      /key: 'pop',\s*label: 'POP',\s*subPath: '\/pop'/,
    );
  });
});
