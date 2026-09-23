#!/usr/bin/env node
/**
 * WO-O4O-ADMIN-CI-CD-AFFECTED-SCOPE-AND-DUPLICATE-WORK-REDUCTION-V1
 *   — Admin CI / Admin CD 가 공유하는 affected scope 판정기 (SSOT)
 *
 * 배경
 * ---------------------------------------------------------------
 *   1. `deploy-admin.yml` 의 path trigger 가 `packages/**` 전체였다. Admin 의 의존성
 *      closure 에 없는 package(예: `packages/hospital-pharmacy-core`)만 바뀌어도
 *      Admin Dashboard 가 Docker build + Cloud Run deploy 까지 수행했다(실측 3분 01초).
 *   2. `apps/admin-dashboard/**` 한 파일만 바뀐 push 에서도 CI 가 API Server 전체
 *      Jest(약 9분)를 critical path 로 잡았다(실측 CI 14분 13초).
 *
 *   이 스크립트는 **하나의 판정 기준**을 두 workflow 에 공급한다. workflow YAML 두 곳에
 *   서로 다른 glob 을 손으로 유지하지 않는다.
 *
 * 판정 원칙
 * ---------------------------------------------------------------
 *   - Admin 의 의존성 closure 는 **하드코딩하지 않는다.** pnpm-workspace 축의
 *     package.json 을 읽어 dependencies / devDependencies / peerDependencies /
 *     optionalDependencies 의 workspace 이름을 따라 transitive 하게 계산한다.
 *   - **의심스러우면 전부 실행한다.** 매핑되지 않는 파일, 판정 실패, base SHA 이상,
 *     force push, shallow history → `global_or_unknown=true` → 기존 full CI 로 fallback.
 *     false negative(검증 누락) 보다 불필요한 1회 실행을 선택한다.
 *   - `docs/**` 는 **추가·수정일 때만** 중립이다. 기록물 존재를 단언하는 api-server
 *     정적 spec 이 있으므로(`archive-retention-*`, `cross-session-safe-commit-guard` 등)
 *     문서 **삭제·이동**은 중립이 아니라 full fallback 이다.
 *   - `.github/**` · `scripts/**` · root manifest/config · 매핑 불가 경로는 전부
 *     global 이다. api-server 의 정적 계약 spec 들이 이 파일들을 raw text 로 읽는다.
 *
 * admin_only
 * ---------------------------------------------------------------
 *   코드 변경이 `apps/admin-dashboard/**` 에만 있고 나머지가 중립 문서인 경우.
 *   이때도 **Admin 소스를 읽는 api-server 정적 guard spec 은 건너뛰지 않는다.**
 *   `--mode=guard-specs` 가 그 목록을 raw-source 참조로 선별한다(§ 아래).
 *
 * 사용법
 * ---------------------------------------------------------------
 *   node scripts/ci/detect-affected.mjs                       # BASE_SHA/HEAD_SHA 환경변수
 *   node scripts/ci/detect-affected.mjs --base <sha> --head <sha>
 *   node scripts/ci/detect-affected.mjs --files-from <file>   # "STATUS\tpath" 목록 (테스트/재현용)
 *   node scripts/ci/detect-affected.mjs --mode=guard-specs    # 선별된 api-server spec 경로 출력
 *
 *   node scripts/ci/detect-affected.mjs --mode=docs-specs     # 변경 문서를 소비하는 api-server test 경로 출력
 *
 *   GITHUB_OUTPUT 가 있으면 admin_affected / admin_only / api_affected /
 *   docs_only / docs_fast_eligible / global_or_unknown / fallback / reason 을
 *   기록한다. 항상 exit 0 이다 — 판정기 자체의 실패가 파이프라인을 막는 대신
 *   안전한 fallback 이 되도록 한다.
 *
 * docs fast path
 * ---------------------------------------------------------------
 *   WO-O4O-DOCS-ONLY-CI-SECURITY-FAST-PATH-AND-PUSH-CONCURRENCY-PRESERVATION-V1
 *
 *   문서만 바꾼 commit 에서도 CI 전체(약 14분) + CodeQL 전체(약 7분 30초)가 돌았다.
 *   `docs_fast_eligible` 은 그 중 **가장 좁은 부분집합**만 참으로 만든다:
 *     - 변경 전체가 `docs/**` 안
 *     - 상태가 A(추가) · M(수정) 뿐 — 삭제 · 이동은 기록물 존재를 단언하는
 *       정적 spec 이 있으므로 기존 full fallback 유지
 *     - 확장자가 `.md` 뿐 — `docs/checks/data/**` 의 JSON fixture 처럼
 *       **코드·테스트가 읽는 데이터 자산**은 문서가 아니다
 *     - 경로에 `data/` 세그먼트가 없음 (같은 이유의 보수적 여유)
 *   나머지는 전부 기존 경로다. 애매하면 full CI 한 번을 선택한다.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, appendFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(HERE, '..', '..');

/** pnpm-workspace.yaml 의 packages 축과 동일하게 유지한다. */
const WORKSPACE_DIRS = ['apps', 'packages', 'packages/@o4o-apps', 'services'];
/** pnpm-workspace.yaml 의 `!` 항목 */
const EXCLUDED_WORKSPACES = new Set(['services/mobile-app']);

