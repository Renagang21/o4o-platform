#!/usr/bin/env node
/**
 * WO-O4O-SECURITY-ROUTE-STATIC-GUARD-CI-V1 — 위험 운영 route 정적 가드
 *
 * 배경 (2026-08-08 사고):
 *   `/__debug__/**` 8개가 인증·환경 게이트 없이 프로덕션에 등록돼, 인증 없는 GET 요청으로
 *   멤버십 승인(`isPlatformAdmin: true` 하드코딩) · RBAC 역할 부여 · 게시글 하드 삭제가
 *   가능했다. 원인은 "지우지 않아서" 가 아니라 **처음부터 게이트 없이 만들어진 것** 이다.
 *   그래서 같은 형태가 다시 들어오면 CI 에서 막는다.
 *
 * 검사 규칙:
 *   R1  GET handler 안의 DB write        — 조회는 GET, 변경은 POST/PATCH/DELETE
 *   R2  권한 하드코딩                     — isPlatformAdmin/isAdmin/isSuperAdmin: true
 *   R3  debug/test 성격 route 의 무가드 등록 — NODE_ENV !== 'production' 게이트 필수
 *
 * 설계 원칙:
 *   - 새 보안 프레임워크를 만들지 않는다. 단일 파일 + Node 표준 라이브러리만 쓴다.
 *   - 오탐을 줄이기 위해 문자열 단순 grep 이 아니라 **SQL 형태**와 **괄호 매칭으로 자른
 *     handler 본문** 을 본다. (HTML 텍스트에 'DELETE' 가 있다고 걸리면 안 된다.)
 *   - allowlist 는 작고 명시적으로 유지한다. 정상 route 를 규칙에서 빼주지 않는다.
 *
 * 사용:
 *   node scripts/check-unsafe-routes.mjs            # 위반 시 exit 1
 *   node scripts/check-unsafe-routes.mjs --report   # 항상 exit 0 (측정용)
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const SCAN_ROOT = join(ROOT, 'apps', 'api-server', 'src');
const REPORT_ONLY = process.argv.includes('--report');

/** 검사에서 제외 (테스트·마이그레이션은 런타임 route 가 아니다) */
const EXCLUDE_DIR = ['__tests__', 'tests', 'node_modules', 'dist', 'migrations', 'database/migrations', 'scripts'];
const EXCLUDE_FILE = /\.(spec|test)\.ts$/;

/**
 * 명시적 allowlist. 규칙을 끄는 것이 아니라 "검토 후 안전하다고 확인된 개별 위치" 만 적는다.
 * 항목마다 이유를 남긴다. 비어 있는 상태가 정상이다.
 */
const ALLOWLIST = [
  {
    file: 'routes/o4o-store/controllers/store-qr-landing.controller.ts',
    rule: 'R1',
    match: 'store_qr_scan_events',
    reason:
      '공개 QR 랜딩의 스캔 집계(append-only 이벤트 적재). 업무 엔티티 상태를 바꾸지 않는 ' +
      '조회 로깅이며 5초 중복 방지 + IP 해시를 적용한다. 페이지뷰 집계는 GET 예외로 인정한다.',
  },
  // ── /api/v1/ops/seed-* 2건 ────────────────────────────────────────────────
  // 이 둘은 컨트롤러에서 x-admin-secret 가드를 강제하며 프로덕션에서 401/404 로 실측 확인됐다.
  // 규칙상 seed 는 공개 HTTP route 로 두지 않는 것이 원칙이라 CLI 전환 대상이지만,
  // 그 전환은 WO-O4O-DEBUG-ROUTE-LIFECYCLE-...-V1 의 FOLLOW-UP F1 로 분리돼 있다.
  // 전환이 끝나면 아래 두 항목을 제거한다. (규칙을 끄는 것이 아니라 개별 위치 예외다.)
  {
    file: 'bootstrap/register-routes.ts',
    rule: 'R3',
    match: 'seed-store-hub',
    reason: 'x-admin-secret 가드 있음. CLI 전환은 F1 로 분리됨.',
  },
  {
    file: 'bootstrap/register-routes.ts',
    rule: 'R3',
    match: 'seed-neture-offers',
    reason: 'x-admin-secret 가드 있음. CLI 전환은 F1 로 분리됨.',
  },
];

