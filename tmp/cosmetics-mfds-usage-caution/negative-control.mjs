/**
 * 검증기 음성 대조 — 결함을 주입해 03-validate 가 **잡는지** 확인한다.
 * "위반 0" 이 검증기 무력화 상태가 아님을 증명하기 위해서다.
 * 좁힌 의약품 주장 규칙의 **미탐 0** 도 여기서 함께 확인한다.
 */
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const P = 'tmp/cosmetics-mfds-usage-caution/';
const orig = fs.readFileSync(P + 'dry-run-plan.json', 'utf8');
const plan = JSON.parse(orig);
const pick = (pred) => plan.find(pred);
const injected = [];

// 1) 기존 블록 삭제
const a = pick((p) => p.before.content.includes('<h3>주요 특징</h3>'));
if (a) {
  a.after.content = a.after.content.split('\n').filter((b) => !b.startsWith('<h3>주요 특징</h3>')).join('\n');
  injected.push('ORIGINAL_BLOCK_LOST');
}
// 2) 주의사항 원문 변조 + 의약품 주장 삽입 (좁힌 규칙의 미탐 확인)
const b = pick((p) => p.changedFields.includes('cautions') && p !== a);
if (b) {
  const first = b.addedCautionLines[0];
  b.after.content = b.after.content.replace(first, '이 제품은 의약품 수준의 효과가 있습니다.');
  injected.push('CAUTION_NOT_VERBATIM + CAUTION_CLAIM');
}
// 3) 용법/주의사항 필드 뒤바뀜
const c = pick((p) => p.changedFields.includes('usage') && p !== a && p !== b);
if (c) {
  c.after.content = c.after.content.replace(
    /<h3>사용 방법<\/h3><p>[\s\S]*?<\/p>/,
    '<h3>사용 방법</h3><p>1. 화장품을 사용하여 다음과 같은 이상이 있는 경우에는 사용을 중지할 것</p>',
  );
  injected.push('USAGE_NOT_VERBATIM / USAGE_LOOKS_LIKE_CAUTION');
}
// 4) 블록 계약 위반 — 새 블록 안에 개행
const d = pick((p) => p.changedFields.includes('cautions') && p !== a && p !== b && p !== c);
if (d) {
  d.after.content = d.after.content.replace('<h3>주의사항</h3><ul>', '<h3>주의사항</h3>\n<ul>');
  injected.push('BLOCK_CONTAINS_NEWLINE');
}
// 5) 다른 제품 보고 연결
const e = pick((p) => p !== a && p !== b && p !== c && p !== d);
if (e) {
  e.mfdsSourceKey = { ...e.mfdsSourceKey, reportSeq: plan.find((x) => x.mfdsSourceKey.reportSeq !== e.mfdsSourceKey.reportSeq).mfdsSourceKey.reportSeq };
  injected.push('MFDS_PRODUCT_MISMATCH');
}

fs.writeFileSync(P + 'dry-run-plan.json', JSON.stringify(plan, null, 2), 'utf8');
try {
  execSync('node --max-old-space-size=6144 apps/api-server/src/scripts/cosmetics-mfds-usage-caution/03-validate.mjs', { stdio: 'inherit' });
  const v = JSON.parse(fs.readFileSync(P + 'validation.json', 'utf8'));
  console.log('\n주입한 결함:', injected.join(' · '));
  console.log('검증기가 잡은 위반:', JSON.stringify(v.byCode, null, 1));
} finally {
  fs.writeFileSync(P + 'dry-run-plan.json', orig, 'utf8');
}
