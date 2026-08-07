/**
 * WO-...-LIVE-APPLY-AND-PUBLIC-VERIFY-V1 §17·§18·§20 — 공개 언어 계약 검증 (read-only, DB write 0).
 *
 * 공개 진입점은 `GET /api/v1/public/product-landings/:publicKey?locale=xx` (ProductLandingService).
 * 그 read model 의 언어 계약을 **서비스와 같은 SQL·같은 정렬**로 전 모집단(19,360)에 재현한다.
 *
 *   languages       = DISTINCT COALESCE(language,'ko') WHERE status='canonical' AND description_type='STORE'
 *                     AND deleted_at IS NULL,  정렬: ko 최우선 → 나머지 localeCompare
 *   resolvedLocale  = 요청 locale 이 languages 에 있으면 그것, 없으면 ko, 그것도 없으면 languages[0]
 *
 * 검사(마스터당):
 *   EN_PRESENT        'en' ∈ languages
 *   EN_RESOLVES       resolvedLocale('en') === 'en'
 *   KO_DEFAULT        resolvedLocale(undefined) === 'ko'   (기존 KO 기본 동작 회귀 없음)
 *   ORDER_KO_FIRST    languages[0] === 'ko'
 *
 * landing 이 발급된 master 만 실제 HTTP 로 도달 가능하므로 발급 현황도 함께 집계한다
 * (발급은 단건 idempotent 정책이라 대량 발급하지 않는다 — 이번 WO 범위 밖).
 */
import fs from 'node:fs';
import path from 'node:path';
import { StringDecoder } from 'node:string_decoder';
import pg from 'pg';
import { RESULTS } from './tm-lib.mjs';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const PORT = parseInt(arg('--port', '15471'), 10);
const CHUNK = parseInt(arg('--chunk', '400'), 10);
const TAG = arg('--tag', 'public');
const PLAN = arg('--plan', path.join(RESULTS, 'live-apply-plan.jsonl'));

function* streamJsonl(file) {
  const fd = fs.openSync(file, 'r');
  const decoder = new StringDecoder('utf8');
  try {
    const buf = Buffer.alloc(1 << 20); let tail = '';
    for (;;) {
      const n = fs.readSync(fd, buf, 0, buf.length, null);
      if (n === 0) break;
      const lines = (tail + decoder.write(buf.subarray(0, n))).split('\n');
      tail = lines.pop() ?? '';
      for (const l of lines) if (l.trim()) yield JSON.parse(l);
    }
    tail += decoder.end();
    if (tail.trim()) yield JSON.parse(tail);
  } finally { fs.closeSync(fd); }
}

const plan = new Map();
for (const r of streamJsonl(PLAN)) plan.set(r.masterId, r);

const client = new pg.Client({ host: '127.0.0.1', port: PORT, user: process.env.PGUSER, password: process.env.PGPASSWORD, database: 'o4o_platform' });
await client.connect();
await client.query('SET default_transaction_read_only = on');

const SQL_LANG = `
  SELECT master_id::text "masterId", array_agg(DISTINCT COALESCE(language,'ko')) "langs"
  FROM shared_product_descriptions
  WHERE master_id = ANY($1::uuid[]) AND deleted_at IS NULL
    AND status='canonical' AND description_type='STORE'
  GROUP BY master_id`;
const SQL_LANDING = `
  SELECT product_master_id::text "masterId", public_key "publicKey", status, exposure_state "exposureState"
  FROM product_landings WHERE product_master_id = ANY($1::uuid[])`;

const sortLangs = (a) => [...a].sort((x, y) => (x === 'ko' ? -1 : y === 'ko' ? 1 : x.localeCompare(y)));
const resolve = (available, reqLoc) => (available.includes(reqLoc) ? reqLoc : available.includes('ko') ? 'ko' : available[0] ?? null);

const ids = [...plan.keys()].sort();
const checks = { EN_PRESENT: 0, EN_RESOLVES: 0, KO_DEFAULT: 0, ORDER_KO_FIRST: 0 };
const failures = [];
const landing = { issued: 0, active: 0, blocked: 0, none: 0, byState: {} };
const langCombo = {};

for (let i = 0; i < ids.length; i += CHUNK) {
  const slice = ids.slice(i, i + CHUNK);
  const [langRows, landRows] = await Promise.all([
    client.query(SQL_LANG, [slice]).then((r) => r.rows),
    client.query(SQL_LANDING, [slice]).then((r) => r.rows),
  ]);
  const langBy = new Map(langRows.map((r) => [r.masterId, sortLangs(r.langs.map((s) => s.toLowerCase()))]));
  const landBy = new Map(landRows.map((r) => [r.masterId, r]));

  for (const masterId of slice) {
    const available = langBy.get(masterId) ?? [];
    langCombo[available.join('+') || '(none)'] = (langCombo[available.join('+') || '(none)'] ?? 0) + 1;

    const fail = [];
    if (available.includes('en')) checks.EN_PRESENT++; else fail.push('EN_PRESENT');
    if (resolve(available, 'en') === 'en') checks.EN_RESOLVES++; else fail.push('EN_RESOLVES');
    if (resolve(available, '') === 'ko') checks.KO_DEFAULT++; else fail.push('KO_DEFAULT');
    if (available[0] === 'ko') checks.ORDER_KO_FIRST++; else fail.push('ORDER_KO_FIRST');
    if (fail.length && failures.length < 100) failures.push({ masterId, itemSeq: plan.get(masterId).itemSeq, available, failed: fail });

    const l = landBy.get(masterId);
    if (!l) landing.none++;
    else {
      landing.issued++;
      landing.byState[`${l.status}/${l.exposureState}`] = (landing.byState[`${l.status}/${l.exposureState}`] ?? 0) + 1;
      if (l.status === 'active' && l.exposureState === 'ok') landing.active++; else landing.blocked++;
    }
  }
  process.stderr.write(`${TAG} ${Math.min(i + CHUNK, ids.length)}/${ids.length}\n`);
}
await client.end();

const out = {
  wo: 'WO-O4O-EASY-DRUG-EN-FULL-RETRANSLATION-LIVE-APPLY-AND-PUBLIC-VERIFY-V1',
  step: `live-public-verify(${TAG})`,
  population: ids.length,
  checks,
  allPassed: Object.values(checks).every((n) => n === ids.length),
  failures: failures.slice(0, 30),
  failureCount: failures.length,
  languageCombinations: langCombo,
  landing,
  publicEndpoint: 'GET /api/v1/public/product-landings/:publicKey?locale=en',
  cacheContract: 'Cache-Control: no-store, private + Vary: Authorization (공개 shared cache 미저장 — CDN stale 구조적으로 없음)',
  dbWrites: 0,
};
fs.writeFileSync(path.join(RESULTS, `live-public-verify-${TAG}-result.json`), JSON.stringify({ ...out, failures }, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(out, null, 2));
