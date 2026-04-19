/**
 * AI Prompt — title_suggest (제목 추천)
 *
 * WO-STORE-AI-CONTENT-ASSIST-V1
 *
 * 목적: 원문 기반 제목 후보 3-5개 생성
 * 특징: 15자 이내, 매장 POP/QR 맥락, 한국어 자연스러운 제목
 */

import { COMMON_SYSTEM_RULES, buildOptionInstructions } from './common.js';
import type { NormalizedAiContentResponse } from './common.js';

const OUTPUT_SCHEMA = `{
  "html": "제목 후보 리스트를 HTML <ol> 태그로 구성",
  "title": "가장 추천하는 제목 (1순위)",
  "summary": "",
  "bullets": ["제목 후보 1", "제목 후보 2", "제목 후보 3", "제목 후보 4", "제목 후보 5"],
  "shortText": "가장 추천하는 제목 (1순위, title과 동일)",
  "longText": ""
}`;

const TYPE_RULES = `[제목 추천 규칙]
- 입력된 원문의 핵심 주제를 기반으로 제목 후보 3-5개를 제안한다.
- 각 제목은 15자 이내로 간결하게 작성한다.
- 한국어로 자연스럽고, 매장 POP/QR/콘텐츠 제목으로 적합해야 한다.
- 첫 번째 제목이 가장 추천하는 후보이다.
- 다양한 스타일 포함: 의문형, 명령형, 명사형, 혜택 강조형 등.
- bullets 배열에 제목 후보를 담는다.
- html은 <ol><li> 태그로 후보 리스트를 구성한다.
- 원문에 없는 효능이나 허위 내용을 제목에 포함하지 않는다.`;

/** title_suggest 시스템 프롬프트 조합 */
export function buildTitleSuggestSystemPrompt(
  options: { tone?: string; length?: string; audience?: string }
): string {
  const optionInstructions = buildOptionInstructions(options, 'title_suggest');
  return [
    COMMON_SYSTEM_RULES,
    TYPE_RULES,
    optionInstructions,
    `\n[출력 형식]\n반드시 아래 JSON 구조만 출력한다:\n${OUTPUT_SCHEMA}`,
  ]
    .filter(Boolean)
    .join('\n');
}

/** title_suggest 사용자 프롬프트 */
export function buildTitleSuggestUserPrompt(input: string): string {
  return `다음 원문을 바탕으로 매장 콘텐츠/POP/QR 제목으로 적합한 후보 3-5개를 추천해 주세요. 각 제목은 15자 이내로 작성하세요.\n\n[원문]\n${input.trim()}`;
}

/** title_suggest 응답 파싱 → NormalizedAiContentResponse */
export function parseTitleSuggestResponse(
  parsed: Record<string, any>,
  rawText: string
): Omit<NormalizedAiContentResponse, 'type'> {
  const bullets = Array.isArray(parsed.bullets) ? parsed.bullets : [];

  // html fallback: 불릿을 <ol> 리스트로 변환
  const html =
    parsed.html ||
    (bullets.length > 0
      ? `<ol>${bullets.map((b: string) => `<li>${b}</li>`).join('')}</ol>`
      : `<p>${rawText.replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>')}</p>`);

  return {
    html,
    title: typeof parsed.title === 'string' ? parsed.title : (bullets[0] || ''),
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    bullets,
    shortText: typeof parsed.shortText === 'string' ? parsed.shortText : (bullets[0] || ''),
    longText: typeof parsed.longText === 'string' ? parsed.longText : '',
  };
}
