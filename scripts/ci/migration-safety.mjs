/**
 * WO-O4O-CICD-PROMOTE-APPROVAL-REDUCTION-V1 — migration 파괴형 판정기 (결정적 · AI 판정 아님)
 *
 * 질문은 하나다 — "이 migration 의 up() 을 운영에 적용하면 기존 데이터 · 구조가 사라지거나 바뀌는가."
 *
 *   ADDITIVE     아래 허용 목록의 문장만 있다 → 자동 배포 (적용 직전 Cloud SQL 백업은 그대로 만든다)
 *   DESTRUCTIVE  DROP · 이름 변경 · 타입 변경 · 데이터 UPDATE / DELETE / TRUNCATE → Promote 승인
 *   REVIEW       그 밖의 모든 문장 → Promote 승인 (fail-closed)
 *
 * 허용 목록 (2026-11-12 통합 담당 결정 — 확실히 안전한 몇 가지 문장 형태만 추가형으로 보고 나머지는 전부 승인):
 *   - CREATE TABLE <이름> ( ... )            (AS · INHERITS · PARTITION OF 제외)
 *   - CREATE [UNIQUE] INDEX ...
 *   - 기존 표 ALTER TABLE — 동작이 모두 ADD COLUMN(제약 · REFERENCES 없음) 또는 ALTER COLUMN .. DROP NOT NULL
 *   - 같은 migration 에서 IF NOT EXISTS 없이 만든 표의 ALTER TABLE — ADD ... · ALTER COLUMN .. SET/DROP DEFAULT · SET/DROP NOT NULL
 *   - COMMENT ON ... · CREATE SEQUENCE ...(OWNED BY 제외) · CREATE TYPE .. AS ENUM (...) · ALTER TYPE .. ADD VALUE ...
 *   - QueryRunner 구조 API: createTable · createIndex · createIndices (읽기 · 트랜잭션 제어는 중립 · addColumn(s) 는 승인 대상)
 *   - query() 인자는 문자열 상수 하나 · 보간 없음 · 값이 확정되는 escape 만
 *   - up() 본문은 `await <runner>.query('<SQL>');` 문장과 JS 주석뿐 (helper · 변수 · 구조 API 호출은 승인 대상)
 *   - SQL 안의 주석(-- · 블록 주석)은 승인 대상 (중첩 주석으로 문장을 숨길 수 있다)
 * 데이터를 쓰는 문장(INSERT · UPDATE · DELETE · TRUNCATE · MERGE)은 새 표 대상이어도 추가형으로 보지 않는다.
 * 읽기(SELECT) · 잠금 · 확장 · 스키마 · 트리거 · 함수 · 권한 · 동적 SQL · 그 밖의 QueryRunner 호출도 승인 대상이다.
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

/**
 * `up(...)` 메서드 본문과 QueryRunner 매개변수 이름.
 * 주석 · 문자열 밖의 up 메서드 정의가 정확히 하나일 때만 돌려준다 — 없거나 둘 이상이면(예제 주석 · 여러 클래스) null.
 */
export function extractUp(source) {
  const re = /\b(?:public\s+)?(?:async\s+)?up\s*\(/g;
  let m;
  let found = null;
  while ((m = re.exec(source))) {
    if (insideLiteral(source.slice(0, m.index))) continue;
    const paramsOpen = m.index + m[0].length - 1;
    const paramsClose = matchBracket(source, paramsOpen);
    if (paramsClose < 0) return null;
    const bodyOpen = source.indexOf('{', paramsClose);
    if (bodyOpen < 0) continue;
    // `up(q): Promise<void> {` — 괄호 뒤에는 반환 타입만 올 수 있다
    if (!/^\s*(:[^{;]*)?$/.test(source.slice(paramsClose + 1, bodyOpen))) continue;
    const bodyClose = matchBracket(source, bodyOpen);
    if (bodyClose < 0) return null;
    if (found) return null;
    const runner = /^\s*([A-Za-z_$][\w$]*)/.exec(source.slice(paramsOpen + 1, paramsClose))?.[1] ?? null;
    found = { body: source.slice(bodyOpen + 1, bodyClose), runner };
    re.lastIndex = bodyClose;
  }
  return found;
}

/** 값이 그대로 확정되는 escape 만 해석한다 */
const SIMPLE_ESCAPE = { n: '\n', t: '\t', r: '\r', '\\': '\\', "'": "'", '"': '"', '`': '`', $: '$' };

/**
 * 인용 문자열 하나를 읽는다 → {value, end, interpolated, unsafeEscape} · 문자열이 아니면 null.
 * SIMPLE_ESCAPE 밖의 escape(\u · \x · 8진 · 줄 이음 등)는 실행 SQL 과 판정 문자열이 달라질 수 있으므로 unsafeEscape 로 표시한다.
 */
function readStringLiteral(src, pos) {
  const q = src[pos];
  if (q !== '"' && q !== "'" && q !== '`') return null;
  let out = '';
  let interpolated = false;
  let unsafeEscape = false;
  let i = pos + 1;
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') {
      const n = src[i + 1];
      if (Object.hasOwn(SIMPLE_ESCAPE, n ?? '')) out += SIMPLE_ESCAPE[n];
      else { unsafeEscape = true; out += n ?? ''; }
      i += 2;
      continue;
    }
    if (q === '`' && c === '$' && src[i + 1] === '{') interpolated = true;
    if (c === q) return { value: out, end: i + 1, interpolated, unsafeEscape };
    out += c;
    i += 1;
  }
  return null;
}

