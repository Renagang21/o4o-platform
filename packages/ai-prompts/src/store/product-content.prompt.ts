/**
 * Product AI Content Prompts
 * WO-O4O-PRODUCT-AI-CONTENT-PIPELINE-V1
 *
 * Product Master + AI Tags + OCR Text 기반 AI 콘텐츠 생성
 * 5가지 content type별 전용 프롬프트
 */

export interface ProductContentInput {
  id: string;
  purpose?: 'professional' | 'ai-support' | 'consumer-qr';
  productFacts?: string;
  professionalReference?: { content: string; source: string; reviewStatus: 'reviewed' | 'pending' };
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
- 제공된 근거에 있는 효능, 성분, 사용 대상을 설명하세요. 근거가 없는 항목은 만들지 말고 확인 필요로 표시하세요.`;

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
  parts.push(`이용 목적: ${product.purpose ?? 'consumer-qr'}`);
  parts.push('상품 사실과 전문 참고정보를 구분하세요. 질병명·진단·감별 과정을 주제 자체로 배제하지 마세요.');
  parts.push('상품 고유 사실은 제공된 상품 근거에서만 사용하고, 전문 참고정보를 제품의 확정 효과로 바꾸지 마세요.');
  parts.push('자료가 부족하면 필요한 근거를 명시하고, 상담 안내만으로 설명을 대신하지 마세요.');
  parts.push('제품명·태그·OCR만으로 효능·성분·용법을 추측하지 마세요.');
  if (product.productFacts?.trim()) parts.push(`[상품 사실 근거]\n${product.productFacts.trim()}`);
  if (product.professionalReference?.content.trim()) {
    const ref = product.professionalReference;
    parts.push(`[전문 참고정보 — ${ref.reviewStatus === 'reviewed' && ref.source.trim() ? '검수됨' : '검수 대기·확정 근거로 사용하지 않음'}]\n출처: ${ref.source.trim() || '미확인'}\n${ref.content.trim()}`);
  }
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

/** 소비자용 짧은 문구와 전문 판단지원 본문을 분리한다. */
export function buildProductContentSystemPrompt(type: ProductAiContentType, product: ProductContentInput): string {
  if ((type === 'product_description' || type === 'qr_description') &&
      (product.purpose === 'professional' || product.purpose === 'ai-support')) {
    return `당신은 전문인의 상품 이해·상담 판단을 지원하는 설명 작성 도우미입니다.
- 이용 목적: ${product.purpose}.
- 제공된 상품 사실과 별도 출처가 있는 전문 참고정보를 구분하세요.
- 질병명·진단·감별 과정, 판단 근거·추가 확인 사항을 충분히 설명하세요. 소비자용 글자 수 제한이나 구매 유도 목적을 적용하지 마세요.
- 검수 대기·출처 미확인 자료는 확정 근거로 사용하지 마세요. 근거 없는 상품 효능·개인별 확정 진단·처방을 만들지 마세요.
- 상담 안내로 설명을 대신하지 마세요. 출처와 검토 필요 사항을 본문에 보존하세요.
- 반드시 {"content":"설명 본문"} JSON만 출력하세요.`;
  }
  return PRODUCT_CONTENT_PROMPTS[type].system + `
- 상품 고유 사실과 전문 참고정보를 구분하고 제공된 근거만 사용하세요. 없는 효능·성분·용법을 만들지 마세요.
- 질병명·진단 과정 등 전문 주제를 일괄 배제하지 마세요. 검수 대기·출처 미확인 자료는 확정 근거로 사용하지 마세요.
- 근거와 사용 맥락을 유지하고, 상담 안내만으로 설명을 대신하지 마세요.`;
}
