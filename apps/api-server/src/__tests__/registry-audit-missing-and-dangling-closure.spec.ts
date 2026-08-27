/**
 * WO-O4O-REGISTRY-AUDIT-MISSING-AND-DANGLING-CLOSURE-V1
 *   — block / shortcode registry audit 의 missing · dangling 계약 테스트
 *
 * 배경
 * ---------------------------------------------------------------
 *   두 checker 의 findings 는 대부분 **scanner 결함**이었다.
 *
 *     1. exclude 목록이 `/` 로 앵커돼 있는데 판정 입력은 `path.join` 결과라
 *        Windows 에서 목록 전체가 무력화됐다 (플랫폼별로 결과가 달랐다).
 *     2. block 이름을 **파일명에서 유추**해 선언값과 어긋났다
 *        (`SlideBlock.tsx` → `o4o/slide-block` vs 선언 `o4o/slide`).
 *     3. 등록 이름을 **import 변수명에서 유추**해 같은 오류가 등록 쪽에도 있었다
 *        (`socialBlockDefinition` → `o4o/social` vs 선언 `o4o/social-links`).
 *     4. 같은 component 를 여러 이름으로 등록하는 **alias** 를 표현하지 못해
 *        살아 있는 등록을 dangling 으로 봤다 (`login_form` · `oauth_login`).
 *
 *   실제 결함은 `o4o/buttons` 미등록 1건뿐이었고 그것만 등록했다.
 *   registry 숫자를 맞추기 위한 placeholder / fake alias 는 만들지 않았다.
 *
 * DB · 네트워크 접근 0. 스크립트를 실행하지 않고 raw-source 로 단언한다.
 */
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const BLOCK_SCANNER = 'scripts/audit/check-block-registry.ts';
const SHORTCODE_SCANNER = 'scripts/audit/check-shortcode-registry.ts';
const BLOCK_INDEX = 'apps/admin-dashboard/src/blocks/index.ts';
const BUTTONS_DEF = 'apps/admin-dashboard/src/blocks/definitions/buttons.tsx';
const AUTH_REGISTRY = 'packages/shortcodes/src/auth/index.ts';

const readRoot = (rel: string) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf-8');

describe('scanner 의 exclude 판정은 플랫폼 독립이다', () => {
  it.each([
    ['block', BLOCK_SCANNER],
    ['shortcode', SHORTCODE_SCANNER],
  ])('%s — exclude 는 canonical repo-relative 경로로 검사한다', (_label, rel) => {
    const src = readRoot(rel);

    // `/` 로 앵커된 패턴을 `path.join` 결과에 그대로 물리면 Windows 에서 무력화된다.
    expect(src).toContain('const probePath = `/${toRepoPath(filePath)}`;');
    expect(src).toContain('exclude.some(regex => regex.test(probePath))');
    expect(src).not.toContain('exclude.some(regex => regex.test(filePath))');
  });
});

describe('block registry — 이름은 소스 선언값이 정본이다', () => {
  it('스캔한 파일 이름을 파일명이 아니라 선언된 `name:` 에서 읽는다', () => {
    const src = readRoot(BLOCK_SCANNER);

    expect(src).toContain('const declaredName = content.match(');
    expect(src).toContain('declaredName ? declaredName[1] : fileNameToBlockName(fileName)');
  });

  it('등록 이름을 import 변수명이 아니라 대상 정의 파일에서 해석한다', () => {
    const src = readRoot(BLOCK_SCANNER);

    expect(src).toContain('findRegisteredBlocks(files: BlockFile[])');
    expect(src).toContain('const target = files.find(');
    expect(src).toContain('target ? target.blockName :');
  });

  it('`SlideBlock.tsx` 를 스캔에서 배제하지 않는다 (실재하는 정의 파일이다)', () => {
    const src = readRoot(BLOCK_SCANNER);
    // 주석에는 사례로 언급되므로 exclude 패턴 형태만 막는다.
    expect(src).not.toContain('/\/SlideBlock\.tsx$/');
  });

  it('선언값과 파일명이 다른 블록이 실제로 존재한다 — 회귀 고정', () => {
    // 이 두 건이 과거 dangling/missing 오탐의 원인이었다.
    expect(readRoot('apps/admin-dashboard/src/blocks/definitions/slide/SlideBlock.tsx'))
      .toContain("name: 'o4o/slide',");
    expect(readRoot('apps/admin-dashboard/src/blocks/definitions/social.tsx'))
      .toContain("name: 'o4o/social-links',");
  });
});