const SQL_WRITE = [
  /\bDELETE\s+FROM\b/i,
  /\bINSERT\s+INTO\b/i,
  /\bUPDATE\s+["'`\w.]+\s+SET\b/i,
  /\bTRUNCATE\s+(TABLE\s+)?["'`\w.]+/i,
  /\bDROP\s+(TABLE|COLUMN)\b/i,
];
/** TypeORM repository 계열 write. `map.delete(` 등 오탐을 피하려 receiver 를 제한한다. */
const ORM_WRITE = [
  /\b(repo|repository|manager|queryRunner\.manager|\w*Repository|\w*Repo)\s*\.\s*(save|remove|softRemove|softDelete|insert|update|delete|upsert)\s*\(/,
  /\.getRepository\([^)]*\)\s*\.\s*(save|remove|softRemove|softDelete|insert|update|delete|upsert)\s*\(/,
];

const HARDCODED_PRIV = /\b(isPlatformAdmin|isAdmin|isSuperAdmin)\s*:\s*true\b/;

/** debug/test 성격으로 간주하는 마운트 경로 */
const RISKY_MOUNT = /['"`]\/(__debug__|api\/v1\/ops)\/|['"`]\/[^'"`]*\/(debug|test|repair|backfill|cleanup)(\/|['"`])/;

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const e of entries) {
    const p = join(dir, e);
    const rel = relative(SCAN_ROOT, p).split(sep).join('/');
    if (EXCLUDE_DIR.some((d) => rel === d || rel.startsWith(d + '/') || rel.includes('/' + d + '/'))) continue;
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) walk(p, out);
    else if (e.endsWith('.ts') && !EXCLUDE_FILE.test(e)) out.push(p);
  }
  return out;
}

/** 줄/블록 주석 제거 (문자열·템플릿 리터럴은 보존 — SQL 이 그 안에 있다) */
function stripComments(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  let mode = 'code'; // code | line | block | sq | dq | tpl
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (mode === 'code') {
      if (c === '/' && d === '/') { mode = 'line'; out += '  '; i += 2; continue; }
      if (c === '/' && d === '*') { mode = 'block'; out += '  '; i += 2; continue; }
      if (c === "'") mode = 'sq';
      else if (c === '"') mode = 'dq';
      else if (c === '`') mode = 'tpl';
      out += c; i++; continue;
    }
    if (mode === 'line') { if (c === '\n') { mode = 'code'; out += c; } else out += ' '; i++; continue; }
    if (mode === 'block') { if (c === '*' && d === '/') { mode = 'code'; out += '  '; i += 2; } else { out += c === '\n' ? '\n' : ' '; i++; } continue; }
    // 문자열 내부
    out += c;
    if (c === '\\') { out += src[i + 1] ?? ''; i += 2; continue; }
    if ((mode === 'sq' && c === "'") || (mode === 'dq' && c === '"') || (mode === 'tpl' && c === '`')) mode = 'code';
    i++;
  }
  return out;
}

/** idx 의 여는 괄호부터 짝이 맞는 닫는 괄호까지 잘라낸다 */
function sliceBalanced(src, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    const c = src[i];
    if (c === '(') depth++;
    else if (c === ')') { depth--; if (depth === 0) return src.slice(openIdx, i + 1); }
  }
  return src.slice(openIdx);
}

const lineOf = (src, idx) => src.slice(0, idx).split('\n').length;
const isAllowed = (file, rule, body = '') =>
  ALLOWLIST.some(
    (a) => a.rule === rule && file.endsWith(a.file) && (!a.match || body.includes(a.match)),
  );

/**
 * R2 오탐 억제: 하드코딩처럼 보여도 **직전에 권한을 실제로 검사한 분기 안**이면 정상이다.
 * 예) if (isPlatformAdmin) return { allowed: true, isPlatformAdmin: true };
 *     if (await hasAnyRole(...)) { req.slotAccess = { isAdmin: true, ... } }
 * 사고 사례(approval-test)는 이런 검사가 전혀 없이 인자로 넘겼기 때문에 계속 잡힌다.
 */