const ADMIN_PACKAGE = '@o4o/admin-dashboard';
const ADMIN_DIR = 'apps/admin-dashboard';
const API_PACKAGE = '@o4o/api-server';
const API_DIR = 'apps/api-server';

const DEP_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

/**
 * 저장소 전역 영향 경로.
 *   exact  — 정확히 이 파일
 *   prefix — 이 경로로 시작하는 모든 파일
 * 여기에 걸리면 판정 없이 기존 full CI 로 간다.
 */
const GLOBAL_EXACT = new Set([
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  '.npmrc',
  '.npmrc.pnpm',
  '.nvmrc',
  'eslint.config.js',
  '.eslintrc.cjs',
  '.eslintignore',
  'tsconfig.json',
  'tsconfig.base.json',
  'tsconfig.node.json',
  '.dockerignore',
  '.gcloudignore',
]);

const GLOBAL_PREFIXES = [
  // workflow · composite action · CI 스크립트는 api-server 정적 spec 들이 raw text 로 읽는다.
  '.github/',
  'scripts/',
  'tools/',
  'e2e/',
  'config/',
  'bundles/',
  '.husky/',
];

/** 추가·수정일 때 중립으로 취급하는 경로 (삭제·이동은 중립이 아니다). */
const NEUTRAL_PREFIXES = ['docs/'];

/** docs fast path 대상 확장자 — Markdown 문서만. */
const DOCS_FAST_EXTENSIONS = ['.md'];
/** docs 경로 안이어도 문서가 아니라 **데이터 자산**으로 보는 세그먼트. */
const DOCS_DATA_SEGMENTS = new Set(['data', 'fixtures', 'translations']);

// ---------------------------------------------------------------------------
// workspace graph
// ---------------------------------------------------------------------------

/**
 * @param {string} root
 * @returns {{ byName: Map<string, {name: string, dir: string, deps: string[]}>, byDir: Map<string, string>, dirs: string[] }}
 */
export function buildWorkspaceGraph(root = REPO_ROOT) {
  const byName = new Map();
  const byDir = new Map();

  for (const wsDir of WORKSPACE_DIRS) {
    const abs = path.join(root, ...wsDir.split('/'));
    if (!existsSync(abs) || !statSync(abs).isDirectory()) continue;
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.endsWith('.backup')) continue;
      const rel = `${wsDir}/${entry.name}`;
      if (EXCLUDED_WORKSPACES.has(rel)) continue;
      const manifest = path.join(abs, entry.name, 'package.json');
      if (!existsSync(manifest)) continue;
      const pkg = JSON.parse(readFileSync(manifest, 'utf-8'));
      if (!pkg.name) continue;
      byName.set(pkg.name, { name: pkg.name, dir: rel, manifest: pkg });
      byDir.set(rel, pkg.name);
    }
  }

  // workspace 내부 이름만 의존성으로 남긴다 (외부 npm 패키지는 graph 축이 아니다).
  for (const node of byName.values()) {
    const deps = new Set();
    for (const field of DEP_FIELDS) {
      for (const dep of Object.keys(node.manifest[field] ?? {})) {
        if (byName.has(dep) && dep !== node.name) deps.add(dep);
      }
    }
    node.deps = [...deps].sort();
    delete node.manifest;
  }

  // 긴 경로가 먼저 매칭되도록 정렬한다 (packages/@o4o-apps/x vs packages/x).
  const dirs = [...byDir.keys()].sort((a, b) => b.length - a.length);
  return { byName, byDir, dirs };
}

/** root 패키지의 transitive workspace 의존성 closure (root 자신 포함). */
export function dependencyClosure(graph, rootName) {
  const seen = new Set();
  if (!graph.byName.has(rootName)) return seen;
  const queue = [rootName];
  seen.add(rootName);
  while (queue.length > 0) {
    const current = queue.pop();
    for (const dep of graph.byName.get(current)?.deps ?? []) {
      if (!seen.has(dep)) {
        seen.add(dep);
        queue.push(dep);
      }
    }
  }
  return seen;
}

// ---------------------------------------------------------------------------
// changed files
// ---------------------------------------------------------------------------

