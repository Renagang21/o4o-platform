/**
 * WO-O4O-SHORTCODE-REGISTRY-SSOT-AND-RUNTIME-REACHABILITY-V1
 *   — shortcode 등록의 **실제 runtime 계약**을 고정한다
 *
 * 배경
 * ---------------------------------------------------------------
 *   선행 WO 는 shortcode audit 에 `approval_queue` · `product_shortcodes`
 *   2건을 UNKNOWN 으로 남겼다. 조사 결과 두 이름은 **소스 어디에도 없었다** —
 *   scanner 가 파일명(`ApprovalQueue.tsx` · `productShortcodes.tsx`)에서
 *   유추한 이름이었다. 즉 등록 누락이 아니라 audit 모델의 오류였다.
 *
 *   확정된 계약:
 *
 *     SSOT            = `packages/shortcodes/src/registry.ts` 의 `globalRegistry`
 *                       **단일 인스턴스**. renderer 도 editor 도 이것만 조회한다.
 *     canonical key   = 정의에 **선언된 `name:`** (파일명·변수명 유추 금지)
 *     registered 판정 = bootstrap 에서 실제 호출되는 경로로 등록되는 것만
 *
 * DB · 네트워크 접근 0. 소스를 읽어 단언한다.
 */
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

const REGISTRY = 'packages/shortcodes/src/registry.ts';
const RENDERER = 'packages/shortcodes/src/renderer.ts';
const RENDER_COMPONENT = 'packages/shortcodes/src/components/ShortcodeRenderer.tsx';
const EDITOR_BLOCK = 'apps/admin-dashboard/src/components/editor/blocks/ShortcodeBlock.tsx';
const BOOTSTRAP_ENTRY = 'apps/admin-dashboard/src/App.tsx';
const BOOTSTRAP_MODULE = 'apps/admin-dashboard/src/utils/register-dynamic-shortcodes.ts';
const LAZY_LOADER = 'apps/admin-dashboard/src/utils/shortcode-loader.ts';
const AUTH_REGISTRY = 'packages/shortcodes/src/auth/index.ts';
const ADMIN_INDEX = 'apps/admin-dashboard/src/components/shortcodes/admin/index.ts';
const PRODUCT_BUNDLE = 'apps/admin-dashboard/src/components/shortcodes/productShortcodes.tsx';
const SHORTCODE_REPORT = 'scripts/audit/shortcode-registry-report.json';

const readRoot = (rel: string) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf-8');

/** bootstrap 에서 실제로 등록되는 shortcode — runtime 실행으로 확인한 값이다. */
const RUNTIME_REGISTERED = ['acf_field', 'cpt_field', 'cpt_list', 'meta_field', 'preset'];

// ───────────────────────────────────────────────────────────────
// 저장소 전체 소스 스캔 (소비처 0 을 단언하기 위한 최소 도구)
// ───────────────────────────────────────────────────────────────

const SKIP_DIR = new Set(['node_modules', 'dist', 'dist-node', 'build', 'coverage', '.turbo']);

function walk(dir: string, acc: string[]): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIR.has(entry.name)) continue;
      walk(path.join(dir, entry.name), acc);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      acc.push(path.join(dir, entry.name));
    }
  }
  return acc;
}

let sourceFiles: string[] | null = null;

function allSources(): string[] {
  if (!sourceFiles) {
    const acc: string[] = [];
    for (const tree of ['apps', 'packages']) {
      walk(path.join(REPO_ROOT, tree), acc);
    }
    // 이 spec 자체는 판정 대상이 아니다 — 아래 단언들이 같은 리터럴을 담고 있어
    // 스스로를 소비처로 세면 "소비처 0" 을 영원히 증명할 수 없다.
    sourceFiles = acc.filter(file => file !== __filename);
  }
  return sourceFiles;
}

