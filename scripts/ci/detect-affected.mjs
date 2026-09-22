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
 *   GITHUB_OUTPUT 가 있으면 admin_affected / admin_only / api_affected /
 *   global_or_unknown / fallback / reason 을 기록한다. 항상 exit 0 이다 —
 *   판정기 자체의 실패가 파이프라인을 막는 대신 안전한 fallback 이 되도록 한다.
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
 * @param {{status: string, path: string}[]} changedFiles
 * @param {ReturnType<typeof buildWorkspaceGraph>} graph
 */
export function classify(changedFiles, graph) {
  const result = {
    admin_affected: false,
    admin_only: false,
    api_affected: false,
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
      global_or_unknown: true,
      fallback: true,
      reasons: ['변경 파일 0건 — 판정 불가, full CI 로 fallback'],
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

  if (global) {
    return {
      admin_affected: true,
      admin_only: false,
      api_affected: true,
      global_or_unknown: true,
      fallback: false,
      reasons: result.reasons,
    };
  }

  return {
    admin_affected: adminAffected,
    admin_only: adminAffected && !nonAdminCode,
    api_affected: apiAffected,
    global_or_unknown: false,
    fallback: false,
    reasons: result.reasons,
  };
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
  return { ...read, source: `git diff ${base.slice(0, 8)}..${head.slice(0, 8)}` };
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
      global_or_unknown: true,
      fallback: true,
      reasons: [`safe fallback — ${read.reason}`],
    };
  } else {
    verdict = classify(read.files, graph);
  }

  const reason = verdict.reasons.slice(0, 12).join(' | ') || '변경 없음';

  console.log(`source          : ${read.source ?? 'n/a'}`);
  console.log(`changed files   : ${read.ok ? read.files.length : 'n/a'}`);
  console.log(`admin_affected  : ${verdict.admin_affected}`);
  console.log(`admin_only      : ${verdict.admin_only}`);
  console.log(`api_affected    : ${verdict.api_affected}`);
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
