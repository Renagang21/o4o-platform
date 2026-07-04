/**
 * Health Functional Food Official Text Parser — unit tests
 *
 * WO-O4O-HEALTH-FUNCTIONAL-FOOD-OFFICIAL-TEXT-PARSER-DRYRUN-V1 §6.2
 */

import {
  normalizeOfficialTextField,
  parseHealthFunctionalFoodOfficialText,
  classifyHealthFunctionalFoodDescriptionSuitability,
} from '../health-functional-food-official-text.parser';
import type { HealthFunctionalFoodItem } from '../health-functional-food-jsonl.parser';

/** 정상 full row (11필드 중 설명 관련 채움) */
const fullItem: HealthFunctionalFoodItem = {
  ENTRPS: '주식회사 예시헬스',
  PRDUCT: '  예시 프로바이오틱스 ',
  STTEMNT_NO: '20240012345',
  REGIST_DT: '20240115',
  DISTB_PD: '제조일로부터 24개월',
  SUNGSANG: '미황색의 분말',
  SRV_USE: '1일 1회, 1회 1포(2g)를 물과 함께 섭취',
  PRSRV_PD: '직사광선을 피해 실온(1~30℃) 보관',
  INTAKE_HINT1: '알레르기 체질은 원료를 확인 후 섭취',
  MAIN_FNCTN: '유산균 증식 및 유해균 억제, 배변활동 원활에 도움을 줄 수 있음',
  BASE_STANDARD: '대장균군: 음성, 총균수: 1.0x10^9 CFU/g 이상',
};

describe('normalizeOfficialTextField', () => {
  it('null/빈문자/공백 → 빈 문자열', () => {
    expect(normalizeOfficialTextField(null)).toBe('');
    expect(normalizeOfficialTextField(undefined)).toBe('');
    expect(normalizeOfficialTextField('')).toBe('');
    expect(normalizeOfficialTextField('   \n\t ')).toBe('');
  });

  it('HTML entity/br 를 디코드·정규화', () => {
    const out = normalizeOfficialTextField('1일 1회<br>1회 1정&nbsp;섭취 &amp; 물과 함께');
    expect(out).toContain('\n');
    expect(out).toContain('&');
    expect(out).not.toContain('<br>');
    expect(out).not.toContain('&nbsp;');
    expect(out).not.toContain('&amp;');
  });

  it('줄바꿈/중복 공백/ㆍ 불릿 정규화, 숫자·단위 보존', () => {
    const out = normalizeOfficialTextField('비타민C   1000mg\r\n\r\n\r\n칼슘ㆍ마그네슘   함유');
    expect(out).toContain('1000mg'); // 숫자·단위 보존
    expect(out).not.toContain('\r');
    expect(out).not.toMatch(/\n{3,}/); // 과다 줄바꿈 축소
    expect(out).not.toMatch(/ {2,}/); // 중복 공백 축소
    expect(out).toContain('칼슘\n마그네슘'); // ㆍ → 줄바꿈
  });

  it('내용성 하이픈/세미콜론은 보존(분리하지 않음)', () => {
    const out = normalizeOfficialTextField('1-2정; 비타민-C 함유');
    expect(out).toBe('1-2정; 비타민-C 함유');
  });
});

