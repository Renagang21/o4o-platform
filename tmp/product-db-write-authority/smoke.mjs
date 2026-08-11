/**
 * WO-O4O-PRODUCT-DB-WRITE-AUTHORITY-BOUNDARY-ALIGNMENT-V1 — 배포 후 smoke
 *
 * 자격증명은 코드에 박지 않는다. gitignore 된 docs/local/TEST-ACCOUNTS.local.md 에서 읽는다.
 * write 호출은 **본문을 비워** 보낸다 — guard 통과 시 400 검증 오류로 끝나므로 DB write 0.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const API = process.env.O4O_API ?? 'https://api.neture.co.kr';
const MASTER = process.env.SMOKE_MASTER_ID;
const doc = readFileSync('docs/local/TEST-ACCOUNTS.local.md', 'utf8');

function passwordsFor(email) {
  return [...new Set(
    doc.split(/\r?\n/).filter((l) => l.startsWith('|') && l.includes(email))
      .map((l) => l.split('|').map((c) => c.trim()))
      .map((c) => c[c.indexOf(email) + 1])
      .filter((v) => v && !v.includes(' ') && v.length >= 6),
  )];
}

async function login(email) {
  for (const password of passwordsFor(email)) {
    const r = await fetch(`${API}/api/v1/auth/login`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const cookie = (r.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
    if (r.status === 200 && cookie) return cookie;
  }
  return null;
}

const BASE = `${API}/api/v1/admin/o4o-product-db/masters/${MASTER}/store-descriptions`;
const ACTORS = [
  ['sohae2100@gmail.com', 'neture:admin+operator (O4O 전체 관리자)'],
  ['renagang21@gmail.com', 'store_owner/supplier (비관리자)'],
];

const out = { api: API, masterId: MASTER, dbWrites: 0, results: [] };
for (const [email, note] of ACTORS) {
  const cookie = await login(email);
  if (!cookie) { out.results.push({ email, note, error: '로그인 실패 (문서 기재 비밀번호 불일치 — 비밀번호 변경 금지)' }); continue; }
  const g = await fetch(BASE, { headers: { cookie } });
  const gt = await g.text();
  const w = await fetch(BASE, { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: '{}' });
  const wt = await w.text();
  const code = (t) => { try { return JSON.parse(t)?.code ?? JSON.parse(t)?.error ?? null; } catch { return null; } };
  out.results.push({ email, note, get: { status: g.status, code: code(gt) }, write: { status: w.status, code: code(wt) } });
}
writeFileSync(new URL('./smoke.json', import.meta.url), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