describe('block `o4o/buttons` 는 등록된 상태를 유지한다', () => {
  it('정의가 살아 있고 `o4o/buttons` 를 선언한다', () => {
    expect(readRoot(BUTTONS_DEF)).toContain("name: 'o4o/buttons',");
  });

  it('`blocks/index.ts` 가 import 하고 register 한다', () => {
    const src = readRoot(BLOCK_INDEX);
    expect(src).toContain("import buttonsBlockDefinition from './definitions/buttons';");
    expect(src).toContain('blockRegistry.register(buttonsBlockDefinition);');
  });

  it('단수형 `o4o/button` 과 별개의 블록이다', () => {
    const src = readRoot(BLOCK_INDEX);
    expect(src).toContain('blockRegistry.register(buttonBlockDefinition);');
    expect(readRoot('apps/admin-dashboard/src/blocks/definitions/button.tsx'))
      .toContain("name: 'o4o/button',");
  });

  it('Vite(ESM) 번들에서 죽는 `require()` 를 쓰지 않는다', () => {
    const src = readRoot(BUTTONS_DEF);
    expect(src).toContain("import { DynamicRenderer } from '../registry/DynamicRenderer';");
    // 주석에는 `require()` 가 언급되므로 실제 호출 형태만 막는다.
    expect(src).not.toContain("require('../registry/DynamicRenderer')");
  });

  it('저장된 콘텐츠의 canonical block name 과 일치한다', () => {
    // normalize-blocknames 는 `core/buttons` 를 `o4o/buttons` 로 정규화한다.
    // 즉 `o4o/buttons` 는 legacy key 가 아니라 **정규화 목적지**다.
    const src = readRoot('scripts/cms/normalize-blocknames.ts');
    expect(src).toContain("'core/buttons': 'o4o/buttons',");
    expect(src).toContain("'o4o/buttons': 'o4o/buttons',");
    // renderer 는 이미 이 키를 그릴 수 있다.
    expect(readRoot('packages/block-renderer/src/renderers/index.ts')).toContain("'o4o/buttons'");
  });
});

describe('shortcode registry — alias 와 인프라 모듈 계약', () => {
  it('alias 판정용 component 식별자를 정의 블록에서 함께 읽는다', () => {
    // WO-O4O-SHORTCODE-REGISTRY-SSOT-AND-RUNTIME-REACHABILITY-V1 에서
    // scanner 모델이 "파일 존재 → 등록 기대" 에서 "bootstrap 도달 → 등록" 으로
    // 바뀌었다. component 식별자 추출은 alias 표현 수단으로 남는다.
    const src = readRoot(SHORTCODE_SCANNER);
    expect(src).toContain('const componentMatch = window.match(/component:\\s*(\\w+)/);');
  });

  it('`login_form` · `oauth_login` 은 SocialLogin 의 alias 로 남는다', () => {
    const src = readRoot(AUTH_REGISTRY);
    for (const name of ['social_login', 'login_form', 'oauth_login']) {
      expect(src).toContain(`name: '${name}',`);
    }
    // 세 등록이 모두 같은 component 를 가리킨다 = alias 관계.
    expect(src.match(/component:\s*SocialLogin/g)).toHaveLength(3);
  });

  it('shortcode 컴포넌트가 아닌 인프라 모듈은 스캔 대상이 아니다', () => {
    const src = readRoot(SHORTCODE_SCANNER);
    expect(src).toContain('/\\/metadata\\.ts$/');
    expect(src).toContain('/\\/utils\\//');
  });
});

describe('생성된 report 는 계약을 만족한다', () => {
  const REPORTS = [
    'scripts/audit/block-registry-report.json',
    'scripts/audit/shortcode-registry-report.json',
  ];

  it.each(REPORTS)('%s — Git 에 추적되지 않는다', (rel) => {
    // 선행 WO 두 건의 untrack 계약. 재생성해도 Git 이 아무것도 보면 안 된다.
    const ignore = readRoot('.gitignore');
    expect(ignore).toContain(`/${rel}`);
  });

  it('block report 가 있으면 missing · dangling 이 0 이다', () => {
    const abs = path.join(REPO_ROOT, REPORTS[0]);
    // report 는 git-ignored 라 clean checkout 에는 없다. 부재는 실패가 아니다.
    if (!fs.existsSync(abs)) return;

    const parsed = JSON.parse(fs.readFileSync(abs, 'utf-8'));
    expect(parsed.summary.totalMissing).toBe(0);
    expect(parsed.summary.totalDangling).toBe(0);
    expect(parsed.registeredBlocks.map((r: { name: string }) => r.name)).toContain('o4o/buttons');
  });

  it('shortcode report 가 있으면 설명되지 않은 missing · dangling 이 0 이다', () => {
    const abs = path.join(REPO_ROOT, REPORTS[1]);
    if (!fs.existsSync(abs)) return;

    const parsed = JSON.parse(fs.readFileSync(abs, 'utf-8'));

    // WO-O4O-SHORTCODE-REGISTRY-SSOT-AND-RUNTIME-REACHABILITY-V1:
    //   이 WO 가 남긴 미확정 2건(`approval_queue` · `product_shortcodes`)은
    //   **파일명에서 유추된 이름**이었고 소스 어디에도 존재하지 않았다.
    //   scanner 가 선언된 `name:` 만 canonical key 로 쓰도록 바뀌면서 사라졌고,
    //   등록되지 않는 정의는 원인별로 `explainedGaps` 에 분류된다.
    expect(parsed.summary.totalDangling).toBe(0);
    expect(parsed.summary.totalMissing).toBe(0);
    expect(parsed.missingInRegistry).toEqual([]);
  });
});
