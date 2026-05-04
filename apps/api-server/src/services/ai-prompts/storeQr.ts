/**
 * AI Prompt — store_qr (QR 안내문)
 *
 * WO-O4O-STORE-USE-CONTENT-TRANSFORM-V1
 *
 * 목적: 원문을 QR 코드 랜딩 페이지용 짧은 안내문으로 재구성
 * 특징: 짧고 명확, 스캔 후 고객이 즉시 이해할 수 있는 안내 중심
 */

import { COMMON_SYSTEM_RULES, buildOptionInstructions } from './common.js';
import type { NormalizedAiContentResponse } from './common.js';

const OUTPUT_SCHEMA = `{
  "html": "QR 랜딩용 간단 HTML (<p>, <strong>, <ul>/<li> 허용)",
  "title": "QR 안내 제목 (20자 이내)",
  "summary": "한 줄 핵심 안내 (30자 이내)",
  "shortText": "QR 스캔 직후 보여줄 짧은 안내 (1~2문장, 50자 이내)",
  "longText": "QR 랜딩 본문 안내 (3~5문장, 상세 안내)"
}`;

const TYPE_RULES = `[QR 안내문 작성 규칙]
- 입력된 원문을 QR 코드 스캔 후 고객에게 보여줄 안내문으로 재구성한다.
- QR을 스캔한 고객이 즉시 이해할 수 있도록 명확하고 간단하게 작성한다.
- title은 QR 랜딩 페이지 상단 제목으로, 20자 이내의 짧고 명확한 문장.
- shortText는 스캔 직후 보여줄 핵심 안내 (예: "이 약의 올바른 복용법을 안내합니다").
- longText는 QR 랜딩 페이지 본문으로, 3~5문장 이내의 핵심 정보.
- html은 shortText + longText를 합쳐 간단한 HTML로 조합한다.
- 불필요한 장식적 표현 금지. 정보 전달에 집중.
- 원문에 없는 정보 추가 금지.`;

export function buildStoreQrSystemPrompt(
  options: { tone?: string; length?: string; audience?: string }
): string {
  const optionInstructions = buildOptionInstructions(options, 'store_qr');
  return [
    COMMON_SYSTEM_RULES,
    TYPE_RULES,
    optionInstructions,
    `\n[출력 형식]\n반드시 아래 JSON 구조만 출력한다:\n${OUTPUT_SCHEMA}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildStoreQrUserPrompt(input: string): string {
  return `다음 원문을 바탕으로 QR 코드 안내문을 작성해 주세요. 원문에 없는 정보는 추가하지 마세요.\n\n[원문]\n${input.trim()}`;
}

export function parseStoreQrResponse(
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
