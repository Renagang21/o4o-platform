/**
 * WO-O4O-HFF-KO-SKIPPED-EXISTING-2451-FUNCTION-CANONICAL-BACKFILL-V1  §15
 *
 * family 보존 patch 모듈 fixture 검증 (DB 접속 없음 · write 0).
 *   D01~D03 = DRIVER family / C01~C08 = COMPOSITE family / U01 = 미지원 구조
 * 산출물: data/hff-ko-skipped-existing-2451-fixture-results-v1.json
 */
import fs from 'node:fs';
import { analyzeTarget, applyPatch, verifyPatch, cmpText, insertHazard } from './hff-ko-function-family-preserving-patch.mjs';

/* 삽입 텍스트 가드 단위 검증 — 세그먼터가 라인 선두 (국문) 표기를 제거하므로
   fixture 로 재현되지 않는 경로를 직접 확인한다. */
const HAZARD_CASES = [
  { text: '(국문) 자외선에 의한 피부손상으로부터 피부건강을 유지하는데 도움을 줄 수 있음', expect: 'INSERT_CLAUSE_LANGUAGE_MARKER_PREFIX' },
  { text: 'EPA및DHA함유유지 : 건조한 눈을 개선하여 눈 건강에 도움을 줄 수 있음', expect: 'INSERT_CLAUSE_CARRIES_INLINE_LABEL' },
  { text: '배변활동 원활', expect: 'INSERT_CLAUSE_NO_FUNCTION_PREDICATE' },
  { text: '기능성 내용', expect: 'INSERT_CLAUSE_NO_FUNCTION_PREDICATE' },
  { text: '철의 흡수에 필요', expect: null },
  { text: '뼈 형성에 필요,', expect: null },
  { text: '지방, 탄수화물, 단백질 대사와 에너지 생성에 필요', expect: null },
  { text: '정상적인 혈액응고에 필요 4)골다공증발생 위험 감소에 도움을 줌', expect: 'INSERT_CLAUSE_MULTI_CLAUSE_SEGMENT' },
];
const hazardResults = HAZARD_CASES.map((c) => {
  const actual = insertHazard(c.text, '');
  return { text: c.text, expected: c.expect, actual, pass: actual === c.expect };
});

const DATA = 'apps/api-server/src/scripts/data';
const HERO = (name) => `<div class="sd-card sd-theme-green"><div class="sd-hero">
  <div class="sd-badges"><span class="sd-badge">건강기능식품</span></div>
  <h1>${name}</h1><p class="sd-meta">테스트 제조 · 1일 1회</p></div>
  <div class="sd-body">`;
const TAIL = `  <h2>표시 기준</h2><div class="sd-spec"><div class="sd-item"><b>성상</b> 시험용</div></div>
  <h2>이런 분께</h2><ul class="sd-who"><li>테스트</li></ul></div><div class="sd-foot"><b>섭취 시 주의사항</b> · 전문가와 상담</div></div>`;
const DRV_TAIL = `  <h2>섭취량 및 섭취방법 (공식 표기 그대로)</h2><div class="sd-intake"><span class="sd-chips"><span class="sd-tag">1일 1회</span></span></div>
  <h2>확인 가능한 기준·규격 정보</h2><div class="sd-spec"><div class="sd-item"><b>성상</b> 시험용</div></div>
  <h2>매장 전문가 문의 안내</h2><div class="sd-cta">매장 전문가에게 문의하십시오.</div></div><div class="sd-foot">제품 표시사항을 함께 확인하십시오.</div></div>`;
const DRV_INTRO = `<p class="sd-intro">이 제품은 식약처에 신고된 건강기능식품입니다.</p>\n`;

