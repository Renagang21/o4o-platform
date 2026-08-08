/**
 * WO-O4O-HFF-EN-C01-… §자산 수확
 *
 * 번역을 **지어내지 않기 위해** 근거 자산을 먼저 모은다. DB read-only, write 0.
 *
 * 근거는 두 곳이다.
 *   ① 이전 승인 배치의 KO→EN 번역 자산(data/hff-en-*.json) — 문장 단위
 *   ② **프로덕션 KO↔EN 문서 정렬** — 같은 master 의 KO/EN 문서에서 `sd-spec` 슬롯이
 *      같은 개수면 인덱스로 정렬된다. EN 쪽이 이미 영어인 슬롯은 그 KO 원문의
 *      **검증된 번역**이다. 성분명(머리)·규격 문법(몸통)을 여기서 그대로 얻는다.
 *
 * 산출: data/hff-en-c01-glossary-v1.json · .cache/hff-en-c01-glossary.json
 */
import fs from 'node:fs';
import pg from 'pg';
import { splitSlot, bodyShape, specSlots, norm, HANGUL } from './hff-en-c01-lib.mjs';

const D = 'apps/api-server/src/scripts/data';
const CACHE = process.env.JA_CACHE ?? 'apps/api-server/src/scripts/.cache';
const WO = 'WO-O4O-HFF-EN-C01-LABELLED-STANDARD-40896-FULL-TRANSLATION-REPAIR-V1';

/**
 * 값이 **번역문**인지 판정한다.
 *
 * 옛 배치 보고 파일에는 `{"성상": "14291/14291"}` 처럼 한국어 키에 **진행률 카운터**가
 * 붙은 항목이 대량으로 들어 있다(실측 33,769건). 이것을 번역으로 오인하면 카운터 문자열이
 * 그대로 프로덕션 본문에 들어간다. 그래서 값은 **영문 단어를 포함**해야만 채택한다.
 */
const isPair = (k, v) => HANGUL.test(k) && !HANGUL.test(v) && /[A-Za-z]{2}/.test(v)
  && !/^[\d\s./,:%()-]+$/.test(v) && k.trim().length > 1;

/* ── ① 이전 배치 자산 ─────────────────────────────────────────── */
const asset = new Map();
const walk = (v) => {
  if (!v || typeof v !== 'object') return;
  if (Array.isArray(v)) { for (const x of v) walk(x); return; }
  for (const [k, x] of Object.entries(v)) {
    if (typeof x === 'string') { if (isPair(k, x)) asset.set(norm(k), x.trim()); }
    else walk(x);
  }
};
for (const f of fs.readdirSync(D)) {
  if (!/^hff-en-.*\.json$/.test(f)) continue;
  try { walk(JSON.parse(fs.readFileSync(`${D}/${f}`, 'utf8'))); } catch { /* 손상 파일은 건너뛴다 */ }
}

/* ── ② 프로덕션 KO↔EN 정렬 수확 ──────────────────────────────── */
const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5611', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 1800000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }
const BASE = `deleted_at IS NULL AND source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical'`;

const headPair = new Map(), bodyPair = new Map(), specForm = new Map();
const bump = (map, k, v) => { const m = map.get(k) ?? new Map(); m.set(v, (m.get(v) ?? 0) + 1); map.set(k, m); };
let pairs = 0, aligned = 0, misaligned = 0;
let cursor = '00000000-0000-0000-0000-000000000000';
for (;;) {
  const rows = (await c.query(`
    SELECT e.master_id, e.content en, k.content ko
      FROM shared_product_descriptions e
      JOIN shared_product_descriptions k
        ON k.master_id = e.master_id AND coalesce(k.language,'ko')='ko' AND ${BASE.replace(/deleted_at/g, 'k.deleted_at').replace(/source_type/g, 'k.source_type').replace(/description_type/g, 'k.description_type').replace(/status/g, 'k.status')}
     WHERE e.language='en' AND e.deleted_at IS NULL AND e.source_type='o4o_hff_generated'
       AND e.description_type='STORE' AND e.status='canonical' AND e.master_id > $1
     ORDER BY e.master_id LIMIT 3000`, [cursor])).rows;
  if (!rows.length) break;
  cursor = rows[rows.length - 1].master_id;
  for (const r of rows) {
    pairs++;
    const es = specSlots(r.en), ks = specSlots(r.ko);
    if (!es.length || es.length !== ks.length) { misaligned++; continue; }
    aligned++;
    for (let i = 0; i < es.length; i++) {
      const e = splitSlot(es[i]), k = splitSlot(ks[i]);
      if (HANGUL.test(k.head) && k.head.trim() && !HANGUL.test(e.head) && e.head.trim()) bump(headPair, norm(k.head), norm(e.head));
      if (HANGUL.test(k.body) && k.body.trim() && !HANGUL.test(e.body) && e.body.trim()) {
        bump(bodyPair, norm(k.body), norm(e.body));
        const shape = bodyShape(k.body);
        if (shape === 'SPEC_RANGE_PAREN' || shape === 'SPEC_RANGE_TRAIL') {
          /* 숫자를 가려 **문법 골격**만 남긴다 — 정형 규칙의 근거 */
          const mask = (s) => norm(s).replace(/[\d.,]+/g, 'N');
          bump(specForm, shape + ' | ' + mask(k.body), mask(e.body));
        }
      }
    }
  }
  process.stderr.write(`\rpairs ${pairs}`);
}
process.stderr.write('\n');
await c.end();

/* 다수결 — 같은 KO 에 여러 EN 이 있으면 가장 많이 쓰인 것을 정본으로 본다. */
const best = (map) => { const o = {}; for (const [k, m] of map) { const [v, n] = [...m.entries()].sort((a, b) => b[1] - a[1])[0]; o[k] = { en: v, n, variants: m.size }; } return o; };
const heads = best(headPair), bodies = best(bodyPair), forms = best(specForm);

const out = {
  wo: WO, harvestedAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  assetPairs: asset.size, koEnDocPairs: pairs, alignedDocs: aligned, misalignedDocs: misaligned,
  headTerms: Object.keys(heads).length, bodyPhrases: Object.keys(bodies).length, specForms: Object.keys(forms).length,
  ambiguousHeads: Object.values(heads).filter((h) => h.variants > 1).length,
  specFormTop: Object.entries(forms).sort((a, b) => b[1].n - a[1].n).slice(0, 12).map(([ko, v]) => ({ n: v.n, ko, en: v.en, variants: v.variants })),
  headTop: Object.entries(heads).sort((a, b) => b[1].n - a[1].n).slice(0, 40).map(([ko, v]) => ({ n: v.n, ko, en: v.en, variants: v.variants })),
};
fs.writeFileSync(`${D}/hff-en-c01-glossary-v1.json`, JSON.stringify(out, null, 1));
fs.writeFileSync(`${CACHE}/hff-en-c01-glossary.json`, JSON.stringify({ asset: Object.fromEntries(asset), heads, bodies, forms }));
console.log(JSON.stringify(out, null, 1));
