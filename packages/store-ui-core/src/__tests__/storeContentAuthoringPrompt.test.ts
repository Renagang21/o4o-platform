/**
 * Store 외부 LLM Prompt Core 단위 테스트
 * WO-O4O-STORE-EXTERNAL-LLM-CONTENT-AUTHORING-V1 §22
 */
import { describe, it, expect } from 'vitest';
import {
  buildStoreContentAuthoringPrompt,
  resolveStoreContentLlmTask,
  isBlankStoreHtml,
  STORE_LLM_ASSIST_LABEL,
} from '../llm/storeContentAuthoringPrompt';

describe('resolveStoreContentLlmTask / isBlankStoreHtml', () => {
  it('빈 본문(undefined · "" · <p></p> · <p><br></p>) → create', () => {
    expect(resolveStoreContentLlmTask(undefined)).toBe('create');
    expect(resolveStoreContentLlmTask('')).toBe('create');
    expect(resolveStoreContentLlmTask('<p></p>')).toBe('create');
    expect(resolveStoreContentLlmTask('<p><br></p>')).toBe('create');
    expect(isBlankStoreHtml('<p>&nbsp;</p>')).toBe(false); // <p>&nbsp;</p> 는 p 안에 내용이 있으므로 blank 아님 (편집기 기준 보수적)
  });
  it('본문 있음 → revise', () => {
    expect(resolveStoreContentLlmTask('<p>안녕하세요</p>')).toBe('revise');
  });
});

describe('buildStoreContentAuthoringPrompt — CREATE', () => {
  const prompt = buildStoreContentAuthoringPrompt({ task: 'create', title: '가을 환절기 안내' });

  it('create 작업 문구 + 제목 Context', () => {
    expect(prompt).toContain('새 콘텐츠를 HTML 로 작성');
    expect(prompt).toContain('[참고 정보]');
    expect(prompt).toContain('- 콘텐츠 제목: 가을 환절기 안내');
    expect(prompt).not.toContain('[현재 본문 HTML]');
  });
  it('사실 창작 금지 + HTML-only 출력 계약', () => {
    expect(prompt).toContain('없는 사실을 새로 만들지 마세요');
    expect(prompt).toContain('HTML 만 반환');
    expect(prompt).toContain('인라인 CSS');
    expect(prompt).toContain('script, iframe, 외부 CSS');
  });
  it('Context 가 하나도 없어도 [작업]·[결과 조건] 은 있고 [참고 정보] 절은 생략', () => {
    const p = buildStoreContentAuthoringPrompt({ task: 'create' });
    expect(p).toContain('[작업]');
    expect(p).toContain('[결과 조건]');
    expect(p).not.toContain('[참고 정보]');
    expect(p).not.toContain('[추가 요청]');
  });
  it('create 에서 이미 쓴 내용이 있으면 참고 절로 첨부', () => {
    const p = buildStoreContentAuthoringPrompt({ task: 'create', currentHtml: '<p>메모</p>' });
    expect(p).toContain('[이미 작성한 내용 HTML — 참고]');
    expect(p).toContain('<p>메모</p>');
  });
});

describe('buildStoreContentAuthoringPrompt — REVISE', () => {
  const html = '<h2>영업시간</h2><p>평일 9시~19시</p>';
  const prompt = buildStoreContentAuthoringPrompt({ task: 'revise', title: '영업 안내', currentHtml: html });

  it('revise 작업 문구 + 현재 본문 HTML 첨부', () => {
    expect(prompt).toContain('수정·다듬어 주세요');
    expect(prompt).toContain('기존 사실을 바꾸거나 새로운 사실을 추가하지 마세요');
    expect(prompt).toContain('[현재 본문 HTML]');
    expect(prompt).toContain(html);
  });
  it('본문이 blank 이면 revise 라도 본문 절 생략', () => {
    const p = buildStoreContentAuthoringPrompt({ task: 'revise', currentHtml: '<p></p>' });
    expect(p).not.toContain('[현재 본문 HTML]');
  });
});

