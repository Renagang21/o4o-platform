#!/usr/bin/env tsx
/**
 * Shortcode Registry Audit Script
 *
 * WO-O4O-SHORTCODE-REGISTRY-SSOT-AND-RUNTIME-REACHABILITY-V1
 * ---------------------------------------------------------------
 * 이 스크립트의 **모델이 바뀌었다.**
 *
 *   이전: 파일이 존재하면 등록돼야 한다고 기대했다(파일명 → shortcode 이름 유추).
 *   이후: **실제 bootstrap 에서 호출되는 registration 경로만 registered 로 본다.**
 *
 * 근거 — shortcode SSOT 은 `packages/shortcodes/src/registry.ts` 의
 * `globalRegistry` **단일 인스턴스**다. renderer(`ShortcodeRenderer` ·
 * `DefaultShortcodeRenderer`) 도 editor(`getAllShortcodes()`) 도 전부 이 인스턴스만
 * 조회한다. 따라서 audit 의 canonical key = **runtime resolver 가 조회하는 key**
 * 이고, "소스 파일이 존재한다" 는 사실은 등록 근거가 아니다.
 *
 * Usage: npx tsx scripts/audit/check-shortcode-registry.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** repository root — 이 스크립트는 `scripts/audit/` 에 있다. */
const PROJECT_ROOT = path.join(__dirname, '../..');

/**
 * WO-O4O-REGISTRY-AUDIT-GENERATOR-CANONICALIZATION-V1
 *
 * report 의 경로는 **repo root 기준 POSIX 경로**로만 기록한다.
 * 절대경로를 그대로 넣으면 실행 머신마다 report 전체가 달라진다
 * (`C:\Users\me\repo\x.ts` vs `/home/dev/repo/x.ts`).
 * 구분자도 `/` 로 통일해 Windows/Linux 출력이 같아지게 한다.
 *
 * sibling 인 check-block-registry.ts 에 **같은 함수를 그대로** 둔다.
 * 공용 helper 로 추출하면 scripts/ 의 모듈 경계가 커져 이번 범위를 넘는다.
 */
function toRepoPath(absPath: string): string {
  return path.relative(PROJECT_ROOT, absPath).split(path.sep).join('/');
}

function abs(repoRelative: string): string {
  return path.join(PROJECT_ROOT, repoRelative);
}

function readIfExists(repoRelative: string): string | null {
  const p = abs(repoRelative);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : null;
}

/**
 * 기본 출력은 **재실행해도 byte-identical** 이어야 한다.
 * 실행 시각이 필요한 경우에만 `--timestamp` 로 명시한다.
 */
const INCLUDE_TIMESTAMP = process.argv.includes('--timestamp');

// ───────────────────────────────────────────────────────────────
// 계약 상수 — 실제 소스에서 증명되는 값만 둔다
// ───────────────────────────────────────────────────────────────

/** shortcode 정의를 찾는 트리. */
const DEFINITION_TREES = [
  'apps/admin-dashboard/src/components/shortcodes',
  'packages/shortcodes/src',
];

/** initializer caller / importer 를 찾는 트리(저장소 전체 소비처 확인용). */
const CALLER_TREES = ['apps', 'packages'];

/** admin-dashboard 의 shortcode bootstrap — 저장소에서 유일한 진입점이다. */
const BOOTSTRAP_ENTRY = 'apps/admin-dashboard/src/App.tsx';
const BOOTSTRAP_MODULE = 'apps/admin-dashboard/src/utils/register-dynamic-shortcodes.ts';
const LAZY_LOADER_MODULE = 'apps/admin-dashboard/src/utils/shortcode-loader.ts';
const PRESET_MODULE = 'packages/shortcodes/src/preset/index.ts';
const DYNAMIC_MODULE = 'packages/shortcodes/src/dynamic/index.ts';

/** lazy loader glob 이 훑는 트리의 접두사. */
const LOADER_ROOT_PREFIX = 'apps/admin-dashboard/src/components/shortcodes/';

/**
 * 정의 census 제외 — shortcode **컴포넌트가 아닌 인프라 모듈**이다.
 *   metadata.ts  — shortcode 문서/AI 메타데이터 (registry 가 아니다)
 *   utils/**     — 명명 규칙 helper
 */
const DEFINITION_EXCLUDE = [
  /\.test\.(ts|tsx)$/,
  /\.spec\.(ts|tsx)$/,
  /__tests__/,
  /\/dist\//,
  /\/node_modules\//,
  /\/metadata\.ts$/,
  /\/utils\//,
];

