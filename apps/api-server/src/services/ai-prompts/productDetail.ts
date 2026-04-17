/**
 * AI Prompt — product_detail
 *
 * WO-AI-PROMPT-STRUCTURE-DESIGN-V1
 *
 * 목적: 원문을 상품 상세 설명 HTML로 재구성
 * HTML 기준: <p>, <ul>, <li>, <strong> 중심 / table·인라인 스타일 금지
 */

import { COMMON_SYSTEM_RULES, buildOptionInstructions } from './common.js';
import type { NormalizedAiContentResponse } from './common.js';

const OUTPUT_SCHEMA = `{
  "html": "상품 설명 HTML 문자열",
  "title": "한 줄 요약 제목 (30자 이내)",
  "summary": "핵심 요약 (3줄 이내)",
  "bullets": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"]
}`;

const TYPE_RULES = `[상품 설명 작성 규칙]
- 입력된 원문을 상품 상세 페이지용 콘텐츠로 재구성한다.
- 고객이 구매를 결정하는 데 필요한 정보(특징 → 사용법 → 주의사항) 순서로 구성한다.
- <p>, <ul>, <li>, <strong> 태그만 사용한다.
- <table>, <h1>, inline style 사용 금지.
- heading(<h2>, <h3>)은 섹션 구분이 명확히 필요한 경우에만 최소 사용한다.
- 광고성 과장 표현 금지. 원문 근거 없는 효능 주장 금지.
- bullets 배열은 핵심 포인트 3~5개로 구성한다.`;

/** product_detail 시스템 프롬프트 조합 */
export function buildProductDetailSystemPrompt(
  options: { tone?: string; length?: string; audience?: string }
): string {
  const optionInstructions = buildOptionInstructions(options, 'product_detail');
  return [
    COMMON_SYSTEM_RULES,
    TYPE_RULES,
    optionInstructions,
    `\n[출력 형식]\n반드시 아래 JSON 구조만 출력한다:\n${OUTPUT_SCHEMA}`,
  ]
    .filter(Boolean)
    .join('\n');
}

/** product_detail 사용자 프롬프트 */
export function buildProductDetailUserPrompt(input: string): string {
  return `다음 원문을 바탕으로 상품 상세 설명을 재구성해 주세요. 원문에 없는 정보는 추가하지 마세요.\n\n[원문]\n${input.trim()}`;
}

/** product_detail 응답 파싱 → NormalizedAiContentResponse */
export function parseProductDetailResponse(
  parsed: Record<string, any>,
  rawText: string
): Omit<NormalizedAiContentResponse, 'type'> {
  const html =
    parsed.html ||
    `<p>${rawText.replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>')}</p>`;

  return {
    html,
    title: typeof parsed.title === 'string' ? parsed.title : '',
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    bullets: Array.isArray(parsed.bullets) ? parsed.bullets : [],
    shortText: '',
    longText: '',
  };
}
