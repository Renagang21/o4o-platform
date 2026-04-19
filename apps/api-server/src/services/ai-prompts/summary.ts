/**
 * AI Prompt — summary (짧게 요약)
 *
 * WO-STORE-AI-CONTENT-ASSIST-V1
 *
 * 목적: 원문을 3-5줄 요약 + 핵심 불릿으로 재구성
 * 특징: 원본 의미 보존, 짧고 명확한 요약, 불필요한 수식어 제거
 */

import { COMMON_SYSTEM_RULES, buildOptionInstructions } from './common.js';
import type { NormalizedAiContentResponse } from './common.js';

const OUTPUT_SCHEMA = `{
  "html": "요약 결과를 HTML 형식으로 (간단한 <p>, <ul> 태그만 사용)",
  "title": "요약 제목 (원문 주제 기반, 15자 이내)",
  "summary": "핵심 요약 (3-5줄)",
  "bullets": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"],
  "shortText": "한 줄 요약 (1문장, 40자 이내)"
}`;

const TYPE_RULES = `[요약 작성 규칙]
- 입력된 원문의 핵심 내용을 3-5줄로 요약한다.
- 원문의 의미를 왜곡하거나 새로운 정보를 추가하지 않는다.
- bullets는 핵심 포인트 3-5개. 각 항목은 명사형 또는 짧은 문장형.
- shortText는 전체를 대표하는 한 줄 요약 (40자 이내).
- title은 원문 주제를 반영한 간결한 제목 (15자 이내).
- html은 요약 결과를 <p>와 <ul><li> 태그로 구성한다.
- 불필요한 수식어, 감탄사, 과장 표현을 제거한다.`;

/** summary 시스템 프롬프트 조합 */
export function buildSummarySystemPrompt(
  options: { tone?: string; length?: string; audience?: string }
): string {
  const optionInstructions = buildOptionInstructions(options, 'summary');
  return [
    COMMON_SYSTEM_RULES,
    TYPE_RULES,
    optionInstructions,
    `\n[출력 형식]\n반드시 아래 JSON 구조만 출력한다:\n${OUTPUT_SCHEMA}`,
  ]
    .filter(Boolean)
    .join('\n');
}

/** summary 사용자 프롬프트 */
export function buildSummaryUserPrompt(input: string): string {
  return `다음 원문을 핵심만 남겨 짧게 요약해 주세요. 원문에 없는 정보는 추가하지 마세요.\n\n[원문]\n${input.trim()}`;
}

/** summary 응답 파싱 → NormalizedAiContentResponse */
export function parseSummaryResponse(
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
    shortText: typeof parsed.shortText === 'string' ? parsed.shortText : '',
    longText: typeof parsed.longText === 'string' ? parsed.longText : '',
  };
}