const normalize = (p) => p.split('\\').join('/').replace(/^\.\//, '');

const git = (args, cwd = REPO_ROOT) =>
  spawnSync('git', args, { cwd, encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });

/**
 * `git diff --name-status` 를 {status, path} 목록으로 읽는다.
 * rename(R)/copy(C) 는 두 경로 모두 변경으로 본다.
 * @returns {{ok: true, files: {status: string, path: string}[]} | {ok: false, reason: string}}
 */
export function readChangedFiles(base, head, cwd = REPO_ROOT) {
  const ZERO = /^0{7,40}$/;
  if (!base || ZERO.test(base)) return { ok: false, reason: `base SHA 없음/all-zero (${base || 'empty'})` };
  if (!head) return { ok: false, reason: 'head SHA 없음' };

  let from = base;
  const mb = git(['merge-base', base, head], cwd);
  if (mb.status === 0 && mb.stdout.trim()) {
    from = mb.stdout.trim();
  }

  const diff = git(['diff', '--name-status', '-z', `${from}`, `${head}`], cwd);
  if (diff.status !== 0) {
    return { ok: false, reason: `git diff 실패 (${(diff.stderr || '').trim().slice(0, 200)})` };
  }

  const files = [];
  const parts = diff.stdout.split('\0');
  for (let i = 0; i < parts.length; i += 1) {
    const token = parts[i];
    if (!token) continue;
    const status = token[0];
    if (status === 'R' || status === 'C') {
      const oldPath = parts[i + 1];
      const newPath = parts[i + 2];
      i += 2;
      if (oldPath) files.push({ status, path: normalize(oldPath) });
      if (newPath) files.push({ status, path: normalize(newPath) });
    } else {
      const p = parts[i + 1];
      i += 1;
      if (p) files.push({ status, path: normalize(p) });
    }
  }
  return { ok: true, files };
}

/** "STATUS\tpath" 또는 "path" 한 줄씩. 테스트 fixture · 수동 재현용. */
export function parseFileList(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line) => {
      const tab = line.indexOf('\t');
      if (tab === -1) return { status: 'M', path: normalize(line) };
      return { status: line.slice(0, tab).trim()[0] ?? 'M', path: normalize(line.slice(tab + 1)) };
    });
}

// ---------------------------------------------------------------------------
// classification
// ---------------------------------------------------------------------------

const hasPrefix = (p, prefixes) => prefixes.some((prefix) => p === prefix.replace(/\/$/, '') || p.startsWith(prefix));

/** 파일 경로 → 소속 workspace 디렉터리 (없으면 null) */
export function workspaceDirOf(graph, filePath) {
  for (const dir of graph.dirs) {
    if (filePath === dir || filePath.startsWith(`${dir}/`)) return dir;
  }
  return null;
}

/**
 * docs fast path 판정.
 *
 * WO-O4O-DOCS-ONLY-CI-SECURITY-FAST-PATH-AND-PUSH-CONCURRENCY-PRESERVATION-V1
 *
 *   docs_only          변경 전체가 `docs/**` 안
 *   docs_fast_eligible docs_only + 상태 A/M + 확장자 `.md` + data 세그먼트 없음
 *
 * `.md` 가 아니거나(예: `docs/checks/data/**.json` guard fixture,
 * `docs/guides/.../translations/*.json`) 삭제·이동이면 fast 대상이 아니다.
 * 이 경우 docs_only 는 참일 수 있지만 docs_fast_eligible 은 거짓이며,
 * 호출자는 기존 full 경로를 그대로 탄다.
 *
 * @param {{status: string, path: string}[]} changedFiles
 * @returns {{docs_only: boolean, docs_fast_eligible: boolean, reasons: string[]}}
 */
export function classifyDocs(changedFiles) {
  if (!Array.isArray(changedFiles) || changedFiles.length === 0) {
    return { docs_only: false, docs_fast_eligible: false, reasons: ['변경 파일 0건 — docs fast 대상 아님'] };
  }

  const reasons = [];
  let docsOnly = true;
  let fast = true;

  for (const { status, path: file } of changedFiles) {
    if (!hasPrefix(file, NEUTRAL_PREFIXES)) {
      docsOnly = false;
      fast = false;
      continue;
    }
    if (status !== 'A' && status !== 'M') {
      fast = false;
      reasons.push(`문서 ${status}(삭제/이동) — docs fast 아님: ${file}`);
      continue;
    }
    if (!DOCS_FAST_EXTENSIONS.some((ext) => file.toLowerCase().endsWith(ext))) {
      fast = false;
      reasons.push(`Markdown 이 아닌 문서 경로 자산 — docs fast 아님: ${file}`);
      continue;
    }
    if (file.split('/').some((seg) => DOCS_DATA_SEGMENTS.has(seg))) {
      fast = false;
      reasons.push(`데이터 성격 경로(${file.split('/').find((seg) => DOCS_DATA_SEGMENTS.has(seg))}/) — docs fast 아님: ${file}`);
      continue;
    }
  }

  return { docs_only: docsOnly, docs_fast_eligible: docsOnly && fast, reasons };
}

/**
 * @param {{status: string, path: string}[]} changedFiles
 * @param {ReturnType<typeof buildWorkspaceGraph>} graph
 */
