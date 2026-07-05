/**
 * Medical Device Gate B Promotion Service
 * — 의료기기 ProductCandidate 중 안전 후보를 ProductMaster/ProductIdentifier 로 승격 (PLAN/PREVIEW)
 *
 * WO-O4O-MEDICAL-DEVICE-GATE-B-PROMOTION-SCRIPT-V1
 * runbook: docs/checks/WO-O4O-MEDICAL-DEVICE-GATE-B-APPLY-RUNBOOK-V1.md
 *
 * 본 서비스의 계획 로직(filter/grouping)은 **순수 함수**다(DB 무관, 테스트 용이).
 * DB 조회(후보 로드 / barcode·identifier 충돌 / apply write)는 CLI 책임.
 *
 * 승격 조건(8+2, runbook §2):
 *   1 identifier_type='GTIN'  2 UDIDI 숫자13/14  3 GTIN check-digit pass
 *   4 match_status != 'conflict'  5 permit matched  6 active(RTRCN_DSCTN_DIVS_CD IS NULL)
 *   7 name 존재  8 manufacturer 존재  9 DB barcode 충돌 없음  10 DB normalized 충돌 없음
 *
 * PRMISN_STTEMNT 는 active 판정에 사용하지 않는다.
 */

import { isValidGtin } from '../../../utils/gtin.js';
import { normalizeIdentifier } from '../utils/product-identifier.util.js';

export const MDS_SOURCE_LABEL = 'MFDS_MEDICAL_DEVICE_STANDARD_CODE';
export const MDS_SOURCE_KIND = 'medical_device_standard_code';
export const MDS_REGULATORY_TYPE = 'MEDICAL_DEVICE';

/** 허가 상태 맵 값 (permit-status-map.tsv 유래) */
export interface PermitStatus {
  matched: boolean;
  active: boolean; // RTRCN_DSCTN_DIVS_CD IS NULL
}
export type PermitStatusMap = Map<string, PermitStatus>;

/** DB product_candidates 1행의 승격 판정 입력 (CLI 가 채운다) */
export interface GateBCandidate {
  id: string;
  identifierType: string | null;
  identifierValue: string | null; // UDIDI_CD
  matchStatus: string; // unmatched | conflict
  candidateName: string | null;
  candidateManufacturer: string | null;
  candidateSpec: string | null; // FOML_INFO
  permitNo: string | null; // raw_payload->>'permitNo'
  prdlstNm: string | null; // raw_payload->'source'->>'PRDLST_NM' (regulatory_name 용)
  rowSignature: string; // raw_payload->>'sourceRowSignature'
}

export type GateBHoldReason =
  | 'NON_GTIN_HIBCC'
  | 'GTIN_CHECKDIGIT_FAIL'
  | 'DUP_CONFLICT'
  | 'PERMIT_NOT_FOUND'
  | 'PERMIT_INACTIVE_RTRCN'
  | 'REQUIRED_FIELD_MISSING';

export interface MasterPreview {
  barcode: string;
  name: string;
  regulatoryName: string;
  manufacturerName: string;
  regulatoryType: string;
  mfdsProductId: string; // MFDS:MEDICAL_DEVICE:{UDIDI}
  mfdsPermitNumber: string | null;
  specification: string | null;
  isMfdsVerified: true;
  representativeCandidateId: string;
  duplicateCandidateIds: string[];
  identifiers: Array<{
    identifierType: 'GTIN' | 'UDI_DI';
    identifierValue: string;
    normalizedValue: string;
    isPrimary: boolean;
    verificationStatus: 'imported';
  }>;
}

export interface GateBHoldCounts {
  NON_GTIN_HIBCC: number;
  GTIN_CHECKDIGIT_FAIL: number;
  DUP_CONFLICT: number;
  PERMIT_NOT_FOUND: number;
  PERMIT_INACTIVE_RTRCN: number;
  REQUIRED_FIELD_MISSING: number;
}

const EMPTY_HOLDS = (): GateBHoldCounts => ({
  NON_GTIN_HIBCC: 0,
  GTIN_CHECKDIGIT_FAIL: 0,
  DUP_CONFLICT: 0,
  PERMIT_NOT_FOUND: 0,
  PERMIT_INACTIVE_RTRCN: 0,
  REQUIRED_FIELD_MISSING: 0,
});

/**
 * 단건 승격 판정 (DB 충돌 제외 — 1~8). 통과면 null, 아니면 첫 탈락 사유(waterfall).
 */
