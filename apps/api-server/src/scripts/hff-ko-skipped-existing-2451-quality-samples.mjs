/**
 * WO-O4O-HFF-KO-SKIPPED-EXISTING-2451-FUNCTION-CANONICAL-BACKFILL-V1  §18·§20
 *
 * 변경 범위 검증 + 표본 수기 검증.
 *   - SAFE 대상은 16건뿐이므로 **전수**를 before/after 전문과 함께 기록한다.
 *   - §6 전후 동일 항목(제품명·섭취방법·참고사항·기준규격·footer·기능성 외 텍스트·
 *     renderer family·class 구조·카드 순서·source metadata) 을 항목별로 판정한다.
 *   - NO_CHANGE / HUMAN_REVIEW / UNSUPPORTED 대조 표본을 합쳐 80건까지 기록한다.
 * read-only · DB write 0.
 *
 * 산출물
 *   - data/hff-ko-skipped-existing-2451-quality-samples-v1.json
 *   - data/hff-ko-skipped-existing-2451-render-preview-v1.html  (§20 렌더 감사 입력)
 */
import pg from 'pg';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { applyPatch, verifyPatch, htmlText, cmpText } from './hff-ko-function-family-preserving-patch.mjs';

const DATA = 'apps/api-server/src/scripts/data';
const WO = 'WO-O4O-HFF-KO-SKIPPED-EXISTING-2451-FUNCTION-CANONICAL-BACKFILL-V1';
const sha = (s) => crypto.createHash('sha256').update(String(s ?? ''), 'utf8').digest('hex');
const J = (f) => JSON.parse(fs.readFileSync(`${DATA}/${f}`, 'utf8'));

const diff = J('hff-ko-skipped-existing-2451-function-diff-v1.json');
const safeRows = diff.items.filter((r) => r.applyStatus === 'SAFE_APPLY');

/* §6 전후 동일해야 하는 영역 추출기 */
const h2Seq = (h) => [...h.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => htmlText(m[1]));
const sectionOf = (h, re) => {
  const list = h2Seq(h);
  const i = list.findIndex((x) => re.test(x));
  if (i < 0) return null;
  const ms = [...h.matchAll(/<h2\b[^>]*>[\s\S]*?<\/h2>/g)];
  const start = ms[i].index + ms[i][0].length;
  const end = i + 1 < ms.length ? ms[i + 1].index : h.length;
  return h.slice(start, end);
};
const productName = (h) => (h.match(/<h1>([\s\S]*?)<\/h1>/) ?? [])[1] ?? null;
const footer = (h) => (h.match(/<div class="sd-foot">[\s\S]*?<\/div>/) ?? [])[0] ?? null;
const classSet = (h) => [...new Set([...h.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)))].sort();
const cardSeq = (h) => [...h.matchAll(/<div class="(sd-[^"]*)"/g)].map((m) => m[1]);
/** 기능성 섹션을 제거한 나머지 전문 — 기능성 외 영역 byte 동일 증명용. */
const nonFunctionalBody = (h) => {
  const ms = [...h.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)];
  let out = h; const cuts = [];
  ms.forEach((m, i) => {
    if (!/기능성|영양기능/.test(htmlText(m[1]))) return;
    const start = m.index;
    const end = i + 1 < ms.length ? ms[i + 1].index : h.length;
    cuts.push([start, end]);
  });
  for (const [s, e] of cuts.reverse()) out = out.slice(0, s) + out.slice(e);
  return out;
};

const client = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', ssl: false, statement_timeout: 600000 });
await client.connect();
await client.query('SET default_transaction_read_only = on');

const ids = safeRows.map((r) => r.canonicalId);
const cur = new Map((await client.query(
  `SELECT id, content, source_type, source_ref_id, master_id, description_type, language, status, updated_at
   FROM shared_product_descriptions WHERE id = ANY($1)`, [ids])).rows.map((x) => [x.id, x]));