/** 권한을 실제로 검사하는 이름들 */
const PRIV_NAMES = /\b(isPlatformAdmin|isAdmin|isSuperAdmin|hasAnyRole|hasRole|requireAdmin)\b/;
/** 그 이름이 조건/반환 문맥에서 쓰였는지 */
const PRIV_CONTEXT = /\b(if|return)\b|\?|&&|\|\|/;

function privilegeCheckedNearby(lines, idx, lookback = 12) {
  const start = Math.max(0, idx - lookback);
  return lines.slice(start, idx).some((l) => PRIV_NAMES.test(l) && PRIV_CONTEXT.test(l));
}

const findings = [];
const files = walk(SCAN_ROOT);

for (const abs of files) {
  const relPath = relative(ROOT, abs).split(sep).join('/');
  const raw = readFileSync(abs, 'utf8');
  const src = stripComments(raw);

  // ── R1: GET handler 안의 DB write ─────────────────────────────
  const getRe = /\b(?:router|app)\s*\.\s*get\s*\(/g;
  let m;
  while ((m = getRe.exec(src))) {
    const openIdx = m.index + m[0].length - 1;
    const body = sliceBalanced(src, openIdx);
    const hit = [...SQL_WRITE, ...ORM_WRITE].find((re) => re.test(body));
    if (hit) {
      const line = lineOf(src, m.index);
      if (!isAllowed(relPath, 'R1', body)) {
        findings.push({ rule: 'R1', file: relPath, line, msg: `GET handler 안에서 DB write 가 발견됐다 (${hit.source.slice(0, 40)}…). 상태 변경은 POST/PATCH/DELETE 로 옮긴다.` });
      }
    }
  }

  // ── R2: 권한 하드코딩 ────────────────────────────────────────
  const srcLines = src.split('\n');
  srcLines.forEach((l, i) => {
    if (!HARDCODED_PRIV.test(l)) return;
    // 타입 선언·인터페이스는 값 할당이 아니다
    if (/^\s*(\/\/|\*|export\s+(type|interface)|type\s|interface\s)/.test(l)) return;
    const line = i + 1;
    if (privilegeCheckedNearby(srcLines, i)) return;
    if (!isAllowed(relPath, 'R2')) {
      findings.push({ rule: 'R2', file: relPath, line, msg: '권한을 코드에서 true 로 하드코딩했다. 요청자 권한에서 파생해야 한다.' });
    }
  });

  // ── R3: debug/test 성격 route 의 무가드 등록 ──────────────────
  const useRe = /\bapp\s*\.\s*use\s*\(/g;
  while ((m = useRe.exec(src))) {
    const call = sliceBalanced(src, m.index + m[0].length - 1);
    if (!RISKY_MOUNT.test(call)) continue;
    const line = lineOf(src, m.index);
    // 같은 파일에서 이 마운트를 감싸는 NODE_ENV 게이트가 앞쪽에 있는지 본다
    const before = src.slice(0, m.index);
    const gateIdx = before.lastIndexOf("NODE_ENV !== 'production'");
    const gateOpen = gateIdx >= 0;
    // 게이트가 이미 닫혔으면 무효
    const closedAfterGate = gateOpen && /end SECURITY gate/.test(src.slice(gateIdx, m.index));
    const guarded = gateOpen && !closedAfterGate;
    if (!guarded && !isAllowed(relPath, 'R3', call)) {
      findings.push({ rule: 'R3', file: relPath, line, msg: 'debug/test/ops 성격 route 가 production 게이트 없이 등록됐다. NODE_ENV !== "production" 으로 감싸거나 CLI 로 옮긴다.' });
    }
  }
}

const byRule = findings.reduce((a, f) => ((a[f.rule] = (a[f.rule] || 0) + 1), a), {});
console.log(`검사 파일 ${files.length}개 · 위반 ${findings.length}건 ${JSON.stringify(byRule)}`);
for (const f of findings) {
  console.log(`  [${f.rule}] ${f.file}:${f.line}`);
  console.log(`        ${f.msg}`);
}

if (findings.length && !REPORT_ONLY) {
  console.log('');
  console.log('::error::위험 운영 route 가 발견됐습니다. 규칙은 CLAUDE.md §8 을 참조하세요.');
  process.exit(1);
}
process.exit(0);