/**
 * 분석한 query() 호출 범위와 주석 · `await` · `;` · 공백을 지운 뒤 남는 코드가 있는지.
 * @param {string} body
 * @param {[number, number][]} ranges
 */
function residueOf(body, ranges) {
  let text = '';
  let last = 0;
  for (const [s, e] of ranges) { text += body.slice(last, s) + ' '; last = e; }
  text += body.slice(last);
  let out = '';
  let i = 0;
  while (i < text.length) {
    if (text[i] === '/' && (text[i + 1] === '/' || text[i + 1] === '*')) { i = skipLiteral(text, i); out += ' '; continue; }
    out += text[i];
    i += 1;
  }
  return out.replace(/(?<![\w$])await(?![\w$])/g, ' ').replace(/[;\s]/g, '') !== '';
}

/** QueryRunner 의 구조 API — 이름으로 판정한다 (query 외) */
// addColumn(s) 는 열 옵션(NOT NULL · unique · 외래 키 등)을 객체로 받아 분석할 수 없으므로 승인 대상이다 — 추가형으로 두려면 SQL ADD COLUMN 을 쓴다
const RUNNER_ADDITIVE = new Set(['createTable', 'createIndex', 'createIndices']);
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
  /** 분석을 마친 query() 호출 범위 [시작, 끝) — 본문 형태 검사에서 제외한다 */
  const calls = [];
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
      // 인자는 문자열 상수 하나뿐이어야 한다 — 뒤에 `+` · `.concat()` · 매개변수 배열 등이 붙으면 승인 대상
      if (body[after] !== ')') problems.push('query() 인자가 문자열 상수 하나가 아님 (이어 붙임 · 메서드 호출 · 매개변수 등)');
      else calls.push([m.index, after + 1]);
      if (lit.interpolated) problems.push('query() 문자열에 `${}` 보간');
      if (lit.unsafeEscape) problems.push('query() 문자열에 해석하지 않는 escape (\\u · \\x · 8진 · 줄 이음 등)');
      // SQL 주석(-- · /* */ · 중첩 주석)은 문장 분리를 흐릴 수 있다
      if (/--|\/\*|\*\//.test(lit.value)) problems.push('query() SQL 에 주석 (-- · /* */) — 자동 판정 불가');
      sql.push(lit.value);
      continue;
    }
    if (RUNNER_ADDITIVE.has(method) || RUNNER_NEUTRAL.has(method)) runnerCalls.push({ method, verdict: ADDITIVE });
    else if (RUNNER_DESTRUCTIVE.test(method)) runnerCalls.push({ method, verdict: DESTRUCTIVE });
    else runnerCalls.push({ method, verdict: REVIEW });
  }
  if (queryCalls > runnerQueries) problems.push('QueryRunner 매개변수가 아닌 query() 호출 — 실행 대상을 알 수 없음');
  // up() 본문은 `await <runner>.query('<SQL>');` 문장과 주석만으로 이뤄져야 한다 — 그 밖의 코드(helper 호출 · 변수 ·
  // 구조 API 등)는 무엇을 실행하는지 확정할 수 없으므로 승인 대상이다
  if (residueOf(body, calls)) problems.push('up() 에 `await <runner>.query(\'<SQL>\');` 외 코드 (helper · 변수 · 구조 API 등)');
  // 템플릿 문자열의 `${}` 안은 실행 코드다 — 위 수집은 문자열 전체를 건너뛰므로, up() 안의 보간은 어디에 있든 승인 대상이다
  if (body.includes('${')) problems.push('up() 안의 템플릿 문자열 보간 `${}` — 보간식 안의 실행 코드를 분석하지 않음');
  // 조건 · 반복 · 예외 처리 안의 CREATE TABLE 은 건너뛰어질 수 있다 — 그때는 "새 표" 예외를 주지 않는다
  let conditional = false;
  const flow = /(?<![\w$])(?:if|else|for|while|do|switch|case|try|catch|finally)(?![\w$])|\?|&&|\|\|/g;
  while ((m = flow.exec(body))) {
    if (!insideLiteral(body.slice(0, m.index))) { conditional = true; break; }
  }
  return { sql, runnerCalls, problems, conditional };
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

