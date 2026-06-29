/**
 * AI Prompt — qr_description (QR 전용 AI 설명)
 *
 * WO-O4O-KPA-QR-AI-DESCRIPTION-SINGLE-CORNER-V1
 *
 * 목적: 매장 경영자가 입력한 "상품명 + 강조점"(단일) 또는 "코너명 + 상품 항목들"(코너)을
 *       바탕으로 QR 랜딩에 쓸 안내 콘텐츠 HTML 을 생성한다. 등록 상품 ID 와 무관 — 매장 입력만 사용.
 *
 * 출력 계약:
 *   single  → { title, html }
 *   corner  → { html (코너 소개), items: [{ key, descriptionHtml, relatedKeys[] }] }
 *
 * Guardrail: COMMON_SYSTEM_RULES (과장/의료확정/위험태그 금지) + 효능 단정·진단/치료 단언 금지.
 *   - 입력에 없는 item key 는 사용 금지(서버가 추가 검증/제거).
 */

import { COMMON_SYSTEM_RULES } from './common.js';

export type QrDescriptionMode = 'single' | 'corner';

export interface QrDescriptionItemInput {
  key: string;
  name: string;
  emphasis?: string;
}

export interface QrDescriptionInput {
  mode: QrDescriptionMode;
  /** single 전용 */
  productName?: string;
  /** corner 전용 */
  cornerName?: string;
  /** single=상품 강조점 / corner=코너 전체 강조점 */
  emphasis?: string;
  /** corner 전용 — 매장이 입력한 상품 항목들 */
  items?: QrDescriptionItemInput[];
  options?: { tone?: string; length?: string; audience?: string };
}

export interface QrDescriptionItemOutput {
  key: string;
  descriptionHtml: string;
  relatedKeys: string[];
}

export interface QrDescriptionParsed {
  title: string;
  html: string;
  items: QrDescriptionItemOutput[];
}

const SAFETY_RULES = `[QR 설명 작성 규칙]
- 입력된 상품명/코너명/강조점만 근거로 작성한다. 입력에 없는 사실·수치·성분·효과를 지어내지 않는다.
- 약·건강 관련 효능을 단정하거나 질병의 진단·치료·예방을 단언하지 않는다("치료한다", "낫는다" 등 금지).
- 과장·최상급 표현(최고, 완벽, 100%)을 피하고, 매장 안내문 톤으로 친절하고 명확하게 쓴다.
- 허용 태그: section, div, p, h2, h3, ul, ol, li, strong, br 만 사용. script/style/iframe/form/input/이미지 외부 리소스 금지.
- 색상·여백 등 간단한 디자인은 태그의 style 속성(인라인)으로만 표현한다.`;

const SINGLE_SCHEMA = `{
  "title": "QR 상단 제목 (상품명 기반, 24자 이내)",
  "html": "<section>...상품 소개 본문(HTML)...</section>"
}`;

const CORNER_SCHEMA = `{
  "html": "<section>...코너 전체 소개(HTML)...</section>",
  "items": [
    {
      "key": "입력으로 받은 item key 를 그대로 사용",
      "descriptionHtml": "<p>해당 상품의 짧은 설명(2~4문장 HTML)</p>",
      "relatedKeys": ["같은 코너 안의 함께 보면 좋은 다른 item key (없으면 빈 배열)"]
    }
  ]
}`;

export function buildQrDescriptionSystemPrompt(mode: QrDescriptionMode): string {
  const schema = mode === 'corner' ? CORNER_SCHEMA : SINGLE_SCHEMA;
  const modeRule =
    mode === 'corner'
      ? `[코너 모드]\n- 코너 전체 소개(html)는 코너명/강조점을 살린 2~4문장.\n- items 의 각 항목은 입력으로 받은 item 마다 1개씩, key 를 입력값 그대로 사용한다. 입력에 없는 key 를 만들지 않는다.\n- relatedKeys 는 같은 코너 안의 다른 item key 중 함께 안내하면 좋은 것만(없으면 빈 배열). 입력에 없는 key 금지.`
      : `[단일 모드]\n- 하나의 상품을 소개하는 본문 html 과 제목 title 을 만든다.`;
  return [
    COMMON_SYSTEM_RULES,
    SAFETY_RULES,
    modeRule,
    `\n[출력 형식]\n반드시 아래 JSON 구조만 출력한다(설명 문장 없이 JSON 만):\n${schema}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildQrDescriptionUserPrompt(input: QrDescriptionInput): string {
  const opt = input.options ?? {};
  const optLine = [
    opt.audience ? `대상 고객: ${opt.audience}` : '',
    opt.tone ? `톤: ${opt.tone}` : '',
    opt.length ? `분량: ${opt.length}` : '',
  ]
    .filter(Boolean)
    .join(' / ');

  if (input.mode === 'corner') {
    const items = (input.items ?? [])
      .map(
        (it, i) =>
          `${i + 1}. key="${it.key}" / 상품명="${it.name}"${it.emphasis ? ` / 강조점="${it.emphasis}"` : ''}`,
      )
      .join('\n');
    return [
      `다음 코너의 안내 콘텐츠를 작성해 주세요. 각 상품 설명은 아래 입력만 근거로 합니다.`,
      `[코너명] ${input.cornerName ?? ''}`,
      input.emphasis ? `[코너 강조점] ${input.emphasis}` : '',
      optLine ? `[옵션] ${optLine}` : '',
      `[상품 항목 — 이 key 들만 사용]`,
      items || '(항목 없음)',
    ]
      .filter(Boolean)
      .join('\n');
  }

  return [
    `다음 상품의 QR 안내 콘텐츠를 작성해 주세요. 아래 입력만 근거로 합니다.`,
    `[상품명] ${input.productName ?? ''}`,
    input.emphasis ? `[강조점] ${input.emphasis}` : '',
    optLine ? `[옵션] ${optLine}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

/**
 * 모델 응답(parsed)을 검증·정규화한다.
 *  - single: title/html 추출.
 *  - corner: html + items(입력 key 화이트리스트 통과만, relatedKeys 도 입력 key 로 제한).
 * rawText 는 parsed.html 이 비었을 때 폴백 본문 생성용.
 */
export function parseQrDescriptionResponse(
  mode: QrDescriptionMode,
  parsed: Record<string, any>,
  rawText: string,
  inputItemKeys: string[],
): QrDescriptionParsed {
  const keySet = new Set(inputItemKeys);

  const fallbackHtml =
    asString(parsed.html) ||
    (rawText.trim()
      ? `<section><p>${rawText.trim().replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>')}</p></section>`
      : '');

  if (mode === 'single') {
    return { title: asString(parsed.title), html: fallbackHtml, items: [] };
  }

  const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
  const items: QrDescriptionItemOutput[] = rawItems
    .map((it: any) => ({
      key: asString(it?.key),
      descriptionHtml: asString(it?.descriptionHtml),
      relatedKeys: Array.isArray(it?.relatedKeys) ? it.relatedKeys.map(asString) : [],
    }))
    // 입력에 없는 key 는 제거(서버 검증)
    .filter((it: QrDescriptionItemOutput) => keySet.has(it.key))
    .map((it: QrDescriptionItemOutput) => ({
      ...it,
      relatedKeys: it.relatedKeys.filter((k) => k !== it.key && keySet.has(k)),
    }));

  return { title: '', html: fallbackHtml, items };
}
