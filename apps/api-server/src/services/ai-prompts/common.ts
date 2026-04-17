/**
 * AI Prompt — 공통 시스템 규칙
 *
 * WO-AI-PROMPT-STRUCTURE-DESIGN-V1
 *
 * 모든 outputType에 공통 적용되는 기준을 정의한다.
 * "새 글 생성"이 아닌 "기존 콘텐츠 재구성" 원칙을 유지한다.
 */

/** 모든 outputType에 공통으로 적용하는 시스템 원칙 */
export const COMMON_SYSTEM_RULES = `[공통 원칙]
- 입력된 원문을 바탕으로 재구성한다. 원문에 없는 정보를 창작하거나 추가하지 않는다.
- 사실 왜곡 금지. 원문이 모호하면 모호한 채로 유지한다.
- 과장·허위 표현 금지 (예: "완벽한", "최고의", "100% 효과" 등).
- 불필요한 의료적 확정 표현 금지 (예: "치료된다", "치유한다").
- HTML 결과는 편집기에서 후수정이 가능하도록 단순한 태그만 사용한다.
- script, style, iframe, form, input 등 실행·위험 태그 사용 금지.
- 과도하게 복잡한 중첩 마크업 금지.
- 응답은 반드시 유효한 JSON 형식 하나만 출력한다. 마크다운 코드블록(\`\`\`) 금지.`;

/** tone 옵션을 outputType에 맞게 한국어 지시로 변환 */
export function buildToneInstruction(
  tone: string | undefined,
  outputType: string
): string {
  if (!tone) return '';

  const map: Record<string, Record<string, string>> = {
    product_detail: {
      friendly: '친근하고 따뜻한 톤으로 작성하세요. 고객이 편하게 읽을 수 있도록 자연스러운 말투를 사용하세요.',
      professional: '전문적이고 신뢰감 있는 톤으로 작성하세요. 정확하고 명확한 표현을 사용하세요.',
      concise: '간결하고 핵심만 담아 작성하세요. 불필요한 수식어를 최소화하세요.',
    },
    blog: {
      friendly: '부드럽고 공감가는 어조로 작성하세요. 독자와 대화하듯 자연스러운 문체를 사용하세요.',
      professional: '정보 전달에 충실한 설명형 어조로 작성하세요. 근거와 흐름이 명확하게 드러나야 합니다.',
      concise: '핵심 정보 중심으로 간결하게 작성하세요. 문단은 짧고 명료하게 유지하세요.',
    },
    pop: {
      friendly: '짧고 따뜻한 메시지로 작성하세요.',
      professional: '신뢰감 있고 선명한 메시지로 작성하세요.',
      concise: '최대한 짧고 강렬하게 핵심만 작성하세요.',
    },
  };

  return map[outputType]?.[tone] ?? '';
}

/** length 옵션을 outputType에 맞게 한국어 지시로 변환 */
export function buildLengthInstruction(
  length: string | undefined,
  outputType: string
): string {
  if (!length) return '';

  if (outputType === 'pop') {
    const map: Record<string, string> = {
      short: '제목 1문장, shortText 1문장, longText 2~3문장 이내로 작성하세요.',
      medium: '제목 1문장, shortText 1~2문장, longText 3~4문장으로 작성하세요.',
      long: '제목 1문장, shortText 2문장, longText 5문장 이내로 작성하세요.',
    };
    return map[length] ?? '';
  }

  // product_detail, blog: 문단 수 기준
  const map: Record<string, string> = {
    short: '본문은 2~3개 문단 또는 200자 이내로 간략하게 작성하세요.',
    medium: '본문은 3~5개 문단 또는 300~500자 분량으로 작성하세요.',
    long: '본문은 5개 이상 문단 또는 500자 이상 풍부하게 작성하세요.',
  };
  return map[length] ?? '';
}

/** audience 옵션을 한국어 지시로 변환 */
export function buildAudienceInstruction(audience: string | undefined): string {
  if (!audience) return '';
  const map: Record<string, string> = {
    general: '일반 소비자가 이해하기 쉬운 수준으로 작성하세요.',
    pharmacy: '약국 방문 고객을 대상으로 작성하세요. 전문 용어는 쉽게 풀어서 설명하세요.',
    operator: '운영자나 실무자를 대상으로 작성하세요. 핵심 정보와 수치 위주로 정리하세요.',
  };
  return map[audience] ?? '';
}

/** 공통 옵션 계층을 조합한 지시문 생성 */
export function buildOptionInstructions(
  options: { tone?: string; length?: string; audience?: string },
  outputType: string
): string {
  const parts = [
    buildToneInstruction(options.tone, outputType),
    buildLengthInstruction(options.length, outputType),
    buildAudienceInstruction(options.audience),
  ].filter(Boolean);

  if (parts.length === 0) return '';
  return `\n[작성 옵션]\n${parts.map((p) => `- ${p}`).join('\n')}`;
}

/** AI 응답(파싱 실패 포함)을 공통 구조로 정규화 */
export interface NormalizedAiContentResponse {
  html: string;
  title: string;
  summary: string;
  bullets: string[];
  shortText: string;
  longText: string;
  type: string;
}

export function normalizeAiResponse(
  parsed: Record<string, any>,
  rawText: string,
  outputType: string
): NormalizedAiContentResponse {
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
    type: outputType,
  };
}
