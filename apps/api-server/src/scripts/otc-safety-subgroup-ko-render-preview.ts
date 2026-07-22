/** READ-ONLY 렌더 미리보기 — DB 접근·write 경로 전무. buildDrugOtcConsumerHtml 로 authored content 렌더 + 게이트 확인. */
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { buildDrugOtcConsumerHtml } from '../modules/neture/drug-import/drug-otc-description-consumer-html.js';

const TITLE = '마그밀정 (수산화마그네슘 500mg)';
const CONTENT = {
  efficacy: '이 약은 위·십이지장궤양, 위염, 위산과다에서 위산을 중화(제산)하여 증상을 개선하고, 변비에 사용합니다.',
  usage: ['위·십이지장궤양, 위염, 위산과다: 산화마그네슘으로서 1일 2~5정(1~2.5 g)을 여러 차례 나누어 복용합니다.', '변비: 1일 2~4정(1~2 g)을 1~2회 나누어 복용합니다.', '연령과 증상에 따라 용량을 적절히 조절합니다.'].join('\n\n'),
  usageLabel: '복용 안내',
  caution: ['다음 환자는 이 약을 복용하지 마십시오: 신장애 환자, 설사 환자.', '이 약을 복용하기 전에 심기능 장애, 고마그네슘혈증 환자는 의사 또는 약사와 상의하십시오.', '테트라사이클린계 항생물질과 함께 복용하지 마십시오.', '다량의 우유나 칼슘제제와 함께 복용하면 우유·알칼리 증후군(고칼슘혈증, 고질소혈증, 알칼리증 등)이 나타날 수 있으므로 의사 또는 약사와 상의하십시오.', '마그네슘 중독 증상이나 때때로 설사가 나타날 수 있습니다.', '습기와 빛을 피해 실온에서 보관하고, 어린이의 손이 닿지 않는 곳에 보관하십시오.', '이 설명서는 제품 선택을 돕기 위한 안내이며, 정확한 복용법과 주의사항은 매장 내 약사 등 전문가와 상의하십시오.'].join('\n\n'),
  summaryTable: { 분류: '일반의약품', 성분: '수산화마그네슘 500mg', 작용: '제산(위산 중화), 완하(배변 완화)', '주요 증상': '위·십이지장궤양, 위염, 위산과다, 변비', '주의 대상': '신장애, 설사, 심기능 장애, 고마그네슘혈증', '선택 포인트': '위산과다 증상과 변비에 사용하는 제산·완하제' },
};
const built = buildDrugOtcConsumerHtml(CONTENT as never, { title: TITLE });
const gates = { missing: built.missing, hasTable: built.html.includes('<table'), hasComment: built.html.includes('<!--'), hasSdWarn: built.html.includes('sd-warn'), htmlLen: built.html.length };
const pass = built.missing.length === 0 && !gates.hasTable && !gates.hasComment && gates.hasSdWarn && built.html.length > 0;
const OUT = path.resolve(process.cwd(), 'src/scripts/data');
mkdirSync(OUT, { recursive: true });
writeFileSync(path.join(OUT, 'otc-safety-subgroup-magnesium500-ko-render.json'), JSON.stringify({ groupKey: '수산화마그네슘|500밀리그램|정', title: TITLE, gatesPass: pass, gates, content_json: CONTENT, html: built.html }, null, 2), 'utf8');
console.log('GATES', JSON.stringify(gates), 'PASS', pass);
console.log(built.html);