describe('parseHealthFunctionalFoodOfficialText', () => {
  it('1. 모든 필드가 있는 정상 row → 섹션·식별자·메트릭', () => {
    const r = parseHealthFunctionalFoodOfficialText(fullItem);
    expect(r.sttemntNo).toBe('20240012345');
    expect(r.productName).toBe('예시 프로바이오틱스'); // 선행공백 trim
    expect(r.manufacturerName).toBe('주식회사 예시헬스');
    expect(r.sections.mainFunction).toContain('배변활동');
    expect(r.sections.intake).toContain('1일 1회');
    expect(r.sections.caution).toContain('알레르기');
    expect(r.sections.baseStandard).toContain('CFU/g');
    expect(r.sections.appearance).toBe('미황색의 분말');
    expect(r.sections.storage).toContain('실온');
    expect(r.sections.shelfLife).toContain('24개월');
    expect(r.sections.ingredients).toBeUndefined(); // HFF 원천 미제공
    expect(r.metrics.sourceFieldCount).toBe(7);
    expect(r.metrics.parsedSectionCount).toBe(7);
    expect(r.metrics.textLength).toBeGreaterThan(0);
    expect(r.flags).not.toContain('MAIN_FUNCTION_MISSING');
  });

  it('2. MAIN_FNCTN 만 있는 row', () => {
    const r = parseHealthFunctionalFoodOfficialText({ MAIN_FNCTN: '항산화에 도움을 줄 수 있음' });
    expect(r.sections.mainFunction).toContain('항산화');
    expect(r.flags).toContain('INTAKE_MISSING');
    expect(r.flags).toContain('BASE_STANDARD_MISSING');
    expect(r.flags).not.toContain('MAIN_FUNCTION_MISSING');
    expect(r.metrics.parsedSectionCount).toBe(1);
  });

  it('3. INTAKE_HINT1(주의사항)만 있는 row', () => {
    const r = parseHealthFunctionalFoodOfficialText({ INTAKE_HINT1: '임산부는 섭취 전 전문가와 상담' });
    expect(r.sections.caution).toContain('임산부');
    expect(r.flags).toContain('MAIN_FUNCTION_MISSING');
  });

  it('4. BASE_STANDARD 만 있는 row', () => {
    const r = parseHealthFunctionalFoodOfficialText({ BASE_STANDARD: '납: 1.0mg/kg 이하' });
    expect(r.sections.baseStandard).toContain('mg/kg');
    expect(r.flags).not.toContain('BASE_STANDARD_MISSING');
    expect(r.flags).toContain('MAIN_FUNCTION_MISSING');
  });

  it('5. HTML entity/br 포함 row → HAD_HTML flag + 평문화', () => {
    const r = parseHealthFunctionalFoodOfficialText({
      SRV_USE: '1일 1회<br>1회 2정을 물과 함께 섭취&nbsp;하세요',
      MAIN_FNCTN: '<p>피로개선에 도움</p>',
    });
    expect(r.flags).toContain('HAD_HTML');
    expect(r.sections.intake).not.toContain('<br>');
    expect(r.sections.mainFunction).not.toContain('<p>');
    expect(r.sections.intake).toContain('\n');
  });

  it('6. 줄바꿈/중복 공백 포함 row → 정규화', () => {
    const r = parseHealthFunctionalFoodOfficialText({
      MAIN_FNCTN: '기능성A\r\n\r\n\r\n기능성B     상세',
    });
    expect(r.sections.mainFunction).not.toMatch(/\n{3,}/);
    expect(r.sections.mainFunction).not.toMatch(/ {2,}/);
  });

  it('7. 빈 문자열/null row → RAW_PAYLOAD_MISSING/RAW_TEXT_MISSING', () => {
    const empty = parseHealthFunctionalFoodOfficialText(null);
    expect(empty.flags).toContain('RAW_PAYLOAD_MISSING');
    expect(empty.metrics.parsedSectionCount).toBe(0);

    const blank = parseHealthFunctionalFoodOfficialText({ MAIN_FNCTN: '   ', SRV_USE: '' });
    expect(blank.flags).toContain('RAW_TEXT_MISSING');
    expect(blank.metrics.parsedSectionCount).toBe(0);
  });

  it('8. 질병 치료/예방 암시 단어 포함 → RISK_DISEASE_CLAIM flag', () => {
    const r = parseHealthFunctionalFoodOfficialText({
      MAIN_FNCTN: '고혈압 예방 및 당뇨 치료에 효과',
    });
    expect(r.flags).toContain('RISK_DISEASE_CLAIM');
    // 원문은 보존 — 삭제/치환하지 않음
    expect(r.sections.mainFunction).toContain('고혈압');
    expect(r.sections.mainFunction).toContain('치료');
  });

  it('8b. 허용된 기능성 표현("도움을 줄 수 있음")은 RISK flag 미부여', () => {
    const r = parseHealthFunctionalFoodOfficialText({
      MAIN_FNCTN: '혈중 콜레스테롤 개선에 도움을 줄 수 있음',
    });
    expect(r.flags).not.toContain('RISK_DISEASE_CLAIM');
  });

  it('9. 숫자/단위/원료명 손실 없음', () => {
    const r = parseHealthFunctionalFoodOfficialText({
      SRV_USE: '1일 2회, 1회 500mg(비타민C 1000IU, 아연 15mg)',
    });
    expect(r.sections.intake).toContain('500mg');
    expect(r.sections.intake).toContain('1000IU');
    expect(r.sections.intake).toContain('아연 15mg');
  });
});

describe('classifyHealthFunctionalFoodDescriptionSuitability', () => {
  it('정상 full → READY_FOR_GUIDELINE', () => {
    const r = parseHealthFunctionalFoodOfficialText(fullItem);
    expect(classifyHealthFunctionalFoodDescriptionSuitability(r)).toBe('READY_FOR_GUIDELINE');
  });

  it('risk 문구 → REVIEW_RISK_CLAIM (READY 보다 우선)', () => {
    const r = parseHealthFunctionalFoodOfficialText({
      MAIN_FNCTN: '당뇨 치료',
      SRV_USE: '1일 1회 섭취',
      BASE_STANDARD: '규격 상세',
    });
    expect(classifyHealthFunctionalFoodDescriptionSuitability(r)).toBe('REVIEW_RISK_CLAIM');
  });

  it('일부 텍스트만 → PARTIAL_TEXT_ONLY', () => {
    const r = parseHealthFunctionalFoodOfficialText({ SUNGSANG: '연질캡슐', PRSRV_PD: '실온 보관' });
    expect(classifyHealthFunctionalFoodDescriptionSuitability(r)).toBe('PARTIAL_TEXT_ONLY');
  });

  it('텍스트 없음 → INSUFFICIENT_TEXT', () => {
    const r = parseHealthFunctionalFoodOfficialText({ MAIN_FNCTN: '   ' });
    expect(classifyHealthFunctionalFoodDescriptionSuitability(r)).toBe('INSUFFICIENT_TEXT');
  });

  it('item 없음 → RAW_PAYLOAD_MISSING', () => {
    const r = parseHealthFunctionalFoodOfficialText(null);
    expect(classifyHealthFunctionalFoodDescriptionSuitability(r)).toBe('RAW_PAYLOAD_MISSING');
  });
});