/* 대조 표본 — NO_CHANGE / HUMAN_REVIEW / UNSUPPORTED 각 계열에서 균등 추출 */
const takeEvery = (arr, n) => (arr.length <= n ? arr : Array.from({ length: n }, (_, i) => arr[Math.floor((i * arr.length) / n)]));
const controls = [
  ...takeEvery(diff.items.filter((r) => r.applyStatus === 'NO_CHANGE'), 40),
  ...takeEvery(diff.items.filter((r) => r.applyStatus === 'HUMAN_REVIEW'), 16),
  ...takeEvery(diff.items.filter((r) => r.applyStatus === 'UNSUPPORTED_STRUCTURE'), 8),
];
const ctrlCur = new Map((await client.query(
  'SELECT id, content, source_type, source_ref_id FROM shared_product_descriptions WHERE id = ANY($1)',
  [controls.map((r) => r.canonicalId)])).rows.map((x) => [x.id, x]));
await client.end();

/* ── SAFE 전수 검증 ───────────────────────────────────────────────────── */
const samples = [];
const violations = [];
for (const r of safeRows) {
  const row = cur.get(r.canonicalId);
  const before = row.content;
  const after = applyPatch({ content: before, plan: { ...r.plan, inserts: r.plan.inserts } });
  const patchFails = verifyPatch({ before, after, plan: r.plan });

  const invariants = {
    productName: productName(before) === productName(after),
    intakeSection: sectionOf(before, /섭취/) === sectionOf(after, /섭취/),
    intakeHintSection: sectionOf(before, /참고사항|주의/) === sectionOf(after, /참고사항|주의/),
    specSection: sectionOf(before, /기준|규격|표시 기준/) === sectionOf(after, /기준|규격|표시 기준/),
    footer: footer(before) === footer(after),
    nonFunctionalBodyByteEqual: nonFunctionalBody(before) === nonFunctionalBody(after),
    h2Sequence: h2Seq(before).join('|') === h2Seq(after).join('|'),
    classSet: classSet(before).join(',') === classSet(after).join(','),
    cardOrder: cardSeq(before).join('|') === cardSeq(after).join('|'),
    // 삽입은 class 없는 <li> 뿐이므로 family 마커 출현 횟수는 전후 동일해야 한다.
    rendererFamilyMarks: ['sd-func', 'sd-why', 'sd-fn', 'sd-core', 'sd-item', 'sd-tag']
      .every((c) => before.split(`class="${c}`).length === after.split(`class="${c}`).length),
    sourceTypeUnchanged: row.source_type === 'o4o_hff_generated',
    sourceRefIdEqualsCandidate: row.source_ref_id === r.candidateId,
    masterIdEqualsTarget: row.master_id === r.productMasterId,
    descriptionTypeStore: row.description_type === 'STORE',
    languageKo: (row.language ?? 'ko') === 'ko',
    statusCanonical: row.status === 'canonical',
    lengthGrewOnly: after.length > before.length,
    liDeltaEqualsInserts: ([...after.matchAll(/<li>/g)].length - [...before.matchAll(/<li>/g)].length) === r.plan.inserts.length,
    insertedTextsOfficialVerbatim: r.plan.inserts.every((x) => after.includes(`<li>${x.text}</li>`) || after.includes(x.text)),
    noEnglishOnlyInsert: r.plan.inserts.every((x) => /[가-힣]/.test(x.text)),
  };
  const failed = Object.entries(invariants).filter(([, v]) => v !== true).map(([k]) => k);
  if (patchFails.length || failed.length) violations.push({ candidateId: r.candidateId, patchFails, failedInvariants: failed });

  samples.push({
    kind: 'SAFE_APPLY', candidateId: r.candidateId, canonicalId: r.canonicalId,
    productMasterId: r.productMasterId, statementNo: r.statementNo, productName: r.productName,
    family: r.family, sectionH2: r.plan.sectionH2, mode: r.plan.mode,
    beforeContentHash: sha(before), afterContentHash: sha(after),
    beforeLength: before.length, afterLength: after.length, lengthDelta: after.length - before.length,
    inserts: r.plan.inserts.map((x) => ({ ingredient: x.ingredient, text: x.text, html: x.html })),
    officialClauseCount: r.officialClauseCount,
    functionalSectionBefore: sectionOf(before, /기능성|영양기능/),
    functionalSectionAfter: sectionOf(after, /기능성|영양기능/),
    invariants, patchFails,
    manualVerdict: patchFails.length === 0 && failed.length === 0 ? 'PASS' : 'FAIL',
    beforeContent: before, afterContent: after,
  });
}

