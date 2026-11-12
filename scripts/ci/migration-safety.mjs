/**
 * WO-O4O-CICD-PROMOTE-APPROVAL-REDUCTION-V1 — migration 파괴형 판정기 (결정적 · AI 판정 아님)
 *
 * 질문은 하나다 — "이 migration 의 up() 을 운영에 적용하면 기존 데이터 · 구조가 사라지거나 바뀌는가."
 *
 *   ADDITIVE     표 · 열 · 인덱스를 **더하기만** 한다 → 자동 배포 (적용 직전 Cloud SQL 백업은 그대로 만든다)
 *   DESTRUCTIVE  DROP · 이름 변경 · 타입 변경 · 데이터 일괄 UPDATE / DELETE / TRUNCATE → Promote 승인
 *   REVIEW       판정이 애매하다 → Promote 승인 (fail-closed)
 *
 * 애매함의 기준 (전부 승인 쪽):
 *   - up() 을 찾지 못함 · query() 인자가 문자열 상수가 아님(변수 · 연결 · `${}` 보간) · QueryRunner 의 다른 메서드
 *   - 함수 · DO 블록(`$$`) · 권한(GRANT / REVOKE / POLICY) · 기존 표의 제약 추가 · 기존 표 INSERT · 기본값 변경 등
 *     아래 허용 목록에 없는 문장
 * 같은 migration 에서 새로 만든 표에 대한 작업(제약 · 트리거 · INSERT 등)은 기존 데이터가 없으므로 ADDITIVE 로 본다.
 *
 * 과탐(승인 유지)은 허용, 미탐(파괴형을 자동 배포)은 금지 — 판단이 서지 않으면 REVIEW 로 둔다.
 */

export const ADDITIVE = 'ADDITIVE';
export const DESTRUCTIVE = 'DESTRUCTIVE';
export const REVIEW = 'REVIEW';
const RANK = { [ADDITIVE]: 0, [REVIEW]: 1, [DESTRUCTIVE]: 2 };
const worst = (a, b) => (RANK[b] > RANK[a] ? b : a);

// ---------------------------------------------------------------------------
// TypeScript 원문 스캔 — up() 본문 · query() 문자열 인자
// ---------------------------------------------------------------------------

/** pos 의 문자열 · 주석을 건너뛴 다음 위치. 문자열이 아니면 pos 그대로. */
function skipLiteral(src, pos) {
  const c = src[pos];
  if (c === '/' && src[pos + 1] === '/') {
    const end = src.indexOf('\n', pos);
    return end < 0 ? src.length : end;
  }
  if (c === '/' && src[pos + 1] === '*') {
    const end = src.indexOf('*/', pos + 2);
    return end < 0 ? src.length : end + 2;
  }
  // 정규식 리터럴 — `/` 앞(공백 제외)이 식의 시작 자리일 때만 (`replace(/"/g, ...)`)
  if (c === '/') {
    let k = pos - 1;
    while (k >= 0 && /\s/.test(src[k])) k -= 1;
    if (k < 0 || '(,=:[!&|?{};'.includes(src[k])) {
      let i = pos + 1;
      let inClass = false;
      while (i < src.length && src[i] !== '\n') {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === '[') inClass = true;
        else if (src[i] === ']') inClass = false;
        else if (src[i] === '/' && !inClass) return i + 1;
        i += 1;
      }
    }
    return pos;
  }
  if (c === '"' || c === "'" || c === '`') {
    let i = pos + 1;
    while (i < src.length) {
      if (src[i] === '\\') { i += 2; continue; }
      if (src[i] === c) return i + 1;
      i += 1;
    }
    return src.length;
  }
  return pos;
}

/** open 위치의 여는 괄호와 짝인 닫는 괄호 위치. 못 찾으면 -1. */
function matchBracket(src, open) {
  const pair = { '{': '}', '(': ')' }[src[open]];
  let depth = 0;
  let i = open;
  while (i < src.length) {
    const next = skipLiteral(src, i);
    if (next !== i) { i = next; continue; }
    if (src[i] === src[open]) depth += 1;
    else if (src[i] === pair) {
      depth -= 1;
      if (depth === 0) return i;
    }
    i += 1;
  }
  return -1;
}

