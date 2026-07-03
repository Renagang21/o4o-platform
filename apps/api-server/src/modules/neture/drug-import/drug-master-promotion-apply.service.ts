/**
 * Drug Master Promotion Apply Service — ProductCandidate → ProductMaster 승격 엔진
 *
 * WO-O4O-DRUG-MASTER-CANDIDATE-PROMOTION-APPLY-V1
 * 선행: CHECK-O4O-DRUG-MASTER-CANDIDATE-TO-PRODUCTMASTER-PROMOTION-DESIGN-V1,
 *       CHECK-O4O-DRUG-MASTER-CANDIDATE-PROMOTION-DRYRUN-V1
 *
 * 설계:
 *   - 승격 판정/미리보기/충돌 로직은 store port(PromotionMasterStore) 위에서 동작하는 **순수 결정 계층**.
 *     → InMemory store 로 DB 없이 단위테스트 가능. DB store 로 실 apply.
 *   - dry-run 기본. apply 는 --apply + DB store + (운영 DB 는 별도 승인) 일 때만 write.
 *   - 이번 WO 생성 대상 = ProductMaster + ProductIdentifier 뿐.
 *     RepresentativeProduct / SharedProductDescription / ProductDrugExtension / ProductImage /
 *     SupplierProductOffer / OrganizationProductListing / StoreLocalProduct 생성 안 함.
 *   - 기존 Master(barcode 일치)는 link 만. immutable 필드 자동 덮어쓰기 금지(차이는 report).
 *   - KOREA_DRUG_CODE / mfdsProductId 가 다른 Master 에 있으면 conflict(write 금지).
 */

import { validateGtin } from '../../../utils/gtin.js';
import { normalizeIdentifier } from '../utils/product-identifier.util.js';
import type { ProductDrugCategory } from '../utils/product-type.util.js';
import {
  mapDrugCategory,
  buildSpecification,
  MFDS_PRODUCT_ID_PREFIX,
} from './drug-master-promotion-dryrun.service.js';

// 편의 re-export (승격 apply 소비처가 dryrun 모듈을 몰라도 되게)
export { MFDS_PRODUCT_ID_PREFIX, mapDrugCategory, buildSpecification } from './drug-master-promotion-dryrun.service.js';

/** 표준코드 형식: 13자리 숫자 */
const STANDARD_CODE_PATTERN = /^\d{13}$/;

export type PromotionSkipReason =
  | 'cancelled'
  | 'missing_standard_code'
  | 'invalid_standard_code_format'
  | 'invalid_standard_code_check_digit'
  | 'missing_required';

export type PromotionConflictReason =
  | 'barcode'
  | 'mfds_product_id'
  | 'identifier_belongs_to_other_master';

export type PromotionOutcomeKind = 'create' | 'link' | 'conflict' | 'skip';

/** 승격 입력(공급원 중립). candidate/CSV 어댑터가 이 형태로 변환한다. */
export interface PromotionFields {
  candidateId: string | null; // CSV 어댑터는 null
  rowNumber: number | null;
  standardCode: string | null; // 표준코드
  mfdsCode: string | null; // 품목기준코드
  insuranceCode: string | null; // 제품코드(개정후)
  atcCode: string | null; // 국제표준코드(ATC코드)
  productName: string | null; // 한글상품명
  manufacturer: string | null; // 업체명
  rxOtc: string | null; // 전문일반구분
  spec: string | null; // 약품규격
  totalQuantity: string | null; // 제품총수량
  dosageForm: string | null; // 제형구분
  packageForm: string | null; // 포장형태
  isCancelled: boolean;
}

export interface MasterPreview {
  barcode: string;
  regulatoryType: 'DRUG';
  drugCategory: ProductDrugCategory;
  regulatoryName: string;
  name: string;
  manufacturerName: string;
  mfdsPermitNumber: null;
  mfdsProductId: string;
  specification: string | null;
  isMfdsVerified: true;
  mfdsSyncedAt: string;
  representativeProductId: null;
  tags: string[];
}

export interface IdentifierPreview {
  identifierType: 'KOREA_DRUG_CODE' | 'MFDS_CODE' | 'KOREA_INSURANCE_CODE' | 'ATC_CODE';
  identifierValue: string;
  normalizedValue: string;
  isPrimary: boolean;
  verificationStatus: 'imported';
  country: 'KR';
  sourceType: 'drug_master_import';
  metadata: {
    sourceDataset: 'HIRA_DRUG_MASTER';
    sourceBaseDate: string;
    sourceRowNumber: number | null;
    importBatchId: string;
    promotedFromCandidateId: string | null;
  };
}

