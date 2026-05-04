/**
 * AI Prompt — store_sns (SNS 공유문)
 *
 * WO-O4O-STORE-USE-CONTENT-TRANSFORM-V1
 *
 * 목적: 원문을 SNS 게시용 공유문으로 재구성
 * 특징: 짧고 임팩트 있는 SNS 포스트, 해시태그 포함, 공유 유도
 */

import { COMMON_SYSTEM_RULES, buildOptionInstructions } from './common.js';
import type { NormalizedAiContentResponse } from './common.js';

const OUTPUT_SCHEMA = `{
  "html": "SNS 포스트용 간단 HTML (<p>, <strong> 허용, 해시태그 포함)",
  "title": "SNS 포스트 첫 줄 문구 (30자 이내, 주목을 끄는 문장)",
  "summary": "핵심 내용 한 줄 요약 (30자 이내)",
  "shortText": "짧은 버전 SNS 포스트 (2~3문장, 인스타그램/X 스타일)",
  "longText": "긴 버전 SNS 포스트 (4~6문장, 블로그형 SNS 스타일, 해시태그 포함)"
}`;

const TYPE_RULES = `[SNS 공유문 작성 규칙]
- 입력된 원문을 SNS(인스타그램, 블로그, 카카오 등) 공유용 게시물로 재구성한다.
- title은 피드에서 눈에 띄는 첫 문장. 질문형·혜택형·공감형 허용.
- shortText는 인스타그램이나 X(트위터) 스타일의 짧고 임팩트 있는 포스트.
- longText는 블로그형 SNS(네이버 블로그, 카카오 채널 등) 스타일의 길고 자세한 포스트.
- longText 마지막에 관련 해시태그 3~5개를 추가한다 (예: #약국 #건강정보 #복약안내).
- 과장·허위 표현 금지. 원문 근거 없는 효능 주장 금지.
- 원문에 없는 정보 추가 금지.`;

export function buildStoreSnsSystemPrompt(
  options: { tone?: string; length?: string; audience?: string }
): string {
  const optionInstructions = buildOptionInstructions(options, 'store_sns');
  return [
    COMMON_SYSTEM_RULES,
    TYPE_RULES,
    optionInstructions,
    `\n[출력 형식]\n반드시 아래 JSON 구조만 출력한다:\n${OUTPUT_SCHEMA}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildStoreSnsUserPrompt(input: string): string {
  return `다음 원문을 바탕으로 SNS 공유문을 작성해 주세요. 원문에 없는 정보는 추가하지 마세요.\n\n[원문]\n${input.trim()}`;
}

export function parseStoreSnsResponse(
  parsed: Record<string, any>,
  rawText: string
): Omit<NormalizedAiContentResponse, 'type'> {
  const title = typeof parsed.title === 'string' ? parsed.title : '';
  const shortText = typeof parsed.shortText === 'string' ? parsed.shortText : '';
  const longText = typeof parsed.longText === 'string' ? parsed.longText : '';

  const html =
    parsed.html ||
    [
      title ? `<p><strong>${title}</strong></p>` : '',
      shortText ? `<p>${shortText}</p>` : '',
      longText ? `<p>${longText}</p>` : '',
    ]
      .filter(Boolean)
      .join('') ||
    `<p>${rawText.replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>')}</p>`;

  return {
    html,
    title,
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    bullets: Array.isArray(parsed.bullets) ? parsed.bullets : [],
    shortText,
    longText,
  };
}
