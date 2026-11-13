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
 *
 * WO-O4O-SUPPLIER-AI-ASSISTANCE-ROLLOUT-V1 P1 보완:
 * - 가격·추천 표시(offerDraft.priceGeneral · consumerReferencePrice · isFeatured)는 적용하지 않는다.
 *   신규 제품 검토 요청(Candidate)은 가격·게시 필드를 받지 않으며 이 화면에 입력란도 없다 —
 *   보이지 않는 칸에 AI 값을 넣지 않고, 값이 왔으면 후속 업무에서 입력하도록 안내만 한다.
 * - 설명은 화면의 "소비자용 간이 설명" 칸(서버 consumerShortDescription 500자)에 들어간다.
 *   간이 설명을 우선 쓰고, 상세 설명은 변환 후 한도 안일 때만 쓴다. 넘치면 적용하지 않고 안내한다
 *   (적용 후 제출 단계에서 FIELD_TOO_LONG 으로 실패하지 않게).
 * - AI 가 읽은 바코드·허가번호는 "확인 필요", 결과가 null 이라 비어 있는 칸은 "미확인"으로 알린다.
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
}

export interface ApplySupplierProductDraftOptions {
  mode: SupplierProductApplyMode;
  /** 진입 화면(productType)에서 규제 구분이 이미 정해진 경우 true */
  lockRegulatoryType: boolean;
  /** 현재 설명 에디터 값(HTML/텍스트) — 비어 있는지 판단에만 사용 */
  currentDescription: string;
  /** 설명 칸에 넣을 수 있는 최대 길이(변환된 HTML 기준). 기본: 서버 consumerShortDescription 한도 */
  descriptionMaxLength?: number;
}

/** 서버 supplier-single-candidate.mapper LIMITS.consumerShortDescription 과 같다 */
export const SUPPLIER_PRODUCT_DESCRIPTION_MAX_LENGTH = 500;

/** 사용자에게 보여줄 필드 이름 */
const FIELD_LABELS: Record<string, string> = {
  marketingName: '제품명',
  barcode: '바코드',
  brandName: '브랜드명',
  manufacturerName: '제조사',
  specification: '규격',
  originCountry: '원산지',
  regulatoryName: '규제명',
  mfdsPermitNumber: '허가번호',
};

/** AI 가 읽은 식별값 — 적용됐으면 원본과 대조하도록 알린다 */
const VERIFY_FIELDS: ReadonlyArray<keyof SupplierProductDraftTargetForm> = ['barcode', 'mfdsPermitNumber'];
/** 결과가 비어 있으면 미확인으로 알리는 기본 항목(규제명·허가번호는 규제 제품에만 쓰여 제외) */
const UNCONFIRMED_FIELDS: ReadonlyArray<keyof SupplierProductDraftTargetForm> = [
  'marketingName', 'brandName', 'manufacturerName', 'specification', 'originCountry',
];

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
    notes.push('브랜드명이 바뀌어 선택된 O4O 브랜드 연결을 해제했습니다. 브랜드를 다시 선택해 주시기 바랍니다.');
  }

  if (draft.regulatoryType) {
    if (lockRegulatoryType) {
      notes.push('규제 구분은 진입 시 선택한 제품 유형을 따릅니다(AI 값 미적용).');
    } else if (draft.regulatoryType === 'DRUG') {
      notes.push('AI 가 의약품(DRUG)으로 판단했지만 자동 적용하지 않습니다. 의약품은 등록 시작 화면에서 유형을 선택해 주시기 바랍니다.');
    } else if (mode === 'overwrite' || isBlank(form.regulatoryType) || form.regulatoryType === 'GENERAL') {
      if (next.regulatoryType !== draft.regulatoryType) {
        next.regulatoryType = draft.regulatoryType as T['regulatoryType'];
        changedFields.push('regulatoryType');
      }
    }
  }

  const offer = draft.offerDraft;
  if (
    typeof offer.priceGeneral === 'number' ||
    typeof offer.consumerReferencePrice === 'number' ||
    offer.isFeatured
  ) {
    notes.push('가격·추천 표시는 이 화면에서 받지 않아 적용하지 않았습니다. 표준 제품 확정 후 공급 등록 단계에서 직접 입력해 주시기 바랍니다.');
  }

  let description: string | null = null;
  const maxLength = options.descriptionMaxLength ?? SUPPLIER_PRODUCT_DESCRIPTION_MAX_LENGTH;
  const candidates = [offer.consumerShortDescription, offer.consumerDetailDescription]
    .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
    .map((v) => descriptionTextToHtml(v));
  if (candidates.length > 0 && canSet(currentDescription)) {
    const html = candidates.find((h) => h.length <= maxLength);
    if (!html) {
      notes.push(`설명이 간이 설명 한도(${maxLength}자)를 넘어 적용하지 않았습니다. 요약해 직접 입력해 주시기 바랍니다.`);
    } else if (html !== currentDescription) {
      description = html;
      changedFields.push('description');
    }
  }

  const verify = VERIFY_FIELDS.filter((f) => changedFields.includes(f)).map((f) => FIELD_LABELS[f]);
  if (verify.length > 0) {
    notes.push(`확인 필요: ${verify.join('·')}은(는) AI 가 자료에서 읽은 값입니다. 실물·원본 자료와 한 글자씩 대조해 주시기 바랍니다.`);
  }
  const unconfirmed = UNCONFIRMED_FIELDS.filter((f) => isBlank(next[f])).map((f) => FIELD_LABELS[f]);
  if (unconfirmed.length > 0) {
    notes.push(`미확인: ${unconfirmed.join('·')} — 자료에서 확인되지 않아 비워 두었습니다. 확인되면 직접 입력해 주시기 바랍니다.`);
  }

  return { form: next, description, changedFields, notes };
}
