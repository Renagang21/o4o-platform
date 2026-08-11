/**
 * WO §6 — dry-run. 대상 1,317건을 AUTO_ENRICH / NO_CHANGE / CHECK 로 가른다.
 *
 * 산출: dry-run-plan.json · dry-run-summary.json · check-queue.json
 */
import { editContent } from './content-edit-core.mjs';
import { judgeCautions, judgeUsage } from './enrich-core.mjs';
import { readOut, writeOut } from './lib.mjs';

const pop = readOut('population.json');

const plan = [];
const checkQueue = [];
const counts = { AUTO_ENRICH: 0, NO_CHANGE: 0, CHECK: 0 };
const usageVerdicts = {};
const cautionVerdicts = {};
const fieldCounts = { usage: 0, cautions: 0 };

for (const p of pop) {
  const ju = judgeUsage(p);
  const jc = judgeCautions(p);
  usageVerdicts[ju.verdict] = (usageVerdicts[ju.verdict] ?? 0) + 1;
  cautionVerdicts[jc.verdict] = (cautionVerdicts[jc.verdict] ?? 0) + 1;

  const add = {};
  if (ju.verdict === 'REPLACE') add.usage = ju.text;
  if (jc.verdict === 'ADD') add.cautionLines = jc.lines;

  const before = p.content ?? '';
  const { content: after, applied } = editContent(before, add);
  const changed = after !== before;

  const conflict = ju.verdict === 'CONFLICT';
  if (conflict) {
    counts.CHECK += 1;
    checkQueue.push({
      masterId: p.masterId,
      brandName: p.brandName,
      productName: p.productName,
      reason: ju.reason,
      currentUsage: p.currentUsage,
      mfdsUsage: p.mfdsUsage,
      reportNo: p.reportNo,
    });
    continue;
  }
  if (!changed) {
    counts.NO_CHANGE += 1;
    continue;
  }

  counts.AUTO_ENRICH += 1;
  const changedFields = [];
  if (applied.includes('usageReplaced') || applied.includes('usageInserted')) {
    changedFields.push('usage');
    fieldCounts.usage += 1;
  }
  if (applied.includes('cautionInserted')) {
    changedFields.push('cautions');
    fieldCounts.cautions += 1;
  }

  plan.push({
    masterId: p.masterId,
    descId: p.descId,
    brandName: p.brandName,
    productName: p.productName,
    productType: p.productType,
    changedFields,
    before: { content: before, usage: p.currentUsage, usageState: p.currentUsageState, cautionState: p.currentCautionState },
    after: { content: after, usage: add.usage ?? p.currentUsage },
    addedUsage: add.usage ?? null,
    addedCautionLines: add.cautionLines ?? null,
    usageVerdict: ju.verdict,
    usageReason: ju.reason,
    cautionVerdict: jc.verdict,
    cautionReason: jc.reason,
    mfdsSourceKey: { reportSeq: p.reportSeq, reportNo: p.reportNo, companyName: p.companyName, mfdsProductName: p.mfdsProductName, matchRule: p.matchRule },
    appliedEdits: applied,
  });
}

writeOut('dry-run-plan.json', plan);
writeOut('check-queue.json', checkQueue);
writeOut('dry-run-summary.json', {
  wo: 'WO-O4O-COSMETICS-MFDS-USAGE-CAUTION-ENRICHMENT-V1',
  population: pop.length,
  counts,
  fieldCounts,
  usageVerdicts,
  cautionVerdicts,
});
process.stderr.write(`${JSON.stringify({ counts, fieldCounts, usageVerdicts, cautionVerdicts })}\n`);
