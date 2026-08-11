/**
 * 검증기 음성 대조 — 일부러 망가뜨린 계획을 07-validate 의 규칙에 태워 **잡히는지** 확인한다.
 * (검증기가 아무것도 못 잡는 상태를 "위반 0" 으로 오독하지 않기 위해서다.)
 */
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const P = 'tmp/cosmetics-guide-gap-enrichment/';
const orig = fs.readFileSync(P + 'dry-run-plan.json', 'utf8');
const plan = JSON.parse(orig);

const pick = (pred) => plan.find(pred);
const mutations = [];

// 1) 원래 특징 항목 삭제
const a = pick((p) => p.before.content.includes('<h3>주요 특징</h3>') && p.addedFeatures.length);
if (a) {
  a.after.content = a.after.content.replace(/<li>[\s\S]*?<\/li>/, '');
  mutations.push('ORIGINAL_FEATURE_LOST');
}
// 2) 효능 문장을 임의로 바꿔치기
const b = pick((p) => p.addedFeatures.some((f) => f.from === 'MFDS_EFFICACY') && p !== a);
if (b) {
  const f = b.addedFeatures.find((x) => x.from === 'MFDS_EFFICACY');
  const old = f.text;
  f.text = '식약처 기능성화장품 보고 효능·효과: 피부를 완벽하게 치료한다.';
  b.after.content = b.after.content.replace(old, f.text);
  mutations.push('MFDS_EFFICACY_NOT_VERBATIM + HYPE/DRUG');
}
// 3) 판매명에 없는 용량 주장
const c = pick((p) => p.addedFeatures.some((f) => f.from?.startsWith('NAME_')) && p !== a && p !== b);
if (c) {
  const f = c.addedFeatures.find((x) => x.from?.startsWith('NAME_'));
  const old = f.text;
  f.text = '용량/구성: 999ml';
  c.after.content = c.after.content.replace(old, f.text);
  mutations.push('CAPACITY_NUMBER_NOT_IN_NAME');
}
// 4) 유형 정정이 부위 표기를 잃게 만든다
const d = pick((p) => p.typeChange && p !== a && p !== b && p !== c);
if (d) {
  d.after.content = d.after.content.replace(`— ${d.typeChange.to} 제품입니다.`, '— 오일 제품입니다.');
  d.typeChange = { ...d.typeChange, to: '오일' };
  mutations.push('TYPE_CHANGE_DEGRADES / NOT_RENDERED');
}

fs.writeFileSync(P + 'dry-run-plan.json', JSON.stringify(plan, null, 2), 'utf8');
try {
  execSync('node --max-old-space-size=6144 apps/api-server/src/scripts/cosmetics-guide-gap-enrichment/07-validate.mjs', { stdio: 'inherit' });
  const v = JSON.parse(fs.readFileSync(P + 'validation.json', 'utf8'));
  console.log('\n주입한 결함:', mutations.join(' · '));
  console.log('검증기가 잡은 위반:', JSON.stringify(v.byCode, null, 1));
} finally {
  fs.writeFileSync(P + 'dry-run-plan.json', orig, 'utf8');
}
