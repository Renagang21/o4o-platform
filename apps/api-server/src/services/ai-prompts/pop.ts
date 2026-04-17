/**
 * AI Prompt — pop (Point of Purchase)
 *
 * WO-AI-PROMPT-STRUCTURE-DESIGN-V1
 *
 * 목적: 원문을 POP 템플릿 입력용 문구 세트로 재구성
 * 특징: 짧고 강한 메시지, 템플릿 슬롯 기반 구조, 과한 문장 길이 금지
 */

import { COMMON_SYSTEM_RULES, buildOptionInstructions } from './common.js';
import type { NormalizedAiContentResponse } from './common.js';

const OUTPUT_SCHEMA = `{
  "html": "참고용 간단 HTML (선택, 없으면 빈 문자열)",
  "title": "POP 헤드라인 (15자 이내)",
  "summary": "핵심 메시지 요약 (2줄 이내)",
  "bullets": ["포인트 1", "포인트 2", "포인트 3"],
  "shortText": "짧은 메시지 (1~2문장, 30자 이내)",
  "longText": "긴 메시지 (3~5문장, 템플릿 본문용)"
}`;

const TYPE_RULES = `[POP 작성 규칙]
- 입력된 원문을 POP(Point of Purchase) 템플릿 슬롯에 들어갈 문구 세트로 재구성한다.
- title은 짧고 임팩트 있게. 의문형·명령형·혜택 강조형 모두 허용.
- shortText는 매장 내 짧은 노출 공간(스티커, 배너 등)을 전제로 최대 30자.
- longText는 A4 절반 크기 POP 본문을 전제로 3~5문장 이내.
- bullets는 고객이 한눈에 파악할 수 있는 핵심 포인트 3~5개.
- 과장·허위 표현 금지. 원문 근거 없는 효능 주장 금지.
- html은 필요 시 참고용으로만 간단히 생성 가능. 없어도 무방.`;

/** pop 시스템 프롬프트 조합 */
export function buildPopSystemPrompt(
  options: { tone?: string; length?: string; audience?: string }
): string {
  const optionInstructions = buildOptionInstructions(options, 'pop');
  return [
    COMMON_SYSTEM_RULES,
    TYPE_RULES,
    optionInstructions,
    `\n[출력 형식]\n반드시 아래 JSON 구조만 출력한다:\n${OUTPUT_SCHEMA}`,
  ]
    .filter(Boolean)
    .join('\n');
}

/** pop 사용자 프롬프트 */
export function buildPopUserPrompt(input: string): string {
  return `다음 원문을 바탕으로 POP 템플릿용 문구 세트를 재구성해 주세요. 원문에 없는 정보는 추가하지 마세요.\n\n[원문]\n${input.trim()}`;
}

/** pop 응답 파싱 → NormalizedAiContentResponse */
export function parsePopResponse(
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