export function classify(changedFiles, graph, opts = {}) {
  const result = {
    admin_affected: false,
    admin_only: false,
    api_affected: false,
    api_ci_affected: false,
    api_deploy_affected: false,
    docs_only: false,
    docs_fast_eligible: false,
    global_or_unknown: false,
    fallback: false,
    reasons: [],
  };

  if (!Array.isArray(changedFiles) || changedFiles.length === 0) {
    // 변경 0건은 판정 불가로 본다 (예: 빈 push, 알 수 없는 diff).
    return {
      ...result,
      admin_affected: true,
      api_affected: true,
      api_ci_affected: true,
      api_deploy_affected: true,
      docs_only: false,
      docs_fast_eligible: false,
      global_or_unknown: true,
      fallback: true,
      reasons: ['변경 파일 0건 — 판정 불가, full CI · API 배포로 fallback'],
    };
  }

  const adminClosure = dependencyClosure(graph, ADMIN_PACKAGE);
  const apiClosure = dependencyClosure(graph, API_PACKAGE);

  let adminAffected = false;
  let apiAffected = false;
  let global = false;
  let nonAdminCode = false;

  for (const { status, path: file } of changedFiles) {
    if (GLOBAL_EXACT.has(file) || hasPrefix(file, GLOBAL_PREFIXES)) {
      global = true;
      result.reasons.push(`global: ${file}`);
      continue;
    }

    if (hasPrefix(file, NEUTRAL_PREFIXES)) {
      if (status === 'A' || status === 'M') continue;
      global = true;
      result.reasons.push(`문서 삭제/이동(${status}) — 기록물 존재를 단언하는 정적 spec 때문에 중립 아님: ${file}`);
      continue;
    }

    const wsDir = workspaceDirOf(graph, file);
    if (!wsDir) {
      global = true;
      result.reasons.push(`workspace 매핑 불가: ${file}`);
      continue;
    }

    const pkgName = graph.byDir.get(wsDir);
    if (wsDir === ADMIN_DIR) {
      adminAffected = true;
      result.reasons.push(`admin 소스: ${file}`);
    } else {
      nonAdminCode = true;
      if (adminClosure.has(pkgName)) {
        adminAffected = true;
        result.reasons.push(`admin 의존성 ${pkgName}: ${file}`);
      }
      if (wsDir === API_DIR || apiClosure.has(pkgName)) {
        apiAffected = true;
        result.reasons.push(`api 의존성 ${pkgName}: ${file}`);
      }
      if (!adminClosure.has(pkgName) && wsDir !== API_DIR && !apiClosure.has(pkgName)) {
        result.reasons.push(`admin/api 무관 workspace ${pkgName}: ${file}`);
      }
    }
  }

  // docs 축은 code 축과 독립적으로 계산한다 — 문서 삭제·이동은 위에서 이미 global 이므로
  // 여기서 docs_fast_eligible 이 참이 되는 경우는 `docs/**` Markdown 추가·수정뿐이다.
  const docs = classifyDocs(changedFiles);
  // 배포 축은 CI 축과 **독립적으로** 계산한다 (WO-O4O-API-CD-RUNTIME-AFFECTED-DEPLOY-GATE-V1 §5).
  const deploy = classifyApiDeploy(changedFiles, graph, opts);

  if (global) {
    return {
      admin_affected: true,
      admin_only: false,
      api_affected: true,
      api_ci_affected: true,
      api_deploy_affected: deploy.api_deploy_affected,
      docs_only: docs.docs_only,
      docs_fast_eligible: false,
      global_or_unknown: true,
      fallback: false,
      reasons: [...result.reasons, ...docs.reasons, ...deploy.reasons],
    };
  }

  return {
    admin_affected: adminAffected,
    admin_only: adminAffected && !nonAdminCode,
    api_affected: apiAffected,
    api_ci_affected: apiAffected,
    api_deploy_affected: deploy.api_deploy_affected,
    docs_only: docs.docs_only,
    docs_fast_eligible: docs.docs_fast_eligible,
    global_or_unknown: false,
    fallback: false,
    reasons: [...result.reasons, ...docs.reasons, ...deploy.reasons],
  };
}

// ---------------------------------------------------------------------------
// API 배포 영향 판정 (api_ci_affected vs api_deploy_affected)
// ---------------------------------------------------------------------------

/**
 * WO-O4O-API-CD-RUNTIME-AFFECTED-DEPLOY-GATE-V1
 *
 * 두 축은 다른 질문이다.
 *   api_ci_affected     — API 를 **검증**해야 하는가 (Jest · type-check)
 *   api_deploy_affected — production **image/runtime/schema** 가 바뀌는가
 *
 * 후자가 거짓이면 Docker build/push · Cloud Run migration Job 실행 ·
 * 새 revision · one-off job image 재고정이 **전부 불필요한 프로덕션 작업**이다.
 *
 * production image 실측 구성 (Dockerfile · tsup.config.ts · deploy-api.yml 조사):
 *   dist/main.js · dist/migrate.js · one-off job entry 7개 (tsup 번들)
 *   dist/database/** (tsc 산출 migration + migration-config)
 *   src/assets/** · packages/mail-core/templates/email
 * 이 중 어디에도 test 파일은 들어가지 않는다.
 */

/**
 * 배포 파이프라인이 **실제로 사용하는** 저장소 공용 경로.
 * 조사 결과 `deploy-api.yml` 이 참조하는 저장소 파일은 composite action 하나뿐이고
 * (`uses: ./.github/actions/setup-build-env`), root `build:packages` 와 api-server 의
 * `build`/`build:api` 어디에도 `scripts/**` 호출이 없다.
 */
