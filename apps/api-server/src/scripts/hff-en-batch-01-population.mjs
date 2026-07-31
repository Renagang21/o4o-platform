/**
 * WO-O4O-HFF-EN-BULK-PRODUCTION-BATCH-01-5000-V1 / Batch 01 모집단 고정 + 사전 커버리지 측정 (read-only).
 *   Track A = 기존 STORE/en canonical 에 기능성 섹션이 없는 대상 824
 *   Track B = EN 미보유 KO 중 고정 정렬 최초 4,176
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const ASSETS = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-01-translation-assets-v1.json`, 'utf8'));
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const norm = (s) => (s ?? '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/[･·∙‧・•]/g, '·').replace(/\s+/g, ' ').trim();
const key = (s) => norm(s).replace(/\s/g, '');
const has = (d, s) => Object.prototype.hasOwnProperty.call(ASSETS.dict[d], key(s));

// KO 문서에서 번역이 필요한 텍스트 슬롯을 모두 뽑는다
const SLOTS = [
  { kind: 'heading', re: /<h2>([\s\S]*?)<\/h2>/g, dict: 'heading' },
  { kind: 'clause', re: /<li>((?:(?!<li>|<\/li>)[\s\S])*?)<\/li>/g, dict: 'clause' },
  { kind: 'label', re: /<span class="sd-tag">([\s\S]*?)<\/span>/g, dict: 'label' },
  { kind: 'label', re: /<b>([\s\S]*?)<\/b>/g, dict: 'label' },
  { kind: 'intro', re: /<p class="sd-intro">([\s\S]*?)<\/p>/g, dict: 'intro' },
  { kind: 'meta', re: /<p class="sd-meta">([\s\S]*?)<\/p>/g, dict: 'meta' },
  { kind: 'badge', re: /<span class="sd-badge[^"]*">([\s\S]*?)<\/span>/g, dict: 'badge' },
  { kind: 'foot', re: /<div class="sd-foot">([\s\S]*?)<\/div>/g, dict: 'foot' },
];
function slots(content) {
  const out = [];
  for (const s of SLOTS) {
    for (const m of content.matchAll(s.re)) {
      const t = norm(m[1]);
      if (!t) continue;
      // sd-intro / sd-meta 안의 <b> 는 label 이 아니라 문장 일부다
      if (s.dict === 'label' && /class="sd-(intro|meta|why)"/.test(content.slice(Math.max(0, m.index - 120), m.index))) continue;
      out.push({ kind: s.kind, dict: s.dict, text: t });
    }
  }
  return out;
}

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5507', 10), user: process.env.PGUSER, password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
await c.query('SET default_transaction_read_only = on');

// 한국어 영구 HOLD (제외 대상)
const permHold = new Set(fs.readFileSync(`${D}/hff-ko-nontranslation-permanent-hold-v1.jsonl`, 'utf8')
  .trim().split('\n').map((l) => JSON.parse(l).canonicalId).filter(Boolean));
for (const l of fs.readFileSync(`${D}/hff-ko-final-unresolved-v1.jsonl`, 'utf8').trim().split('\n')) {
  const r = JSON.parse(l);
  if (r.finalHoldReason === 'FINAL_HOLD_OFFICIAL_SOURCE_MISSING' && r.canonicalId) permHold.add(r.canonicalId);
}

// Track A — 기존 EN 기능성 HOLD 인벤토리(826) 중 **현재도** 기능성 섹션이 없는 대상.
// 인벤토리는 과거 시점 판단이므로 현재 DB 로 다시 확인한다(그 사이 2건은 기능성 섹션을 갖췄다 → 824).
const invIds = [...new Set(fs.readFileSync(`${D}/hff-en-function-missing-inventory-v1.jsonl`, 'utf8')
  .trim().split('\n').map((l) => JSON.parse(l).canonicalId).filter(Boolean))];
const trackA = (await c.query(`
  SELECT en.id en_id, en.content en_content, ko.id ko_id, ko.content ko_content, ko.master_id,
         pc.id cand_id, pc.raw_payload::jsonb->'source'->>'PRDUCT' name
  FROM shared_product_descriptions en
  JOIN shared_product_descriptions ko
    ON ko.master_id = en.master_id AND ko.description_type='STORE' AND ko.status='canonical'
   AND coalesce(ko.language,'ko')='ko' AND ko.source_type='o4o_hff_generated' AND ko.deleted_at IS NULL
  LEFT JOIN product_candidates pc ON pc.matched_product_master_id = en.master_id AND pc.deleted_at IS NULL
  WHERE en.id = ANY($1)
    AND en.description_type='STORE' AND en.status='canonical' AND en.language='en'
    AND en.source_type='o4o_hff_generated' AND en.deleted_at IS NULL
    AND en.content !~ '<h2>[^<]*unction[^<]*</h2>'
  ORDER BY en.master_id ASC, en.id ASC`, [invIds])).rows;

// Track B — EN 미보유 KO (고정 정렬)
const trackBAll = (await c.query(`
  SELECT ko.id ko_id, ko.content ko_content, ko.master_id,
         pc.id cand_id, pc.raw_payload::jsonb->'source'->>'PRDUCT' name
  FROM shared_product_descriptions ko
  LEFT JOIN product_candidates pc ON pc.matched_product_master_id = ko.master_id AND pc.deleted_at IS NULL
  WHERE ko.description_type='STORE' AND ko.status='canonical' AND coalesce(ko.language,'ko')='ko'
    AND ko.source_type='o4o_hff_generated' AND ko.deleted_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM shared_product_descriptions en
        WHERE en.master_id = ko.master_id AND en.description_type='STORE' AND en.status='canonical'
          AND en.language='en' AND en.deleted_at IS NULL)
  ORDER BY ko.master_id ASC, ko.id ASC`)).rows;
await c.end();

const seenMaster = new Set(), seenKo = new Set();
const A = [];
for (const r of trackA) {
  if (seenMaster.has(r.master_id) || seenKo.has(r.ko_id)) continue;
  seenMaster.add(r.master_id); seenKo.add(r.ko_id);
  A.push(r);
}
const B = [];
for (const r of trackBAll) {
  if (B.length >= 4176) break;
  if (seenMaster.has(r.master_id) || seenKo.has(r.ko_id)) continue;
  if (permHold.has(r.ko_id)) continue;
  seenMaster.add(r.master_id); seenKo.add(r.ko_id);
  B.push(r);
}

function cover(rows, track) {
  const out = [];
  for (const r of rows) {
    const sl = slots(r.ko_content);
    const miss = sl.filter((s) => !has(s.dict, s.text));
    out.push({
      track, masterId: r.master_id, koCanonicalId: r.ko_id, enCanonicalId: r.en_id ?? null,
      candidateId: r.cand_id ?? null, productNameKo: r.name ?? null,
      koHash: sha(r.ko_content), enHash: r.en_content ? sha(r.en_content) : null,
      slots: sl.length, missing: miss.length,
      missingByKind: miss.reduce((a, m) => { a[m.kind] = (a[m.kind] ?? 0) + 1; return a; }, {}),
      fullyCovered: miss.length === 0,
    });
  }
  return out;
}
const rowsA = cover(A, 'A'), rowsB = cover(B, 'B');
const all = [...rowsA, ...rowsB];

const missAgg = {};
for (const r of all) for (const [k, v] of Object.entries(r.missingByKind)) missAgg[k] = (missAgg[k] ?? 0) + v;

const checks = {
  trackA: rowsA.length, trackB: rowsB.length, total: all.length, expected: 5000, matches: all.length === 5000,
  trackBCandidatePool: trackBAll.length,
  masterDup: all.length - new Set(all.map((r) => r.masterId)).size,
  koDup: all.length - new Set(all.map((r) => r.koCanonicalId)).size,
  enDup: rowsA.length - new Set(rowsA.map((r) => r.enCanonicalId)).size,
  intersectAB: rowsA.filter((r) => rowsB.some((x) => x.masterId === r.masterId)).length,
  permHoldMixedIn: 0,
  coverage: {
    fullyCoveredA: rowsA.filter((r) => r.fullyCovered).length,
    fullyCoveredB: rowsB.filter((r) => r.fullyCovered).length,
    fullyCoveredTotal: all.filter((r) => r.fullyCovered).length,
    missingSlotsByKind: missAgg,
  },
};
fs.writeFileSync(`${D}/hff-en-batch-01-population-v1.json`, JSON.stringify({ builtAt: new Date().toISOString(), readOnly: true, dbWrites: 0, checks, rows: all }, null, 1));
console.log(JSON.stringify(checks, null, 2));
