/**
 * 원내 Local Query 의도 판정 — 단위 테스트
 *
 * WO-O4O-HOSPITAL-DRUG-BROWSER-LOCAL-DATA-CONNECT-V1
 *
 * 실행: 저장소 루트에서
 *   npx vitest run --config services/web-neture/vitest.config.mjs
 *
 * 서버 hospital-drug-surface 의 도메인 어휘(원내·동일성분)를 브라우저에서 같은 축으로 재현하는지,
 * 조사·불용어를 걷어내고 원내에서 찾을 질의어만 남기는지 세운다.
 */

import { describe, expect, it } from 'vitest';
import {
  classifyLocalQuery,
  extractQueryTerms,
  extractStrength,
  isHospitalLocalQuery,
  mentionsHospital,
  mentionsSameIngredient,
} from '../localIntent';

describe('mentionsHospital / mentionsSameIngredient', () => {
  it("'원내' 를 인식한다", () => {
    expect(mentionsHospital('아목시실린 원내 보유 여부')).toBe(true);
    expect(mentionsHospital('타이레놀 효능 조사')).toBe(false);
  });

  it("동일성분·같은성분(공백 무관)을 인식한다", () => {
    expect(mentionsSameIngredient('타이레놀정과 같은 성분의 원내약')).toBe(true);
    expect(mentionsSameIngredient('동일성분 약 찾아줘')).toBe(true);
    expect(mentionsSameIngredient('타이레놀 재고')).toBe(false);
  });
});

describe('classifyLocalQuery', () => {
  it('동일성분 언급이면 research_and_local', () => {
    expect(classifyLocalQuery('타이레놀정과 같은 성분의 원내약 있어?')).toBe('research_and_local');
  });

  it('원내만 언급이면 local_only', () => {
    expect(classifyLocalQuery('아목시실린 원내 보유 여부 확인해줘')).toBe('local_only');
  });

  it('원내 언급이 없으면 none', () => {
    expect(classifyLocalQuery('타이레놀정의 효능을 조사해줘')).toBe('none');
    expect(isHospitalLocalQuery('타이레놀정의 효능을 조사해줘')).toBe(false);
  });
});

describe('extractStrength', () => {
  it('숫자+단위를 뽑는다', () => {
    expect(extractStrength('타이레놀 500mg 있어?')).toBe('500mg');
    expect(extractStrength('비타민D 1000IU')).toBe('1000IU');
    expect(extractStrength('함량 정보 없음')).toBeNull();
  });
});

describe('extractQueryTerms — 조사·불용어 제거', () => {
  it('원내 보유 질문에서 약품명만 남긴다', () => {
    expect(extractQueryTerms('우리 원내에 아세트아미노펜 있어?')).toEqual(['아세트아미노펜']);
    expect(extractQueryTerms('아목시실린 원내 보유 여부 확인해줘')).toEqual(['아목시실린']);
  });

  it('동일성분 질문에서 제품 토큰(조사 제거)을 남긴다', () => {
    expect(extractQueryTerms('타이레놀정과 같은 성분의 원내약 있어?')).toEqual(['타이레놀정']);
  });

  it('따옴표 구절을 우선 후보로 넣는다', () => {
    const terms = extractQueryTerms('"우루사정 200mg" 원내 있어?');
    expect(terms).toContain('우루사정 200mg');
  });
});