/** 소비처 탐색에서 항상 제외하는 생성물 트리. */
const ARTIFACT_EXCLUDE = [
  // 테스트는 소스를 **읽어서 단언**할 뿐 runtime 호출자가 아니다.
  // 이것을 caller 로 세면 dead initializer 가 영원히 live 로 보인다.
  /\.test\.(ts|tsx)$/,
  /\.spec\.(ts|tsx)$/,
  /__tests__/,
  /\/node_modules\//,
  /\/dist\//,
  /\/dist-node\//,
  /\/build\//,
  /\/coverage\//,
];

// ───────────────────────────────────────────────────────────────
// 타입
// ───────────────────────────────────────────────────────────────

interface DefinitionToken {
  /** runtime resolver 가 조회하는 canonical key. 파일명에서 유추하지 않는다. */
  token: string;
  filePath: string;
  /** 이 정의를 감싸는 initializer 함수(있으면). */
  initializer?: string;
  /** alias 판정용 — 정의 블록에 적힌 component 식별자. */
  component?: string;
}

interface RuntimeRegistration {
  token: string;
  definitionFile: string;
  /** 어떤 경로로 등록되는가. bootstrap 에서 실제로 호출되는 경로만 기록한다. */
  via: string;
}

interface ExplainedGap {
  token: string;
  filePath: string;
  verdict: string;
  reason: string;
}

interface UnreachableInitializer {
  name: string;
  filePath: string;
  tokens: string[];
  callers: string[];
  verdict: string;
}

interface LoaderContract {
  glob: string;
  matchedFiles: string[];
  filesWithDefinitionArray: string[];
  registeredDefinitions: number;
}

interface AuditReport {
  /** `--timestamp` 를 준 실행에서만 존재한다. */
  timestamp?: string;
  /** bootstrap 이 shortcode 등록 모듈을 side-effect import 하는가. */
  bootstrapWired: boolean;
  /** 두 트리에서 **선언된** shortcode 정의 전수(`name:` 기준). */
  definedShortcodes: DefinitionToken[];
  /** bootstrap 에서 실제 호출되는 경로로 등록되는 shortcode. */
  runtimeRegistered: RuntimeRegistration[];
  /** 호출자가 0 인 registration 함수. 등록으로 세지 않는다. */
  unreachableInitializers: UnreachableInitializer[];
  /** lazy loader glob 의 실측 계약. */
  lazyLoaderContract: LoaderContract;
  /** 정의는 있으나 등록되지 않는 것 중 **원인이 규명된** 항목. */
  explainedGaps: ExplainedGap[];
  /** 정의는 있으나 등록되지 않고 원인도 규명되지 않은 항목. 0 이어야 한다. */
  missingInRegistry: DefinitionToken[];
  /** 등록되지만 정의가 없는 항목. 0 이어야 한다. */
  danglingRegistryEntries: RuntimeRegistration[];
  summary: {
    totalDefined: number;
    totalRuntimeRegistered: number;
    totalExplainedGaps: number;
    totalMissing: number;
    totalDangling: number;
  };
}

// ───────────────────────────────────────────────────────────────
// 파일 순회
// ───────────────────────────────────────────────────────────────

function findFilesRecursive(dir: string, pattern: RegExp, exclude: RegExp[]): string[] {
  const results: string[] = [];

  if (!fs.existsSync(dir)) {
    return results;
  }

  // readdirSync 순서는 파일시스템마다 다르다 — 정렬해 순회 순서를 고정한다.
  const files = fs.readdirSync(dir).sort();

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    // Skip excluded patterns.
    //   WO-O4O-REGISTRY-AUDIT-MISSING-AND-DANGLING-CLOSURE-V1:
    //   exclude 패턴은 `/\/metadata\.ts$/` 처럼 **`/` 로 앵커**돼 있는데
    //   `path.join` 이 만든 경로는 Windows 에서 `\` 구분자다. 그래서 이 목록이
    //   Windows 에서만 통째로 무력화됐다(= 플랫폼별로 audit 결과가 달라졌다).
    //   판정 입력도 repo-relative POSIX 경로로 canonicalize 한다.
    const probePath = `/${toRepoPath(filePath)}`;
    if (exclude.some(regex => regex.test(probePath))) {
      continue;
    }

    if (stat.isDirectory()) {
      results.push(...findFilesRecursive(filePath, pattern, exclude));
    } else if (pattern.test(file)) {
      results.push(filePath);
    }
  }

  return results;
}