/** `up(...)` 메서드 본문과 QueryRunner 매개변수 이름. 못 찾으면 null. */
export function extractUp(source) {
  const re = /\b(?:public\s+)?(?:async\s+)?up\s*\(/g;
  let m;
  while ((m = re.exec(source))) {
    const paramsOpen = m.index + m[0].length - 1;
    const paramsClose = matchBracket(source, paramsOpen);
    if (paramsClose < 0) return null;
    const bodyOpen = source.indexOf('{', paramsClose);
    if (bodyOpen < 0) return null;
    // `up(q): Promise<void> {` — 괄호 뒤에는 반환 타입만 올 수 있다
    if (!/^\s*(:[^{;]*)?$/.test(source.slice(paramsClose + 1, bodyOpen))) continue;
    const bodyClose = matchBracket(source, bodyOpen);
    if (bodyClose < 0) return null;
    const runner = /^\s*([A-Za-z_$][\w$]*)/.exec(source.slice(paramsOpen + 1, paramsClose))?.[1] ?? null;
    return { body: source.slice(bodyOpen + 1, bodyClose), runner };
  }
  return null;
}

/** 인용 문자열 하나를 읽는다 → {value, end, interpolated} · 문자열이 아니면 null */
function readStringLiteral(src, pos) {
  const q = src[pos];
  if (q !== '"' && q !== "'" && q !== '`') return null;
  let out = '';
  let interpolated = false;
  let i = pos + 1;
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') {
      const n = src[i + 1];
      out += n === 'n' ? '\n' : n === 't' ? '\t' : n;
      i += 2;
      continue;
    }
    if (q === '`' && c === '$' && src[i + 1] === '{') interpolated = true;
    if (c === q) return { value: out, end: i + 1, interpolated };
    out += c;
    i += 1;
  }
  return null;
}

/** QueryRunner 의 구조 API — 이름으로 판정한다 (query 외) */
const RUNNER_ADDITIVE = new Set([
  'createTable', 'addColumn', 'addColumns', 'createIndex', 'createIndices', 'createForeignKey', 'createForeignKeys',
  'createUniqueConstraint', 'createUniqueConstraints', 'createCheckConstraint', 'createCheckConstraints',
  'createPrimaryKey', 'createSchema', 'createView',
]);
const RUNNER_DESTRUCTIVE = /^(drop|rename|change|clear|update|delete|truncate)/i;
/** 상태를 바꾸지 않는 읽기 · 제어 */
const RUNNER_NEUTRAL = new Set(['hasTable', 'hasColumn', 'getTable', 'getTables', 'startTransaction', 'commitTransaction', 'rollbackTransaction']);

/**
 * up() 본문에서 SQL 과 구조 호출을 뽑는다 — QueryRunner 매개변수(`runner`)에 대한 호출만 본다.
 * @returns {{ sql: string[], runnerCalls: {method: string, verdict: string}[], problems: string[] }}
 */
