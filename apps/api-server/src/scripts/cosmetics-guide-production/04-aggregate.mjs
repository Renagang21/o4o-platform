/**
 * WO-O4O-COSMETICS-KO-GUIDE-FULL-PRODUCTION-V1 — 단계 4: 통합 산출물 · 문제 큐 · 요약
 *
 * WO §12 산출물 계약: all-guides-ko.json / issue-queue.json / production-summary.json
 * WO §15 보고 항목을 그대로 계산해 요약에 담는다.
 */
import { readCensus, readOut, writeOut } from './lib.mjs';

const tally = (arr, pick) => arr.reduce((a, x) => ((a[pick(x)] = (a[pick(x)] ?? 0) + 1), a), {});

/** WO §15 문제 유형 분류 — 큐 issueType 을 보고용 6축으로 접는다. */
const ISSUE_AXIS = {
  NAME_TOO_SHORT: 'identity',
  NAME_EQUALS_TYPE: 'identity',
  PRODUCT_TYPE_UNDETERMINED: 'productType',
  PRODUCT_TYPE_AXIS_NOT_FORM: 'productType',
  TYPE_NAME_CONTRADICTION: 'productType',
  TYPE_NAME_MISMATCH: 'productType',
  USAGE_NO_GENERIC_MAPPING: 'usage',
  NO_OBSERVED_FEATURE: 'source',
  NON_COSMETIC_SUSPECT: 'merge/bundle',
  SYSTEM_FAILURE: '기타',
};

function main() {
  const input = readOut('production-input.json');
  const censusQueue = readCensus('issue-queue.json');

  const guides = [];
  const issues = [];
  const perBatch = [];
  for (const b of input.batches) {
    const g = readOut(`${b.label}/guides-ko.json`);
    const i = readOut(`${b.label}/issues.json`);
    const v = readOut(`${b.label}/validation.json`);
    guides.push(...g.guides);
    issues.push(...i.issues);
    perBatch.push({
      batch: b.label,
      input: b.count,
      generated: g.meta.generated,
      complete: g.meta.statusTally.COMPLETE ?? 0,
      partial: g.meta.statusTally.PARTIAL ?? 0,
      issues: i.issues.length,
      systemFailures: g.meta.systemFailures,
      validationViolations: v.meta.violations,
    });
  }

  const missingBreakdown = {};
  for (const g of guides) for (const m of g.missingRequired) missingBreakdown[m] = (missingBreakdown[m] ?? 0) + 1;

  const axis = {};
  for (const it of issues) {
    const a = ISSUE_AXIS[it.type] ?? '기타';
    axis[a] = (axis[a] ?? 0) + 1;
  }

  const summary = {
    wo: 'WO-O4O-COSMETICS-KO-GUIDE-FULL-PRODUCTION-V1',
    population: input.population,
    koGenerated: guides.length,
    notGenerated: input.population - guides.length,
    complete: guides.filter((g) => g.status === 'COMPLETE').length,
    partial: guides.filter((g) => g.status === 'PARTIAL').length,
    missingBreakdown,
    issueQueue: { total: issues.length, byType: tally(issues, (x) => x.type), byAxis: axis },
    functionalUsed: guides.filter((g) => g.functionalStatus === 'RETAIL_FUNCTIONAL_MATCHED').length,
    perBatch,
    validationTotalViolations: perBatch.reduce((a, b) => a + b.validationViolations, 0),
    // census 단계에서 이미 쌓여 있던 사람 검수 큐. 이번 WO 에서 추가 해소하지 않았다(WO §2).
    censusIssueQueueCarriedOver: censusQueue.issues.length,
    dbWrites: 0,
    englishGuides: 0,
  };

  writeOut('all-guides-ko.json', { meta: summary, guides });
  writeOut('issue-queue.json', { meta: { total: issues.length, byType: summary.issueQueue.byType, byAxis: axis }, issues });
  writeOut('production-summary.json', summary);
  process.stderr.write(JSON.stringify(summary, null, 2) + '\n');
}

main();