export interface ExistingMaster {
  id: string;
  name: string | null;
  manufacturerName: string | null;
  specification: string | null;
}

/** 승격 대상 저장소 port. read 는 dry-run/apply 공통, write 는 apply 전용. */
export interface PromotionMasterStore {
  findMasterByBarcode(barcode: string): Promise<ExistingMaster | null>;
  findMasterByMfdsProductId(mfdsProductId: string): Promise<{ id: string } | null>;
  /** 활성 identifier (type, normalized) 를 보유한 master id 목록 */
  findMasterIdsByIdentifier(type: IdentifierPreview['identifierType'], normalizedValue: string): Promise<string[]>;
  // ── write (apply 전용) ──
  createMaster(preview: MasterPreview): Promise<{ id: string }>;
  createIdentifier(masterId: string, preview: IdentifierPreview): Promise<void>;
  markCandidatePromoted(candidateId: string, masterId: string, kind: 'create' | 'link'): Promise<void>;
}

export interface ExistingMasterDiff {
  nameDiffers: boolean;
  manufacturerDiffers: boolean;
  specificationDiffers: boolean;
  existing: { name: string | null; manufacturerName: string | null; specification: string | null };
  candidate: { name: string; manufacturerName: string; specification: string | null };
}

export interface PromotionOutcome {
  candidateId: string | null;
  rowNumber: number | null;
  standardCode: string | null;
  outcome: PromotionOutcomeKind;
  skipReason?: PromotionSkipReason;
  conflictReason?: PromotionConflictReason;
  masterId?: string;
  masterPreview?: MasterPreview;
  identifiersCreated: number; // dry-run: would-create
  identifiersExisting: number;
  existingMasterDiff?: ExistingMasterDiff;
  gtinError?: string;
}

export interface PromoteCtx {
  apply: boolean;
  importBatchId: string;
  sourceBaseDate: string;
  sourceLabel: string;
}

function clean(v: unknown): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t.length === 0 ? null : t;
}

/** eligibility 판정 (dry-run 서비스와 동일 정책·우선순위) */
export function evaluateEligibility(f: PromotionFields): { eligible: boolean; reason?: PromotionSkipReason; gtinError?: string } {
  if (f.isCancelled) return { eligible: false, reason: 'cancelled' };
  if (f.standardCode == null) return { eligible: false, reason: 'missing_standard_code' };
  if (!STANDARD_CODE_PATTERN.test(f.standardCode)) return { eligible: false, reason: 'invalid_standard_code_format' };
  const gtinError = validateGtin(f.standardCode);
  if (gtinError != null) return { eligible: false, reason: 'invalid_standard_code_check_digit', gtinError };
  if (f.productName == null || f.manufacturer == null) return { eligible: false, reason: 'missing_required' };
  return { eligible: true };
}

export function buildMasterPreview(f: PromotionFields, ctx: PromoteCtx): MasterPreview {
  const standardCode = f.standardCode as string;
  return {
    barcode: standardCode,
    regulatoryType: 'DRUG',
    drugCategory: mapDrugCategory(f.rxOtc),
    regulatoryName: f.productName as string,
    name: f.productName as string,
    manufacturerName: f.manufacturer as string,
    mfdsPermitNumber: null,
    mfdsProductId: `${MFDS_PRODUCT_ID_PREFIX}${standardCode}`,
    specification: buildSpecification(f.spec, f.totalQuantity, f.dosageForm, f.packageForm),
    isMfdsVerified: true,
    mfdsSyncedAt: ctx.sourceBaseDate,
    representativeProductId: null,
    tags: ['import:hira-drug-master', `batch:${ctx.importBatchId}`, `src:${ctx.sourceLabel}`],
  };
}