const FIXTURES = [
  {
    id: 'D01', family: 'DRIVER', note: 'DRIVER 무라벨 평면 목록 · 공식 절 1건 누락 → 안전 append',
    mainFnctn: '①면역력 증진에 도움을 줄 수 있음\n②피로개선에 도움을 줄 수 있음',
    content: `${HERO('D01 테스트')}${DRV_INTRO}  <h2>주요 기능성</h2><ul class="sd-why"><li>면역력 증진에 도움을 줄 수 있음</li></ul>\n${DRV_TAIL}`,
    expect: { classification: 'SAFE_MISSING_CLAUSE', inserts: 1, insertedTexts: ['피로개선에 도움을 줄 수 있음'] },
  },
  {
    id: 'D02', family: 'DRIVER', note: 'DRIVER 원료별 그룹(sd-core/sd-item/sd-tag) · 아연 절 누락 → 아연 카드에만 삽입',
    mainFnctn: '[마그네슘]\n에너지 이용에 필요\n[아연]\n정상적인 면역기능에 필요\n정상적인 세포분열에 필요',
    content: `${HERO('D02 테스트')}${DRV_INTRO}  <h2>주요 기능성</h2><div class="sd-core"><div class="sd-item"><span class="sd-tag">마그네슘</span><ul><li>에너지 이용에 필요</li></ul></div><div class="sd-item"><span class="sd-tag">아연</span><ul><li>정상적인 면역기능에 필요</li></ul></div></div>\n${DRV_TAIL}`,
    expect: { classification: 'SAFE_MISSING_CLAUSE', inserts: 1, insertedTexts: ['정상적인 세포분열에 필요'], insertedIntoIngredient: '아연' },
  },
  {
    id: 'D03', family: 'DRIVER', note: 'DRIVER 원료별 그룹 · 공식 원문에 원료 라벨이 없어 누락 절의 원료 대응 불명확 → 사람 검토',
    mainFnctn: '에너지 이용에 필요\n혈중 콜레스테롤 개선에 도움을 줄 수 있음',
    content: `${HERO('D03 테스트')}${DRV_INTRO}  <h2>주요 기능성</h2><div class="sd-core"><div class="sd-item"><span class="sd-tag">마그네슘</span><ul><li>에너지 이용에 필요</li></ul></div><div class="sd-item"><span class="sd-tag">아연</span><ul><li>정상적인 면역기능에 필요</li></ul></div></div>\n${DRV_TAIL}`,
    expect: { classification: 'HUMAN_REVIEW_REQUIRED', reason: 'MISSING_CLAUSE_WITHOUT_INGREDIENT_LABEL' },
  },
  {
    id: 'C01', family: 'COMPOSITE', note: 'COMPOSITE 평면 목록 + 공식 라벨 1종 · 1건 누락 → 안전 append',
    mainFnctn: '[인삼제품]1.면역력 증진에 도움을 줄 수 있음.\n               2.피로개선에 도움을 줄 수 있음.',
    content: `${HERO('C01 테스트')}<p class="sd-intro">이 제품은 <b>인삼</b>을(를) 주원료로 한 건강기능식품입니다.</p>
  <h2>왜 이 제품인가</h2><ul class="sd-why"><li>주원료: <b>인삼</b></li></ul>
  <h2>공식 인정 기능성</h2><ul class="sd-why"><li>면역력 증진에 도움을 줄 수 있음</li></ul>
  <h2>섭취방법 (공식 표기 그대로)</h2><div class="sd-intake"><span class="sd-chips"><span class="sd-tag">1일 2회</span></span></div>
${TAIL}`,
    expect: { classification: 'SAFE_MISSING_CLAUSE', inserts: 1, insertedTexts: ['피로개선에 도움을 줄 수 있음'] },
  },
  {
    id: 'C02', family: 'COMPOSITE', note: 'COMPOSITE 원료별 sd-func · 아연 절 1건 누락 → 아연 카드에만 삽입',
    mainFnctn: '[마그네슘]\n에너지 이용에 필요\n[아연]\n정상적인 면역기능에 필요\n정상적인 세포분열에 필요',
    content: `${HERO('C02 테스트')}<p class="sd-intro">2원료 복합 건강기능식품입니다.</p>
  <h2>왜 이 제품인가</h2><ul class="sd-why"><li>복합</li></ul>
  <h2>원료별 공식 인정 기능성</h2><ul class="sd-func"><li><b>마그네슘</b><ul class="sd-why"><li>에너지 이용에 필요</li></ul></li><li><b>아연</b><ul class="sd-why"><li>정상적인 면역기능에 필요</li></ul></li></ul>
  <h2>섭취방법 (공식 표기 그대로)</h2><div class="sd-intake"><span class="sd-chips"><span class="sd-tag">1일 2회</span></span></div>
${TAIL}`,
    expect: { classification: 'SAFE_MISSING_CLAUSE', inserts: 1, insertedTexts: ['정상적인 세포분열에 필요'], insertedIntoIngredient: '아연' },
  },
  {
    id: 'C03', family: 'COMPOSITE', note: 'COMPOSITE 평면 목록 + 공식 라벨 2종 이상 · 원료 대응 불명확 → 사람 검토',
    mainFnctn: '[마늘] 혈중 콜레스테롤 개선에 도움을 줄 수 있음\n[아연]\n정상적인 면역기능에 필요',
    content: `${HERO('C03 테스트')}<p class="sd-intro">이 제품은 <b>마늘</b>을(를) 주원료로 한 건강기능식품입니다.</p>
  <h2>왜 이 제품인가</h2><ul class="sd-why"><li>주원료: <b>마늘</b></li></ul>
  <h2>공식 인정 기능성</h2><ul class="sd-why"><li>혈중 콜레스테롤 개선에 도움을 줄 수 있음</li></ul>
  <h2>섭취방법 (공식 표기 그대로)</h2><div class="sd-intake"><span class="sd-chips"><span class="sd-tag">1일 1회</span></span></div>
${TAIL}`,
    expect: { classification: 'HUMAN_REVIEW_REQUIRED', reason: 'FLAT_LIST_WITH_MULTIPLE_OFFICIAL_INGREDIENTS' },
  },
  {
    id: 'C04', family: 'COMPOSITE', note: 'COMPOSITE 원료별 카드에 공식 라벨 대응 카드 없음 → 사람 검토',
    mainFnctn: '[마그네슘]\n에너지 이용에 필요\n[루테인]\n노화로 인한 눈 건강에 도움을 줄 수 있음',
    content: `${HERO('C04 테스트')}<p class="sd-intro">복합 제품입니다.</p>
  <h2>원료별 공식 인정 기능성</h2><ul class="sd-func"><li><b>마그네슘</b><ul class="sd-why"><li>에너지 이용에 필요</li></ul></li><li><b>아연</b><ul class="sd-why"><li>정상적인 면역기능에 필요</li></ul></li></ul>
${TAIL}`,
    expect: { classification: 'HUMAN_REVIEW_REQUIRED', reason: 'INGREDIENT_CARD_NOT_FOUND' },
  },
  {
    id: 'C05', family: 'COMPOSITE', note: '공식 기능성 전량 이미 존재 → 변경 없음',
    mainFnctn: '[인삼제품]1.면역력 증진에 도움을 줄 수 있음.\n               2.피로개선에 도움을 줄 수 있음.',
    content: `${HERO('C05 테스트')}<p class="sd-intro">인삼 제품입니다.</p>
  <h2>공식 인정 기능성</h2><ul class="sd-why"><li>면역력 증진에 도움을 줄 수 있음</li><li>피로개선에 도움을 줄 수 있음</li></ul>
${TAIL}`,
    expect: { classification: 'FUNCTION_COMPLETE' },
  },
  {
    id: 'C06', family: 'COMPOSITE', note: '공식 복합절이 기존 렌더에서 분해 저장됨(홍삼 lane) → 변경 없음(DECOMPOSED 인정)',
    mainFnctn: '[홍삼]\n면역력 증진·피로개선·혈소판 응집억제를 통한 혈액흐름·기억력 개선·항산화에 도움을 줄 수 있음',
    content: `${HERO('C06 테스트')}<p class="sd-intro">홍삼 제품입니다.</p>
  <h2>이 홍삼의 공식 기능성</h2><ul class="sd-fn"><li>면역력 증진에 도움을 줄 수 있음</li><li>피로개선에 도움을 줄 수 있음</li><li>혈소판 응집 억제를 통한 혈액흐름에 도움을 줄 수 있음</li><li>기억력 개선에 도움을 줄 수 있음</li><li>항산화에 도움을 줄 수 있음</li></ul>
${TAIL}`,
    expect: { classification: 'FUNCTION_COMPLETE' },
  },
  {
    id: 'C07', family: 'COMPOSITE', note: '기능성 h2 가 2개 → 삽입 위치 단일 결정 불가 → 사람 검토',
    mainFnctn: '[마그네슘]\n에너지 이용에 필요\n신경과 근육 기능 유지에 필요',
    content: `${HERO('C07 테스트')}<p class="sd-intro">복합 제품입니다.</p>
  <h2>공식 인정 기능성</h2><ul class="sd-why"><li>에너지 이용에 필요</li></ul>
  <h2>추가 기능성 안내</h2><ul class="sd-why"><li>참고 문구</li></ul>
${TAIL}`,
    expect: { classification: 'HUMAN_REVIEW_REQUIRED', reason: 'MULTIPLE_FUNCTIONAL_SECTIONS' },
  },
  {
    id: 'C08', family: 'COMPOSITE', note: '기능성 섹션 자체가 없고 누락 존재 → 구조 어댑터 필요(자동 제외)',
    mainFnctn: '[마그네슘]\n에너지 이용에 필요',
    content: `${HERO('C08 테스트')}<p class="sd-intro">마그네슘 제품입니다.</p>
  <h2>왜 이 제품인가</h2><ul class="sd-why"><li>1일 1회</li></ul>
${TAIL}`,
    expect: { classification: 'STRUCTURE_ADAPTER_REQUIRED', reason: 'NO_FUNCTIONAL_SECTION' },
  },
  {
    id: 'C09', family: 'COMPOSITE', note: '동일 목록에 2건 누락(같은 삽입 offset) · 원문 순서 유지 + additive-only 유지',
    mainFnctn: '[인삼제품]1.면역력 증진에 도움을 줄 수 있음.\n               2.피로개선에 도움을 줄 수 있음.\n               3.기억력 개선에 도움을 줄 수 있음.',
    content: `${HERO('C09 테스트')}<p class="sd-intro">인삼 제품입니다.</p>
  <h2>공식 인정 기능성</h2><ul class="sd-why"><li>면역력 증진에 도움을 줄 수 있음</li></ul>
${TAIL}`,
    expect: { classification: 'SAFE_MISSING_CLAUSE', inserts: 2, insertedTexts: ['피로개선에 도움을 줄 수 있음', '기억력 개선에 도움을 줄 수 있음'], orderedTexts: ['피로개선에 도움을 줄 수 있음', '기억력 개선에 도움을 줄 수 있음'] },
  },
  {
    id: 'C10', family: 'COMPOSITE', note: '서로 다른 원료 카드에 각각 1건 누락(서로 다른 offset) · 카드별 정확 귀속',
    mainFnctn: '[마그네슘]\n에너지 이용에 필요\n신경과 근육 기능 유지에 필요\n[아연]\n정상적인 면역기능에 필요\n정상적인 세포분열에 필요',
    content: `${HERO('C10 테스트')}<p class="sd-intro">2원료 복합 건강기능식품입니다.</p>
  <h2>원료별 공식 인정 기능성</h2><ul class="sd-func"><li><b>마그네슘</b><ul class="sd-why"><li>에너지 이용에 필요</li></ul></li><li><b>아연</b><ul class="sd-why"><li>정상적인 면역기능에 필요</li></ul></li></ul>
${TAIL}`,
    expect: { classification: 'SAFE_MISSING_CLAUSE', inserts: 2, insertedTexts: ['신경과 근육 기능 유지에 필요', '정상적인 세포분열에 필요'] },
  },
  {
    id: 'C11', family: 'COMPOSITE', note: '공식 절이 쉼표로 결합되어 있고 기존 렌더가 항목별로 분해 저장 → 이미 반영으로 인정(중복 삽입 금지)',
    mainFnctn: '비타민D : 칼슘과 인이 흡수되고 이용되는데 필요, 뼈의 형성과 유지에 필요, 골다공증발생 위험 감소에 도움을 줌.',
    content: `${HERO('C11 테스트')}<p class="sd-intro">비타민 D 제품입니다.</p>
  <h2>비타민 D 영양기능 (공식 인정 기능성)</h2><ul class="sd-why"><li>칼슘과 인이 흡수되고 이용되는데 필요</li><li>뼈의 형성과 유지에 필요</li><li>골다공증 발생 위험 감소에 도움을 줌</li></ul>
${TAIL}`,
    expect: { classification: 'FUNCTION_COMPLETE' },
  },
  {
    id: 'C12', family: 'COMPOSITE', note: '기능성 문구는 존재하고 고시 주석만 없음 → 이미 반영으로 인정(중복 삽입 금지)',
    mainFnctn: '배변활동 원활에 도움을 줄 수 있음\n,식후 혈당상승 억제에 도움을 줄 수 있음[고시 제2021-95호(2021.11.23.), 시행일(2022.11.23.)]',
    content: `${HERO('C12 테스트')}<p class="sd-intro">식이섬유 제품입니다.</p>
  <h2>식이섬유 기능성 (공식 인정)</h2><ul class="sd-why"><li>배변활동 원활에 도움을 줄 수 있음</li><li>식후 혈당상승 억제에 도움을 줄 수 있음</li></ul>
${TAIL}`,
    expect: { classification: 'FUNCTION_COMPLETE' },
  },
  {
    id: 'C13', family: 'COMPOSITE', note: '누락 절이 다른 원료의 선두 라벨을 품고 있음 → 원료 혼입 위험으로 사람 검토',
    mainFnctn: '노화로 인해 감소될 수 있는 황반색소밀도를 유지하여 눈 건강에 도움을 줄 수 있음\nEPA및DHA함유유지 : 관절 건강에 도움을 줄 수 있음',
    content: `${HERO('C13 테스트')}<p class="sd-intro">루테인 제품입니다.</p>
  <h2>루테인 기능성 (공식 인정)</h2><ul class="sd-why"><li>노화로 인해 감소될 수 있는 황반색소밀도를 유지하여 눈 건강에 도움을 줄 수 있음</li></ul>
${TAIL}`,
    expect: { classification: 'HUMAN_REVIEW_REQUIRED', reason: 'INSERT_CLAUSE_CARRIES_INLINE_LABEL' },
  },
  {
    id: 'C14', family: 'COMPOSITE', note: '누락 절의 하위 구 일부가 이미 존재 → 부분 중복 위험으로 사람 검토',
    mainFnctn: '면역력 증진에 도움을 줄 수 있음\n피로개선·기억력 개선에 도움을 줄 수 있음',
    content: `${HERO('C14 테스트')}<p class="sd-intro">인삼 제품입니다.</p>
  <h2>공식 인정 기능성</h2><ul class="sd-why"><li>면역력 증진에 도움을 줄 수 있음</li><li>피로개선에 도움을 줄 수 있음</li></ul>
${TAIL}`,
    expect: { classification: 'HUMAN_REVIEW_REQUIRED', reason: 'PARTIAL_DUPLICATION_RISK' },
  },
  {
    id: 'C15', family: 'COMPOSITE', note: '반각 가운뎃점(･)으로 결합된 공식 복합절이 기존 렌더에서 분해 저장됨 → 이미 반영으로 인정',
    mainFnctn: '[홍삼]\n면역력 증진･피로개선에 도움을 줄 수 있음\n혈소판 응집억제를 통한 혈액흐름･기억력 개선･항산화에 도움을 줄 수 있음',
    content: `${HERO('C15 테스트')}<p class="sd-intro">홍삼 제품입니다.</p>
  <h2>이 홍삼의 공식 기능성</h2><ul class="sd-fn"><li>면역력 증진에 도움을 줄 수 있음</li><li>피로개선에 도움을 줄 수 있음</li><li>혈소판 응집 억제를 통한 혈액흐름에 도움을 줄 수 있음</li><li>기억력 개선에 도움을 줄 수 있음</li><li>항산화에 도움을 줄 수 있음</li></ul>
${TAIL}`,
    expect: { classification: 'FUNCTION_COMPLETE' },
  },
  {
    id: 'C16', family: 'COMPOSITE', note: '`/` 로 결합된 다중 절 세그먼트 → 단일 항목 삽입 금지(사람 검토)',
    mainFnctn: '[비타민A]\n어두운 곳에서 시각 적응을 위해 필요 / 피부와 점막을 형성하고 기능을 유지하는데 필요 / 상피세포의 성장과 발달에 필요',
    content: `${HERO('C16 테스트')}<p class="sd-intro">비타민 A 제품입니다.</p>
  <h2>공식 인정 기능성</h2><ul class="sd-why"><li>세포의 성장에 도움</li></ul>
${TAIL}`,
    expect: { classification: 'HUMAN_REVIEW_REQUIRED', reason: 'INSERT_CLAUSE_MULTI_CLAUSE_SEGMENT' },
  },
  {
    id: 'C17', family: 'COMPOSITE', note: '`2)` 열거 마커로 결합된 다중 절 → 사람 검토',
    mainFnctn: '요오드 : 갑상선 호르몬의 합성에 필요 2)에너지 생성에 필요 3)신경발달에 필요',
    content: `${HERO('C17 테스트')}<p class="sd-intro">요오드 제품입니다.</p>
  <h2>요오드 영양기능 (공식 인정 기능성)</h2><ul class="sd-why"><li>갑상선 기능 유지</li></ul>
${TAIL}`,
    expect: { classification: 'HUMAN_REVIEW_REQUIRED', reason: 'INSERT_CLAUSE_MULTI_CLAUSE_SEGMENT' },
  },
  {
    id: 'C18', family: 'COMPOSITE', note: '문두 구두점이 남은 깨진 세그먼트(`: (국문) …`) → 사람 검토',
    mainFnctn: ': (국문) 면역기능 증진에 도움을 줄 수 있음',
    content: `${HERO('C18 테스트')}<p class="sd-intro">베타글루칸 제품입니다.</p>
  <h2>공식 인정 기능성</h2><ul class="sd-why"><li>면역 건강 관리</li></ul>
${TAIL}`,
    expect: { classification: 'HUMAN_REVIEW_REQUIRED', reason: 'INSERT_CLAUSE_LEADING_PUNCTUATION' },
  },
  {
    id: 'C19', family: 'COMPOSITE', note: '쉼표가 성분 열거일 뿐 단일 절인 경우는 정상 삽입 대상',
    mainFnctn: '[판토텐산]\n지방, 탄수화물, 단백질 대사와 에너지 생성에 필요',
    content: `${HERO('C19 테스트')}<p class="sd-intro">판토텐산 제품입니다.</p>
  <h2>공식 인정 기능성</h2><ul class="sd-why"><li>에너지 대사 보조</li></ul>
${TAIL}`,
    expect: { classification: 'SAFE_MISSING_CLAUSE', inserts: 1, insertedTexts: ['지방, 탄수화물, 단백질 대사와 에너지 생성에 필요'] },
  },
  {
    id: 'C20', family: 'COMPOSITE', note: '기능 서술어로 끝나지 않는 절단 조각(`배변활동 원활`) → 사람 검토',
    mainFnctn: '배변활동 원활\n배변활동 원활\n배변활동 원활',
    content: `${HERO('C20 테스트')}<p class="sd-intro">식이섬유 제품입니다.</p>
  <h2>공식 인정 기능성</h2><ul class="sd-why"><li>장 건강 관리</li></ul>
${TAIL}`,
    expect: { classification: 'HUMAN_REVIEW_REQUIRED', reason: 'INSERT_CLAUSE_NO_FUNCTION_PREDICATE' },
  },
  {
    id: 'C21', family: 'COMPOSITE',
    note: '라벨 없는 다중 영양성분 열거 블록 → 평면 목록에 붙이면 원료 귀속 불명확 · 사람 검토',
    mainFnctn: '(국문) 피부 보습에 도움을 줄 수 있음 (영문) May help to moisturize skin\n'
      + '①결합조직 형성과 기능유지에 필요②철의 흡수에 필요\n\n①정상적인 면역기능에 필요②정상적인 세포분열에 필요',
    content: `${HERO('C21 테스트')}<p class="sd-intro">콜라겐 복합 제품입니다.</p>
  <h2>공식 인정 기능성</h2><ul class="sd-why"><li>피부 보습에 도움을 줄 수 있음</li></ul>
${TAIL}`,
    expect: { classification: 'HUMAN_REVIEW_REQUIRED', reason: 'FLAT_LIST_WITH_MULTIPLE_OFFICIAL_CLAUSE_GROUPS' },
  },
  {
    id: 'C22', family: 'COMPOSITE',
    note: '공식 절 그룹이 하나면 평면 목록 삽입은 계속 허용된다(과잉 차단 방지 회귀)',
    mainFnctn: '①정상적인 면역기능에 필요②정상적인 세포분열에 필요',
    content: `${HERO('C22 테스트')}<p class="sd-intro">아연 제품입니다.</p>
  <h2>공식 인정 기능성</h2><ul class="sd-why"><li>정상적인 면역기능에 필요</li></ul>
${TAIL}`,
    expect: { classification: 'SAFE_MISSING_CLAUSE', inserts: 1, insertedTexts: ['정상적인 세포분열에 필요'] },
  },
  {
    id: 'U01', family: 'COMPOSITE', note: '공식 원문에 국문 기능성 절이 없음(영문 단독) → 자동 대상 제외 · 영문 삽입 금지',
    mainFnctn: '(영문) May help to maintain male health in menopause',
    content: `${HERO('U01 테스트')}<p class="sd-intro">테스트.</p>
  <h2>공식 인정 기능성</h2><ul class="sd-why"><li>갱년기 남성건강에 도움을 줄 수 있음</li></ul>
${TAIL}`,
    expect: { classification: 'HUMAN_REVIEW_REQUIRED', reason: 'NO_OFFICIAL_KO_CLAUSE' },
  },
];

