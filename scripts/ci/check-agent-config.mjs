#!/usr/bin/env node
/**
 * WO-O4O-DOCS-FAST-AGENT-CONFIG-V1 — `.claude/` 에이전트 설정 경량 검사.
 *
 * `.claude/**` 변경은 docs fast path 로 간다(`scripts/ci/detect-affected.mjs` `isDocsFastExtra`).
 * full CI 의 type-check · ESLint(ts/tsx 만) · Jest 는 이 경로를 원래 검사하지 않았으므로,
 * 대신 아래 세 가지를 docs fast job 과 Code Quality Check 에서 blocking 으로 돌린다.
 *
 *   1. `.claude/**` 의 모든 `*.json` (settings.json 포함) — JSON.parse
 *   2. `.claude/hooks/**` 의 `*.mjs` · `*.js` · `*.cjs` — `node --check` (구문 검사)
 *   3. `.claude/hooks/**` 의 `*.test.{mjs,js,cjs}` — `node --test` (훅 단위 테스트, 있을 때만)
 *
 * 세 검사 중 하나라도 실패하면 exit 1. `.claude/` 가 없으면 검사 대상 0 으로 통과한다.
 * 파일을 수정 · 삭제하지 않는다.
 *
 *   node scripts/ci/check-agent-config.mjs [--root <repo root>]
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_FILE = /\.(mjs|js|cjs)$/;
const TEST_FILE = /\.test\.(mjs|js|cjs)$/;

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, out);
    else if (entry.isFile()) out.push(abs);
  }
  return out;
}

/**
 * @param {string} root 저장소 루트
 * @returns {{ok: boolean, lines: string[], counts: {json: number, scripts: number, tests: number}}}
 */
export function checkAgentConfig(root) {
  const claudeDir = path.join(root, '.claude');
  const rel = (abs) => path.relative(root, abs).split(path.sep).join('/');
  const lines = [];
  let ok = true;

  const files = walk(claudeDir).sort((a, b) => a.localeCompare(b));
  const jsonFiles = files.filter((f) => f.endsWith('.json'));
  const hooksDir = path.join(claudeDir, 'hooks') + path.sep;
  const hookScripts = files.filter((f) => f.startsWith(hooksDir) && SCRIPT_FILE.test(f));
  const hookTests = hookScripts.filter((f) => TEST_FILE.test(f));

  for (const file of jsonFiles) {
    try {
      JSON.parse(readFileSync(file, 'utf8'));
      lines.push(`ok   JSON          ${rel(file)}`);
    } catch (error) {
      ok = false;
      lines.push(`FAIL JSON          ${rel(file)} — ${error.message}`);
    }
  }

  for (const file of hookScripts) {
    const r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (r.status === 0) {
      lines.push(`ok   node --check  ${rel(file)}`);
    } else {
      ok = false;
      const detail = `${r.stderr || r.stdout || r.error?.message || ''}`.trim().split('\n').slice(0, 6).join(' | ');
      lines.push(`FAIL node --check  ${rel(file)} — ${detail}`);
    }
  }

  if (hookTests.length === 0) {
    lines.push('info 훅 단위 테스트 0건 (.claude/hooks/**/*.test.{mjs,js,cjs}) — 생기면 자동으로 실행한다');
  } else {
    // 바깥이 `node --test` 일 때 물려받는 NODE_TEST_CONTEXT 가 있으면 자식이 결과를 부모 runner 로 넘기고
    // 자기 exit code 로 실패를 알리지 않는다. 독립 실행이 되도록 지운다.
    const env = { ...process.env };
    delete env.NODE_TEST_CONTEXT;
    const r = spawnSync(process.execPath, ['--test', ...hookTests], { encoding: 'utf8', cwd: root, env });
    const tail = `${r.stdout || ''}${r.stderr || ''}`.trim().split('\n').filter((l) => /^# (tests|pass|fail)|^not ok/.test(l));
    if (r.status === 0) {
      lines.push(`ok   node --test   ${hookTests.length} files — ${tail.join(' · ')}`);
    } else {
      ok = false;
      const detail = tail.join(' · ') || r.error?.message || 'exit ' + r.status;
      lines.push(`FAIL node --test   ${hookTests.length} files — ${detail}`);
    }
  }

  return { ok, lines, counts: { json: jsonFiles.length, scripts: hookScripts.length, tests: hookTests.length } };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--root');
  const root = i >= 0 && argv[i + 1] ? path.resolve(argv[i + 1]) : path.resolve(HERE, '..', '..');
  const result = checkAgentConfig(root);
  for (const line of result.lines) console.log(line);
  const { json, scripts, tests } = result.counts;
  console.log(`agent config: JSON ${json} · hook scripts ${scripts} · hook test files ${tests} → ${result.ok ? 'PASS' : 'FAIL'}`);
  if (!result.ok) {
    console.log('::error::.claude/ 설정 검사 실패 — 위 FAIL 항목을 고친다');
    process.exitCode = 1;
  }
}
