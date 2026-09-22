/**
 * buildSupplierProductAuthoringPrompt — 공급자 제품정보 외부 LLM 작업 Prompt 조립 (순수 함수)
 *
 * WO-O4O-SUPPLIER-PRODUCT-AI-ASSISTED-CANDIDATE-AUTHORING-V1 §2.1 · §2.2
 *
 * Store 의 storeContentAuthoringPrompt(HTML 출력)와 원칙은 같지만 출력이 구조화 JSON 이라 별도 빌더다.
 * Prompt = Task + Source Context + Output Contract. 화면별 Prompt 복사본을 만들지 않는다.
 * 회원·주문·매출 등 개인정보·거래 정보는 넣지 않는다. 사진/PDF 는 사용자가 자기 LLM 대화에 직접 첨부한다.
 */

import type {
  SupplierProductAuthoringContext,
  SupplierProductCandidateDraft,
  SupplierProductSourceKind,
} from './types';
import { SUPPLIER_CANDIDATE_REGULATORY_TYPES } from './types';

/** 대표 CTA — Store 의 STORE_LLM_ASSIST_LABEL 과 같은 문구(테스트가 동일성을 고정). */
export const SUPPLIER_PRODUCT_LLM_ASSIST_LABEL = 'ChatGPT로 작업';

const REGULATORY_LABELS: Record<string, string> = {
  GENERAL: '일반(기타)',
  COSMETIC: '화장품',
  HEALTH_FUNCTIONAL: '건강기능식품',
  QUASI_DRUG: '의약외품',
  MEDICAL_DEVICE: '의료기기',
  DRUG: '의약품',
};

const SOURCE_KIND_LINES: Record<SupplierProductSourceKind, string[]> = {
  manual: ['자료: 아래 "현재 입력값"과 제가 이 대화에 적는 설명을 바탕으로 정리해 주세요.'],
  image: [
    '자료: 제품 사진(포장·라벨·성분표)을 이 대화에 첨부합니다. 사진에 실제로 인쇄된 정보만 읽어 주세요.',
    '사진이 아직 첨부되지 않았다면 첨부를 기다렸다가 작업해 주세요.',
  ],
  pdf: [
    '자료: 제품 소개서/카탈로그 PDF 를 이 대화에 첨부합니다. PDF 에 실제로 적힌 정보만 사용해 주세요.',
    'PDF 가 아직 첨부되지 않았다면 첨부를 기다렸다가 작업해 주세요.',
  ],
  url: ['자료: 아래 제품 상세 URL 의 내용을 확인해 정리해 주세요. 페이지에 없는 정보는 만들지 마세요.'],
  import: ['자료: 아래 "현재 입력값"은 제품 상세페이지에서 자동 추출한 초안입니다. 오류·누락을 바로잡아 주세요.'],
};

/** Output Contract 에 고정하는 규칙 — 추측 금지 · 모르면 null */
export const SUPPLIER_PRODUCT_OUTPUT_RULES: readonly string[] = [
  '자료에서 확인되지 않는 값은 반드시 null 로 두세요. 추측해서 채우지 마세요.',
  '바코드(barcode)는 자료에 실제로 인쇄·표기된 값만 적고, 없으면 null 입니다. 임의로 생성하지 마세요.',
  '허가번호(mfdsPermitNumber)는 자료에 명시된 값만 적고, 없으면 null 입니다. 생성하지 마세요.',
  'categoryId · brandId · drugCategory · imageUrl · contentImageUrls 는 항상 null(배열은 [])로 두세요. O4O 화면에서 사용자가 직접 선택합니다.',
  '브랜드는 brandName 에 이름만 적으세요. brandId 를 추측하지 마세요.',
  '의약품의 일반의약품(OTC)/전문의약품(Rx) 구분을 추측하지 마세요(drugCategory 는 항상 null).',
  'regulatoryType 은 자료에서 명확할 때만 ' + SUPPLIER_CANDIDATE_REGULATORY_TYPES.join(' | ') + ' 중 하나, 아니면 null.',
  'supplierId · masterId · serviceKeys · distributionType · 재고(stock)·유효기간·일련번호 같은 키는 넣지 마세요.',
  '가격(priceGeneral · consumerReferencePrice)은 자료에 숫자로 명시된 경우에만 숫자(원 단위)로 적고, 없으면 null.',
  '질병 치료·예방 효능을 단정하는 표현이나 확인되지 않은 수치(함량·용량·기간)를 설명에 넣지 마세요.',
  '결과는 아래 형식의 JSON 객체 1개만 출력하세요. 설명 문장·주석·여러 개의 JSON 을 붙이지 마세요.',
];