/** 소비처 탐색용 소스 파일 목록. 한 번만 만들어 재사용한다. */
let sourceFileCache: string[] | null = null;

function allSourceFiles(): string[] {
  if (sourceFileCache) return sourceFileCache;

  const files: string[] = [];
  for (const tree of CALLER_TREES) {
    files.push(...findFilesRecursive(abs(tree), /\.(ts|tsx)$/, ARTIFACT_EXCLUDE));
  }
  sourceFileCache = files;
  return files;
}

// ───────────────────────────────────────────────────────────────
// 1. 정의 census — 선언된 `name:` 만 canonical key 로 인정한다
// ───────────────────────────────────────────────────────────────

/** `export function registerXxx() { ... }` 의 이름과 본문 범위. */
function extractInitializerSpans(content: string): { name: string; start: number; end: number }[] {
  const spans: { name: string; start: number; end: number }[] = [];
  const pattern = /^export function (register\w+)\s*\([^)]*\)[^{]*\{/gm;

  for (const match of content.matchAll(pattern)) {
    const start = match.index ?? 0;
    // 최상위 함수이므로 컬럼 0 의 `}` 가 본문의 끝이다.
    const closing = content.indexOf('\n}', start);
    spans.push({ name: match[1], start, end: closing === -1 ? content.length : closing });
  }

  return spans;
}

/**
 * `ShortcodeDefinition` 의 **최상위 속성**으로 선언된 `name:` 만 읽는다.
 *
 *   - 2-space 들여쓰기 → `export const x: ShortcodeDefinition = { name: '...' }`
 *   - 4-space 들여쓰기 → `registerShortcode({ name: '...' })` 인라인 객체
 *
 * 6-space 이상은 `attributes` 안의 **파라미터 이름**이므로 shortcode token 이 아니다.
 * 파일명 유추는 더 쓰지 않는다 — 선언값과 어긋나 오탐을 만들었다(§13 naming contract).
 */
function extractDefinitionTokens(filePath: string): DefinitionToken[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  const functionSpans = extractInitializerSpans(content);
  const found: DefinitionToken[] = [];

  lines.forEach((line, index) => {
    const topLevel = line.match(/^ {2}name: '([a-z0-9_]+)',$/);
    const inline = line.match(/^ {4}name: '([a-z0-9_]+)',$/);

    let token: string | null = null;
    if (topLevel) {
      token = topLevel[1];
    } else if (inline && /registerShortcode\(\s*\{\s*$/.test(lines[index - 1] ?? '')) {
      token = inline[1];
    }

    if (!token) return;

    // 정의 블록에서 component 식별자를 함께 읽는다(alias 판정용).
    const window = lines.slice(index, index + 12).join('\n');
    const componentMatch = window.match(/component:\s*(\w+)/);

    const offset = lines.slice(0, index).join('\n').length;
    const owner = functionSpans.find(s => offset >= s.start && offset <= s.end);

    found.push({
      token,
      filePath: toRepoPath(filePath),
      ...(owner ? { initializer: owner.name } : {}),
      ...(componentMatch ? { component: componentMatch[1] } : {}),
    });
  });

  return found;
}

function findDefinedShortcodes(): DefinitionToken[] {
  const defined: DefinitionToken[] = [];

  for (const tree of DEFINITION_TREES) {
    for (const filePath of findFilesRecursive(abs(tree), /\.(ts|tsx)$/, DEFINITION_EXCLUDE)) {
      defined.push(...extractDefinitionTokens(filePath));
    }
  }

  return defined;
}

// ───────────────────────────────────────────────────────────────
// 2. initializer 호출자 — 저장소 전체에서 확인한다
// ───────────────────────────────────────────────────────────────

/** re-export 는 호출이 아니다. `export { X } from '...'` 과 주석을 걸러낸다. */
function isCallSite(line: string, name: string): boolean {
  if (/^\s*(export|import)\b/.test(line) && /\bfrom\b/.test(line)) return false;
  if (/^\s*\*/.test(line) || /^\s*\/\//.test(line)) return false;
  return new RegExp(`\\b${name}\\s*\\(`).test(line);
}

function findCallers(name: string, definitionFile: string): string[] {
  const callers = new Set<string>();

  for (const filePath of allSourceFiles()) {
    const repoPath = toRepoPath(filePath);
    if (repoPath === definitionFile) continue;

    const content = fs.readFileSync(filePath, 'utf-8');
    if (!content.includes(name)) continue;

    for (const line of content.split(/\r?\n/)) {
      if (isCallSite(line, name)) {
        callers.add(repoPath);
        break;
      }
    }
  }

  return Array.from(callers).sort();
}

/** 해당 파일을 import 하는 모듈이 저장소에 있는가. */
function hasImporter(repoPath: string): boolean {
  const base = path.posix.basename(repoPath).replace(/\.(ts|tsx)$/, '');
  const suffix = `/${base}`;

  for (const filePath of allSourceFiles()) {
    if (toRepoPath(filePath) === repoPath) continue;

    const content = fs.readFileSync(filePath, 'utf-8');
    if (!content.includes(base)) continue;

    for (const match of content.matchAll(/from\s+'([^']+)'/g)) {
      const spec = match[1];
      if (spec === base || spec.endsWith(suffix) || spec.endsWith(`${suffix}.js`)) {
        return true;
      }
    }
  }

  return false;
}

// ───────────────────────────────────────────────────────────────
// 3. runtime 등록 경로 — bootstrap 에서 증명한다
// ───────────────────────────────────────────────────────────────

/**
 * `App.tsx` 가 `register-dynamic-shortcodes` 를 side-effect import 하는지 확인한다.
 * 이것이 저장소에서 유일한 shortcode bootstrap 이다.
 */
function bootstrapIsWired(): boolean {
  const app = readIfExists(BOOTSTRAP_ENTRY);
  return !!app && /import\s+'@\/utils\/register-dynamic-shortcodes'/.test(app);
}

/** `preset/index.ts` 처럼 **식별자 형태**로 등록하는 경로를 해석한다. */
function resolveIdentifierRegistration(moduleFile: string, defined: DefinitionToken[]): string[] {
  const content = readIfExists(moduleFile);
  if (!content) return [];

  const tokens = new Set<string>();
  for (const match of content.matchAll(/registerShortcode\(\s*(\w+)\s*\)/g)) {
    const ident = match[1];
    // 같은 파일에서 선언된 정의여야 한다.
    if (!new RegExp(`(export )?const ${ident}[^=]*=\\s*\\{`).test(content)) continue;
    for (const d of defined.filter(x => x.filePath === moduleFile)) {
      tokens.add(d.token);
    }
  }

  return Array.from(tokens).sort();
}

/**
 * `dynamic/index.ts` 의
 * `import('./x.js').then(({ ident }) => { registry.register(ident); })`
 * 를 해석해 **실제 정의 파일의 선언 token** 을 얻는다.
 */
function resolveDynamicRegistration(
  moduleFile: string,
  defined: DefinitionToken[]
): RuntimeRegistration[] {
  const content = readIfExists(moduleFile);
  if (!content) return [];

  const dir = path.posix.dirname(moduleFile);
  const results: RuntimeRegistration[] = [];
  const pattern =
    /import\('\.\/([\w-]+)\.js'\)\.then\(\(\{\s*(\w+)\s*\}\)\s*=>\s*\{\s*registry\.register\(\2\);/g;

  for (const match of content.matchAll(pattern)) {
    const base = `${dir}/${match[1]}`;
    const target = defined.find(d => d.filePath === `${base}.tsx` || d.filePath === `${base}.ts`);
    if (target) {
      results.push({
        token: target.token,
        definitionFile: target.filePath,
        via: 'registerDynamicShortcodes',
      });
    }
  }

  return results;
}

/**
 * lazy loader glob 의 **실측** 계약을 만든다.
 * loader 는 matched 모듈에서 `ShortcodeDefinition[]` export 만 등록한다.
 */
function measureLazyLoader(): LoaderContract {
  const loader = readIfExists(LAZY_LOADER_MODULE);
  const globMatch = loader?.match(/import\.meta\.glob\('([^']+)'/);
  const glob = globMatch ? globMatch[1] : '';

  // `../components/shortcodes/**/index.{ts,tsx}` — loader 파일 기준 상대 경로.
  const loaderDir = path.posix.dirname(LAZY_LOADER_MODULE);
  const globRoot = path.posix.normalize(
    `${loaderDir}/${glob.replace(/\/\*\*\/index\.\{ts,tsx\}$/, '')}`
  );

  const matchedFiles = glob
    ? findFilesRecursive(abs(globRoot), /^index\.(ts|tsx)$/, [...ARTIFACT_EXCLUDE, /__tests__/]).map(
        toRepoPath
      )
    : [];

  const filesWithDefinitionArray = matchedFiles.filter(f =>
    (readIfExists(f) ?? '').includes('ShortcodeDefinition[]')
  );

  return {
    glob,
    matchedFiles,
    filesWithDefinitionArray,
    registeredDefinitions: 0, // 아래에서 실제 등록 수로 갱신한다.
  };
}

function findRuntimeRegistered(
  defined: DefinitionToken[],
  loader: LoaderContract
): RuntimeRegistration[] {
  const registered: RuntimeRegistration[] = [];

  // bootstrap 이 연결돼 있지 않으면 등록되는 shortcode 는 0 이다.
  if (!bootstrapIsWired()) {
    return registered;
  }

  const bootstrap = readIfExists(BOOTSTRAP_MODULE) ?? '';

  // (a) preset — bootstrap 이 `registerPresetShortcode()` 를 직접 호출한다.
  if (/registerPresetShortcode\(\)/.test(bootstrap)) {
    for (const token of resolveIdentifierRegistration(PRESET_MODULE, defined)) {
      registered.push({ token, definitionFile: PRESET_MODULE, via: 'registerPresetShortcode' });
    }
  }

  // (b) dynamic — `registerDynamicShortcodes(globalRegistry)` (별칭 import 포함).
  if (/registerDynamic\w*\(\s*globalRegistry\s*\)/.test(bootstrap)) {
    registered.push(...resolveDynamicRegistration(DYNAMIC_MODULE, defined));
  }

  // (c) lazy loader glob — matched 모듈이 `ShortcodeDefinition[]` 를 낼 때만 등록된다.
  for (const file of loader.filesWithDefinitionArray) {
    for (const d of defined.filter(x => x.filePath === file)) {
      registered.push({ token: d.token, definitionFile: d.filePath, via: 'loadShortcodes' });
    }
  }

  return registered;
}

// ───────────────────────────────────────────────────────────────
// 4. 판정
// ───────────────────────────────────────────────────────────────

function analyzeRegistry(
  defined: DefinitionToken[],
  runtime: RuntimeRegistration[],
  loader: LoaderContract
): {
  unreachable: UnreachableInitializer[];
  explained: ExplainedGap[];
  missing: DefinitionToken[];
  dangling: RuntimeRegistration[];
} {
  const registeredTokens = new Set(runtime.map(r => r.token));
  const definedTokens = new Set(defined.map(d => d.token));

  // (1) 호출자 0 인 initializer — 등록으로 세지 않는다(§2 원칙).
  const initializerFiles = new Map<string, Set<string>>();
  for (const d of defined) {
    if (!d.initializer) continue;
    if (!initializerFiles.has(d.initializer)) initializerFiles.set(d.initializer, new Set());
    initializerFiles.get(d.initializer)!.add(d.filePath);
  }

  const unreachable: UnreachableInitializer[] = [];
  for (const [name, files] of Array.from(initializerFiles.entries()).sort()) {
    for (const definitionFile of Array.from(files).sort()) {
      const callers = findCallers(name, definitionFile);
      if (callers.length > 0) continue;

      unreachable.push({
        name,
        filePath: definitionFile,
        tokens: defined
          .filter(d => d.initializer === name && d.filePath === definitionFile)
          .map(d => d.token),
        callers,
        verdict: 'DEAD_INITIALIZER',
      });
    }
  }

  const deadInitializerTokens = new Set(unreachable.flatMap(u => u.tokens));

  // (2) loader glob 밖 + importer 0 인 정의 번들 — 번들에 들어가지 않는다.
  const unmountedFiles = new Set<string>();
  for (const d of defined) {
    if (!d.filePath.startsWith(LOADER_ROOT_PREFIX)) continue;
    if (loader.filesWithDefinitionArray.includes(d.filePath)) continue;
    if (hasImporter(d.filePath)) continue;
    unmountedFiles.add(d.filePath);
  }

  // (3) 설명된 gap / 설명되지 않은 missing
  const explained: ExplainedGap[] = [];
  const missing: DefinitionToken[] = [];

  for (const d of defined) {
    if (registeredTokens.has(d.token)) continue;

    if (deadInitializerTokens.has(d.token)) {
      explained.push({
        token: d.token,
        filePath: d.filePath,
        verdict: 'DEAD_INITIALIZER',
        reason: `${d.initializer}() 의 호출자가 저장소 전체에서 0 이다 — bootstrap 에 연결돼 있지 않다.`,
      });
      continue;
    }

    if (unmountedFiles.has(d.filePath)) {
      explained.push({
        token: d.token,
        filePath: d.filePath,
        verdict: 'UNMOUNTED_DEFINITION_BUNDLE',
        reason:
          'lazy loader glob(index.*) 밖이고 이 파일을 import 하는 모듈도 0 이다 — 번들에 들어가지 않는다.',
      });
      continue;
    }

    missing.push(d);
  }

  // (4) dangling — 등록되지만 선언된 정의가 없는 token
  const dangling = runtime.filter(r => !definedTokens.has(r.token));

  return { unreachable, explained, missing, dangling };
}

// ───────────────────────────────────────────────────────────────
// 5. 리포트
// ───────────────────────────────────────────────────────────────

function generateReport(): AuditReport {
  console.log('🔍 Scanning shortcode definitions (declared `name:` only)...');
  const defined = findDefinedShortcodes();
  console.log(`   Found ${defined.length} declared shortcode definitions`);

  console.log('📦 Measuring lazy loader contract...');
  const loader = measureLazyLoader();
  console.log(
    `   glob matched ${loader.matchedFiles.length} file(s) / ` +
      `${loader.filesWithDefinitionArray.length} with ShortcodeDefinition[]`
  );

  console.log('🚀 Resolving runtime registration path from bootstrap...');
  const bootstrapWired = bootstrapIsWired();
  const runtime = findRuntimeRegistered(defined, loader);
  loader.registeredDefinitions = runtime.filter(r => r.via === 'loadShortcodes').length;
  console.log(`   ${runtime.length} shortcode(s) reachable from bootstrap`);

  console.log('🔬 Analyzing registry...');
  const { unreachable, explained, missing, dangling } = analyzeRegistry(defined, runtime, loader);

  const report: AuditReport = {
    ...(INCLUDE_TIMESTAMP ? { timestamp: new Date().toISOString() } : {}),
    bootstrapWired,
    definedShortcodes: defined,
    runtimeRegistered: runtime,
    unreachableInitializers: unreachable,
    lazyLoaderContract: loader,
    explainedGaps: explained,
    missingInRegistry: missing,
    danglingRegistryEntries: dangling,
    summary: {
      totalDefined: defined.length,
      totalRuntimeRegistered: runtime.length,
      totalExplainedGaps: explained.length,
      totalMissing: missing.length,
      totalDangling: dangling.length,
    },
  };

  return report;
}

/**
 * Main execution
 */
function main() {
  try {
    console.log('═══════════════════════════════════════════════');
    console.log('  Shortcode Registry Integrity Check');
    console.log('═══════════════════════════════════════════════\n');

    const report = generateReport();

    // Save report to JSON
    const reportPath = path.join(__dirname, 'shortcode-registry-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n✅ Report saved to: ${reportPath}`);

    // Print summary
    console.log('\n═══════════════════════════════════════════════');
    console.log('  Summary');
    console.log('═══════════════════════════════════════════════');
    console.log(`Declared definitions:      ${report.summary.totalDefined}`);
    console.log(`Runtime registered:        ${report.summary.totalRuntimeRegistered}`);
    console.log(`Explained gaps:            ${report.summary.totalExplainedGaps}`);
    console.log(`Unexplained missing:       ${report.summary.totalMissing}`);
    console.log(`Dangling registry entries: ${report.summary.totalDangling}`);

    if (report.runtimeRegistered.length > 0) {
      console.log('\n✅ Runtime registered:');
      for (const entry of report.runtimeRegistered) {
        console.log(`   - ${entry.token} (via ${entry.via})`);
      }
    }

    if (report.explainedGaps.length > 0) {
      console.log('\nℹ️  Explained gaps (정의는 있으나 등록되지 않음 — 원인 규명됨):');
      for (const gap of report.explainedGaps) {
        console.log(`   - ${gap.token} [${gap.verdict}] ${gap.filePath}`);
      }
    }

    if (report.missingInRegistry.length > 0) {
      console.log('\n⚠️  Unexplained missing:');
      for (const item of report.missingInRegistry) {
        console.log(`   - ${item.token} (${item.filePath})`);
      }
    }

    if (report.danglingRegistryEntries.length > 0) {
      console.log('\n⚠️  Dangling registry entries (선언된 정의 없음):');
      for (const entry of report.danglingRegistryEntries) {
        console.log(`   - ${entry.token} (via ${entry.via})`);
      }
    }

    console.log('\n═══════════════════════════════════════════════\n');

    // Exit with error if unexplained issues remain
    if (report.summary.totalMissing > 0 || report.summary.totalDangling > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error during audit:', error);
    process.exit(1);
  }
}

// Run if executed directly
main();

export { generateReport };
