/**
 * WO-O4O-HFF-MULTILINGUAL-AUTHORING-CONTRACT-PARITY-AND-RESIDUAL-CLEANUP-V1
 * Phase 4-A — EN canonical 15,498 정합 전수 감사 (read-only, DB write 0).
 *
 * 목적
 *   1. sd-who(=KO `이런 분께` 대응) 잔존 전수 구조 측정
 *   2. 기능성 h2 부재 EN 문서의 **공식 EN 근거 존재 여부** 확인
 *      (근거 = product_candidates.raw_payload.source.MAIN_FNCTN 안의 (영문) 구간 또는 영문 전용 문구)
 *   3. EN 전문가 안내 문구 대응 현황
 * KO 문구 기계 번역은 하지 않는다. 근거 없는 기능성 문구는 생성 대상에서 제외한다.
 */
import fs from 'node:fs';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const HFF = `source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL`;
const EN = `${HFF} AND language='en'`;
const h2sOf = (s) => [...String(s ?? '').matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').trim());
const nrm = (s) => (s ?? '').replace(/\r/g, '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

/** 공식 원문에서 영문 기능성 근거만 추출 — (영문) 마커 뒤 구간, 또는 한글이 전혀 없는 라인 */
function enGrounding(raw) {
  const s = nrm(raw);
  if (!s) return { has: false, why: 'NO_SOURCE' };
  const parts = [];
  const re = /\(\s*영\s*문\s*\)\s*([^[(]*(?:\([^)]*\)[^[(]*)*)/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    const t = m[1].replace(/^[\s,]+|[\s,]+$/g, '');
    if (t && /[A-Za-z]/.test(t) && !/[가-힣]/.test(t)) parts.push(t);
  }
  if (parts.length) return { has: true, kind: 'BILINGUAL_MARKER', parts };
  if (/[A-Za-z]/.test(s) && !/[가-힣]/.test(s)) return { has: true, kind: 'ENGLISH_ONLY_SOURCE', parts: [s] };
  return { has: false, why: 'KO_ONLY_SOURCE' };
}

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 900000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }

const rows = (await c.query(`
  SELECT spd.id canonical_id, spd.master_id, spd.content,
         pc.id candidate_id,
         pc.raw_payload::jsonb->'source'->>'STTEMNT_NO' stmt,
         pc.raw_payload::jsonb->'source'->>'PRDUCT' name,
         pc.raw_payload::jsonb->'source'->>'MAIN_FNCTN' fn
  FROM shared_product_descriptions spd
  LEFT JOIN product_candidates pc ON pc.matched_product_master_id = spd.master_id
    AND pc.source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND pc.deleted_at IS NULL
  WHERE ${EN.replace(/\b(source_type|description_type|status|deleted_at|language)\b/g, 'spd.$1')}
  ORDER BY spd.id`)).rows;
await c.end();

const h2Tally = {}, shapeTally = {}, groundTally = {};
const noFn = [], whoRows = [];
const WHO_RE = /<h2>[^<]*<\/h2><ul class="sd-who">[\s\S]*?<\/ul>/;
const FOOT_END_RE = /<div class="sd-foot"><b>[^<]*<\/b>([\s\S]*?)<\/div><\/div>$/;
const EXPERT_EN = /(pharmacist|in-store expert|store expert)/i;

for (const r of rows) {
  const h2 = h2sOf(r.content);
  for (const h of h2) h2Tally[h] = (h2Tally[h] ?? 0) + 1;
  const hasFn = h2.some((x) => /function/i.test(x) || /기능성/.test(x));
  const hasWho = r.content.includes('class="sd-who"');
  const whoHeading = h2.find((x) => /who|for whom/i.test(x)) ?? null;
  const expert = EXPERT_EN.test(r.content);
  const shape = [hasFn ? 'FN' : 'NO_FN', hasWho ? 'WHO' : '-', whoHeading ? 'WHO_H2' : 'NO_WHO_H2',
    WHO_RE.test(r.content) ? 'WHO_RE_OK' : 'WHO_RE_MISS', expert ? 'EXPERT_OK' : 'EXPERT_MISSING',
    FOOT_END_RE.test(r.content) ? 'FOOT_RE_OK' : 'FOOT_RE_MISS'].join('|');
  shapeTally[shape] = (shapeTally[shape] ?? 0) + 1;
  if (hasWho) whoRows.push({ canonicalId: r.canonical_id, whoHeading, whoReOk: WHO_RE.test(r.content) });
  if (!hasFn) {
    const g = enGrounding(r.fn);
    const key = g.has ? `GROUNDED:${g.kind}` : `NO_GROUND:${g.why}`;
    groundTally[key] = (groundTally[key] ?? 0) + 1;
    noFn.push({ canonicalId: r.canonical_id, candidateId: r.candidate_id, statementNo: r.stmt,
      productName: r.name, grounded: g.has, groundKind: g.kind ?? null, groundWhy: g.why ?? null,
      groundParts: (g.parts ?? []).slice(0, 4), h2 });
  }
}

const whoHeadTally = whoRows.reduce((a, x) => { a[String(x.whoHeading)] = (a[String(x.whoHeading)] ?? 0) + 1; return a; }, {});
const out = {
  ranAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  wo: 'WO-O4O-HFF-MULTILINGUAL-AUTHORING-CONTRACT-PARITY-AND-RESIDUAL-CLEANUP-V1',
  phase: '4-A — EN canonical 전수 정합 감사',
  enTotal: rows.length,
  h2Tally: Object.fromEntries(Object.entries(h2Tally).sort((a, b) => b[1] - a[1]).slice(0, 25)),
  shapeTally,
  sdWho: { total: whoRows.length, headingTally: whoHeadTally, whoRegexMatched: whoRows.filter((x) => x.whoReOk).length },
  functionMissing: { total: noFn.length, groundingTally: groundTally },
  groundedSamples: noFn.filter((x) => x.grounded).slice(0, 5),
  ungroundedSamples: noFn.filter((x) => !x.grounded).slice(0, 5),
};
fs.writeFileSync(`${D}/hff-en-parity-audit-v1.json`, JSON.stringify(out, null, 1));
fs.writeFileSync(`${D}/hff-en-function-missing-inventory-v1.jsonl`, noFn.map((x) => JSON.stringify(x)).join('\n') + (noFn.length ? '\n' : ''));
console.log(JSON.stringify(out, null, 2));