/* ── 대조 표본 (변경 없음 증명) ───────────────────────────────────────── */
for (const r of controls) {
  const row = ctrlCur.get(r.canonicalId);
  samples.push({
    kind: r.applyStatus, candidateId: r.candidateId, canonicalId: r.canonicalId,
    productName: r.productName, family: r.family,
    classification: r.classification, reason: r.reason,
    contentHash: sha(row?.content), contentLength: row?.content?.length ?? null,
    sourceTypeUnchanged: row?.source_type === 'o4o_hff_generated',
    officialClauseCount: r.officialClauseCount,
    missingClauseCount: (r.missingClauses ?? []).length,
    functionalSectionExcerpt: row ? (sectionOf(row.content, /기능성|영양기능/) ?? '(none)').slice(0, 600) : null,
    writePlanned: false,
    manualVerdict: 'NO_WRITE',
  });
}

/* ── §20 렌더 감사 입력 HTML ──────────────────────────────────────────── */
const previewCards = samples.filter((s) => s.kind === 'SAFE_APPLY').map((s, i) => `
<section data-sample="${i}" data-candidate="${s.candidateId}">
  <h3 class="dbg">#${i + 1} ${s.productName} · ${s.family} · ${s.mode} · +${s.lengthDelta}B</h3>
  <div class="store-desc-content" data-role="after">${s.afterContent}</div>
</section>`).join('\n');
fs.writeFileSync(`${DATA}/hff-ko-skipped-existing-2451-render-preview-v1.html`,
  `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${WO} render preview (${samples.filter((s) => s.kind === 'SAFE_APPLY').length} SAFE targets)</title>
<style>
 body{margin:0;padding:12px;font-family:system-ui,'Malgun Gothic',sans-serif;background:#f6f7f9}
 .dbg{font:600 13px/1.4 monospace;color:#555;margin:18px 0 6px}
 .store-desc-content{max-width:100%;overflow-wrap:anywhere;background:#fff}
 .store-desc-content h1{font-size:20px;margin:.4em 0}
 .store-desc-content h2{font-size:16px;margin:1em 0 .4em}
 .store-desc-content ul{padding-left:1.2em;margin:.3em 0}
 .store-desc-content .sd-card{border:1px solid #e3e5e8;border-radius:10px;padding:14px}
 .store-desc-content .sd-badge{display:inline-block;border:1px solid #cfd4da;border-radius:999px;padding:2px 8px;font-size:12px;margin:0 4px 4px 0}
 .store-desc-content .sd-foot{margin-top:12px;padding-top:10px;border-top:1px solid #e3e5e8;font-size:13px;color:#555}
</style></head><body>
<h1 class="dbg">${WO} · §20 render audit input · generated ${new Date().toISOString()}</h1>
${previewCards}
</body></html>`, 'utf8');

const verdict = violations.length === 0 ? 'PASS' : 'STOP';
fs.writeFileSync(`${DATA}/hff-ko-skipped-existing-2451-quality-samples-v1.json`, JSON.stringify({
  workOrder: WO,
  contract: '§18·§20 — SAFE 전수 + 대조 표본 수기 검증. §6 전후 동일 항목 불변식 판정 포함. DB write 0.',
  generatedAt: new Date().toISOString(),
  safeTotal: safeRows.length, safeVerified: safeRows.length,
  controlSamples: controls.length, sampleTotal: samples.length,
  invariantViolations: violations, verdict,
  invariantKeys: Object.keys(samples[0]?.invariants ?? {}),
  samples,
}, null, 1));

console.log(JSON.stringify({
  safeVerified: safeRows.length, controls: controls.length, total: samples.length,
  violations: violations.length, verdict,
  perTarget: samples.filter((s) => s.kind === 'SAFE_APPLY').map((s) => ({ p: s.productName, d: s.lengthDelta, v: s.manualVerdict })),
}, null, 1));
if (verdict !== 'PASS') process.exit(2);
