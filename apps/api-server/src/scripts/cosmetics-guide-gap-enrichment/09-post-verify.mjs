/**
 * WO §11 — 독립 postVerify.
 *
 * 적용 스크립트를 믿지 않고 **적용 후 DB 를 다시 읽어** 대조한다.
 *   1. 계획한 건은 계획한 본문과 **정확히** 같은가
 *   2. 계획하지 않은 건은 **한 글자도 바뀌지 않았는가**
 *   3. 결손 census 를 다시 돌려 before → after 를 낸다
 *
 * 산출: post-verify.json
 */
import { join } from 'node:path';
import { OUT_DIR, readJsonl, readOut, writeOut } from './lib.mjs';

const plan = readOut('dry-run-plan.json');
const planByDesc = new Map(plan.map((p) => [p.descId, p]));

const before = new Map();
await readJsonl(join(OUT_DIR, 'db-cosmetics-ko-canonical.jsonl'), (r) => before.set(r.desc_id, r));

const after = new Map();
await readJsonl(join(OUT_DIR, 'db-after.jsonl'), (r) => after.set(r.desc_id, r));

const res = {
  beforeRows: before.size,
  afterRows: after.size,
  plannedApplied: 0,
  plannedMismatch: [],
  untouchedOk: 0,
  unplannedChanged: [],
  enrichTagged: 0,
  typeChangeApplied: 0,
  typeChangeMismatch: [],
  missingRow: [],
};

for (const [descId, a] of after) {
  const b = before.get(descId);
  if (!b) {
    res.missingRow.push(descId);
    continue;
  }
  if (a.enrich_batch) res.enrichTagged += 1;
  const p = planByDesc.get(descId);
  if (p) {
    if ((a.content ?? '') === (p.after.content ?? '')) res.plannedApplied += 1;
    else res.plannedMismatch.push({ descId, masterId: a.master_id });
    if (p.typeChange) {
      if (a.product_type === p.typeChange.to) res.typeChangeApplied += 1;
      else res.typeChangeMismatch.push({ descId, expected: p.typeChange.to, actual: a.product_type });
    }
  } else if ((a.content ?? '') === (b.content ?? '')) {
    res.untouchedOk += 1;
  } else {
    res.unplannedChanged.push({ descId, masterId: a.master_id });
  }
}

// ── 결손 census 재측정 ──────────────────────────────────────────────────
const hasSection = (html, title) => String(html ?? '').includes(`<h3>${title}</h3>`);
const countGaps = (map) => {
  let f = 0;
  let u = 0;
  let t = 0;
  for (const r of map.values()) {
    if (!hasSection(r.content, '주요 특징')) f += 1;
    if (!hasSection(r.content, '사용 방법')) u += 1;
    if (!r.product_type) t += 1;
  }
  return { mainFeatures: f, usage: u, productType: t };
};
res.gapBefore = countGaps(before);
res.gapAfter = countGaps(after);

res.plannedTotal = plan.length;
res.pass =
  res.plannedMismatch.length === 0 &&
  res.unplannedChanged.length === 0 &&
  res.typeChangeMismatch.length === 0 &&
  res.missingRow.length === 0 &&
  res.plannedApplied === plan.length;

res.plannedMismatch = res.plannedMismatch.slice(0, 20);
res.unplannedChanged = res.unplannedChanged.slice(0, 20);
writeOut('post-verify.json', res);
process.stderr.write(`${JSON.stringify({ pass: res.pass, applied: res.plannedApplied, untouched: res.untouchedOk, gapBefore: res.gapBefore, gapAfter: res.gapAfter })}\n`);
