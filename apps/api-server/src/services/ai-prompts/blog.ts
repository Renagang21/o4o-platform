/**
 * AI Prompt — blog
 *
 * WO-AI-PROMPT-STRUCTURE-DESIGN-V1
 *
 * 목적: 원문을 블로그 게시용 콘텐츠로 재구성
 * 특징: 설명형/정보형 문체, 문단 흐름 중시, 광고성 과다 표현 금지
 */

import { COMMON_SYSTEM_RULES, buildOptionInstructions } from './common.js';
import type { NormalizedAiContentResponse } from './common.js';

const OUTPUT_SCHEMA = `{
  "html": "블로그 본문 HTML 문자열",
  "title": "블로그 제목 (40자 이내)",
  "summary": "핵심 내용 요약 (3줄 이내)",
  "bullets": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"]
}`;

const TYPE_RULES = `[블로그 작성 규칙]
- 입력된 원문을 블로그 게시용 콘텐츠로 재구성한다.
- 정보 전달이 자연스럽게 흐르도록 문단 간 연결을 강화한다.
- <p> 태그 중심. 필요 시 <ul>, <li>, <strong> 허용.
- 과도한 heading 사용 금지 (<h2> 이하 섹션 구분 필요 시만 사용).
- inline style, table 사용 금지.
- 광고성 문구 과다 사용 금지. 원문 근거 없는 주장 금지.
- 독자가 끝까지 읽고 싶도록 흐름이 자연스러워야 한다.
- bullets 배열은 독자에게 전달할 핵심 인사이트 3~5개로 구성한다.`;

/** blog 시스템 프롬프트 조합 */
export function buildBlogSystemPrompt(
  options: { tone?: string; length?: string; audience?: string }
): string {
  const optionInstructions = buildOptionInstructions(options, 'blog');
  return [
    COMMON_SYSTEM_RULES,
    TYPE_RULES,
    optionInstructions,
    `\n[출력 형식]\n반드시 아래 JSON 구조만 출력한다:\n${OUTPUT_SCHEMA}`,
  ]
    .filter(Boolean)
    .join('\n');
}

/** blog 사용자 프롬프트 */
export function buildBlogUserPrompt(input: string): string {
  return `다음 원문을 바탕으로 블로그 게시용 콘텐츠를 재구성해 주세요. 원문에 없는 정보는 추가하지 마세요.\n\n[원문]\n${input.trim()}`;
}

/** blog 응답 파싱 → NormalizedAiContentResponse */
export function parseBlogResponse(
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