describe('Source Context — 있음/없음', () => {
  it('sourceTitle · sourceOrigin(라벨 변환) · productName 있음', () => {
    const p = buildStoreContentAuthoringPrompt({
      task: 'create',
      sourceTitle: '커뮤니티 원본 글',
      sourceOrigin: 'snapshot',
      productName: '테스트 제품',
    });
    expect(p).toContain('- 원본 제목: 커뮤니티 원본 글');
    expect(p).toContain('- 출처: 커뮤니티에서 가져온 콘텐츠');
    expect(p).toContain('- 관련 제품: 테스트 제품');
    expect(p).toContain('성분·효능 등은 추측하지 마세요');
  });
  it('알 수 없는 origin 은 원문 그대로', () => {
    const p = buildStoreContentAuthoringPrompt({ task: 'create', sourceOrigin: 'other-origin' });
    expect(p).toContain('- 출처: other-origin');
  });
  it('공백/누락 Context 는 줄 자체를 만들지 않음', () => {
    const p = buildStoreContentAuthoringPrompt({ task: 'create', sourceTitle: '  ', productName: null, sourceOrigin: undefined });
    expect(p).not.toContain('원본 제목');
    expect(p).not.toContain('관련 제품');
    expect(p).not.toContain('출처');
  });
});

describe('additionalInstruction', () => {
  it('있으면 [추가 요청] 절, 없으면/공백이면 생략', () => {
    const p = buildStoreContentAuthoringPrompt({ task: 'create', additionalInstruction: '  친근한 말투로  ' });
    expect(p).toContain('[추가 요청]\n친근한 말투로');
    expect(buildStoreContentAuthoringPrompt({ task: 'create', additionalInstruction: '   ' })).not.toContain('[추가 요청]');
  });
});

describe('건강·의약품 조항', () => {
  it('건강 관련 단서가 있으면 효능·치료 표현 추가 금지 조항 포함', () => {
    const p = buildStoreContentAuthoringPrompt({ task: 'create', title: '환절기 비타민 복용 안내' });
    expect(p).toContain('효능·효과·질병 치료·예방 표현을 추가하지 마세요');
  });
  it('일반 매장 안내(비건강)에는 건강 조항 없음', () => {
    const p = buildStoreContentAuthoringPrompt({ task: 'create', title: '추석 연휴 휴무 안내' });
    expect(p).not.toContain('효능·효과·질병 치료');
  });
});