const results = [];
for (const f of FIXTURES) {
  const a = analyzeTarget({ content: f.content, mainFnctn: f.mainFnctn, family: f.family });
  const r = {
    id: f.id, family: f.family, note: f.note,
    expected: f.expect, actualClassification: a.classification, actualReason: a.reason,
    insertCount: a.plan?.inserts.length ?? 0,
    insertedTexts: a.plan?.inserts.map((x) => x.text) ?? [],
    insertedIngredients: a.plan?.inserts.map((x) => x.ingredient) ?? [],
    patchVerdict: null, patchFails: [], additiveOnly: null, englishInserted: null,
    pass: false, failures: [],
  };
  if (a.classification !== f.expect.classification) r.failures.push(`CLASSIFICATION_MISMATCH(${a.classification})`);
  if (f.expect.reason && a.reason !== f.expect.reason) r.failures.push(`REASON_MISMATCH(${a.reason})`);

  if (a.classification === 'SAFE_MISSING_CLAUSE') {
    const after = applyPatch({ content: f.content, plan: a.plan });
    const fails = verifyPatch({ before: f.content, after, plan: a.plan });
    r.patchFails = fails;
    r.patchVerdict = fails.length ? 'FAIL' : 'PASS';
    r.additiveOnly = !fails.includes('NOT_ADDITIVE_ONLY') && !fails.includes('INSERT_OFFSET_MISMATCH');
    r.englishInserted = a.plan.inserts.some((x) => /^[\x00-\x7F\s]+$/.test(x.text));
    r.afterLength = after.length;
    r.lengthDelta = after.length - f.content.length;
    if (fails.length) r.failures.push(`PATCH_VERIFY(${fails.join(',')})`);
    if (r.englishInserted) r.failures.push('ENGLISH_CLAUSE_INSERTED');
    if (f.expect.inserts != null && r.insertCount !== f.expect.inserts) r.failures.push(`INSERT_COUNT(${r.insertCount})`);
    // 삽입 문구는 공식 원문 verbatim(문말 마침표 등 포함)이므로 비교는 cmpText 기준으로 한다.
    for (const t of f.expect.insertedTexts ?? []) {
      if (!r.insertedTexts.some((x) => cmpText(x) === cmpText(t))) r.failures.push(`MISSING_INSERT_TEXT(${t})`);
    }
    if (f.expect.insertedIntoIngredient && !r.insertedIngredients.includes(f.expect.insertedIntoIngredient)) r.failures.push('INGREDIENT_TARGET_MISMATCH');
    // 동일 offset 다중 삽입 시 공식 원문 순서가 결과 HTML 에도 유지되어야 한다.
    for (let k = 1; k < (f.expect.orderedTexts ?? []).length; k++) {
      const p = after.indexOf(f.expect.orderedTexts[k - 1]);
      const q = after.indexOf(f.expect.orderedTexts[k]);
      if (!(p >= 0 && q > p)) r.failures.push(`INSERT_ORDER_MISMATCH(${f.expect.orderedTexts[k]})`);
    }
    // 다른 원료 카드에 혼입되지 않았는지 — 삽입 offset 이 대상 카드 내부인지 이미 verify 로 보장되므로
    // 여기서는 타 원료 항목 수 불변을 확인한다.
    const cnt = (h) => [...h.matchAll(/<li>/g)].length;
    if (cnt(after) - cnt(f.content) !== r.insertCount) r.failures.push('LI_COUNT_DELTA_MISMATCH');
    r.after = after;
  } else if (a.plan) {
    r.failures.push('PLAN_PRESENT_ON_NON_SAFE');
  }
  r.pass = r.failures.length === 0;
  results.push(r);
}