export function buildIdentifierPreviews(f: PromotionFields, ctx: PromoteCtx): IdentifierPreview[] {
  const mk = (
    identifierType: IdentifierPreview['identifierType'],
    value: string,
    isPrimary: boolean,
  ): IdentifierPreview => ({
    identifierType,
    identifierValue: value,
    normalizedValue: normalizeIdentifier(identifierType, value),
    isPrimary,
    verificationStatus: 'imported',
    country: 'KR',
    sourceType: 'drug_master_import',
    metadata: {
      sourceDataset: 'HIRA_DRUG_MASTER',
      sourceBaseDate: ctx.sourceBaseDate,
      sourceRowNumber: f.rowNumber,
      importBatchId: ctx.importBatchId,
      promotedFromCandidateId: f.candidateId,
    },
  });
  const out: IdentifierPreview[] = [mk('KOREA_DRUG_CODE', f.standardCode as string, true)];
  if (f.mfdsCode != null) out.push(mk('MFDS_CODE', f.mfdsCode, false));
  if (f.insuranceCode != null) out.push(mk('KOREA_INSURANCE_CODE', f.insuranceCode, false));
  if (f.atcCode != null) out.push(mk('ATC_CODE', f.atcCode, false));
  return out;
}

function computeDiff(existing: ExistingMaster, preview: MasterPreview): ExistingMasterDiff {
  return {
    nameDiffers: (existing.name ?? null) !== preview.name,
    manufacturerDiffers: (existing.manufacturerName ?? null) !== preview.manufacturerName,
    specificationDiffers: (existing.specification ?? null) !== (preview.specification ?? null),
    existing: { name: existing.name, manufacturerName: existing.manufacturerName, specification: existing.specification },
    candidate: { name: preview.name, manufacturerName: preview.manufacturerName, specification: preview.specification },
  };
}

/** identifier 확보. masterId 에 (type, normalized) 없으면 create(apply)/would-create(dry-run). */
async function ensureIdentifiers(
  masterId: string,
  previews: IdentifierPreview[],
  store: PromotionMasterStore,
  apply: boolean,
  masterExistsInStore: boolean,
): Promise<{ created: number; existing: number }> {
  let created = 0;
  let existing = 0;
  for (const p of previews) {
    // 새로 만든(또는 dry-run 가상) master 는 아직 identifier 가 없다 → 조회 생략(would-create)
    const alreadyOnThisMaster =
      masterExistsInStore &&
      (await store.findMasterIdsByIdentifier(p.identifierType, p.normalizedValue)).includes(masterId);
    if (alreadyOnThisMaster) {
      existing += 1;
      continue;
    }
    if (apply) await store.createIdentifier(masterId, p);
    created += 1;
  }
  return { created, existing };
}

/**
 * 단건 승격 판정/실행. dry-run 은 read 만, apply 는 write.
 */