export function extractStatements(body, runner) {
  const sql = [];
  const runnerCalls = [];
  const problems = [];
  if (!runner) return { sql, runnerCalls, problems: ['up() 의 QueryRunner 매개변수를 찾지 못함'] };
  const esc = runner.replace(/\$/g, '\\$');
  // runner 를 다른 함수에 넘기면 그 함수가 무엇을 하는지 알 수 없다
  const passed = new RegExp(`[(,]\\s*${esc}\\s*[,)]`, 'g');
  let m;
  while ((m = passed.exec(body))) {
    if (!insideLiteral(body.slice(0, m.index))) { problems.push('QueryRunner 를 다른 함수에 넘김'); break; }
  }
  const re = new RegExp(`(?<![\\w$.])${esc}\\s*\\.\\s*(?:manager\\s*\\.\\s*)?([A-Za-z_$][\\w$]*)\\s*\\(`, 'g');
  // runner 는 직접 메서드 호출로만 써야 한다 — 별칭(`const m = q.manager`) · 구조 분해 · 하위 객체(`q.connection`)로
  // 넘어간 호출은 아래 수집에서 빠지므로 판정할 수 없다.
  const use = new RegExp(`(?<![\\w$.])${esc}(?![\\w$])`, 'g');
  while ((m = use.exec(body))) {
    if (insideLiteral(body.slice(0, m.index))) continue;
    const direct = new RegExp(re.source, 'y');
    direct.lastIndex = m.index;
    if (!direct.test(body)) { problems.push('QueryRunner 를 직접 메서드 호출 밖에서 사용 (별칭 · 구조 분해 · 하위 객체)'); break; }
  }
  // runner 를 거치지 않은 query() 호출(별칭 · 다른 연결)은 무엇을 실행하는지 수집되지 않는다
  let queryCalls = 0;
  const anyQuery = /(?<![\w$])query\s*\(/g;
  while ((m = anyQuery.exec(body))) {
    if (!insideLiteral(body.slice(0, m.index))) queryCalls += 1;
  }
  let runnerQueries = 0;
  while ((m = re.exec(body))) {
    if (insideLiteral(body.slice(0, m.index))) continue;
    const method = m[1];
    if (method === 'query') {
      runnerQueries += 1;
      let p = m.index + m[0].length;
      while (/\s/.test(body[p] ?? '')) p += 1;
      const lit = readStringLiteral(body, p);
      if (!lit) {
        problems.push('query() 인자가 문자열 상수가 아님 (변수 · 함수 결과)');
        continue;
      }
      let after = lit.end;
      while (/\s/.test(body[after] ?? '')) after += 1;
      if (body[after] === '+') problems.push('query() 문자열을 이어 붙임');
      if (lit.interpolated) problems.push('query() 문자열에 `${}` 보간');
      sql.push(lit.value);
      continue;
    }
    if (RUNNER_ADDITIVE.has(method) || RUNNER_NEUTRAL.has(method)) runnerCalls.push({ method, verdict: ADDITIVE });
    else if (RUNNER_DESTRUCTIVE.test(method)) runnerCalls.push({ method, verdict: DESTRUCTIVE });
    else runnerCalls.push({ method, verdict: REVIEW });
  }
  if (queryCalls > runnerQueries) problems.push('QueryRunner 매개변수가 아닌 query() 호출 — 실행 대상을 알 수 없음');
  return { sql, runnerCalls, problems };
}

/** prefix 끝이 문자열 · 주석 안인가 (간이 스캐너) */
function insideLiteral(prefix) {
  let i = 0;
  while (i < prefix.length) {
    const next = skipLiteral(prefix, i);
    if (next !== i) {
      if (next >= prefix.length) return true;
      i = next;
      continue;
    }
    i += 1;
  }
  return false;
}

// ---------------------------------------------------------------------------
// SQL 문장 판정
// ---------------------------------------------------------------------------

/**
 * 주석 제거와 세미콜론 분리를 한 번의 스캔으로 한다 — 문자열 · 따옴표 식별자 안의 `--` · `/*` · `;` 는 SQL 이 아니다.
 * (주석을 먼저 지우면 `'a -- b'; DELETE ...` 의 뒤 문장까지 사라진다.) E'...' 문자열은 역슬래시 escape 를 따른다.
 */
export function splitSql(text) {
  const out = [];
  let cur = '';
  let quote = null;
  let backslash = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quote) {
      cur += c;
      if (backslash && c === '\\') { cur += text[i + 1] ?? ''; i += 1; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '-' && text[i + 1] === '-') {
      while (i < text.length && text[i] !== '\n') i += 1;
      cur += ' ';
      continue;
    }
    if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end < 0 ? text.length : end + 1;
      cur += ' ';
      continue;
    }
    if (c === "'" || c === '"') {
      backslash = c === "'" && /[Ee]/.test(text[i - 1] ?? '') && !/[\w$]/.test(text[i - 2] ?? '');
      quote = c;
      cur += c;
      continue;
    }
    if (c === ';') { if (cur.trim()) out.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** 표 이름 정규화 — 따옴표 · public. 제거 · 소문자 */
const tableName = (raw) => String(raw ?? '').replace(/"/g, '').replace(/^public\./i, '').toLowerCase();
const IDENT = '("?[A-Za-z_][\\w$]*"?(?:\\."?[A-Za-z_][\\w$]*"?)?)';

/** 괄호 밖의 쉼표로 ALTER TABLE 동작을 나눈다 */
function splitActions(text) {
  const out = [];
  let depth = 0;
  let cur = '';
  let quote = null;
  for (const c of text) {
    if (quote) { cur += c; if (c === quote) quote = null; continue; }
    if (c === "'" || c === '"') { quote = c; cur += c; continue; }
    if (c === '(') depth += 1;
    if (c === ')') depth -= 1;
    if (c === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const DESTRUCTIVE_ACTION = /^(DROP\b(?!\s+NOT\s+NULL\b)|RENAME\b)|\bALTER\s+(COLUMN\s+)?\S+\s+(SET\s+DATA\s+)?TYPE\b/;

/** ALTER TABLE 한 동작 */
function classifyAlterAction(action) {
  const a = action.replace(/\s+/g, ' ').trim().toUpperCase();
  if (/^ADD (COLUMN )?(IF NOT EXISTS )?(?!CONSTRAINT\b|PRIMARY\b|UNIQUE\b|CHECK\b|FOREIGN\b|EXCLUDE\b)/.test(a)) return { verdict: ADDITIVE, why: '열 추가' };
  if (/^ALTER (COLUMN )?\S+ DROP NOT NULL$/.test(a)) return { verdict: ADDITIVE, why: 'NOT NULL 해제(제약 완화 · 데이터 불변)' };
  if (DESTRUCTIVE_ACTION.test(a)) return { verdict: DESTRUCTIVE, why: `파괴형 변경: ${a.slice(0, 60)}` };
  return { verdict: REVIEW, why: `기존 표 변경 — 자동 판정 불가: ${a.slice(0, 60)}` };
}

/**
 * SQL 문장 하나.
 * @param {Set<string>} created 이 migration 에서 만든 표 (호출 중 갱신)
 */
export function classifyStatement(stmt, created = new Set()) {
  const s = stmt.replace(/\s+/g, ' ').trim();
  const u = s.toUpperCase();
  const short = s.slice(0, 80);

  if (/\$[A-Za-z_]*\$/.test(s)) return { verdict: REVIEW, why: `함수 · DO 블록 — 자동 판정 불가: ${short}` };

  let m;
  // ── 읽기 · 잠금 ────────────────────────────────────────────────────────
  if (/^SELECT\b/.test(u)) {
    if (/\b(INTO|SETVAL|NEXTVAL|PG_TERMINATE_BACKEND|PG_CANCEL_BACKEND|DBLINK\w*|LO_\w+)\b/.test(u)) return { verdict: REVIEW, why: `상태를 바꿀 수 있는 SELECT: ${short}` };
    return { verdict: ADDITIVE, why: '읽기' };
  }
  if (/^LOCK TABLE\b/.test(u)) return { verdict: ADDITIVE, why: '잠금(데이터 불변)' };

  // ── 생성 ───────────────────────────────────────────────────────────────
  if ((m = new RegExp(`^CREATE (?:UNLOGGED )?TABLE (IF NOT EXISTS )?${IDENT}`, 'i').exec(s))) {
    if (/\bAS\s+SELECT\b/i.test(s)) return { verdict: REVIEW, why: `CREATE TABLE AS — 자동 판정 불가: ${short}` };
    // IF NOT EXISTS 는 표가 이미 있으면(기존 데이터 포함) 아무것도 하지 않는다 — 새 표 예외를 주지 않는다
    if (!m[1]) created.add(tableName(m[2]));
    return { verdict: ADDITIVE, why: '표 추가' };
  }
  if (/^CREATE (UNIQUE )?INDEX\b/.test(u)) return { verdict: ADDITIVE, why: '인덱스 추가' };
  if (/^CREATE (SEQUENCE|TYPE|SCHEMA)\b/.test(u)) return { verdict: ADDITIVE, why: '객체 추가' };
  if (/^CREATE EXTENSION\b/.test(u)) return { verdict: ADDITIVE, why: '확장 추가' };
  if (/^COMMENT ON\b/.test(u)) return { verdict: ADDITIVE, why: '주석' };

  // ── 새 표에만 거는 부속 객체 ────────────────────────────────────────────
  if ((m = new RegExp(`^CREATE (?:CONSTRAINT )?TRIGGER \\S+ .*? ON ${IDENT}`, 'i').exec(s))) {
    return created.has(tableName(m[1]))
      ? { verdict: ADDITIVE, why: '새 표의 트리거' }
      : { verdict: REVIEW, why: `기존 표에 트리거 — 쓰기 동작이 바뀔 수 있음: ${short}` };
  }
  if ((m = new RegExp(`^INSERT INTO ${IDENT}`, 'i').exec(s))) {
    return created.has(tableName(m[1]))
      ? { verdict: ADDITIVE, why: '새 표에 초기 행' }
      : { verdict: REVIEW, why: `기존 표에 행 추가 — 자동 판정 불가: ${short}` };
  }

  // ── 구조 변경 ──────────────────────────────────────────────────────────
  if ((m = new RegExp(`^ALTER TABLE (?:IF EXISTS )?(?:ONLY )?${IDENT} (.*)$`, 'i').exec(s))) {
    const table = tableName(m[1]);
    if (created.has(table)) return { verdict: ADDITIVE, why: '새 표 정의' };
    let verdict = ADDITIVE;
    const whys = [];
    for (const action of splitActions(m[2])) {
      const r = classifyAlterAction(action);
      verdict = worst(verdict, r.verdict);
      whys.push(r.why);
    }
    return { verdict, why: whys.join(' · ') };
  }

  // ── 데이터 일괄 변경 · 삭제 ─────────────────────────────────────────────
  if ((m = new RegExp(`^(UPDATE|DELETE FROM|TRUNCATE(?: TABLE)?) (?:ONLY )?${IDENT}`, 'i').exec(s))) {
    return created.has(tableName(m[2]))
      ? { verdict: ADDITIVE, why: '새 표 데이터' }
      : { verdict: DESTRUCTIVE, why: `데이터 일괄 ${m[1].split(' ')[0].toUpperCase()}: ${short}` };
  }
  if (/^(DROP|ALTER \w+ \S+ RENAME|ALTER (TYPE|SEQUENCE|INDEX|VIEW|SCHEMA)\b.*\bRENAME\b)/.test(u)) {
    return { verdict: DESTRUCTIVE, why: `파괴형 변경: ${short}` };
  }

  return { verdict: REVIEW, why: `허용 목록 밖 문장 — 자동 판정 불가: ${short}` };
}

/**
 * migration 원문 하나 판정.
 * @returns {{ verdict: 'ADDITIVE'|'DESTRUCTIVE'|'REVIEW', findings: string[] }}
 */
export function classifyMigrationSource(source) {
  if (typeof source !== 'string' || source.trim() === '') return { verdict: REVIEW, findings: ['원문을 읽을 수 없음'] };
  const up = extractUp(source);
  if (up === null) return { verdict: REVIEW, findings: ['up() 을 찾지 못함'] };
  const { sql, runnerCalls, problems } = extractStatements(up.body, up.runner);
  let verdict = ADDITIVE;
  const findings = [];
  for (const p of problems) { verdict = worst(verdict, REVIEW); findings.push(p); }
  for (const c of runnerCalls) {
    if (c.verdict === ADDITIVE) continue;
    verdict = worst(verdict, c.verdict);
    findings.push(`${c.method}() — ${c.verdict === DESTRUCTIVE ? '파괴형 구조 호출' : '자동 판정 불가 호출'}`);
  }
  if (sql.length === 0 && runnerCalls.length === 0) {
    return { verdict: REVIEW, findings: [...findings, 'up() 에 실행 문장이 없음'] };
  }
  const created = new Set();
  for (const text of sql) {
    for (const stmt of splitSql(text)) {
      const r = classifyStatement(stmt, created);
      verdict = worst(verdict, r.verdict);
      if (r.verdict !== ADDITIVE) findings.push(r.why);
    }
  }
  return { verdict, findings };
}

/** base 의 줄이 head 에 순서대로 모두 남아 있는가 (등록부 append-only 확인) */
export function isAppendOnly(base, head) {
  if (typeof base !== 'string' || typeof head !== 'string') return false;
  const a = base.split(/\r?\n/);
  const b = head.split(/\r?\n/);
  let j = 0;
  for (const line of a) {
    while (j < b.length && b[j] !== line) j += 1;
    if (j >= b.length) return false;
    j += 1;
  }
  return true;
}
