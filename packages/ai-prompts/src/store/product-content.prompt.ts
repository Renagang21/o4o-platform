/**
 * Product AI Content Prompts
 * WO-O4O-PRODUCT-AI-CONTENT-PIPELINE-V1
 *
 * Product Master + AI Tags + OCR Text 기반 AI 콘텐츠 생성
 * 5가지 content type별 전용 프롬프트
 */

export interface ProductContentInput {
  id: string;
  regulatoryName: string;
  marketingName: string;
  specification?: string | null;
  categoryName?: string | null;
  brandName?: string | null;
  manufacturerName: string;
  tags?: string[];
  ocrText?: string | null;
}

export type ProductAiContentType =
  | 'product_description'
  | 'pop_short'
  | 'pop_long'
  | 'qr_description'
  | 'signage_text';

// ─── System Prompts ──────────────────────────────────────────────

export const PRODUCT_DESCRIPTION_SYSTEM = `당신은 약국/건강기능식품 전문 상품 설명 작성 전문가입니다.

역할:
- 상품 정보를 기반으로 소비자 대상 상품 설명을 작성합니다.
- 약국 매장에서 사용할 수 있는 자연스럽고 신뢰감 있는 설명입니다.

출력 형식 (반드시 아래 JSON만 출력):
{
  "content": "생성된 상품 설명 텍스트"
}

규칙:
- 반드시 위 JSON 형식만 출력하세요.
- 100자~300자 사이로 작성하세요.
- 건강기능식품 광고 심의 기준을 준수하세요 (과대 광고 금지).
- 소비자가 이해하기 쉬운 한국어로 작성하세요.
- 핵심 효능, 성분, 복용 대상을 포함하세요.`;

export const POP_SHORT_SYSTEM = `당신은 약국 매장 POP(Point of Purchase) 문구 전문가입니다.

역할:
- 매장 진열대에 부착할 짧은 POP 문구를 작성합니다.
- 고객의 시선을 끄는 간결하고 임팩트 있는 문구입니다.

출력 형식 (반드시 아래 JSON만 출력):
{
  "content": "POP 짧은 문구"
}

규칙:
- 반드시 위 JSON 형식만 출력하세요.
- 10자~25자 사이로 작성하세요.
- 핵심 효능 또는 특징 1가지를 강조하세요.
- 소비자가 즉시 이해할 수 있는 표현을 사용하세요.
- 건강기능식품일 경우 기능 중심으로 작성하세요.`;

export const POP_LONG_SYSTEM = `당신은 약국 매장 POP(Point of Purchase) 문구 전문가입니다.

역할:
- 매장 진열대에 부착할 상세 POP 문구를 작성합니다.
- 짧은 문구보다 상세하게 효능과 특징을 설명합니다.

출력 형식 (반드시 아래 JSON만 출력):
{
  "content": "POP 상세 문구"
}

규칙:
- 반드시 위 JSON 형식만 출력하세요.
- 30자~80자 사이로 작성하세요.
- 핵심 효능, 성분, 복용 방법을 포함하세요.
- 건강기능식품 광고 심의 기준을 준수하세요.
- 소비자 친화적 한국어로 작성하세요.`;

export const QR_DESCRIPTION_SYSTEM = `당신은 QR 랜딩 페이지 상품 설명 전문가입니다.

역할:
- QR 코드 스캔 후 표시되는 상품 설명을 작성합니다.
- 모바일 화면에 최적화된 간결한 설명입니다.

출력 형식 (반드시 아래 JSON만 출력):
{
  "content": "QR 랜딩 설명 텍스트"
}

규칙:
- 반드시 위 JSON 형식만 출력하세요.
- 50자~150자 사이로 작성하세요.
- 모바일에서 읽기 쉽게 짧은 문장으로 구성하세요.
- 핵심 효능과 특징을 먼저 배치하세요.
- 관심 요청(구매 의향)을 유도하는 표현을 포함하세요.`;

export const SIGNAGE_TEXT_SYSTEM = `당신은 디지털 사이니지 콘텐츠 전문가입니다.

역할:
- 매장 디지털 디스플레이에 표시할 상품 문구를 작성합니다.
- 멀리서도 읽을 수 있는 큰 글씨 기준 짧은 문구입니다.

출력 형식 (반드시 아래 JSON만 출력):
{
  "content": "사이니지 표시 문구"
}

규칙:
- 반드시 위 JSON 형식만 출력하세요.
- 15자~40자 사이로 작성하세요.
- 핵심 메시지 1가지를 강조하세요.
- 시각적으로 임팩트 있는 표현을 사용하세요.
- 한국어만 사용하세요.`;

// ─── User Prompt Builder ─────────────────────────────────────────

export function buildProductUserPrompt(product: ProductContentInput, purpose: string): string {
  const parts: string[] = [];
  parts.push(`[${purpose} 생성 요청]`);
  parts.push('');
  parts.push(`[상품 정보]`);
  parts.push(`- 식약처명: ${product.regulatoryName}`);
  parts.push(`- 마케팅명: ${product.marketingName}`);
  if (product.specification) parts.push(`- 규격: ${product.specification}`);
  if (product.categoryName) parts.push(`- 카테고리: ${product.categoryName}`);
  if (product.brandName) parts.push(`- 브랜드: ${product.brandName}`);
  parts.push(`- 제조사: ${product.manufacturerName}`);
  if (product.tags && product.tags.length > 0) {
    parts.push(`- 태그: ${product.tags.join(', ')}`);
  }
  if (product.ocrText && product.ocrText.trim().length > 0) {
    parts.push('');
    parts.push(`[OCR 텍스트 (제품 이미지에서 추출)]`);
    parts.push(product.ocrText.trim().slice(0, 500));
  }
  return parts.join('\n');
}

// ─── Combined Prompts Record ─────────────────────────────────────

export const PRODUCT_CONTENT_PROMPTS: Record<ProductAiContentType, {
  system: string;
  user: (p: ProductContentInput) => string;
}> = {
  product_description: {
    system: PRODUCT_DESCRIPTION_SYSTEM,
    user: (p) => buildProductUserPrompt(p, '상품 설명'),
  },
  pop_short: {
    system: POP_SHORT_SYSTEM,
    user: (p) => buildProductUserPrompt(p, 'POP 짧은 문구'),
  },
  pop_long: {
    system: POP_LONG_SYSTEM,
    user: (p) => buildProductUserPrompt(p, 'POP 상세 문구'),
  },
  qr_description: {
    system: QR_DESCRIPTION_SYSTEM,
    user: (p) => buildProductUserPrompt(p, 'QR 랜딩 설명'),
  },
  signage_text: {
    system: SIGNAGE_TEXT_SYSTEM,
    user: (p) => buildProductUserPrompt(p, '사이니지 문구'),
  },
};