const API_DEPLOY_WORKFLOW = '.github/workflows/deploy-api.yml';
const API_DEPLOY_BUILD_PREFIXES = ['.github/actions/'];
/**
 * global 이지만 **API production image 와 무관한** 경로.
 * 다른 서비스의 workflow(`deploy-web-services.yml` 등) · CI 스크립트 · e2e · hook 은
 * 이미지 내용에 들어가지도, 빌드에 참여하지도 않는다.
 */
const API_DEPLOY_NEUTRAL_PREFIXES = ['.github/', 'scripts/', 'tools/', 'e2e/', '.husky/'];

/** apps/api-server 안에서 production bundle 에 **들어가지 않는** 경로 (test 축). */
const API_NON_DEPLOY_PATTERNS = [
  /(^|\/)__tests__\//,
  /(^|\/)__mocks__\//,
  /\.(spec|test)\.(ts|tsx|js|mjs|cjs)$/,
  /(^|\/)jest\.config\.[a-z]+$/,
];

/**
 * 조사 근거(census):
 *   - `apps/api-server/tsconfig.build.json` 이 `*.spec.ts` · `*.test.ts` ·
 *     `src/__tests__/**` 를 exclude 한다 → tsc migration 산출물에 없다.
 *   - `tsup.config.ts` entry 9개(main · migrate · *-job)에서 test 파일로 가는
 *     import 경로가 없다. production source 가 `__tests__`/`tests/` 에서
 *     import 하는 사례 **0건**.
 *   - production source 가 test 파일을 raw text 로 읽는 사례 **0건**
 *     (`readFileSync` 히트 2건은 전부 `src/scripts/**` — build 에서 제외되고
 *      tsup entry 도 아니다).
 * 추측이 아니라 이 census 결과로 제외한다.
 */
export function isApiNonDeployPath(file) {
  if (!file.startsWith(`${API_DIR}/`)) return false;
  const rel = file.slice(API_DIR.length + 1);
  // apps/api-server/tests/** — vitest multi-tenant 스위트. 번들·이미지와 무관하다.
  if (rel === 'tests' || rel.startsWith('tests/')) return true;
  return API_NON_DEPLOY_PATTERNS.some((re) => re.test(rel));
}

/**
 * pnpm-lock.yaml 을 `importers:` 블록과 그 밖(tail)으로 가른다.
 * tail 에는 `lockfileVersion` · `settings` · `overrides` · `packages` · `snapshots` 가 들어간다.
 * @returns {{importers: Map<string,string>, tail: string} | null} 파싱 불가면 null
 */
export function parsePnpmLock(text) {
  if (typeof text !== 'string' || text.length === 0) return null;
  const lines = text.split(/\r?\n/);
  const importers = new Map();
  const tail = [];
  let sawImporters = false;
  let inImporters = false;
  let key = null;
  let buf = [];
  const flush = () => {
    if (key !== null) importers.set(key, buf.join('\n'));
    key = null;
    buf = [];
  };
  for (const line of lines) {
    if (!inImporters) {
      if (line === 'importers:') {
        sawImporters = true;
        inImporters = true;
        continue;
      }
      tail.push(line);
      continue;
    }
    if (line.trim() !== '' && /^\S/.test(line)) {
      // importers 블록 종료 — 다음 top-level 키
      flush();
      inImporters = false;
      tail.push(line);
      continue;
    }
    const m = line.match(/^  (\S.*?):\s*$/);
    if (m) {
      flush();
      key = m[1].replace(/^'(.*)'$/, '$1').replace(/^"(.*)"$/, '$1');
      continue;
    }
    if (key !== null) buf.push(line);
    else tail.push(line);
  }
  flush();
  if (!sawImporters) return null;
  return { importers, tail: tail.join('\n') };
}

/** API production image 에 영향을 줄 수 있는 pnpm importer 경로 집합. */
export function apiDeployImporters(graph, closure = dependencyClosure(graph, API_PACKAGE)) {
  // root importer('.') 는 build 환경 자체의 의존성이므로 보수적으로 포함한다.
  const set = new Set(['.']);
  for (const name of closure) {
    const dir = graph.byName.get(name)?.dir;
    if (dir) set.add(dir);
  }
  return set;
}

/**
 * WO-O4O-API-CD-RUNTIME-AFFECTED-DEPLOY-GATE-V1 §9
 *
 * `pnpm-lock.yaml` 을 무조건 global=true 로 끝내지 않는다. 실측상 frontend 서비스 ·
 * closure 밖 package 하나를 추가·수정한 것만으로 lockfile 이 바뀌어 API 가 배포됐다.
 *
 * 판정은 **두 단계 모두 안전한 쪽**으로만 거짓이 된다:
 *   1. importers 밖(packages/snapshots/overrides/settings)이 조금이라도 다르면 → true
 *      (외부 의존성 해석 변경 = 번들 산출물이 달라질 수 있다)
 *   2. importers 안에서 바뀐 항목이 **API closure 밖 importer 뿐**일 때만 false
 * 파싱 실패 · 내용 없음 · 예외는 전부 true 다.
 */
