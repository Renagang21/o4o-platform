// GitHub Actions expression 의 부분집합 평가기 — workflow 계약 시험 전용.
//
// 의미(GitHub 문서 기준):
//   - `&&` / `||` 는 피연산자 값을 그대로 반환한다.
//   - `==` / `!=` 는 문자열이면 대소문자를 무시하고, 타입이 다르면 숫자로 바꿔 비교한다(null → 0, bool → 0/1).
//   - 없는 속성은 null 이다. `a.*.b` 는 객체 값들의 `b` 배열이다(예: `needs.*.result`).
//   - falsy = false · 0 · '' · null · NaN.
//   - `contains(배열, 값)` 은 원소 비교, `contains(문자열, 값)` 은 부분 문자열(대소문자 무시).
//   - `fromJSON` · `always()` · `success()` · `failure()` · `cancelled()` (상태 함수는 ctx.$status 로 주입).
// 실제 GitHub 실행을 대신하지 않는다. 식의 분기 의미를 고정하는 용도다.

const truthy = (v) => !(v === false || v === 0 || v === '' || v === null || v === undefined || Number.isNaN(v));
const num = (v) => (v === null || v === undefined ? 0 : typeof v === 'boolean' ? Number(v) : typeof v === 'number' ? v : typeof v === 'string' ? (v.trim() === '' ? 0 : Number(v)) : NaN);
const eq = (a, b) => {
  a ??= null; b ??= null;
  if (typeof a === typeof b) return typeof a === 'string' ? a.toLowerCase() === b.toLowerCase() : a === b;
  return num(a) === num(b);
};

function lookup(path, ctx) {
  let cur = [ctx];
  let wild = false;
  for (const key of path.split('.')) {
    if (key === '*') {
      wild = true;
      cur = cur.flatMap((o) => (o && typeof o === 'object' ? Object.values(o) : []));
      continue;
    }
    cur = cur.map((o) => (o == null ? null : o[key] ?? null));
  }
  return wild ? cur : cur[0];
}

export function evaluate(expr, ctx = {}) {
  const src = String(expr).trim().replace(/^\$\{\{\s*/, '').replace(/\s*\}\}$/, '');
  const tokens = [...src.matchAll(/\s*('(?:[^']|'')*'|==|!=|&&|\|\||[(),!]|\d+(?:\.\d+)?|[A-Za-z_][\w.*-]*)/gy)].map((m) => m[1]);
  if (tokens.join('').replace(/\s/g, '') !== src.replace(/\s/g, '')) throw new Error(`unsupported syntax: ${src}`);
  let i = 0;
  const peek = () => tokens[i];
  const next = () => tokens[i++];
  const consume = (t) => { const got = next(); if (got !== t) throw new Error(`expected ${t}, got ${got} in ${src}`); };
  const status = ctx.$status ?? {};
  const args = () => {
    consume('(');
    const out = [];
    if (peek() !== ')') { out.push(or()); while (peek() === ',') { next(); out.push(or()); } }
    consume(')');
    return out;
  };
  const primary = () => {
    const t = next();
    if (t === '(') { const v = or(); consume(')'); return v; }
    if (t === '!') return !truthy(primary());
    if (t.startsWith("'")) return t.slice(1, -1).replace(/''/g, "'");
    if (/^\d/.test(t)) return Number(t);
    if (t === 'true' || t === 'false') return t === 'true';
    if (t === 'null') return null;
    if (peek() === '(') {
      const a = args();
      switch (t) {
        case 'fromJSON': return JSON.parse(a[0]);
        case 'contains':
          return Array.isArray(a[0]) ? a[0].some((x) => eq(x, a[1])) : String(a[0] ?? '').toLowerCase().includes(String(a[1] ?? '').toLowerCase());
        case 'always': return true;
        case 'success': return status.success ?? true;
        case 'failure': return status.failure ?? false;
        case 'cancelled': return status.cancelled ?? false;
        default: throw new Error(`unsupported function ${t}`);
      }
    }
    return lookup(t, ctx);
  };
  const cmp = () => {
    let v = primary();
    while (peek() === '==' || peek() === '!=') { const op = next(); const r = primary(); v = op === '==' ? eq(v, r) : !eq(v, r); }
    return v;
  };
  const and = () => { let v = cmp(); while (peek() === '&&') { next(); const r = cmp(); v = truthy(v) ? r : v; } return v; };
  const or = () => { let v = and(); while (peek() === '||') { next(); const r = and(); v = truthy(v) ? v : r; } return v; };
  const out = or();
  if (i !== tokens.length) throw new Error(`trailing tokens in ${src}`);
  return out;
}

/** GitHub 의 문자열 변환 — null → '', boolean → 'true'/'false', 숫자 → 10진 문자열. */
export const toStr = (v) => (v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));

/** `ci-${{ a }}-${{ b }}` 처럼 식이 섞인 문자열을 평가한다. */
export function template(str, ctx) {
  return String(str).replace(/\$\{\{([\s\S]*?)\}\}/g, (_, e) => toStr(evaluate(e, ctx)));
}

/** job `if` 를 GitHub 처럼 평가한다 — `${{ }}` 생략형 · 상태 함수가 없으면 success() 가 암묵적으로 붙는다. */
export function evaluateIf(cond, ctx) {
  if (cond === undefined || cond === null || cond === '') return truthy(evaluate('success()', ctx));
  const s = String(cond);
  const hasStatus = /\b(always|success|failure|cancelled)\s*\(/.test(s);
  const v = evaluate(s, ctx);
  return hasStatus ? truthy(v) : truthy(evaluate('success()', ctx)) && truthy(v);
}

export { truthy };
