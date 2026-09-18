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
