/**
 * WO-...-PRODUCTMASTER-PILOT-V2 — 단계 7: 문제 큐 (WO §15)
 *
 * 이번 파일럿에서 사람이 봐야 할 것만 모은다. 자동 병합·자동 보정은 하지 않는다.
 *   A. 정제 단계 판정 보류 (CHECK / DIFFERENT_PRODUCT_SAME_NAME)
 *   B. dry-run CHECK (브랜드+상품명은 같은데 규제유형이 화장품이 아닌 기존 master)
 *   C. apply 충돌·실패
 *   D. 적용된 500건 중 설명서 결손 (missingRequired / 생산 단계 issue)
 */
import { readGuide, readOut, writeOut } from './lib.mjs';

const audit = readOut('existing-master-match-audit.json');
const dry = readOut('dry-run.json');
const apply = readOut('apply-result.json');
const sample = readOut('sample-500.json').items;
const guides = new Map(readGuide('all-guides-ko.json').guides.map((g) => [g.key, g]));

const appliedKeys = new Set(
  dry.plan.filter((p) => p.action !== 'CHECK').map((p) => p.key),
);

const matched = audit.matched ?? audit.items ?? [];
const pendingJudgement = matched.filter((m) => m.verdict === 'CHECK' || m.verdict === 'DIFFERENT_PRODUCT_SAME_NAME');

const contentGaps = sample
  .filter((s) => appliedKeys.has(s.key))
  .map((s) => ({ key: s.key, g: guides.get(s.key) }))
  .filter(({ g }) => g && (g.missingRequired?.length || g.issues?.length))
  .map(({ key, g }) => ({
    key,
    status: g.status,
    missingRequired: g.missingRequired ?? [],
    issueTypes: (g.issues ?? []).map((i) => i.type),
  }));

const issueTypeCounts = {};
for (const c of contentGaps) for (const t of c.issueTypes) issueTypeCounts[t] = (issueTypeCounts[t] ?? 0) + 1;
const missingCounts = {};
for (const c of contentGaps) for (const m of c.missingRequired) missingCounts[m] = (missingCounts[m] ?? 0) + 1;

writeOut('issue-queue.json', {
  wo: 'WO-O4O-COSMETICS-DESCRIPTION-AUTHORING-POLICY-AND-PRODUCTMASTER-PILOT-V2',
  note: '자동 보정 대상이 아니다. 설명서 feature 결손은 WO §14 상 중지 사유가 아니며 후속 보완 대상이다.',
  A_pendingJudgement: { count: pendingJudgement.length, items: pendingJudgement },
  B_dryRunCheck: { count: dry.expectedCheck, items: dry.plan.filter((p) => p.action === 'CHECK') },
  C_applyConflictOrFailure: {
    conflicts: apply.canonicalConflict,
    failures: apply.failed,
    items: [...apply.conflicts, ...apply.failures],
  },
  D_contentGaps: {
    count: contentGaps.length,
    byIssueType: issueTypeCounts,
    byMissingField: missingCounts,
    items: contentGaps,
  },
});

console.log(
  `A 판정보류 ${pendingJudgement.length} / B dry-run CHECK ${dry.expectedCheck} / ` +
    `C 충돌 ${apply.canonicalConflict}·실패 ${apply.failed} / D 설명서 결손 ${contentGaps.length}\n` +
    `결손 유형 ${JSON.stringify(issueTypeCounts)}\n결손 필드 ${JSON.stringify(missingCounts)}`,
);
