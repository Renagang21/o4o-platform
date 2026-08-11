/**
 * WO-O4O-COSMETICS-KO-GUIDE-FULL-PRODUCTION-V1 — 단계 5: 육안 검수 표본 추출 (WO §14)
 *
 * 기준문서 규칙 S2 — 유명제품 위주로 고르지 않는다. **계통표본만 쓴다.**
 * `index = floor(k × N / 100)` 으로 100건을 뽑고, 사람이 읽을 수 있게 평문으로도 함께 쓴다.
 */
import { readOut, writeOut, writeText } from './lib.mjs';

const N = 100;

function render(g, i) {
  const lines = [
    `## ${i + 1}. ${g.brandName} — ${g.productName}`,
    `- key: ${g.key}`,
    `- 유형: ${g.productType ?? '(미확정)'} (${g.productTypeSource ?? '-'})`,
    `- 한 줄 설명: ${g.oneLineDescription}`,
    `- 주요 특징:`,
    ...(g.mainFeatures.length ? g.mainFeatures.map((f) => `  - ${f.text}  \`${f.evidence}\``) : ['  - (없음)']),
    `- 판매 분류: ${g.classification ?? '(없음)'}`,
    `- 사용방법: ${g.usage ?? '(없음)'}${g.usage ? `  \`${g.usageSource}\`` : ''}`,
    `- 상태: ${g.status}${g.missingRequired.length ? ` (부족: ${g.missingRequired.join(', ')})` : ''}`,
    `- 판매명 원문: ${g.rawProductNames.join(' / ')}`,
    `- 출처: ${g.sourceUrls.join(' ')}`,
  ];
  if (g.issues.length) lines.push(`- 문제 큐: ${g.issues.map((x) => x.type).join(', ')}`);
  return lines.join('\n');
}

function main() {
  const { guides } = readOut('all-guides-ko.json');
  const picked = [];
  for (let k = 0; k < N; k += 1) picked.push(guides[Math.floor((k * guides.length) / N)]);

  writeOut('sample-review-100.json', {
    meta: { method: '계통표본 index = floor(k × N / 100)', population: guides.length, sample: picked.length },
    sample: picked,
  });

  const md = [
    '# 육안 검수 표본 100건 — WO-O4O-COSMETICS-KO-GUIDE-FULL-PRODUCTION-V1',
    '',
    `검수 기준: **매장에서 해당 제품을 확인하고 소비자에게 설명하는 기본 자료로 사용할 수 있는가?**`,
    `표본 추출: 계통표본 \`index = floor(k × ${guides.length} / 100)\` (규칙 S2)`,
    '',
    ...picked.map(render),
  ].join('\n\n');
  writeText('sample-review-100.md', md);
}

main();