describe('라벨', () => {
  it('Store 대표 라벨 = ChatGPT로 작업', () => {
    expect(STORE_LLM_ASSIST_LABEL).toBe('ChatGPT로 작업');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WO-O4O-STORE-PRODUCTION-EXTERNAL-LLM-REALIGNMENT-V1 §44 — 목적별 task (blog · pop · qr · product-description · translate)
// ─────────────────────────────────────────────────────────────────────────────

const COMMON_HTML_CONTRACT = 'HTML 만 반환';
const COMMON_NO_FABRICATION = '없는 사실을 새로 만들지 마세요';

describe('WO3 공통 — 모든 목적별 task 에 공통 HTML contract · 사실 생성 금지 · 추가 요청 유지', () => {
  const tasks = ['blog', 'pop', 'qr', 'product-description', 'translate'] as const;
  for (const task of tasks) {
    it(`${task}: [작업]·[결과 조건]·공통 계약·추가 요청`, () => {
      const p = buildStoreContentAuthoringPrompt({ task, title: '추석 연휴 휴무 안내', additionalInstruction: '짧게' });
      expect(p).toContain('[작업]');
      expect(p).toContain('[결과 조건]');
      expect(p).toContain(COMMON_HTML_CONTRACT);
      expect(p).toContain(COMMON_NO_FABRICATION);
      expect(p).toContain('script, iframe, 외부 CSS');
      expect(p).toContain('[추가 요청]\n짧게');
    });
  }
  it('목적별 task 에서도 건강 단서가 있으면 health guard 유지', () => {
    for (const task of tasks) {
      const p = buildStoreContentAuthoringPrompt({ task, productName: '종합비타민 골드' });
      expect(p).toContain('효능·효과·질병 치료·예방 표현을 추가하지 마세요');
    }
  });
  it('referenceText 가 건강 단서면 health guard 발동(참고 문안도 검사 대상)', () => {
    const p = buildStoreContentAuthoringPrompt({ task: 'pop', title: '가을 이벤트', referenceText: '면역 영양제 특가' });
    expect(p).toContain('효능·효과·질병 치료·예방 표현을 추가하지 마세요');
  });
});

describe('WO3 — blog', () => {
  it('본문 없음 → 새로 작성 · h1 금지 · 구조 지시 · slug/발행 생성 금지', () => {
    const p = buildStoreContentAuthoringPrompt({ task: 'blog', title: '추석 연휴 안내' });
    expect(p).toContain('매장 블로그에 올릴 본문을 HTML 로 작성');
    expect(p).toContain('h1 은 사용하지 마세요');
    expect(p).toContain('도입부 → h2/h3 소제목 → 본문');
    expect(p).toContain('URL·slug·발행 상태 같은 정보는 만들지 마세요');
    expect(p).not.toContain('[현재 본문 HTML]');
  });
  it('본문 있음 → 다듬기 + [현재 본문 HTML] 첨부', () => {
    const p = buildStoreContentAuthoringPrompt({ task: 'blog', currentHtml: '<p>연휴 안내</p>' });
    expect(p).toContain('블로그 글을 다듬어 주세요');
    expect(p).toContain('[현재 본문 HTML]\n<p>연휴 안내</p>');
  });
  it('sourceTitle/sourceOrigin(자료함 Source Context) 반영', () => {
    const p = buildStoreContentAuthoringPrompt({ task: 'blog', sourceTitle: '가을 안내 자료', sourceOrigin: 'library' });
    expect(p).toContain('- 원본 제목: 가을 안내 자료');
    expect(p).toContain('- 출처: 자료함');
  });
});

describe('WO3 — pop', () => {
  it('POP 형식 계약(짧은 제목 · 포인트 2~5 · 장문 금지 · 디자인/PDF 는 O4O)', () => {
    const p = buildStoreContentAuthoringPrompt({ task: 'pop', title: '가을 이벤트' });
    expect(p).toContain('POP 문안을 HTML 로 작성');
    expect(p).toContain('짧은 포인트 2~5개');
    expect(p).toContain('장문을 쓰지 마세요');
    expect(p).toContain('POP 디자인·PDF 는 O4O 가 만듭니다');
    expect(p).toContain('확인되지 않은 효능·효과·할인 조건을 만들어 넣지 마세요');
  });
  it('referenceText(요약) → [참고 문안] 절 · 줄 단위 · 본문 있으면 재구성', () => {
    const p = buildStoreContentAuthoringPrompt({
      task: 'pop',
      title: '가을 이벤트',
      referenceText: ' 첫 줄 \n\n둘째 줄 ',
      currentHtml: '<p>긴 본문</p>',
    });
    expect(p).toContain('- 참고 문안(아래 내용만 사실로 사용):');
    expect(p).toContain('    첫 줄\n    둘째 줄');
    expect(p).toContain('POP 문안으로 다시 구성');
    expect(p).toContain('[현재 본문 HTML]\n<p>긴 본문</p>');
  });
});

describe('WO3 — qr', () => {
  it('single: 상품명 + 강조점 → 모바일 가독성 · 추측 금지 · QR/slug 생성 금지', () => {
    const p = buildStoreContentAuthoringPrompt({ task: 'qr', productName: '종합비타민 골드', referenceText: '하루 한 알' });
    expect(p).toContain('휴대폰 화면에서 읽을 안내 콘텐츠를 HTML 로 작성');
    expect(p).toContain('- 관련 제품: 종합비타민 골드');
    expect(p).toContain('    하루 한 알');
    expect(p).toContain('성분·효능·사용법을 추측해 쓰지 마세요');
    expect(p).toContain('모바일 가독성 우선');
    expect(p).toContain('QR 주소·slug·링크는 만들지 마세요');
  });
  it('corner: 코너명(title) + 항목 목록(referenceText) → 상품별 h3 지시', () => {
    const p = buildStoreContentAuthoringPrompt({
      task: 'qr',
      title: '환절기 면역 코너',
      referenceText: '코너 강조점: 환절기 건강관리\n상품 1: 비타민C / 강조점: 매일\n상품 2: 아연',
    });
    expect(p).toContain('- 콘텐츠 제목: 환절기 면역 코너');
    expect(p).toContain('    상품 1: 비타민C / 강조점: 매일');
    expect(p).toContain('상품별로 h3 소제목');
  });
});

describe('WO3 — product-description (가장 엄격한 사실성)', () => {
  it('비건강 제품이라도 제품 사실 계약 4종 항상 포함', () => {
    const p = buildStoreContentAuthoringPrompt({ task: 'product-description', productName: '유리 물병 500ml' });
    expect(p).toContain('상품 상세 설명을 HTML 로 작성');
    expect(p).toContain('제품명만 보고 성분·효능·원산지 등을 추측해 쓰지 마세요');
    expect(p).toContain('원문에 없는 사용법·주의사항·보관법을 만들어 넣지 마세요');
    expect(p).toContain('질병을 치료·예방한다는 표현을 추가하지 마세요');
    expect(p).toContain('확인되지 않은 수치(함량·용량·가격·기간 등)를 만들어 넣지 마세요');
    // 비건강이라 HEALTH 조항(상담 톤)은 없음 — 제품 계약과 별개
    expect(p).not.toContain('약사 등 전문가와 상담');
  });
  it('현재 설명 있음 → 정리 + prefillNote(referenceText) 반영', () => {
    const p = buildStoreContentAuthoringPrompt({
      task: 'product-description',
      productName: '유리 물병 500ml',
      currentHtml: '<p>기존 설명</p>',
      referenceText: '자료함 메모',
    });
    expect(p).toContain('상품 상세 설명을 다듬어 주세요');
    expect(p).toContain('    자료함 메모');
    expect(p).toContain('[현재 본문 HTML]\n<p>기존 설명</p>');
  });
});

describe('WO3 — translate', () => {
  it('sourceLocale/targetLocale 라벨 · 기준 본문 HTML · 결과 언어 전용 · 사실 불변 계약', () => {
    const p = buildStoreContentAuthoringPrompt({
      task: 'translate',
      productName: '유리 물병 500ml',
      sourceLocale: 'ko',
      targetLocale: 'en',
      referenceHtml: '<h2>사용법</h2><p>500ml</p>',
    });
    expect(p).toContain('다른 언어로 옮겨 주세요');
    expect(p).toContain('- 기준 본문 언어: 한국어');
    expect(p).toContain('- 결과 언어: English');
    expect(p).toContain('- English 로만 작성하세요');
    expect(p).toContain('숫자·단위·제품명·고유명사는 임의로 바꾸지 마세요');
    expect(p).toContain('의학·건강 관련 의미를 원문보다 강하게 표현하지 마세요');
    expect(p).toContain('[기준 본문 HTML — 한국어]\n<h2>사용법</h2><p>500ml</p>');
    expect(p).not.toContain('[현재');
  });
  it('target locale 기존 본문이 있으면 "현재 … 본문 — 참고해 다듬기" 절 추가', () => {
    const p = buildStoreContentAuthoringPrompt({
      task: 'translate',
      sourceLocale: 'ko',
      targetLocale: 'zh',
      referenceHtml: '<p>원문</p>',
      currentHtml: '<p>现有</p>',
    });
    expect(p).toContain('[현재 中文 본문 HTML — 있으면 참고해 다듬기]\n<p>现有</p>');
  });
  it('모르는 locale 코드는 그대로 표기 · 빈 referenceHtml(<p></p>)은 생략', () => {
    const p = buildStoreContentAuthoringPrompt({ task: 'translate', targetLocale: 'fr', referenceHtml: '<p></p>' });
    expect(p).toContain('- 결과 언어: fr');
    expect(p).not.toContain('[기준 본문 HTML');
  });
});

describe('WO3 — WO2 create/revise 출력 불변(회귀 가드)', () => {
  it('create/revise 에는 목적별 형식 조건이 섞이지 않는다', () => {
    const c = buildStoreContentAuthoringPrompt({ task: 'create', title: 'A' });
    const r = buildStoreContentAuthoringPrompt({ task: 'revise', currentHtml: '<p>a</p>' });
    for (const p of [c, r]) {
      expect(p).not.toContain('h1 은 사용하지 마세요');
      expect(p).not.toContain('POP 디자인');
      expect(p).not.toContain('모바일 가독성');
      expect(p).not.toContain('제품명만 보고 성분·효능·원산지');
      expect(p).not.toContain('로만 작성하세요');
    }
  });
});