export function classifyCandidate(c: GateBCandidate, statusMap: PermitStatusMap): GateBHoldReason | null {
  // 1 GTIN type 아님 (HIBCC/UDI_DI)
  if (c.identifierType !== 'GTIN') return 'NON_GTIN_HIBCC';
  // 2/3 숫자 13/14 + check-digit
  const udi = (c.identifierValue ?? '').trim();
  if (!(/^\d{13}$/.test(udi) || /^\d{14}$/.test(udi)) || !isValidGtin(udi)) return 'GTIN_CHECKDIGIT_FAIL';
  // 4 conflict
  if (c.matchStatus === 'conflict') return 'DUP_CONFLICT';
  // 5 permit matched
  const st = c.permitNo ? statusMap.get(c.permitNo) : undefined;
  if (!st || !st.matched) return 'PERMIT_NOT_FOUND';
  // 6 active
  if (!st.active) return 'PERMIT_INACTIVE_RTRCN';
  // 7/8 필수 필드
  if (!c.candidateName || !c.candidateManufacturer) return 'REQUIRED_FIELD_MISSING';
  return null;
}

/**
 * 배치 승격 계획(DB 충돌 제외). 통과 후보 + 보류 breakdown 산출.
 */
export function buildPromotionPlan(
  candidates: GateBCandidate[],
  statusMap: PermitStatusMap,
): { promotable: GateBCandidate[]; holds: GateBHoldCounts } {
  const holds = EMPTY_HOLDS();
  const promotable: GateBCandidate[] = [];
  for (const c of candidates) {
    const reason = classifyCandidate(c, statusMap);
    if (reason == null) promotable.push(c);
    else holds[reason] += 1;
  }
  return { promotable, holds };
}

/**
 * promotable 후보를 distinct barcode 기준 ProductMaster 로 그룹핑.
 * 동일 barcode 다건(완전 동일 signature 반복)이면 1 master 로 병합(대표 + duplicateIds).
 * 동일 barcode 인데 signature 가 다른 경우는 상위 필터(conflict)에서 이미 제외됨.
 */
export function groupIntoMasters(promotable: GateBCandidate[]): MasterPreview[] {
  const byBarcode = new Map<string, GateBCandidate[]>();
  for (const c of promotable) {
    const bc = (c.identifierValue ?? '').trim();
    if (!byBarcode.has(bc)) byBarcode.set(bc, []);
    byBarcode.get(bc)!.push(c);
  }
  const masters: MasterPreview[] = [];
  for (const [barcode, group] of byBarcode) {
    const rep = group[0];
    const name = (rep.candidateName ?? '').trim();
    const regulatoryName = (rep.prdlstNm ?? rep.candidateName ?? '').trim();
    masters.push({
      barcode,
      name,
      regulatoryName,
      manufacturerName: (rep.candidateManufacturer ?? '').trim(),
      regulatoryType: MDS_REGULATORY_TYPE,
      mfdsProductId: `MFDS:MEDICAL_DEVICE:${barcode}`,
      mfdsPermitNumber: rep.permitNo,
      specification: rep.candidateSpec,
      isMfdsVerified: true,
      representativeCandidateId: rep.id,
      duplicateCandidateIds: group.slice(1).map((g) => g.id),
      identifiers: [
        {
          identifierType: 'GTIN',
          identifierValue: barcode,
          normalizedValue: normalizeIdentifier('GTIN', barcode),
          isPrimary: true,
          verificationStatus: 'imported',
        },
        {
          identifierType: 'UDI_DI',
          identifierValue: barcode,
          normalizedValue: normalizeIdentifier('UDI_DI', barcode),
          isPrimary: false,
          verificationStatus: 'imported',
        },
      ],
    });
  }
  return masters;
}

/** TSV(permit-status-map) 파싱: PERMIT_NO\tMATCHED\tRTRCN_NULL\t... → PermitStatusMap */
export function parsePermitStatusMapTsv(text: string): PermitStatusMap {
  const map: PermitStatusMap = new Map();
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.startsWith('PERMIT_NO')) continue;
    const cols = line.split('\t');
    if (cols.length < 3) continue;
    const permit = cols[0];
    const matched = cols[1] === '1';
    const active = matched && cols[2] === '1';
    map.set(permit, { matched, active });
  }
  return map;
}