const hazardFailed = hazardResults.filter((r) => !r.pass);
const passed = results.filter((r) => r.pass).length;
const out = {
  insertHazardUnitCases: hazardResults, insertHazardFailed: hazardFailed.length,
  workOrder: 'WO-O4O-HFF-KO-SKIPPED-EXISTING-2451-FUNCTION-CANONICAL-BACKFILL-V1',
  contract: '§15 — family 보존 patch fixture. DRIVER D01~D03 / COMPOSITE C01~C08 / 미지원 U01. DB write 0.',
  generatedAt: new Date().toISOString(),
  total: results.length, passed, failed: results.length - passed,
  verdict: passed === results.length && hazardFailed.length === 0 ? 'PASS' : 'FAIL',
  results,
};
fs.writeFileSync(`${DATA}/hff-ko-skipped-existing-2451-fixture-results-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ total: out.total, passed, failed: out.failed, hazardUnit: `${hazardResults.length - hazardFailed.length}/${hazardResults.length}`, hazardFailures: hazardFailed, verdict: out.verdict, failures: results.filter((r) => !r.pass).map((r) => ({ id: r.id, actual: r.actualClassification, reason: r.actualReason, failures: r.failures })) }, null, 1));
if (out.verdict !== 'PASS') process.exit(2);