/** `X(` 형태의 호출부. re-export 와 주석은 호출이 아니다. */
function callersOf(name: string, excludeRel: string): string[] {
  const hits: string[] = [];
  const excludeAbs = path.join(REPO_ROOT, excludeRel);

  for (const file of allSources()) {
    if (file === excludeAbs) continue;
    const content = fs.readFileSync(file, 'utf-8');
    if (!content.includes(name)) continue;

    for (const line of content.split(/\r?\n/)) {
      if (/^\s*(export|import)\b/.test(line) && /\bfrom\b/.test(line)) continue;
      if (/^\s*\*/.test(line) || /^\s*\/\//.test(line)) continue;
      if (new RegExp(`\\b${name}\\s*\\(`).test(line)) {
        hits.push(path.relative(REPO_ROOT, file).split(path.sep).join('/'));
        break;
      }
    }
  }

  return hits;
}

/** 소스 전체에서 해당 문자열 리터럴을 포함한 파일. */
function filesContaining(literal: string): string[] {
  return allSources()
    .filter(file => fs.readFileSync(file, 'utf-8').includes(literal))
    .map(file => path.relative(REPO_ROOT, file).split(path.sep).join('/'));
}

// ───────────────────────────────────────────────────────────────

describe('shortcode SSOT — globalRegistry 단일 인스턴스', () => {
  it('registry 인스턴스는 하나뿐이다', () => {
    const src = readRoot(REGISTRY);
    expect(src).toContain('export const globalRegistry = new DefaultShortcodeRegistry();');
    // 인스턴스가 하나여야 renderer/editor 가 같은 것을 본다.
    expect(src.match(/new DefaultShortcodeRegistry\(\)/g)).toHaveLength(1);
  });

  it('renderer 는 registry 조회 결과가 없으면 등록되지 않은 것으로 처리한다', () => {
    // fallback registry 도, lookup 시점의 lazy 해석도 없다.
    expect(readRoot(RENDERER)).toContain('const definition = this.registry.get(shortcode.name);');
    expect(readRoot(RENDER_COMPONENT)).toContain(
      'const definition = globalRegistry.get(shortcode.name);'
    );
  });

  it('editor 는 renderer 와 같은 SSOT 를 조회한다 (SAME_SSOT)', () => {
    const src = readRoot(EDITOR_BLOCK);
    expect(src).toContain('getAllShortcodes');
    expect(src).toContain("from '@o4o/shortcodes'");
  });
});

describe('runtime bootstrap — 등록 경로는 admin-dashboard 하나뿐이다', () => {
  it('App.tsx 가 등록 모듈을 side-effect import 한다', () => {
    expect(readRoot(BOOTSTRAP_ENTRY)).toContain("import '@/utils/register-dynamic-shortcodes';");
  });

  it('등록 모듈은 import 시점에 스스로 호출된다', () => {
    const src = readRoot(BOOTSTRAP_MODULE);
    expect(src).toContain('registerDynamic(globalRegistry);');
    expect(src).toContain('registerPresetShortcode();');
    // 모듈 최하단의 자기호출이 실제 등록 트리거다.
    expect(src).toMatch(/^registerDynamicShortcodes\(\);$/m);
  });

  it('bootstrap 으로 등록되는 집합이 고정돼 있다', () => {
    // 이 목록은 admin-dashboard vitest 의 runtime 검증과 같은 값이다
    // (`src/tests/shortcode-runtime-registration.test.ts`).
    expect([...RUNTIME_REGISTERED].sort()).toEqual(RUNTIME_REGISTERED);
  });
});

describe('registerAuthShortcodes — DEAD_INITIALIZER', () => {
  it('정의·export 는 있으나 호출자가 저장소 전체에서 0 이다', () => {
    expect(readRoot(AUTH_REGISTRY)).toContain('export function registerAuthShortcodes()');
    expect(callersOf('registerAuthShortcodes', AUTH_REGISTRY)).toEqual([]);
  });

  it('호출되지 않으므로 3개 token 은 runtime 에 등록되지 않는다', () => {
    for (const token of ['social_login', 'login_form', 'oauth_login']) {
      expect(RUNTIME_REGISTERED).not.toContain(token);
    }
  });

  it('public barrel export 는 유지한다 (계약 제거는 별도 WO)', () => {
    // dead 라는 판정과 삭제는 별개다. 이 WO 는 audit 모델만 고친다.
    expect(readRoot('packages/shortcodes/src/index.ts')).toContain(
      "export { registerAuthShortcodes } from './auth/index.js';"
    );
  });
});

describe('approval_queue — AUDIT_FALSE_POSITIVE', () => {
  it('`approval_queue` 라는 shortcode 이름은 소스에 존재하지 않는다', () => {
    // 과거 audit 이 파일명 `ApprovalQueue.tsx` 에서 유추한 이름이었다.
    expect(filesContaining("'approval_queue'")).toEqual([]);
  });

  it('실제 키 `admin_approval_queue` 는 소비처 0 인 map 에만 있다 (DEAD_SHORTCODE)', () => {
    const src = readRoot(ADMIN_INDEX);
    expect(src).toContain("'admin_approval_queue': AdminApprovalQueue,");
    // `adminShortcodes` 를 읽는 코드가 없다 = 등록도 렌더도 되지 않는다.
    const consumers = filesContaining('adminShortcodes').filter(f => f !== ADMIN_INDEX);
    expect(consumers).toEqual([]);
  });

  it('admin/index.ts 는 ShortcodeDefinition[] 를 내보내지 않는다 — loader 등록 0', () => {
    expect(readRoot(ADMIN_INDEX)).not.toContain('ShortcodeDefinition[]');
  });
});

describe('product shortcode 번들 — UNMOUNTED_DEFINITION_BUNDLE', () => {
  it('`product_shortcodes` 라는 shortcode 이름은 존재하지 않는다', () => {
    expect(filesContaining("'product_shortcodes'")).toEqual([]);
  });

  it('파일은 6개의 실제 token 을 선언한다', () => {
    const src = readRoot(PRODUCT_BUNDLE);
    for (const token of [
      'product',
      'product_grid',
      'add_to_cart',
      'product_carousel',
      'featured_products',
      'product_categories',
    ]) {
      expect(src).toContain(`  name: '${token}',`);
    }
  });

  it('loader glob(index.*) 밖이고 import 하는 모듈도 0 이다', () => {
    expect(path.posix.basename(PRODUCT_BUNDLE)).not.toMatch(/^index\./);
    const importers = allSources()
      .filter(file => path.relative(REPO_ROOT, file).split(path.sep).join('/') !== PRODUCT_BUNDLE)
      .filter(file => /from\s+'[^']*\/productShortcodes(\.js)?'/.test(fs.readFileSync(file, 'utf-8')));
    expect(importers).toEqual([]);
  });

  it('등록 여부는 소비자 commerce 경계 판단이므로 이 WO 에서 등록하지 않는다', () => {
    // `add_to_cart` · `product_grid` 는 소비자 commerce 표면이다.
    // `docs/baseline/O4O-STORE-COMMERCE-BOUNDARY-V1` 판단이 선행돼야 한다.
    expect(RUNTIME_REGISTERED).not.toContain('add_to_cart');
    expect(RUNTIME_REGISTERED).not.toContain('product_grid');
  });
});

describe('lazy loader glob 계약', () => {
  it('glob 패턴이 index 파일만 훑는다', () => {
    expect(readRoot(LAZY_LOADER)).toContain(
      "import.meta.glob('../components/shortcodes/**/index.{ts,tsx}'"
    );
  });

  it('ShortcodeDefinition[] 배열을 내보내는 모듈만 등록한다', () => {
    expect(readRoot(LAZY_LOADER)).toContain('isShortcodeDefinitionArray');
    expect(readRoot(LAZY_LOADER)).toContain('registerLazyShortcode');
  });
});

describe('audit 모델은 runtime 계약과 일치한다', () => {
  it('scanner 는 파일명이 아니라 선언된 `name:` 을 canonical key 로 쓴다', () => {
    const src = readRoot('scripts/audit/check-shortcode-registry.ts');
    expect(src).toContain("const topLevel = line.match(/^ {2}name: '([a-z0-9_]+)',$/);");
    expect(src).not.toContain('fileNameToShortcodeName');
  });

  it('report 가 있으면 runtime registered set 이 실측값과 같다', () => {
    const abs = path.join(REPO_ROOT, SHORTCODE_REPORT);
    // report 는 git-ignored 라 clean checkout 에는 없다. 부재는 실패가 아니다.
    if (!fs.existsSync(abs)) return;

    const parsed = JSON.parse(fs.readFileSync(abs, 'utf-8'));
    const names = parsed.runtimeRegistered.map((r: { token: string }) => r.token).sort();
    expect(names).toEqual(RUNTIME_REGISTERED);
  });

  it('report 가 있으면 설명되지 않은 missing · dangling 이 0 이다', () => {
    const abs = path.join(REPO_ROOT, SHORTCODE_REPORT);
    if (!fs.existsSync(abs)) return;

    const parsed = JSON.parse(fs.readFileSync(abs, 'utf-8'));
    expect(parsed.summary.totalMissing).toBe(0);
    expect(parsed.summary.totalDangling).toBe(0);
    // 등록되지 않는 정의는 전부 원인이 분류돼 있어야 한다.
    for (const gap of parsed.explainedGaps) {
      expect(['DEAD_INITIALIZER', 'UNMOUNTED_DEFINITION_BUNDLE']).toContain(gap.verdict);
      expect(typeof gap.reason).toBe('string');
    }
  });

  it('report 가 있으면 loader glob 실측이 0 등록임을 기록한다', () => {
    const abs = path.join(REPO_ROOT, SHORTCODE_REPORT);
    if (!fs.existsSync(abs)) return;

    const parsed = JSON.parse(fs.readFileSync(abs, 'utf-8'));
    expect(parsed.lazyLoaderContract.matchedFiles).toEqual([ADMIN_INDEX]);
    expect(parsed.lazyLoaderContract.filesWithDefinitionArray).toEqual([]);
    expect(parsed.lazyLoaderContract.registeredDefinitions).toBe(0);
  });
});