// ─────────────────────────────────────────────────────────────────────────────
// Apply (write) — WO-O4O-MEDICAL-DEVICE-GATE-B-PROMOTION-APPLY-IMPLEMENTATION-V1
// 계획→연산 변환(순수) + Sink 추상화(테스트: fake, 프로덕션: QueryRunner).
// ─────────────────────────────────────────────────────────────────────────────

export interface MasterRow {
  barcode: string;
  regulatoryType: string;
  regulatoryName: string;
  name: string;
  manufacturerName: string;
  mfdsProductId: string;
  mfdsPermitNumber: string | null;
  specification: string | null;
}

export interface IdentifierRow {
  productMasterId: string;
  identifierType: 'GTIN' | 'UDI_DI';
  identifierValue: string;
  normalizedValue: string;
  isPrimary: boolean;
  verificationStatus: 'imported';
  sourceType: string;
  sourceId: string; // representative candidate id
  sourceLabel: string;
  metadata: Record<string, unknown>;
}

export interface CandidateUpdate {
  candidateId: string;
  masterId: string;
  role: 'representative' | 'duplicate';
}

/** apply 저장소 추상화 (프로덕션=QueryRunner, 테스트=fake). */
export interface PromotionSink {
  /** master 배치 INSERT → barcode↔id 반환 */
  insertMasters(rows: MasterRow[]): Promise<Array<{ barcode: string; id: string }>>;
  insertIdentifiers(rows: IdentifierRow[]): Promise<void>;
  updateCandidates(updates: CandidateUpdate[]): Promise<void>;
}

/** identifier source_type (규약값) */
export const MDS_PROMOTION_SOURCE_TYPE = 'medical_device_standard_code_promotion';

export function toMasterRow(m: MasterPreview): MasterRow {
  return {
    barcode: m.barcode,
    regulatoryType: m.regulatoryType,
    regulatoryName: m.regulatoryName,
    name: m.name,
    manufacturerName: m.manufacturerName,
    mfdsProductId: m.mfdsProductId,
    mfdsPermitNumber: m.mfdsPermitNumber,
    specification: m.specification,
  };
}

export function toIdentifierRows(m: MasterPreview, masterId: string): IdentifierRow[] {
  return m.identifiers.map((i) => ({
    productMasterId: masterId,
    identifierType: i.identifierType,
    identifierValue: i.identifierValue,
    normalizedValue: i.normalizedValue,
    isPrimary: i.isPrimary,
    verificationStatus: 'imported' as const,
    sourceType: MDS_PROMOTION_SOURCE_TYPE,
    sourceId: m.representativeCandidateId,
    sourceLabel: MDS_SOURCE_LABEL,
    metadata: {
      permitNo: m.mfdsPermitNumber,
      model: m.specification,
      sourceDatasetId: '15073875',
      sourceKind: MDS_SOURCE_KIND,
      candidateIds: [m.representativeCandidateId, ...m.duplicateCandidateIds],
    },
  }));
}

/**
 * 승격 실행: master 배치 INSERT(RETURNING) → identifier/candidate 배치. Sink 로 추상화.
 * 호출측이 단일 트랜잭션 안에서 부른다. 실패 시 트랜잭션 rollback 은 호출측 책임.
 */
export async function executePromotion(
  sink: PromotionSink,
  masters: MasterPreview[],
  batchSize = 500,
): Promise<{ masters: number; identifiers: number; candidateUpdates: number }> {
  let mc = 0;
  let ic = 0;
  let cc = 0;
  for (let i = 0; i < masters.length; i += batchSize) {
    const chunk = masters.slice(i, i + batchSize);
    const inserted = await sink.insertMasters(chunk.map(toMasterRow));
    const barcodeToId = new Map(inserted.map((r) => [r.barcode, r.id]));
    const idRows: IdentifierRow[] = [];
    const candUpdates: CandidateUpdate[] = [];
    for (const m of chunk) {
      const id = barcodeToId.get(m.barcode);
      if (!id) throw new Error(`master id 매핑 실패: ${m.barcode}`);
      idRows.push(...toIdentifierRows(m, id));
      candUpdates.push({ candidateId: m.representativeCandidateId, masterId: id, role: 'representative' });
      for (const dup of m.duplicateCandidateIds) {
        candUpdates.push({ candidateId: dup, masterId: id, role: 'duplicate' });
      }
    }
    await sink.insertIdentifiers(idRows);
    await sink.updateCandidates(candUpdates);
    mc += chunk.length;
    ic += idRows.length;
    cc += candUpdates.length;
  }
  return { masters: mc, identifiers: ic, candidateUpdates: cc };
}