/**
 * 표 이름 정규화 — PostgreSQL 규칙대로 따옴표 없는 부분만 소문자로 접고, 따옴표로 감싼 부분은 대소문자를 보존한다
 * ("Users" ≠ users). 스키마 public 은 생략한다.
 */
const tableName = (raw) => {
  const parts = (String(raw ?? '').match(/"(?:[^"]|"")*"|[^.]+/g) ?? [])
    .map(p => (p.startsWith('"') ? p.slice(1, -1).replace(/""/g, '"') : p.toLowerCase()));
  if (parts.length === 2 && parts[0] === 'public') parts.shift();
  return parts.join('\u0000');
};
// 이름 한 부분은 따옴표로 완전히 닫힌 식별자("users-live" · "a""b") 또는 따옴표 없는 식별자다 — 앞부분만 잡지 않는다
const IDENT_PART = '(?:"(?:[^"]|"")+"|[A-Za-z_][\\w$]*(?![\\w$"-]))';
const IDENT = `(${IDENT_PART}(?:\\.${IDENT_PART})?)`;

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

// 두 갈래: 문두 DROP(NOT NULL 해제 제외) · RENAME, 또는 어디서든 열 타입 변경.
const DESTRUCTIVE_ACTION = /(?:^(?:DROP\b(?!\s+NOT\s+NULL\b)|RENAME\b))|(?:\bALTER\s+(?:COLUMN\s+)?\S+\s+(?:SET\s+DATA\s+)?TYPE\b)/;

/** text[open] 의 '(' 와 짝인 ')' 뒤 문자열 — 짝이 없으면 null (문자열 · 따옴표 식별자 안의 괄호는 무시) */
function afterParens(text, open) {
  let depth = 0;
  let quote = null;
  for (let i = open; i < text.length; i += 1) {
    const c = text[i];
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === "'" || c === '"') { quote = c; continue; }
    if (c === '(') depth += 1;
    if (c === ')' && --depth === 0) return text.slice(i + 1);
  }
  return null;
}

/**
 * 기존 표의 ALTER TABLE 한 동작 — 제약 없는 열 추가와 NOT NULL 해제만 허용.
 * 열 정의 안의 제약(CHECK · UNIQUE · PRIMARY KEY · REFERENCES · GENERATED · CONSTRAINT)은 기존 행에 대해 실패하거나
 * 다른 표와 엮이므로 승인 대상이다. NOT NULL 은 DEFAULT 가 함께 있을 때만 허용한다(기존 행이 기본값으로 채워진다).
 */
function classifyAlterAction(action) {
  const a = action.replace(/\s+/g, ' ').trim().toUpperCase();
  if (/^ADD (COLUMN )?(IF NOT EXISTS )?(?!CONSTRAINT\b|PRIMARY\b|UNIQUE\b|CHECK\b|FOREIGN\b|EXCLUDE\b)/.test(a)
    && !/\b(REFERENCES|CHECK|UNIQUE|PRIMARY|GENERATED|CONSTRAINT|EXCLUDE)\b/.test(a)
    && (!/\bNOT NULL\b/.test(a) || /\bDEFAULT\b/.test(a))) {
    return { verdict: ADDITIVE, why: '열 추가' };
  }
  if (/^ALTER (COLUMN )?\S+ DROP NOT NULL$/.test(a)) return { verdict: ADDITIVE, why: 'NOT NULL 해제(제약 완화 · 데이터 불변)' };
  if (DESTRUCTIVE_ACTION.test(a)) return { verdict: DESTRUCTIVE, why: `파괴형 변경: ${a.slice(0, 60)}` };
  return { verdict: REVIEW, why: `기존 표 변경 — 허용 목록 밖: ${a.slice(0, 60)}` };
}

/** 이 migration 에서 만든 표의 ALTER TABLE 한 동작 — 정의를 마저 붙이는 동작만 허용 */
function classifyNewTableAction(action) {
  const a = action.replace(/\s+/g, ' ').trim().toUpperCase();
  if (/^ADD\b/.test(a)) return { verdict: ADDITIVE, why: '새 표 정의' };
  if (/^ALTER (COLUMN )?\S+ (SET DEFAULT\b|DROP DEFAULT$|SET NOT NULL$|DROP NOT NULL$)/.test(a)) return { verdict: ADDITIVE, why: '새 표 정의' };
  return classifyAlterAction(action);
}

/**
 * SQL 문장 하나 — 허용 목록에 맞으면 ADDITIVE, 알아볼 수 있는 파괴형이면 DESTRUCTIVE, 나머지는 REVIEW.
 * @param {Set<string>} created 이 migration 에서 IF NOT EXISTS 없이 만든 표 (호출 중 갱신 · 구조 정의에만 쓴다)
 */