export function lockfileDeployImpact(baseText, headText, deployImporters) {
  const base = parsePnpmLock(baseText);
  const head = parsePnpmLock(headText);
  if (!base || !head) return { affected: true, reason: 'pnpm-lock.yaml 내용 비교 불가 — 안전 fallback' };
  if (base.tail !== head.tail) {
    return { affected: true, reason: 'pnpm-lock.yaml importers 밖(packages/snapshots/overrides) 변경 — 의존성 해석 변경' };
  }
  const keys = new Set([...base.importers.keys(), ...head.importers.keys()]);
  const changed = [...keys].filter((k) => base.importers.get(k) !== head.importers.get(k)).sort();
  const hit = changed.filter((k) => deployImporters.has(k));
  if (hit.length > 0) {
    return { affected: true, reason: `pnpm-lock.yaml API closure importer 변경: ${hit.join(', ')}` };
  }
  return {
    affected: false,
    reason: `pnpm-lock.yaml 변경이 API closure 밖 importer 뿐: ${changed.join(', ') || '(importer 변경 없음)'}`,
  };
}

/**
 * WO-O4O-API-CD-RUNTIME-AFFECTED-DEPLOY-GATE-V1 §5 · §6 · §7 · §8 · §16
 *
 * @param {{status: string, path: string}[]} changedFiles
 * @param {ReturnType<typeof buildWorkspaceGraph>} graph
 * @param {{readLock?: (which: 'base'|'head') => string|undefined}} opts
 *        pnpm-lock.yaml 정밀 판정을 위한 base/head 원문 공급자. 없으면 안전 fallback.
 * @returns {{api_deploy_affected: boolean, reasons: string[]}}
 */
export function classifyApiDeploy(changedFiles, graph, opts = {}) {
  if (!Array.isArray(changedFiles) || changedFiles.length === 0) {
    return { api_deploy_affected: true, reasons: ['변경 파일 0건 — 판정 불가, API 배포 fallback'] };
  }

  const closure = dependencyClosure(graph, API_PACKAGE);
  const importers = apiDeployImporters(graph, closure);
  const reasons = [];
  let affected = false;

  for (const { path: file } of changedFiles) {
    if (file === 'pnpm-lock.yaml') {
      let verdict;
      try {
        verdict = lockfileDeployImpact(opts.readLock?.('base'), opts.readLock?.('head'), importers);
      } catch (err) {
        verdict = { affected: true, reason: `pnpm-lock.yaml 판정 예외 — 안전 fallback (${err.message})` };
      }
      if (verdict.affected) affected = true;
      reasons.push(verdict.reason);
      continue;
    }

    // 문서는 production image 에 들어가지 않는다 — 삭제·이동도 배포 영향이 아니다.
    // (기록물 guard spec 은 CI 축의 문제이지 배포 축의 문제가 아니다.)
    if (hasPrefix(file, NEUTRAL_PREFIXES)) continue;

    // 이 workflow 자체의 변경은 배포 영향으로 취급한다 (§15).
    if (file === API_DEPLOY_WORKFLOW) {
      affected = true;
      reasons.push(`deploy workflow 자체: ${file}`);
      continue;
    }
    if (hasPrefix(file, API_DEPLOY_BUILD_PREFIXES)) {
      affected = true;
      reasons.push(`배포가 사용하는 composite action: ${file}`);
      continue;
    }
    if (hasPrefix(file, API_DEPLOY_NEUTRAL_PREFIXES)) {
      reasons.push(`배포 파이프라인 미참여 공용 경로 — 배포 무영향: ${file}`);
      continue;
    }
    if (GLOBAL_EXACT.has(file) || hasPrefix(file, GLOBAL_PREFIXES)) {
      affected = true;
      reasons.push(`deploy global(root manifest/config · 빌드 컨텍스트): ${file}`);
      continue;
    }

    if (file === API_DIR || file.startsWith(`${API_DIR}/`)) {
      if (isApiNonDeployPath(file)) {
        reasons.push(`api test 축 — production image 무영향: ${file}`);
        continue;
      }
      affected = true;
      reasons.push(`api runtime: ${file}`);
      continue;
    }

    const wsDir = workspaceDirOf(graph, file);
    if (!wsDir) {
      affected = true;
      reasons.push(`deploy 판정 불가(workspace 매핑 없음) — 안전 fallback: ${file}`);
      continue;
    }
    const pkgName = graph.byDir.get(wsDir);
    if (closure.has(pkgName)) {
      affected = true;
      reasons.push(`api 의존성 closure package ${pkgName}: ${file}`);
      continue;
    }
    reasons.push(`api closure 밖 ${pkgName} — 배포 무영향: ${file}`);
  }

  return { api_deploy_affected: affected, reasons };
}

// ---------------------------------------------------------------------------
// api-server 정적 guard spec 선별
// ---------------------------------------------------------------------------

/**
 * 변경 경로를 **raw text 로** 참조하는 api-server spec 을 고른다.
 *
 * 왜 raw text 인가: 이 spec 들은 `import` 가 아니라 `fs.readFileSync('apps/admin-dashboard/...')`
 * 로 남의 워크스페이스 소스를 읽어 은퇴 패턴 재유입을 막는 정적 guard 다.
 * jest `--findRelatedTests` 는 모듈 그래프만 보므로 이 축을 전부 놓친다.
 *
 * 매칭 단위는 **workspace 디렉터리 이상**으로 자른다. `apps` 처럼 전역 토큰까지
 * 내려가면 사실상 전체 선택이 되어 선별 의미가 사라진다.
 *
 * @returns {string[]} apps/api-server 기준 상대 경로 (jest 인자로 그대로 사용)
 */
