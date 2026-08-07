/**
 * WO-...-LIVE-APPLY-AND-PUBLIC-VERIFY-V1 §18·§20 — 실제 공개 API 전수 검증 (HTTP GET only, DB write 0).
 *
 * `GET /api/v1/public/product-landings/:publicKey?locale=en` 을 전 모집단에 대해 호출하고,
 * 응답 본문의 md5 가 **plan 이 잠근 productionEnHash 와 바이트 단위로 같은지** 확인한다.
 * DB 조회가 아니라 사용자가 실제로 받는 응답을 본다는 점이 §15/§16 과 다르다.
 *
 * 설명서 본문은 로그인 세션에만 응답하므로(ADR-0002) 세션 쿠키를 먼저 얻는다.
 * 자격증명은 **환경변수로만** 주입한다(O4O_EMAIL / O4O_PASSWORD). 로그에 찍지 않는다.
 *
 * 사용: run-with-db.ps1 -Script live-api-verify.mjs -ScriptArgs @('--port','15491','--base','https://api.neture.co.kr')
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { StringDecoder } from 'node:string_decoder';
import pg from 'pg';
import { RESULTS } from './tm-lib.mjs';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const PORT = parseInt(arg('--port', '15491'), 10);
const BASE = arg('--base', 'https://api.neture.co.kr');
const CONC = parseInt(arg('--concurrency', '8'), 10);
const KO_SAMPLE = parseInt(arg('--ko-sample', '500'), 10);
const TAG = arg('--tag', 'api');
const LIMIT = parseInt(arg('--limit', '0'), 10);
const md5 = (s) => crypto.createHash('md5').update(s, 'utf8').digest('hex');

function* streamJsonl(file) {
  const fd = fs.openSync(file, 'r');
  const dec = new StringDecoder('utf8');
  try {
    const buf = Buffer.alloc(1 << 20); let tail = '';
    for (;;) {
      const n = fs.readSync(fd, buf, 0, buf.length, null);
      if (!n) break;
      const ls = (tail + dec.write(buf.subarray(0, n))).split('\n');
      tail = ls.pop() ?? '';
      for (const l of ls) if (l.trim()) yield JSON.parse(l);
    }
    tail += dec.end();
    if (tail.trim()) yield JSON.parse(tail);
  } finally { fs.closeSync(fd); }
}

const plan = new Map();
for (const r of streamJsonl(path.join(RESULTS, 'live-apply-plan.jsonl'))) plan.set(r.masterId, r);

/* publicKey 매핑 (read-only) */
const client = new pg.Client({ host: '127.0.0.1', port: PORT, user: process.env.PGUSER, password: process.env.PGPASSWORD, database: 'o4o_platform' });
await client.connect();
await client.query('SET default_transaction_read_only = on');
const keyRows = (await client.query(
  `SELECT product_master_id::text "masterId", public_key "publicKey"
   FROM product_landings WHERE product_master_id = ANY($1::uuid[]) AND status='active' AND exposure_state='ok'`,
  [[...plan.keys()]])).rows;
await client.end();

/* 로그인 → 세션 쿠키 */
const email = process.env.O4O_EMAIL, password = process.env.O4O_PASSWORD;
if (!email || !password) throw new Error('O4O_EMAIL / O4O_PASSWORD 환경변수가 필요합니다');
const loginRes = await fetch(`${BASE}/api/v1/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
});
if (!loginRes.ok) throw new Error(`login 실패 status=${loginRes.status}`);
const cookie = (loginRes.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
if (!cookie) throw new Error('세션 쿠키를 받지 못했습니다');
process.stderr.write(`login ok, cookies=${cookie.split(';').length}\n`);

const work = LIMIT > 0 ? keyRows.slice(0, LIMIT) : keyRows;
const checks = { HTTP_200: 0, AUTHED: 0, EN_IN_LANGUAGES: 0, EN_RESOLVED: 0, BODY_HASH_MATCH: 0 };
const failures = [];
let done = 0;

async function getLanding(publicKey, locale) {
  const url = `${BASE}/api/v1/public/product-landings/${encodeURIComponent(publicKey)}${locale ? `?locale=${locale}` : ''}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { headers: { cookie } });
      return { status: res.status, cacheControl: res.headers.get('cache-control'), body: await res.json() };
    } catch (e) { if (attempt) throw e; }
  }
}

async function worker(items) {
  for (const it of items) {
    const p = plan.get(it.masterId);
    const fail = [];
    try {
      const r = await getLanding(it.publicKey, 'en');
      if (r.status === 200) checks.HTTP_200++; else fail.push(`HTTP_${r.status}`);
      const d = r.body?.data;
      if (d && d.authRequired === false) checks.AUTHED++; else fail.push('AUTH_GATE');
      if (d?.languages?.includes('en')) checks.EN_IN_LANGUAGES++; else fail.push('EN_IN_LANGUAGES');
      if (d?.resolvedLocale === 'en') checks.EN_RESOLVED++; else fail.push('EN_RESOLVED');
      const content = d?.description?.content ?? null;
      if (content && md5(content) === p.productionEnHash) checks.BODY_HASH_MATCH++; else fail.push('BODY_HASH_MATCH');
    } catch (e) { fail.push(`EXCEPTION:${String(e.message || e).slice(0, 80)}`); }
    if (fail.length && failures.length < 100) failures.push({ masterId: it.masterId, itemSeq: p?.itemSeq, publicKey: it.publicKey, failed: fail });
    if (++done % 2000 === 0) process.stderr.write(`${TAG} ${done}/${work.length}\n`);
  }
}

const shards = Array.from({ length: CONC }, (_, i) => work.filter((_, idx) => idx % CONC === i));
await Promise.all(shards.map(worker));

/* KO 기본 동작 회귀 (locale 미지정 → ko 본문) — 표본 */
const koChecks = { RESOLVED_KO: 0, KO_BODY_PRESENT: 0, NO_STORE_CACHE: 0 };
const koSample = work.slice(0, Math.min(KO_SAMPLE, work.length));
for (const it of koSample) {
  const r = await getLanding(it.publicKey, '');
  const d = r.body?.data;
  if (d?.resolvedLocale === 'ko') koChecks.RESOLVED_KO++;
  if (d?.description?.content) koChecks.KO_BODY_PRESENT++;
  if ((r.cacheControl || '').includes('no-store')) koChecks.NO_STORE_CACHE++;
}

const out = {
  wo: 'WO-O4O-EASY-DRUG-EN-FULL-RETRANSLATION-LIVE-APPLY-AND-PUBLIC-VERIFY-V1',
  step: `live-api-verify(${TAG})`,
  base: BASE,
  populationWithLanding: keyRows.length,
  requested: work.length,
  checks,
  allPassed: Object.values(checks).every((n) => n === work.length),
  koRegression: { sample: koSample.length, ...koChecks },
  failureCount: failures.length,
  failures: failures.slice(0, 30),
  dbWrites: 0,
};
fs.writeFileSync(path.join(RESULTS, `live-api-verify-${TAG}-result.json`), JSON.stringify({ ...out, failures }, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(out, null, 2));
