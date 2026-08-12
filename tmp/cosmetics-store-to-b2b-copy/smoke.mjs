/**
 * WO §13 검색/소비 smoke — 같은 제품에서 STORE 와 B2B 설명서를 각각 정상 조회할 수 있는가.
 *
 * read-only (GET 만). 새 B2B UI 는 만들지 않는다 — 기존 소비 API 계약만 확인한다.
 *   GET /api/v1/admin/o4o-product-db/masters/:id/store-descriptions?descriptionType=STORE|B2B|all
 * 자격증명은 코드에 박지 않는다. gitignore 된 docs/local/TEST-ACCOUNTS.local.md 에서 읽는다.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const API = process.env.O4O_API ?? 'https://api.neture.co.kr';
const ACCOUNTS = process.env.ACCOUNTS_DOC ?? 'docs/local/TEST-ACCOUNTS.local.md';
const EMAIL = process.env.SMOKE_EMAIL ?? 'sohae2100@gmail.com';
const doc = readFileSync(ACCOUNTS, 'utf8');
const samples = JSON.parse(readFileSync(new URL('./post-verify.json', import.meta.url), 'utf8')).samples;

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

const out = { api: API, actor: EMAIL, method: 'GET only', dbWrites: 0, results: [], pass: false };
const cookie = await login(EMAIL);
if (!cookie) {
  out.error = '로그인 실패 (문서 기재 비밀번호 불일치 — 비밀번호 변경 금지)';
} else {
  for (const s of samples.slice(0, 3)) {
    const base = `${API}/api/v1/admin/o4o-product-db/masters/${s.masterId}/store-descriptions`;
    const fetchType = async (t) => {
      const r = await fetch(`${base}?descriptionType=${t}`, { headers: { cookie } });
      const body = await r.text();
      let items = [];
      try { items = JSON.parse(body)?.data?.items ?? []; } catch { /* non-json */ }
      return { status: r.status, count: items.length, items: items.map((i) => ({ id: i.id, descriptionType: i.descriptionType, language: i.language, status: i.status, contentLen: (i.content ?? '').length })) };
    };
    const store = await fetchType('STORE');
    const b2b = await fetchType('B2B');
    const koStore = store.items.find((i) => i.language === 'ko' && i.status === 'canonical');
    const koB2b = b2b.items.find((i) => i.language === 'ko' && i.status === 'canonical');
    out.results.push({
      masterId: s.masterId,
      store: { status: store.status, koCanonicalId: koStore?.id ?? null, contentLen: koStore?.contentLen ?? null },
      b2b: { status: b2b.status, koCanonicalId: koB2b?.id ?? null, contentLen: koB2b?.contentLen ?? null },
      bothReadable: store.status === 200 && b2b.status === 200 && !!koStore && !!koB2b,
      idDiffers: !!koStore && !!koB2b && koStore.id !== koB2b.id,
      sameLength: koStore?.contentLen === koB2b?.contentLen,
      expectedStoreId: s.storeId,
      expectedB2bId: s.b2bId,
      idsMatchDb: koStore?.id === s.storeId && koB2b?.id === s.b2bId,
    });
  }
  out.pass = out.results.length > 0 && out.results.every((r) => r.bothReadable && r.idDiffers && r.sameLength && r.idsMatchDb);
}

writeFileSync(new URL('./smoke.json', import.meta.url), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
if (!out.pass) process.exitCode = 3;
