/** Phase 4-B — EN 기존 canonical 자산 확인 (전문가 안내 문구 / sd-who 변종 63 / 푸터 형태). read-only. */
import fs from 'node:fs';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const EN = `source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL AND language='en'`;
const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 900000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }

const rows = (await c.query(`SELECT id, content FROM shared_product_descriptions WHERE ${EN}`)).rows;
await c.end();

const FOOT_RE = /<div class="sd-foot"><b>([^<]*)<\/b>([\s\S]*?)<\/div><\/div>$/;
const EXPERT_EN = /(pharmacist|in-store expert|store expert)/i;
const h2sOf = (s) => [...String(s ?? '').matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').trim());

const footLabelTally = {}, expertTailTally = {}, whoOddH2 = {};
let footMiss = 0;
for (const r of rows) {
  const m = r.content.match(FOOT_RE);
  if (!m) { footMiss++; continue; }
  footLabelTally[m[1].trim()] = (footLabelTally[m[1].trim()] ?? 0) + 1;
  if (EXPERT_EN.test(r.content)) {
    // 전문가 안내가 들어간 마지막 절만 추출
    const tail = m[2].split(/(?=·)/).map((x) => x.trim()).filter(Boolean).filter((x) => EXPERT_EN.test(x));
    for (const t of tail) expertTailTally[t] = (expertTailTally[t] ?? 0) + 1;
  }
  const wh = r.content.match(/<h2>([^<]*)<\/h2><ul class="sd-who">/);
  const head = wh ? wh[1].trim() : null;
  if (head && !/who|for whom/i.test(head)) whoOddH2[head] = (whoOddH2[head] ?? 0) + 1;
}
const out = {
  ranAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  enTotal: rows.length, footRegexMiss: footMiss,
  footLabelTally: Object.fromEntries(Object.entries(footLabelTally).sort((a, b) => b[1] - a[1]).slice(0, 10)),
  expertClauseTally: Object.fromEntries(Object.entries(expertTailTally).sort((a, b) => b[1] - a[1]).slice(0, 10)),
  sdWhoNonStandardHeading: whoOddH2,
};
fs.writeFileSync(`${D}/hff-en-parity-probe-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 2));
