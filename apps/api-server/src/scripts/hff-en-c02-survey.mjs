/**
 * WO-O4O-HFF-EN-C02-IN-STORE-EXPERT-GUIDANCE-25404-FULL-REPAIR-V1 §3·§4
 *
 * `Speak to our in-store expert` 섹션의 한글 잔존 전수 재현 + **동일 의미 확인**.
 * DB read-only. write 0.
 *
 * §10 은 "서로 다른 의미의 문장이 한 cluster 에 섞이면 중지"를 요구한다.
 * 따라서 섹션 안의 잔존 문장을 **전부 수집해 고유 문장별로 세어** 동일 의미인지 확인한다.
 *
 * 산출: data/hff-en-c02-survey-v1.json · .cache/hff-en-c02-targets.json
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const CACHE = process.env.JA_CACHE ?? 'apps/api-server/src/scripts/.cache';
const WO = 'WO-O4O-HFF-EN-C02-IN-STORE-EXPERT-GUIDANCE-25404-FULL-REPAIR-V1';
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const HANGUL = /[가-힣]/;
/** 전문가 안내 섹션 — EN 제목 기준. 제목 자체는 이미 영어다. */
const SEC = /<h2[^>]*>\s*Speak to our in-store expert\s*<\/h2>([\s\S]*?)(?=<h2[^>]*>|$)/;

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5551', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 1800000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }
const BASE = `deleted_at IS NULL AND source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical'`;

const totals = (await c.query(`
  SELECT count(*) FILTER (WHERE coalesce(language,'ko')='ko') ko,
         count(*) FILTER (WHERE language='en') en,
         count(*) FILTER (WHERE language='ja') ja,
         count(*) FILTER (WHERE language='zh') zh
    FROM shared_product_descriptions WHERE ${BASE}`)).rows[0];
const dup = (await c.query(`
  SELECT count(*)::int n FROM (SELECT master_id FROM shared_product_descriptions
    WHERE ${BASE} AND language='en' GROUP BY master_id HAVING count(*)>1) a`)).rows[0].n;

const rows = (await c.query(`
  SELECT id, master_id, content FROM shared_product_descriptions
   WHERE ${BASE} AND language='en' ORDER BY master_id`)).rows;
await c.end();

/* 섹션 안의 슬롯(li / sd-item) 중 한글이 있는 것만 수집 */
/* 전문가 안내문은 `<div class="sd-cta"><p>…</p></div>` 에 들어간다(실측). li/sd-item 이 아니다. */
const SLOT = /<div class="sd-cta"[^>]*>\s*<p>([\s\S]*?)<\/p>|<li[^>]*>([\s\S]*?)<\/li>|<div class="sd-item"[^>]*>([\s\S]*?)<\/div>/g;
const phraseAgg = new Map();
const targets = [];
let sectionMissing = 0, noResidue = 0, inlineTag = 0;
for (const r of rows) {
  const m = SEC.exec(r.content);
  if (!m) { sectionMissing++; continue; }
  const secStart = m.index + m[0].indexOf(m[1]);
  const hits = [];
  for (const s of m[1].matchAll(SLOT)) {
    const inner = s[1] ?? s[2] ?? s[3] ?? '';
    if (!HANGUL.test(inner)) continue;
    const start = secStart + s.index + s[0].indexOf(inner);
    hits.push({ inner, start, end: start + inner.length, hasTag: /</.test(inner) });
  }
  if (!hits.length) { noResidue++; continue; }
  for (const h of hits) {
    const key = h.inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    phraseAgg.set(key, (phraseAgg.get(key) ?? 0) + 1);
    if (h.hasTag) inlineTag++;
  }
  targets.push({ enId: r.id, productMasterId: r.master_id, enHash: sha(r.content), hits });
}

const phrases = [...phraseAgg.entries()].map(([ko, n]) => ({ docs: n, ko })).sort((a, b) => b.docs - a.docs);
const out = {
  wo: WO, surveyedAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  totals: { ko: Number(totals.ko), en: Number(totals.en), ja: Number(totals.ja), zh: Number(totals.zh) },
  enCanonicalDup: dup,
  enScanned: rows.length,
  sectionMissing, noResidue,
  targetDocuments: targets.length,
  productMasterDup: targets.length - new Set(targets.map((t) => t.productMasterId)).size,
  distinctResiduePhrases: phrases.length,
  slotsWithInlineTag: inlineTag,
  phrases: phrases.slice(0, 40),
};
fs.writeFileSync(`${D}/hff-en-c02-survey-v1.json`, JSON.stringify(out, null, 1));
fs.writeFileSync(`${CACHE}/hff-en-c02-targets.json`, JSON.stringify(targets));
console.log(JSON.stringify({ ...out, phrases: phrases.slice(0, 15) }, null, 1));
