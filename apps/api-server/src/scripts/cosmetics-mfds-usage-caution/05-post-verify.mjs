/**
 * WO §9 — 독립 postVerify. 적용 후 DB 를 다시 읽어 대조한다.
 *   1. 계획한 건이 계획한 본문과 정확히 같은가
 *   2. 계획하지 않은 건은 한 글자도 안 바뀌었는가
 *   3. usage / caution 보유 before → after
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
  plannedTotal: plan.length,
  plannedApplied: 0,
  plannedMismatch: [],
  untouchedOk: 0,
  unplannedChanged: [],
  batchTagged: 0,
  missingRow: [],
};

for (const [descId, a] of after) {
  const b = before.get(descId);
  if (!b) {
    res.missingRow.push(descId);
    continue;
  }
  if (a.mfds_batch) res.batchTagged += 1;
  const p = planByDesc.get(descId);
  if (p) {
    if ((a.content ?? '') === (p.after.content ?? '')) res.plannedApplied += 1;
    else res.plannedMismatch.push({ descId, masterId: a.master_id });
  } else if ((a.content ?? '') === (b.content ?? '')) {
    res.untouchedOk += 1;
  } else {
    res.unplannedChanged.push({ descId, masterId: a.master_id });
  }
}

const usageBody = (c) => String(c ?? '').match(/<h3>사용 방법<\/h3><p>([\s\S]*?)<\/p>/)?.[1] ?? null;
const stat = (map) => {
  let usage = 0;
  let caution = 0;
  let empty = 0;
  for (const r of map.values()) {
    if (usageBody(r.content)) usage += 1;
    if (String(r.content ?? '').includes('<h3>주의사항</h3>')) caution += 1;
    if (!String(r.content ?? '').trim()) empty += 1;
  }
  return { usageSection: usage, cautionSection: caution, emptyContent: empty };
};
res.statBefore = stat(before);
res.statAfter = stat(after);

// 공식 용법으로 바뀐 문서 수 (계획과 별개로 본문에서 다시 센다)
let usageTextChanged = 0;
for (const [descId, a] of after) {
  const b = before.get(descId);
  if (b && usageBody(a.content) !== usageBody(b.content)) usageTextChanged += 1;
}
res.usageTextChanged = usageTextChanged;

res.pass =
  res.plannedMismatch.length === 0 &&
  res.unplannedChanged.length === 0 &&
  res.missingRow.length === 0 &&
  res.plannedApplied === plan.length &&
  res.beforeRows === res.afterRows &&
  res.statAfter.emptyContent === 0;

res.plannedMismatch = res.plannedMismatch.slice(0, 20);
res.unplannedChanged = res.unplannedChanged.slice(0, 20);
writeOut('post-verify.json', res);
process.stderr.write(`${JSON.stringify({ pass: res.pass, applied: res.plannedApplied, untouched: res.untouchedOk, statBefore: res.statBefore, statAfter: res.statAfter, usageTextChanged })}\n`);
