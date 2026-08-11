/**
 * WO-O4O-ADMIN-PRODUCT-DESCRIPTION-ROUTE-AUTH-BOUNDARY-ALIGNMENT-V1 — §9 smoke (read-only)
 *
 * 자격증명은 코드에 박지 않는다. gitignore 된 docs/local/TEST-ACCOUNTS.local.md 에서 읽는다.
 * GET 만 호출한다 (DB write 0).
 */
import { readFileSync } from 'node:fs';

const API = process.env.O4O_API ?? 'https://api.neture.co.kr';
const doc = readFileSync('docs/local/TEST-ACCOUNTS.local.md', 'utf8');
const TARGET = 'sohae2100@gmail.com';
// 같은 계정에 대해 문서에 기재된 비밀번호가 여러 개다(서비스별 표). 문서 기재값만 순서대로 시도한다.
const candidates = [
  ...new Set(
    doc
      .split(/\r?\n/)
      .filter((l) => l.startsWith('|') && l.includes(TARGET))
      .map((l) => l.split('|').map((c) => c.trim()))
      .map((c) => c[c.indexOf(TARGET) + 1])
      .filter((v) => v && !v.includes(' ') && v.length >= 6),
  ),
];

let token = null;
let email = TARGET;
const loginAttempts = [];
for (const password of candidates) {
  const login = await fetch(`${API}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await login.json();
  loginAttempts.push({ status: login.status, code: body?.code ?? null, keys: Object.keys(body ?? {}), dataKeys: Object.keys(body?.data ?? {}), setCookie: !!login.headers.get('set-cookie') });
  // 이 API 는 쿠키 기반 인증이다 (set-cookie). Authorization 헤더 대신 Cookie 를 이어 쓴다.
  const setCookie = login.headers.getSetCookie?.() ?? [];
  token = setCookie.map((c) => c.split(';')[0]).join('; ') || null;
  if (login.status === 200 && token) { globalThis.__loginBody = body; break; }
  token = null;
}
if (!token) {
  console.log(JSON.stringify({ candidatesTried: candidates.length, loginAttempts }, null, 2));
  throw new Error('로그인 실패 — 문서 기재 비밀번호 전부 불일치 (비밀번호 변경 금지 — WO §9)');
}
const body = globalThis.__loginBody;

const PATHS = [
  ['A: channel-playback-logs', '/api/v1/admin/channel-playback-logs?limit=1'],
  ['A: channels/heartbeat/status', '/api/v1/admin/channels/heartbeat/status'],
  ['A: channels/ops', '/api/v1/admin/channels/ops'],
  ['A: ops/metrics', '/api/v1/admin/ops/metrics'],
  ['A: dashboard (정상 대조군)', '/api/v1/admin/dashboard/sales-summary'],
];

const out = { api: API, actor: email, user: { id: body?.data?.user?.id, roles: body?.data?.user?.roles ?? body?.data?.user?.role ?? null }, results: [] };
for (const [label, path] of PATHS) {
  const r = await fetch(`${API}${path}`, { headers: { cookie: token } });
  const t = await r.text();
  let code = null;
  try { code = JSON.parse(t)?.code ?? null; } catch { /* html */ }
  out.results.push({ label, path, status: r.status, code, snippet: t.slice(0, 120) });
}
console.log(JSON.stringify(out, null, 2));
