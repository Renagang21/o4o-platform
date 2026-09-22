/**
 * applySupplierProductDraft — 검증된 Draft → 화면 폼 값 (순수 함수 · 저장 없음)
 *
 * WO-O4O-SUPPLIER-PRODUCT-AI-ASSISTED-CANDIDATE-AUTHORING-V1 §2.3
 *
 * - 결과는 "새 폼 값"일 뿐이다. 이 함수는 API 를 부르지 않고 어떤 저장도 하지 않는다.
 *   실제 Candidate 제출은 사용자가 화면에서 확인 후 [검토 요청] 을 눌러야 일어난다.
 * - mode='fill-empty': 비어 있는 칸만 채운다(사용자 입력 보존). mode='overwrite': AI 값이 있는 칸은 덮어쓴다.
 * - regulatoryType: 진입 화면에서 유형을 고른 경우(lockRegulatoryType) 바꾸지 않는다.
 *   AI 가 DRUG 를 돌려줘도 적용하지 않는다 — 의약품 여부는 진입 선택이 결정한다(Drug gate 불변).
 * - brandName 이 바뀌면 brandId 는 비운다(문자열 유사도 자동 매칭 금지 · 사용자가 O4O Brand 를 다시 고른다).
 * - categoryId · 이미지 · drugCategory 는 Draft 에 값이 없으므로(파서가 null/[] 고정) 이 함수가 건드리지 않는다.
 */

import type { SupplierProductCandidateDraft } from './types';

export type SupplierProductApplyMode = 'fill-empty' | 'overwrite';

/** CreatePage FormData 중 Draft 가 채울 수 있는 부분집합(모두 문자열 · 화면 입력값 그대로) */
export interface SupplierProductDraftTargetForm {
  barcode: string;
  marketingName: string;
  brandId: string;
  brandName: string;
  manufacturerName: string;
  specification: string;
  originCountry: string;
  regulatoryType: string;
  regulatoryName: string;
  mfdsPermitNumber: string;
  priceGeneral: string;
  consumerReferencePrice: string;
  isFeatured: boolean;
}

export interface ApplySupplierProductDraftOptions {
  mode: SupplierProductApplyMode;
  /** 진입 화면(productType)에서 규제 구분이 이미 정해진 경우 true */
  lockRegulatoryType: boolean;
  /** 현재 설명 에디터 값(HTML/텍스트) — 비어 있는지 판단에만 사용 */
  currentDescription: string;
}

export interface ApplySupplierProductDraftResult<T extends SupplierProductDraftTargetForm> {
  form: T;
  /** 설명 에디터에 넣을 값. null 이면 변경 없음 */
  description: string | null;
  /** 실제로 바뀐 필드명(설명은 'description') */
  changedFields: string[];
  /** 사용자에게 보여줄 안내(예: brandId 초기화 · regulatoryType 미적용) */
  notes: string[];
}

const STRING_FIELDS: ReadonlyArray<[keyof SupplierProductCandidateDraft, keyof SupplierProductDraftTargetForm]> = [
  ['name', 'marketingName'],
  ['barcode', 'barcode'],
  ['brandName', 'brandName'],
  ['manufacturerName', 'manufacturerName'],
  ['specification', 'specification'],
  ['originCountry', 'originCountry'],
  ['regulatoryName', 'regulatoryName'],
  ['mfdsPermitNumber', 'mfdsPermitNumber'],
];

function isBlank(v: unknown): boolean {
  return v === null || v === undefined || String(v).trim() === '';
}

/** 텍스트 설명을 에디터(HTML)에 넣을 때 줄바꿈을 문단으로 바꾼다. 이미 태그가 있으면 그대로. */
export function descriptionTextToHtml(text: string): string {
  const t = text.trim();
  if (!t) return '';
  if (/<[a-z][\s\S]*>/i.test(t)) return t;
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return t
    .split(/\n{2,}/)
    .map((p) => `<p>${esc(p).replace(/\n/g, '<br />')}</p>`)
    .join('');
}

export function applySupplierProductDraft<T extends SupplierProductDraftTargetForm>(
  form: T,
  draft: SupplierProductCandidateDraft,
  options: ApplySupplierProductDraftOptions,
): ApplySupplierProductDraftResult<T> {
  const { mode, lockRegulatoryType, currentDescription } = options;
  const next: T = { ...form };
  const changedFields: string[] = [];
  const notes: string[] = [];
  const canSet = (current: unknown) => mode === 'overwrite' || isBlank(current);

  for (const [from, to] of STRING_FIELDS) {
    const value = draft[from];
    if (typeof value !== 'string' || !value.trim()) continue;
    if (!canSet(next[to])) continue;
    if (next[to] === value) continue;
    (next as SupplierProductDraftTargetForm)[to] = value as never;
    changedFields.push(to);
  }

  if (changedFields.includes('brandName') && form.brandId) {
    next.brandId = '' as T['brandId'];
    notes.push('브랜드명이 바뀌어 선택된 O4O 브랜드 연결을 해제했습니다. 브랜드를 다시 선택해 주세요.');
  }

  if (draft.regulatoryType) {
    if (lockRegulatoryType) {
      notes.push('규제 구분은 진입 시 선택한 제품 유형을 따릅니다(AI 값 미적용).');
    } else if (draft.regulatoryType === 'DRUG') {
      notes.push('AI 가 의약품(DRUG)으로 판단했지만 자동 적용하지 않습니다. 의약품은 등록 시작 화면에서 유형을 선택해 주세요.');
    } else if (mode === 'overwrite' || isBlank(form.regulatoryType) || form.regulatoryType === 'GENERAL') {
      if (next.regulatoryType !== draft.regulatoryType) {
        next.regulatoryType = draft.regulatoryType as T['regulatoryType'];
        changedFields.push('regulatoryType');
      }
    }
  }

  const offer = draft.offerDraft;
  if (typeof offer.priceGeneral === 'number' && canSet(next.priceGeneral)) {
    const s = String(offer.priceGeneral);
    if (next.priceGeneral !== s) { next.priceGeneral = s as T['priceGeneral']; changedFields.push('priceGeneral'); }
  }
  if (typeof offer.consumerReferencePrice === 'number' && canSet(next.consumerReferencePrice)) {
    const s = String(offer.consumerReferencePrice);
    if (next.consumerReferencePrice !== s) {
      next.consumerReferencePrice = s as T['consumerReferencePrice'];
      changedFields.push('consumerReferencePrice');
    }
  }
  if (offer.isFeatured && !form.isFeatured && mode === 'overwrite') {
    next.isFeatured = true as T['isFeatured'];
    changedFields.push('isFeatured');
  }

  let description: string | null = null;
  const descSource = offer.consumerDetailDescription || offer.consumerShortDescription;
  if (descSource && canSet(currentDescription)) {
    const html = descriptionTextToHtml(descSource);
    if (html && html !== currentDescription) {
      description = html;
      changedFields.push('description');
    }
  }

  return { form: next, description, changedFields, notes };
}