export function selectPathGuardSpecs(changedFiles, graph, root = REPO_ROOT) {
  const testDirRel = 'apps/api-server/src/__tests__';
  const testDirAbs = path.join(root, ...testDirRel.split('/'));
  if (!existsSync(testDirAbs)) return [];

  /** 참조 후보 문자열 (workspace dir 이상 깊이만) */
  const needles = new Set();
  for (const { path: file } of changedFiles) {
    const wsDir = workspaceDirOf(graph, file);
    if (wsDir) {
      needles.add(wsDir);
      // spec 마다 표기가 다르다: 경로(`apps/admin-dashboard/...`) · 패키지명
      // (`@o4o/admin-dashboard`) · 디렉터리명(`admin-dashboard`). 셋 다 후보로 둔다.
      // 넓게 잡히면 검사가 늘 뿐이고, 좁게 잡히면 guard 를 놓친다.
      needles.add(wsDir.slice(wsDir.lastIndexOf('/') + 1));
      const pkgName = graph.byDir.get(wsDir);
      if (pkgName) needles.add(pkgName);
      let cur = file;
      while (cur.length > wsDir.length) {
        needles.add(cur);
        const cut = cur.lastIndexOf('/');
        if (cut <= wsDir.length) break;
        cur = cur.slice(0, cut);
      }
      continue;
    }
    if (hasPrefix(file, NEUTRAL_PREFIXES)) {
      // docs/<area> 이상 깊이만 (docs 단독은 너무 넓다)
      const seg = file.split('/');
      if (seg.length >= 2) needles.add(`${seg[0]}/${seg[1]}`);
      needles.add(file);
    }
  }
  if (needles.size === 0) return [];

  const selected = [];
  for (const entry of readdirSync(testDirAbs, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.spec.ts')) continue;
    const source = readFileSync(path.join(testDirAbs, entry.name), 'utf-8');
    for (const needle of needles) {
      if (source.includes(needle)) {
        selected.push(`src/__tests__/${entry.name}`);
        break;
      }
    }
  }
  return selected.sort();
}

// ---------------------------------------------------------------------------
// 변경 문서를 소비하는 api-server test 선별 (docs fast path)
// ---------------------------------------------------------------------------

/**
 * WO-O4O-DOCS-ONLY-CI-SECURITY-FAST-PATH-AND-PUSH-CONCURRENCY-PRESERVATION-V1 §9 · §10
 *
 * 문서를 **실제로 읽는** test 는 top-level `src/__tests__/*.spec.ts` 에만 있지 않다.
 * 전수 조사에서 nested test(`src/modules/content-guard/__tests__/liquid-guard.test.ts`)가
 * `docs/checks/data/**` 를 읽는 사례가 확인됐다. 따라서 docs 축 선별은
 * `apps/api-server/src` 전체를 재귀로 훑는다.
 *
 * Admin 축(`selectPathGuardSpecs`)의 탐색 범위는 **바꾸지 않는다** —
 * 선행 WO 의 Admin fast path 실측(2분 57초)을 회귀시키지 않기 위해서다.
 *
 * 매칭 단위는 `docs/<area>` 이상이다. `docs` 단독까지 내려가면 사실상 전체 선택이 된다.
 * false positive(몇 개 더 실행)는 허용하고 false negative(guard 누락)는 허용하지 않는다.
 *
 * @returns {string[]} apps/api-server 기준 상대 경로 (jest 인자로 그대로 사용)
 */
export function selectDocsConsumerSpecs(changedFiles, root = REPO_ROOT) {
  const srcRel = 'apps/api-server/src';
  const srcAbs = path.join(root, ...srcRel.split('/'));
  if (!existsSync(srcAbs)) return [];

  const needles = new Set();
  for (const { path: file } of changedFiles) {
    if (!hasPrefix(file, NEUTRAL_PREFIXES)) continue;
    const seg = file.split('/');
    if (seg.length >= 2) needles.add(`${seg[0]}/${seg[1]}`);
    needles.add(file);
  }
  if (needles.size === 0) return [];

  const TEST_FILE = /\.(spec|test)\.(ts|tsx|js)$/;
  const selected = [];

  /** @param {string} dirAbs @param {string} dirRel */
  const walk = (dirAbs, dirRel) => {
    for (const entry of readdirSync(dirAbs, { withFileTypes: true })) {
      const abs = path.join(dirAbs, entry.name);
      const rel = dirRel ? `${dirRel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'setup') continue;
        walk(abs, rel);
        continue;
      }
      if (!entry.isFile() || !TEST_FILE.test(entry.name)) continue;
      const source = readFileSync(abs, 'utf-8');
      for (const needle of needles) {
        if (source.includes(needle)) {
          selected.push(`src/${rel}`);
          break;
        }
      }
    }
  };

  walk(srcAbs, '');
  return selected.sort();
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function argValue(argv, name) {
  const inline = argv.find((a) => a.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const idx = argv.indexOf(name);
  return idx >= 0 ? argv[idx + 1] : undefined;
}

function resolveChangedFiles(argv) {
  const listFile = argValue(argv, '--files-from');
  if (listFile) {
    return { ok: true, files: parseFileList(readFileSync(listFile, 'utf-8')), source: `--files-from ${listFile}` };
  }
  const base = argValue(argv, '--base') ?? process.env.BASE_SHA ?? '';
  const head = argValue(argv, '--head') ?? process.env.HEAD_SHA ?? 'HEAD';
  const read = readChangedFiles(base, head);
  return { ...read, base, head, source: `git diff ${base.slice(0, 8)}..${head.slice(0, 8)}` };
}

function main() {
  const argv = process.argv.slice(2);
  const mode = argValue(argv, '--mode') ?? 'classify';
  const graph = buildWorkspaceGraph();

  let read;
  try {
    read = resolveChangedFiles(argv);
  } catch (err) {
    read = { ok: false, reason: `변경 파일 수집 예외: ${err.message}` };
  }

  if (mode === 'docs-specs') {
    // 선별 실패(판정 불가)는 빈 출력이다. 호출자는 빈 목록을 "전체 suite 로 되돌림" 으로 읽는다.
    if (!read.ok) {
      process.stdout.write('\n');
      return;
    }
    process.stdout.write(`${selectDocsConsumerSpecs(read.files).join(' ')}\n`);
    return;
  }

  if (mode === 'guard-specs') {
    // 선별 실패 = 안전하게 "전체" 를 뜻하는 빈 출력 대신 비어 있음을 명시한다.
    // 호출자(workflow)는 목록이 비면 전체 suite 로 되돌린다.
    if (!read.ok) {
      process.stdout.write('\n');
      return;
    }
    process.stdout.write(`${selectPathGuardSpecs(read.files, graph).join(' ')}\n`);
    return;
  }

  let verdict;
  if (!read.ok) {
    verdict = {
      admin_affected: true,
      admin_only: false,
      api_affected: true,
      docs_only: false,
      docs_fast_eligible: false,
      global_or_unknown: true,
      fallback: true,
      reasons: [`safe fallback — ${read.reason}`],
    };
  } else {
    // WO-O4O-API-CD-RUNTIME-AFFECTED-DEPLOY-GATE-V1 §9 — pnpm-lock.yaml 정밀 판정용 base/head 원문.
    // `--files-from` 재현 모드에는 revision 이 없다 → 공급자 없음 → 안전 fallback(true).
    const readLock = (which) => {
      const rev = which === 'base' ? read.base : read.head;
      if (!rev) return undefined;
      const out = git(['show', `${rev}:pnpm-lock.yaml`]);
      return out.status === 0 ? out.stdout : undefined;
    };
    verdict = classify(read.files, graph, { readLock });
  }

  // 중립 변경(docs 추가·수정)만 있으면 사유 줄이 비는 것이 정상이다 —
  // "변경 없음" 으로 적으면 변경 파일이 있었다는 사실이 가려진다.
  const reason = verdict.reasons.slice(0, 12).join(' | ') || '영향 축 없음 (중립 변경만 — 문서 추가·수정)';

  console.log(`source          : ${read.source ?? 'n/a'}`);
  console.log(`changed files   : ${read.ok ? read.files.length : 'n/a'}`);
  console.log(`admin_affected  : ${verdict.admin_affected}`);
  console.log(`admin_only      : ${verdict.admin_only}`);
  console.log(`api_affected    : ${verdict.api_affected}`);
  console.log(`api_ci_affected : ${verdict.api_ci_affected}`);
  console.log(`api_deploy_affected: ${verdict.api_deploy_affected}`);
  console.log(`docs_only       : ${verdict.docs_only}`);
  console.log(`docs_fast_eligible: ${verdict.docs_fast_eligible}`);
  console.log(`global_or_unknown: ${verdict.global_or_unknown}`);
  console.log(`fallback        : ${verdict.fallback}`);
  console.log(`reason          : ${reason}`);
  if (read.ok) {
    for (const f of read.files.slice(0, 50)) console.log(`  ${f.status}\t${f.path}`);
    if (read.files.length > 50) console.log(`  ... (+${read.files.length - 50})`);
  }

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      [
        `admin_affected=${verdict.admin_affected}`,
        `admin_only=${verdict.admin_only}`,
        `api_affected=${verdict.api_affected}`,
        `api_ci_affected=${verdict.api_ci_affected}`,
        `api_deploy_affected=${verdict.api_deploy_affected}`,
        `docs_only=${verdict.docs_only}`,
        `docs_fast_eligible=${verdict.docs_fast_eligible}`,
        `global_or_unknown=${verdict.global_or_unknown}`,
        `fallback=${verdict.fallback}`,
        `reason=${reason.replace(/\r?\n/g, ' ').slice(0, 900)}`,
        '',
      ].join('\n'),
      'utf-8',
    );
  }
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();
