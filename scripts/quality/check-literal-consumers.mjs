#!/usr/bin/env node
/**
 * WO-O4O-CROSSSESSION-SAFE-COMMIT-AND-LITERAL-CONSUMER-GUARD-V1 §10~§13
 *
 * 식별자만 검색하고 **href / path / raw-source 리터럴 소비처**를 놓쳐서
 * "소비처 0" 오판정을 내는 사고를 막는다.
 *
 *   node scripts/quality/check-literal-consumers.mjs "<리터럴>" ["<리터럴>"...]
 *
 * 각 리터럴을 고정 문자열(`git grep -F`)로 전수 검색하고 소비처를 분류한다.
 *   ACTIVE_RUNTIME / ACTIVE_UI / ACTIVE_TEST_CONTRACT / RAW_SOURCE_CONTRACT
 *   / HISTORICAL_DOC / COMMENT_ONLY / DEAD_REFERENCE(=0건)
 *
 * 핵심: RAW_SOURCE_CONTRACT(테스트가 소스를 readFileSync 해서 문자열을 단언하는 경우)는
 * runtime import graph 에 나타나지 않으므로 이 검색으로만 드러난다.
 *
 * **읽기 전용이다.** 기본 exit 0(인구조사 도구). `--fail-on-consumers` 를 주면
 * 살아있는 소비처(ACTIVE_* / RAW_SOURCE_CONTRACT)가 1건이라도 있을 때 exit 1.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

/** Windows 경로 구분자(역슬래시) — 소스에 리터럴로 쓰지 않는다. */
const SEP = String.fromCharCode(92);

const RAW_SOURCE_MARKERS = [
  'readFileSync',
  'readFile(',
  'fs.readFile',
  'sourceText',
  'toMatchSnapshot',
];

const TEST_PATH = /(^|\/)(__tests__|__spec__|tests?)\//i;
const TEST_FILE = /\.(spec|test)\.[cm]?[jt]sx?$/i;
const DOC_PATH = /^(docs|README)/i;
const UI_FILE = /\.(tsx|jsx|vue|html)$/i;
const COMMENT_LINE = /^\s*(\/\/|\/\*|\*|#|<!--)/;

const rawSourceCache = new Map();

function isRawSourceSpec(file) {
  if (rawSourceCache.has(file)) return rawSourceCache.get(file);
  let hit = false;
  try {
    const src = fs.readFileSync(file, 'utf8');
    hit = RAW_SOURCE_MARKERS.some((m) => src.includes(m));
  } catch {
    hit = false;
  }
  rawSourceCache.set(file, hit);
  return hit;
}

export function classify(file, line) {
  if (DOC_PATH.test(file)) return 'HISTORICAL_DOC';
  const isTest = TEST_PATH.test(file) || TEST_FILE.test(file);
  if (isTest) return isRawSourceSpec(file) ? 'RAW_SOURCE_CONTRACT' : 'ACTIVE_TEST_CONTRACT';
  if (COMMENT_LINE.test(line)) return 'COMMENT_ONLY';
  return UI_FILE.test(file) ? 'ACTIVE_UI' : 'ACTIVE_RUNTIME';
}

function grep(literal) {
  try {
    // -F 고정문자열 / -I 바이너리 제외. git 을 직접 spawn 하므로 셸 경로 변환(MSYS)의 영향이 없다.
    const out = execFileSync('git', ['grep', '-n', '-I', '-F', '--', literal], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, MSYS_NO_PATHCONV: '1' },
    });
    return out.split('\n').filter(Boolean);
  } catch (err) {
    if (err.status === 1) return []; // git grep: 매치 없음
    throw err;
  }
}

const LIVE = new Set(['ACTIVE_RUNTIME', 'ACTIVE_UI', 'ACTIVE_TEST_CONTRACT', 'RAW_SOURCE_CONTRACT']);

/**
 * raw-source spec 은 대상 소스를 **파일 경로 문자열**로 읽는다
 *   const navigation = read(`${PH_WEB}/config/navigation.ts`);
 * 이때 route/href 리터럴은 template literal 로 조립되므로 값 검색에 걸리지 않는다.
 * 따라서 "수정 대상 파일의 경로" 자체를 반드시 함께 검색해야 한다(§11).
 */
export function pathLiterals(sourcePath) {
  const p = sourcePath.split(SEP).join('/').replace(/^\.\//, '');
  const parts = p.split('/');
  const out = new Set([p]);
  // 뒤에서부터 2~4 segment 조각 — spec 이 경로를 상수로 쪼개 조립하는 경우를 잡는다.
  for (let n = 2; n <= 4 && n <= parts.length; n += 1) {
    out.add(parts.slice(-n).join('/'));
  }
  return [...out];
}

function main() {
  const args = process.argv.slice(2);
  const failOnConsumers = args.includes('--fail-on-consumers');
  const sourceIdx = args.indexOf('--source');
  const skipIdx = sourceIdx === -1 ? -1 : sourceIdx + 1;
  const literals = args.filter((a, i) => !a.startsWith('--') && i !== skipIdx);

  if (sourceIdx !== -1) {
    const sourcePath = args[sourceIdx + 1];
    if (!sourcePath) {
      console.error('--source 뒤에 저장소 상대 경로가 필요합니다.');
      process.exit(2);
    }
    literals.push(...pathLiterals(sourcePath));
  }

  if (literals.length === 0) {
    console.error('사용법: node scripts/quality/check-literal-consumers.mjs "<리터럴>" [...] [--source <경로>]');
    console.error('  최소 검색 집합(§12): route 리터럴 · 상위 경로 · 컴포넌트/페이지명 ·');
    console.error('  API endpoint · href 리터럴 · navigation label · capability 이름');
    process.exit(2);
  }

  let liveTotal = 0;

  for (const literal of literals) {
    const hits = grep(literal);
    console.log('');
    console.log(`── ${literal}  (${hits.length}건)`);
    if (hits.length === 0) {
      console.log('   DEAD_REFERENCE — 소비처 0. 단, 리터럴 표기 변형(따옴표·경로 분할)을 함께 검색했는지 확인하십시오.');
      continue;
    }
    const byKind = new Map();
    for (const hit of hits) {
      const first = hit.indexOf(':');
      const second = hit.indexOf(':', first + 1);
      const file = hit.slice(0, first);
      const line = hit.slice(second + 1);
      const kind = classify(file, line);
      if (!byKind.has(kind)) byKind.set(kind, []);
      byKind.get(kind).push(`${file}:${hit.slice(first + 1, second)}`);
    }
    for (const [kind, files] of [...byKind.entries()].sort()) {
      if (LIVE.has(kind)) liveTotal += files.length;
      console.log(`   ${kind} (${files.length})`);
      for (const f of files.slice(0, 20)) console.log(`      ${f}`);
      if (files.length > 20) console.log(`      … 외 ${files.length - 20}건`);
    }
  }

  console.log('');
  console.log(`살아있는 소비처 합계: ${liveTotal}건`);
  console.log('  ACTIVE_TEST_CONTRACT · RAW_SOURCE_CONTRACT 도 실제 소비처로 센다(§13).');

  if (failOnConsumers && liveTotal > 0) process.exit(1);
  process.exit(0);
}

const invoked = (process.argv[1] || '').split(SEP).join('/');
if (invoked.endsWith('check-literal-consumers.mjs')) {
  main();
}
