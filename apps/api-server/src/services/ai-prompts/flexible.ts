/**
 * AI Prompt — flexible
 *
 * WO-O4O-KPA-AI-CONTENT-MODE-PRESET-REMOVAL-V1
 *
 * 목적: 모달의 "정리 모드" 프리셋이 제거된 이후의 default 변환 경로.
 *
 * 핵심 철학:
 *   - 결과 형식을 사전에 강제하지 않는다.
 *   - 사용자의 "추가 요청사항(customPrompt)" 이 최종 생성 의도를 결정한다.
 *   - tone / length 는 보조 가이드일 뿐, customPrompt 와 충돌하면 customPrompt 우선.
 *
 * 다른 outputType (product_detail / blog / summary / pop / store_qr / title_suggest)
 * 와 달리 본 builder 는 "원본을 X 형식으로 재구성하라" 같은 사전 형식 지시를 두지 않는다.
 * 따라서 사용자가 "POP 문구로 작성" / "A4 1장 길이 강의자료" / "제목만 추천" 등
 * 무엇을 적든 그 의도가 출력 형식이 된다.
 */

import { COMMON_SYSTEM_RULES, buildOptionInstructions } from './common.js';
import type { NormalizedAiContentResponse } from './common.js';

const OUTPUT_SCHEMA = `{
  "html": "사용자 요청에 맞춰 작성한 HTML 본문",
  "title": "한 줄 제목 (선택)",
  "summary": "한 줄 요약 (선택, 없으면 빈 문자열)"
}`;

const TYPE_RULES = `[작성 규칙]
- 사용자의 [사용자 추가 요청] 블록이 출력 형식과 분량의 1순위 기준이다.
  · 요청이 없거나 모호하면 입력 원문을 깨끗한 HTML 본문으로 정리한다.
  · 요청이 명확하면 그 의도(예: 블로그 글, POP 문구, QR 안내문, 제목 추천, A4 1장 장문 등)대로 따른다.
- 결과 형식을 일방적으로 "요약" 으로 좁히지 말 것. 입력 원문을 자의적으로 축소하지 않는다.
- HTML 본문은 편집기에서 후수정이 가능한 단순 태그만 사용:
  · 본문 단락: <p>
  · 강조: <strong>
  · 목록: <ul><li> / <ol><li>
  · 섹션 구분: <h2>, <h3>
  · 인용: <blockquote>
- script / style / iframe / form / input / 인라인 style 사용 금지.
- title 과 summary 는 원문 또는 사용자 요청에서 자연스럽게 도출되는 경우에만 채운다. 강제하지 않는다.`;

/** flexible 시스템 프롬프트 조합 */
export function buildFlexibleSystemPrompt(
  options: { tone?: string; length?: string; audience?: string }
): string {
  const optionInstructions = buildOptionInstructions(options, 'flexible');
  return [
    COMMON_SYSTEM_RULES,
    TYPE_RULES,
    optionInstructions,
    `\n[출력 형식]\n반드시 아래 JSON 구조만 출력한다 (사용자 요청과 출력 형식 사이에 충돌이 있으면 사용자 요청 우선):\n${OUTPUT_SCHEMA}`,
  ]
    .filter(Boolean)
    .join('\n');
}

/** flexible 사용자 프롬프트 */
export function buildFlexibleUserPrompt(input: string): string {
  return `다음 원본을 사용자 요청에 맞춰 재구성하세요. 원문에 없는 사실을 창작하지 마세요.\n\n[원본]\n${input.trim()}`;
}

/** flexible 응답 파싱 → NormalizedAiContentResponse */
export function parseFlexibleResponse(
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
