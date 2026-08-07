/**
 * WO-O4O-EASY-DRUG-EN-FULL-RETRANSLATION-LIVE-APPLY-AND-PUBLIC-VERIFY-V1
 * 단계 6~9: LIVE census → apply classification → plan ledger 잠금.  **DB write 0** (read-only 트랜잭션).
 *
 * 번역을 만들지 않는다. en-units.jsonl(검증 완료 원장)을 KO HTML 템플릿에 얹어 EN 저장본을
 * 결정적으로 직렬화하고, 그 해시와 현재 DB 상태를 대조해 master 별 action 을 확정할 뿐이다.
 *
 * 산출: results/live-apply-plan.jsonl (master 당 1행) · results/live-census-result.json
 * 사용: run-with-db.ps1 -Script live-census-and-plan.mjs -ScriptArgs @('--port','15461')
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { StringDecoder } from 'node:string_decoder';
import pg from 'pg';
import { RESULTS, EN_UNITS_PATH } from './tm-lib.mjs';
import { renderEnHtml, verifyRoundTrip } from './en-render.mjs';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const PORT = parseInt(arg('--port', '15461'), 10);
const CHUNK = parseInt(arg('--chunk', '300'), 10);
const OUT = arg('--out', path.join(RESULTS, 'live-apply-plan.jsonl'));
const md5 = (s) => crypto.createHash('md5').update(s, 'utf8').digest('hex');

/* ── 1. production artifact 적재 ─────────────────────────────── */
/** 100MB 급 JSONL 을 한 줄씩 흘린다. tm-lib.streamKoUnits 와 동일하게 StringDecoder 필수
 *  (청크 경계에서 한글 3바이트가 잘려 U+FFFD 가 되는 가짜 손상을 막는다). */
function* streamJsonl(file) {
  const fd = fs.openSync(file, 'r');
  const decoder = new StringDecoder('utf8');
  try {
    const buf = Buffer.alloc(1 << 20);
    let tail = '';
    for (;;) {
      const n = fs.readSync(fd, buf, 0, buf.length, null);
      if (n === 0) break;
      const chunk = tail + decoder.write(buf.subarray(0, n));
      const lines = chunk.split('\n');
      tail = lines.pop() ?? '';
      for (const l of lines) if (l.trim()) yield JSON.parse(l);
    }
    tail += decoder.end();
    if (tail.trim()) yield JSON.parse(tail);
  } finally { fs.closeSync(fd); }
}

// 기준선은 en-units.jsonl 하나다. 각 레코드가 생산 시점 KO 해시(koHash)를 함께 들고 있어
// ko-units.jsonl 없이도 KO drift 판정이 가능하다(ko-units 는 DB 에서 재생성 가능한 파생물).
const prod = new Map();   // masterId → { itemSeq, koHash, segments }
for (const u of streamJsonl(EN_UNITS_PATH)) {
  if (prod.has(u.masterId)) throw new Error(`en-units 중복 master ${u.masterId}`);
  prod.set(u.masterId, { itemSeq: u.itemSeq, koHash: u.koHash, segments: u.segments });
}

/* ── 2. DB read-only ─────────────────────────────────────────── */
const client = new pg.Client({ host: '127.0.0.1', port: PORT, user: process.env.PGUSER, password: process.env.PGPASSWORD, database: 'o4o_platform' });
await client.connect();
await client.query('SET default_transaction_read_only = on');

const SQL_KO = `
  SELECT master_id::text "masterId", id::text "descId", md5(content) "md5", content, source_type "sourceType", status
  FROM shared_product_descriptions
  WHERE master_id = ANY($1::uuid[])
    AND description_type = 'STORE' AND COALESCE(language,'ko') = 'ko'
    AND status = 'canonical' AND deleted_at IS NULL`;
const SQL_EN = `
  SELECT master_id::text "masterId", id::text "descId", status, md5(content) "md5",
         source_type "sourceType", source_ref_id::text "sourceRefId", created_at "createdAt"
  FROM shared_product_descriptions
  WHERE master_id = ANY($1::uuid[])
    AND description_type = 'STORE' AND language = 'en' AND deleted_at IS NULL
  ORDER BY created_at, id`;

const LIMIT = parseInt(arg('--limit', '0'), 10);
const allIds = [...prod.keys()].sort();
const ids = LIMIT > 0 ? allIds.slice(0, LIMIT) : allIds;
const plan = [];
const tally = {};
const sourceTypeTally = { koCanonical: {}, enHidden: {}, enCanonical: {} };
const blockSamples = [];
const charNote = { gt: 0, rawAmp: 0, gtSamples: [], ampSamples: [] };
let renderFail = 0;