export async function promoteOne(
  f: PromotionFields,
  store: PromotionMasterStore,
  ctx: PromoteCtx,
): Promise<PromotionOutcome> {
  const base = { candidateId: f.candidateId, rowNumber: f.rowNumber, standardCode: f.standardCode, identifiersCreated: 0, identifiersExisting: 0 };

  const elig = evaluateEligibility(f);
  if (!elig.eligible) {
    return { ...base, outcome: 'skip', skipReason: elig.reason, gtinError: elig.gtinError };
  }

  const masterPreview = buildMasterPreview(f, ctx);
  const idPreviews = buildIdentifierPreviews(f, ctx);
  const kdcNormalized = idPreviews[0].normalizedValue; // KOREA_DRUG_CODE
  const existing = await store.findMasterByBarcode(masterPreview.barcode);
  const kdcMasterIds = await store.findMasterIdsByIdentifier('KOREA_DRUG_CODE', kdcNormalized);

  if (existing) {
    // KOREA_DRUG_CODE 가 다른 master 에 붙어있으면 데이터 불일치 → conflict (write 금지)
    if (kdcMasterIds.some((id) => id !== existing.id)) {
      return { ...base, outcome: 'conflict', conflictReason: 'identifier_belongs_to_other_master' };
    }
    const diff = computeDiff(existing, masterPreview);
    const { created, existing: exCount } = await ensureIdentifiers(existing.id, idPreviews, store, ctx.apply, true);
    if (ctx.apply) await store.markCandidatePromoted(f.candidateId as string, existing.id, 'link');
    return {
      ...base,
      outcome: 'link',
      masterId: existing.id,
      existingMasterDiff: diff,
      identifiersCreated: created,
      identifiersExisting: exCount,
    };
  }

  // barcode 미존재 — KOREA_DRUG_CODE 가 다른 master 에 있으면 conflict
  if (kdcMasterIds.length > 0) {
    return { ...base, outcome: 'conflict', conflictReason: 'identifier_belongs_to_other_master' };
  }
  // mfdsProductId 충돌
  const mfdsConflict = await store.findMasterByMfdsProductId(masterPreview.mfdsProductId);
  if (mfdsConflict) {
    return { ...base, outcome: 'conflict', conflictReason: 'mfds_product_id' };
  }

  // create
  let masterId = '(dry-run)';
  if (ctx.apply) masterId = (await store.createMaster(masterPreview)).id;
  const { created, existing: exCount } = await ensureIdentifiers(masterId, idPreviews, store, ctx.apply, ctx.apply);
  if (ctx.apply) await store.markCandidatePromoted(f.candidateId as string, masterId, 'create');
  return {
    ...base,
    outcome: 'create',
    masterId: ctx.apply ? masterId : undefined,
    masterPreview,
    identifiersCreated: created,
    identifiersExisting: exCount,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// 어댑터: ProductCandidate / CSV row → PromotionFields
// ────────────────────────────────────────────────────────────────────────────

/** ProductCandidate(raw_payload 포함) → PromotionFields. 실 apply 경로. */
export function promotionFieldsFromCandidate(c: {
  id: string;
  candidateName: string | null;
  candidateManufacturer: string | null;
  candidateCategory: string | null;
  candidateSpec: string | null;
  candidateUnit: string | null;
  identifierValue: string | null;
  normalizedIdentifierValue: string | null;
  rawPayload: Record<string, unknown> | null;
}): PromotionFields {
  const raw = c.rawPayload ?? {};
  const source = (raw['source'] as Record<string, string | null> | undefined) ?? {};
  const standardCode = clean(raw['standardCode']) ?? clean(c.identifierValue);
  return {
    candidateId: c.id,
    rowNumber: typeof raw['rowNumber'] === 'number' ? (raw['rowNumber'] as number) : clean(raw['rowNumber']) != null ? Number(raw['rowNumber']) : null,
    standardCode,
    mfdsCode: clean(raw['mfdsCode']) ?? clean(source['품목기준코드']),
    insuranceCode: clean(source['제품코드(개정후)']),
    atcCode: clean(raw['atcCode']) ?? clean(source['국제표준코드(ATC코드)']),
    productName: clean(c.candidateName) ?? clean(source['한글상품명']),
    manufacturer: clean(c.candidateManufacturer) ?? clean(source['업체명']),
    rxOtc: clean(c.candidateCategory) ?? clean(source['전문일반구분']),
    spec: clean(c.candidateSpec) ?? clean(source['약품규격']),
    totalQuantity: clean(source['제품총수량']),
    dosageForm: clean(source['제형구분']),
    packageForm: clean(c.candidateUnit) ?? clean(source['포장형태']),
    isCancelled: raw['isCancelled'] === true || clean(source['취소일자']) != null,
  };
}

/** 약가마스터 CSV record → PromotionFields. dry-run 대량 검증 adapter 전용(실 apply 아님). */
export function promotionFieldsFromDrugRow(
  record: Record<string, string>,
  rowNumber: number,
): PromotionFields {
  const cancelledAt = clean(record['취소일자']);
  return {
    candidateId: null,
    rowNumber,
    standardCode: clean(record['표준코드']),
    mfdsCode: clean(record['품목기준코드']),
    insuranceCode: clean(record['제품코드(개정후)']),
    atcCode: clean(record['국제표준코드(ATC코드)']),
    productName: clean(record['한글상품명']),
    manufacturer: clean(record['업체명']),
    rxOtc: clean(record['전문일반구분']),
    spec: clean(record['약품규격']),
    totalQuantity: clean(record['제품총수량']),
    dosageForm: clean(record['제형구분']),
    packageForm: clean(record['포장형태']),
    isCancelled: cancelledAt != null,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// 리포트 집계
// ────────────────────────────────────────────────────────────────────────────

const SAMPLE_CAP = 10;

export interface PromotionApplyReport {
  mode: 'dry-run' | 'apply';
  importBatchId: string;
  sourceLabel: string;
  sourceBaseDate: string;

  totalCandidates: number;
  eligibleCandidates: number;
  skippedCancelled: number;
  skippedMissingStandardCode: number;
  skippedInvalidStandardCodeFormat: number;
  skippedInvalidStandardCodeCheckDigit: number;
  skippedMissingRequired: number;

  wouldCreateMaster: number; // dry-run
  createdMaster: number; // apply
  wouldLinkExistingMaster: number;
  linkedExistingMaster: number;
  wouldCreateIdentifiers: number;
  createdIdentifiers: number;
  wouldSkipExistingIdentifiers: number;

  conflictBarcode: number;
  conflictMfdsProductId: number;
  conflictIdentifierBelongsToOtherMaster: number;

  rxCount: number;
  otcCount: number;
  drugUnspecifiedCount: number;

  multiPackageMfdsCodeCount: number;
  multiManufacturerMfdsCodeCount: number;

  sampleCreated: PromotionOutcome[];
  sampleLinked: PromotionOutcome[];
  sampleConflicts: PromotionOutcome[];
  sampleSkipped: PromotionOutcome[];
  sampleTruncated: { created: boolean; linked: boolean; conflicts: boolean; skipped: boolean };
}

export function emptyApplyReport(ctx: PromoteCtx): PromotionApplyReport {
  return {
    mode: ctx.apply ? 'apply' : 'dry-run',
    importBatchId: ctx.importBatchId,
    sourceLabel: ctx.sourceLabel,
    sourceBaseDate: ctx.sourceBaseDate,
    totalCandidates: 0,
    eligibleCandidates: 0,
    skippedCancelled: 0,
    skippedMissingStandardCode: 0,
    skippedInvalidStandardCodeFormat: 0,
    skippedInvalidStandardCodeCheckDigit: 0,
    skippedMissingRequired: 0,
    wouldCreateMaster: 0,
    createdMaster: 0,
    wouldLinkExistingMaster: 0,
    linkedExistingMaster: 0,
    wouldCreateIdentifiers: 0,
    createdIdentifiers: 0,
    wouldSkipExistingIdentifiers: 0,
    conflictBarcode: 0,
    conflictMfdsProductId: 0,
    conflictIdentifierBelongsToOtherMaster: 0,
    rxCount: 0,
    otcCount: 0,
    drugUnspecifiedCount: 0,
    multiPackageMfdsCodeCount: 0,
    multiManufacturerMfdsCodeCount: 0,
    sampleCreated: [],
    sampleLinked: [],
    sampleConflicts: [],
    sampleSkipped: [],
    sampleTruncated: { created: false, linked: false, conflicts: false, skipped: false },
  };
}

/** outcome 1건을 report 에 반영 (그룹핑 분포는 별도 누적) */
export function accumulateOutcome(report: PromotionApplyReport, o: PromotionOutcome, f: PromotionFields): void {
  report.totalCandidates += 1;
  if (o.outcome === 'skip') {
    switch (o.skipReason) {
      case 'cancelled': report.skippedCancelled += 1; break;
      case 'missing_standard_code': report.skippedMissingStandardCode += 1; break;
      case 'invalid_standard_code_format': report.skippedInvalidStandardCodeFormat += 1; break;
      case 'invalid_standard_code_check_digit': report.skippedInvalidStandardCodeCheckDigit += 1; break;
      case 'missing_required': report.skippedMissingRequired += 1; break;
    }
    pushSample(report.sampleSkipped, o, () => { report.sampleTruncated.skipped = true; });
    return;
  }
  if (o.outcome === 'conflict') {
    switch (o.conflictReason) {
      case 'barcode': report.conflictBarcode += 1; break;
      case 'mfds_product_id': report.conflictMfdsProductId += 1; break;
      case 'identifier_belongs_to_other_master': report.conflictIdentifierBelongsToOtherMaster += 1; break;
    }
    pushSample(report.sampleConflicts, o, () => { report.sampleTruncated.conflicts = true; });
    return;
  }

  // eligible (create / link)
  report.eligibleCandidates += 1;
  const dc = mapDrugCategory(f.rxOtc);
  if (dc === 'rx') report.rxCount += 1;
  else if (dc === 'otc') report.otcCount += 1;
  else report.drugUnspecifiedCount += 1;

  if (report.mode === 'apply') {
    report.createdIdentifiers += o.identifiersCreated;
  } else {
    report.wouldCreateIdentifiers += o.identifiersCreated;
  }
  report.wouldSkipExistingIdentifiers += o.identifiersExisting;

  if (o.outcome === 'create') {
    if (report.mode === 'apply') report.createdMaster += 1;
    else report.wouldCreateMaster += 1;
    pushSample(report.sampleCreated, o, () => { report.sampleTruncated.created = true; });
  } else {
    if (report.mode === 'apply') report.linkedExistingMaster += 1;
    else report.wouldLinkExistingMaster += 1;
    pushSample(report.sampleLinked, o, () => { report.sampleTruncated.linked = true; });
  }
}

function pushSample(arr: PromotionOutcome[], item: PromotionOutcome, onTrunc: () => void): void {
  if (arr.length < SAMPLE_CAP) arr.push(item);
  else onTrunc();
}
