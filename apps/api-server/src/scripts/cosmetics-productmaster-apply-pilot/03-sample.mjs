/**
 * WO-...-PRODUCTMASTER-PILOT-V2 — 단계 3: 파일럿 500 표본 (WO §9)
 *
 * 재현 가능한 계통표본이다. 난수·유명제품 선택을 쓰지 않는다.
 *   1) 정제된 화장품 모집단(cleansed-population)을 (productType, key) 로 정렬한다.
 *   2) 필수 포함군을 먼저 계통표본으로 뽑는다: 기능성 MATCHED / 문제 큐 보유.
 *   3) 나머지 정원을 전체에서 계통표본으로 채운다.
 * 정렬이 productType 우선이므로 계통 간격 추출이 곧 유형 분산이 된다.
 */
import { readGuide, readOut, writeOut } from './lib.mjs';

const TARGET = 500;

/** 계통표본 — 간격 N/n 로 고르게 n 건 뽑는다(첫 원소부터 시작, 결정적). */
function systematic(list, n) {
  if (n <= 0 || list.length === 0) return [];
  if (list.length <= n) return [...list];
  const step = list.length / n;
  const out = [];
  for (let i = 0; i < n; i++) out.push(list[Math.floor(i * step)]);
  return out;
}

function main() {
  const guides = readGuide('all-guides-ko.json').guides;
  const issues = readGuide('issue-queue.json').issues;
  const keptKeys = new Set(readOut('cleansed-population.json').keys);

  const issueKeys = new Set(issues.map((i) => i.key));
  const pop = guides
    .filter((g) => keptKeys.has(g.key))
    .sort((a, b) =>
      (a.productType ?? '').localeCompare(b.productType ?? '', 'ko') || a.key.localeCompare(b.key, 'ko'),
    );

  const functional = pop.filter((g) => g.functionalStatus === 'RETAIL_FUNCTIONAL_MATCHED');
  const withIssue = pop.filter(
    (g) => issueKeys.has(g.key) && g.functionalStatus !== 'RETAIL_FUNCTIONAL_MATCHED',
  );

  const picked = new Map();
  const take = (list, n, bucket) => {
    for (const g of systematic(list, n)) if (!picked.has(g.key)) picked.set(g.key, { g, bucket });
  };
  take(functional, 100, 'FUNCTIONAL_MATCHED');
  take(withIssue, 100, 'ISSUE_QUEUE');
  take(pop, TARGET - picked.size, 'GENERAL');

  // 계통 간격이 이미 뽑힌 항목과 겹쳐 정원이 빌 수 있다 — 남은 자리를 순서대로 채운다.
  for (const g of pop) {
    if (picked.size >= TARGET) break;
    if (!picked.has(g.key)) picked.set(g.key, { g, bucket: 'GENERAL_FILL' });
  }

  const items = [...picked.values()].map(({ g, bucket }) => ({
    key: g.key,
    bucket,
    brandName: g.brandName,
    productName: g.productName,
    productType: g.productType,
    classification: g.classification,
    functionalStatus: g.functionalStatus,
    status: g.status,
    hasIssue: issueKeys.has(g.key),
  }));

  const dist = (f) =>
    Object.fromEntries(
      Object.entries(items.reduce((m, i) => ((m[f(i)] = (m[f(i)] ?? 0) + 1), m), {})).sort(
        (a, b) => b[1] - a[1],
      ),
    );

  writeOut('sample-500.json', {
    wo: 'WO-O4O-COSMETICS-DESCRIPTION-AUTHORING-POLICY-AND-PRODUCTMASTER-PILOT-V2',
    method: '정제 모집단을 (productType, key) 정렬 후 버킷별 계통표본. 난수 없음 — 재실행 시 동일 결과.',
    population: pop.length,
    size: items.length,
    byBucket: dist((i) => i.bucket),
    byStatus: dist((i) => i.status),
    byFunctionalStatus: dist((i) => i.functionalStatus),
    productTypeCount: new Set(items.map((i) => i.productType)).size,
    topProductTypes: Object.entries(dist((i) => i.productType)).slice(0, 15),
    items,
  });

  console.log(
    `모집단 ${pop.length} → 표본 ${items.length}\n` +
      `버킷 ${JSON.stringify(dist((i) => i.bucket))}\n` +
      `유형 수 ${new Set(items.map((i) => i.productType)).size} / 문제큐 포함 ${items.filter((i) => i.hasIssue).length} / 기능성 ${items.filter((i) => i.functionalStatus === 'RETAIL_FUNCTIONAL_MATCHED').length}`,
  );
}

main();