for (let i = 0; i < ids.length; i += CHUNK) {
  const slice = ids.slice(i, i + CHUNK);
  const [koRows, enRows] = await Promise.all([
    client.query(SQL_KO, [slice]).then((r) => r.rows),
    client.query(SQL_EN, [slice]).then((r) => r.rows),
  ]);
  const koBy = new Map(koRows.map((r) => [r.masterId, r]));
  const enBy = new Map();
  for (const r of enRows) { if (!enBy.has(r.masterId)) enBy.set(r.masterId, []); enBy.get(r.masterId).push(r); }

  for (const masterId of slice) {
    const p = prod.get(masterId);
    const row = { masterId, itemSeq: p.itemSeq, expectedKoHash: p.koHash };
    const k = koBy.get(masterId);

    if (!k) { row.action = 'BLOCK_KO_CANONICAL_MISSING'; push(row); continue; }
    row.koDescriptionId = k.descId;
    row.liveKoHash = k.md5;
    sourceTypeTally.koCanonical[k.sourceType] = (sourceTypeTally.koCanonical[k.sourceType] ?? 0) + 1;
    if (k.md5 !== p.koHash) { row.action = 'BLOCK_KO_HASH_DRIFT'; push(row); continue; }

    // EN 저장본 직렬화 + 왕복 검증
    let enHtml;
    try {
      const r = renderEnHtml(k.content, p.segments);
      const rt = verifyRoundTrip(r.html, r.nodeTexts);
      if (!rt.ok) throw new Error(rt.reason);
      enHtml = r.html;
    } catch (e) {
      renderFail++;
      row.action = 'BLOCK_PRODUCTION_ARTIFACT_MISMATCH';
      row.renderError = String(e.message || e);
      push(row); continue;
    }
    row.productionEnHash = md5(enHtml);
    row.productionEnLength = enHtml.length;
    // HTML 위생 관찰용(차단 아님). 태그가 아니라 **번역문 자체**를 본다.
    // `>` 는 수식 표기(`pH > 7.44`)로 실제 등장하며 HTML 텍스트에서 유효, `&` 는 엔티티 오해 소지가 있어 집계만.
    if (p.segments.some((s) => s.text.includes('>'))) { charNote.gt++; if (charNote.gtSamples.length < 10) charNote.gtSamples.push(masterId); }
    if (p.segments.some((s) => /&(?!(?:nbsp|amp|lt|gt|quot|#\d+);)/.test(s.text))) { charNote.rawAmp++; if (charNote.ampSamples.length < 10) charNote.ampSamples.push(masterId); }

    const rows = enBy.get(masterId) ?? [];
    const canonical = rows.filter((r) => r.status === 'canonical');
    const hidden = rows.filter((r) => r.status === 'hidden');
    const deprecated = rows.filter((r) => r.status === 'deprecated');
    const other = rows.filter((r) => !['canonical', 'hidden', 'deprecated'].includes(r.status));
    row.existingEnCounts = { canonical: canonical.length, hidden: hidden.length, deprecated: deprecated.length, other: other.length };

    if (other.length) { row.action = 'BLOCK_UNEXPECTED_EN_STATUS'; row.otherStatuses = [...new Set(other.map((r) => r.status))]; push(row); continue; }
    if (canonical.length > 1) { row.action = 'BLOCK_MULTIPLE_CANONICAL_EN'; push(row); continue; }
    if (canonical.length === 1) {
      const c = canonical[0];
      sourceTypeTally.enCanonical[c.sourceType] = (sourceTypeTally.enCanonical[c.sourceType] ?? 0) + 1;
      row.existingEnId = c.descId; row.existingStatus = 'canonical'; row.existingEnHash = c.md5;
      row.action = c.md5 === row.productionEnHash ? 'ALREADY_CURRENT_EN' : 'BLOCK_EXISTING_CANONICAL_EN';
      row.expectedFinalStatus = 'canonical';
      push(row); continue;
    }
    if (hidden.length > 1) { row.action = 'BLOCK_MULTIPLE_HIDDEN_EN'; row.hiddenIds = hidden.map((r) => r.descId); push(row); continue; }
    if (hidden.length === 1) {
      const h = hidden[0];
      sourceTypeTally.enHidden[h.sourceType] = (sourceTypeTally.enHidden[h.sourceType] ?? 0) + 1;
      row.existingEnId = h.descId; row.existingStatus = 'hidden'; row.existingEnHash = h.md5;
      row.existingSourceType = h.sourceType; row.existingSourceRefId = h.sourceRefId;
      row.action = 'UPDATE_SINGLE_HIDDEN_EN'; row.expectedFinalStatus = 'canonical';
      push(row); continue;
    }
    row.existingEnId = null; row.existingStatus = null;
    row.action = 'CREATE_NEW_EN'; row.expectedFinalStatus = 'canonical';
    push(row);
  }
  process.stderr.write(`census ${Math.min(i + CHUNK, ids.length)}/${ids.length}\n`);
}
await client.end();

function push(row) {
  plan.push(row);
  tally[row.action] = (tally[row.action] ?? 0) + 1;
  if (row.action.startsWith('BLOCK') && blockSamples.length < 20) blockSamples.push(row);
}

/* ── 3. plan ledger + digest ─────────────────────────────────── */
plan.sort((a, b) => (a.masterId < b.masterId ? -1 : 1));
const lines = plan.map((r) => JSON.stringify({
  masterId: r.masterId, itemSeq: r.itemSeq, koDescriptionId: r.koDescriptionId ?? null,
  expectedKoHash: r.expectedKoHash, productionEnHash: r.productionEnHash ?? null,
  existingEnId: r.existingEnId ?? null, existingStatus: r.existingStatus ?? null,
  existingEnHash: r.existingEnHash ?? null, action: r.action,
  expectedFinalStatus: r.expectedFinalStatus ?? null,
}));
const digest = crypto.createHash('sha256').update(lines.join('\n'), 'utf8').digest('hex');
fs.writeFileSync(OUT, lines.join('\n') + '\n', 'utf8');

const total = plan.length;
const out = {
  wo: 'WO-O4O-EASY-DRUG-EN-FULL-RETRANSLATION-LIVE-APPLY-AND-PUBLIC-VERIFY-V1',
  step: 'live-census-and-plan',
  population: ids.length,
  classified: total,
  unclassified: ids.length - total,
  tally,
  planDigest: digest,
  planFile: path.relative(process.cwd(), OUT).replace(/\\/g, '/'),
  sourceTypeTally,
  renderFail,
  charNote,
  blockSamples,
  dbWrites: 0,
};
fs.writeFileSync(path.join(RESULTS, 'live-census-result.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ ...out, blockSamples: blockSamples.slice(0, 5) }, null, 2));