const OUTPUT_SCHEMA_TEXT = `{
  "name": "제품명(문자열) 또는 null",
  "barcode": "자료에 표기된 바코드(문자열) 또는 null",
  "categoryId": null,
  "brandId": null,
  "brandName": "브랜드명(문자열) 또는 null",
  "manufacturerName": "제조사명(문자열) 또는 null",
  "specification": "규격·용량·수량(예: 500mg x 60정) 또는 null",
  "originCountry": "원산지(문자열) 또는 null",
  "regulatoryType": "${SUPPLIER_CANDIDATE_REGULATORY_TYPES.join(' | ')} 중 하나 또는 null",
  "drugCategory": null,
  "regulatoryName": "식약처 등록 공식 제품명(문자열) 또는 null",
  "mfdsPermitNumber": "자료에 명시된 허가·신고번호(문자열) 또는 null",
  "imageUrl": null,
  "contentImageUrls": [],
  "offerDraft": {
    "priceGeneral": "숫자 또는 null",
    "consumerReferencePrice": "숫자 또는 null",
    "consumerShortDescription": "소비자용 한 줄 설명(200자 이내) 또는 null",
    "consumerDetailDescription": "소비자용 상세 설명(줄바꿈 가능한 텍스트) 또는 null",
    "isFeatured": false
  }
}`;

function clean(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s ? s : null;
}

/** currentDraft 중 비어 있지 않은 값만 "키: 값" 줄로 만든다(참고용 · null 은 생략). */
function currentDraftLines(draft: Partial<SupplierProductCandidateDraft> | null | undefined): string[] {
  if (!draft) return [];
  const lines: string[] = [];
  const push = (label: string, v: unknown) => {
    const s = clean(v);
    if (s) lines.push(`- ${label}: ${s}`);
  };
  push('제품명', draft.name);
  push('바코드', draft.barcode);
  push('브랜드명', draft.brandName);
  push('제조사', draft.manufacturerName);
  push('규격', draft.specification);
  push('원산지', draft.originCountry);
  push('규제명', draft.regulatoryName);
  push('허가번호', draft.mfdsPermitNumber);
  const offer = draft.offerDraft;
  if (offer) {
    if (typeof offer.priceGeneral === 'number') push('공급가', offer.priceGeneral);
    if (typeof offer.consumerReferencePrice === 'number') push('소비자 참고가', offer.consumerReferencePrice);
    push('간이 설명', offer.consumerShortDescription);
    push('상세 설명', offer.consumerDetailDescription);
  }
  return lines;
}

/**
 * 사람이 ChatGPT/Astra 대화창에 붙여 넣을 텍스트 Prompt.
 * API 를 부르지 않고, 결과를 저장하지 않는다.
 */
export function buildSupplierProductAuthoringPrompt(ctx: SupplierProductAuthoringContext): string {
  const sourceKind: SupplierProductSourceKind = ctx.sourceKind ?? 'manual';
  const parts: string[] = [];

  // ── Task ──
  parts.push(
    '[작업]',
    '아래 자료를 바탕으로 O4O 플랫폼에 등록할 제품 기준정보를 정리해 주세요.',
    '이 결과는 O4O 화면에 "검토용 초안"으로 적용되며, 제가 확인·수정한 뒤 제품 정보 검토 요청으로 제출됩니다.',
    '',
  );

  // ── Source Context ──
  parts.push('[자료와 현재 상태]');
  parts.push(...SOURCE_KIND_LINES[sourceKind]);
  const url = clean(ctx.sourceUrl);
  if (sourceKind === 'url' && url) parts.push(`- 제품 상세 URL: ${url}`);
  const label = clean(ctx.sourceLabel);
  if (label) parts.push(`- 자료 설명: ${label}`);
  const typeLabel = clean(ctx.productTypeLabel);
  if (typeLabel) parts.push(`- 등록 제품 구분(사용자 선택): ${typeLabel}`);
  const reg = clean(ctx.regulatoryType);
  if (reg) parts.push(`- 규제 구분 힌트(사용자 선택): ${REGULATORY_LABELS[reg] ?? reg} (${reg})`);
  const draftLines = currentDraftLines(ctx.currentDraft);
  if (draftLines.length > 0) {
    parts.push('- 현재 입력값(참고 · 자료와 다르면 자료를 우선하되 바뀐 이유를 알 수 있게 정확히 적어 주세요):');
    parts.push(...draftLines.map((l) => `  ${l}`));
  }
  const extra = clean(ctx.additionalInstruction);
  if (extra) parts.push(`- 추가 요청: ${extra}`);
  parts.push('');

  // ── Output Contract ──
  parts.push('[출력 규칙]');
  parts.push(...SUPPLIER_PRODUCT_OUTPUT_RULES.map((r) => `- ${r}`));
  parts.push('', '[출력 형식 — JSON 객체 1개]', '```json', OUTPUT_SCHEMA_TEXT, '```');

  return parts.join('\n');
}