export function classifyStatement(stmt, created = new Set()) {
  const s = stmt.replace(/\s+/g, ' ').trim();
  const u = s.toUpperCase();
  const short = s.slice(0, 80);
  const review = (what) => ({ verdict: REVIEW, why: `${what}: ${short}` });

  // `$` 는 dollar-quote($tag$ · $a1$ …) 또는 매개변수($1)다 — 문장 분리가 dollar-quote 를 이해하지 못하므로 `$` 가 있으면 전부 승인 대상
  if (s.includes('$')) return review('`$` 포함 (dollar-quote · 함수 · DO 블록 · 매개변수) — 자동 판정 불가');
  // 역슬래시는 E'...' 문자열의 escape 가 될 수 있다 — 아래 동작 분리 · 괄호 짝 맞춤은 표준 문자열('' 만 escape)만 이해한다
  if (s.includes('\\')) return review('역슬래시 포함 (E 문자열 escape 등) — 자동 판정 불가');

  let m;
  // ── 허용 목록 ──────────────────────────────────────────────────────────
  if ((m = new RegExp(`^CREATE TABLE (IF NOT EXISTS )?${IDENT} ?\\(`, 'i').exec(s))) {
    // 열 정의 괄호 뒤의 부가 절(AS SELECT · INHERITS · PARTITION OF)은 기존 데이터 · 표와 엮인다
    const tail = afterParens(s, m.index + m[0].length - 1);
    if (tail === null || /\b(AS|INHERITS|PARTITION|OF)\b/i.test(tail)) return review('CREATE TABLE 부가 절 — 허용 목록 밖');
    // IF NOT EXISTS 는 표가 이미 있으면(기존 데이터 포함) 아무것도 하지 않는다 — 새 표로 기록하지 않는다
    if (!m[1]) created.add(tableName(m[2]));
    return { verdict: ADDITIVE, why: '표 추가' };
  }
  if (/^CREATE (UNIQUE )?INDEX\b/.test(u)) return { verdict: ADDITIVE, why: '인덱스 추가' };
  if (/^COMMENT ON\b/.test(u)) return { verdict: ADDITIVE, why: '주석' };
  if (/^CREATE SEQUENCE\b/.test(u) && !/\bOWNED BY\b/.test(u)) return { verdict: ADDITIVE, why: '시퀀스 추가' };
  if (new RegExp(`^CREATE TYPE ${IDENT} AS ENUM ?\\(`, 'i').test(s)) return { verdict: ADDITIVE, why: 'enum 추가' };
  if (new RegExp(`^ALTER TYPE ${IDENT} ADD VALUE `, 'i').test(s)) return { verdict: ADDITIVE, why: 'enum 값 추가' };

  if ((m = new RegExp(`^ALTER TABLE (?:IF EXISTS )?(?:ONLY )?${IDENT} (.*)$`, 'i').exec(s))) {
    const classify = created.has(tableName(m[1])) ? classifyNewTableAction : classifyAlterAction;
    let verdict = ADDITIVE;
    const whys = [];
    for (const action of splitActions(m[2])) {
      const r = classify(action);
      verdict = worst(verdict, r.verdict);
      whys.push(r.why);
    }
    return { verdict, why: whys.join(' · ') };
  }

  // ── 알아볼 수 있는 파괴형 (승인 사유를 분명히 하려는 것 — 놓쳐도 아래 REVIEW 로 승인 대상이다) ──
  if (/^(UPDATE|DELETE|TRUNCATE)\b/.test(u)) return { verdict: DESTRUCTIVE, why: `데이터 일괄 ${u.split(' ')[0]}: ${short}` };
  if (/^(DROP|ALTER \w+ \S+ RENAME|ALTER (TYPE|SEQUENCE|INDEX|VIEW|SCHEMA)\b.*\bRENAME\b)/.test(u)) {
    return { verdict: DESTRUCTIVE, why: `파괴형 변경: ${short}` };
  }

  return review('허용 목록 밖 문장 — 승인 필요');
}

/**
 * migration 원문 하나 판정.
 * @returns {{ verdict: 'ADDITIVE'|'DESTRUCTIVE'|'REVIEW', findings: string[] }}
 */
export function classifyMigrationSource(source) {
  if (typeof source !== 'string' || source.trim() === '') return { verdict: REVIEW, findings: ['원문을 읽을 수 없음'] };
  const up = extractUp(source);
  if (up === null) return { verdict: REVIEW, findings: ['up() 을 찾지 못함'] };
  const { sql, runnerCalls, problems, conditional } = extractStatements(up.body, up.runner);
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
  // 조건부 실행이 있으면 기록하지 않는 집합을 넘긴다 — 모든 ALTER TABLE 이 기존 표 기준으로 판정된다
  const created = conditional ? Object.assign(new Set(), { add() { return this; } }) : new Set();
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
