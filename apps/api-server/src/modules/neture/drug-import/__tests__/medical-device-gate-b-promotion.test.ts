/**
 * Unit tests — WO-O4O-MEDICAL-DEVICE-GATE-B-PROMOTION-SCRIPT-V1
 *
 * Gate B 승격 계획(filter/grouping) 순수 로직 검증. 실 DB 불필요.
 */
import {
  classifyCandidate,
  buildPromotionPlan,
  groupIntoMasters,
  parsePermitStatusMapTsv,
  type GateBCandidate,
  type PermitStatusMap,
} from '../medical-device-gate-b-promotion.service.js';

const cand = (over: Partial<GateBCandidate> = {}): GateBCandidate => ({
  id: '1',
  identifierType: 'GTIN',
  identifierValue: '08800158900007', // 유효 GTIN-14
  matchStatus: 'unmatched',
  candidateName: '치과합금',
  candidateManufacturer: '(주)에이디에이',
  candidateSpec: 'ADA-46',
  permitNo: '제인 26-4585 호',
  prdlstNm: '치과합금',
  rowSignature: 'sig-1',
  ...over,
});

const activeMap = (): PermitStatusMap => new Map([['제인 26-4585 호', { matched: true, active: true }]]);

describe('classifyCandidate (승격 판정 waterfall)', () => {
  it('GTIN + active + 필수필드 → 승격(null)', () => {
    expect(classifyCandidate(cand(), activeMap())).toBeNull();
  });
  it('GTIN 아님(HIBCC/UDI_DI) → NON_GTIN_HIBCC', () => {
    expect(classifyCandidate(cand({ identifierType: 'UDI_DI', identifierValue: '+J014660387510' }), activeMap())).toBe('NON_GTIN_HIBCC');
  });
  it('GTIN type 이나 check-digit fail → GTIN_CHECKDIGIT_FAIL', () => {
    expect(classifyCandidate(cand({ identifierValue: '08800158900008' }), activeMap())).toBe('GTIN_CHECKDIGIT_FAIL');
  });
  it('match_status=conflict → DUP_CONFLICT', () => {
    expect(classifyCandidate(cand({ matchStatus: 'conflict' }), activeMap())).toBe('DUP_CONFLICT');
  });
  it('permit 이 status map 에 없음 → PERMIT_NOT_FOUND', () => {
    expect(classifyCandidate(cand({ permitNo: '없는 허가 99 호' }), activeMap())).toBe('PERMIT_NOT_FOUND');
  });
  it('permit matched 이나 active=false → PERMIT_INACTIVE_RTRCN (PRMISN_STTEMNT 무관, active 플래그만 사용)', () => {
    const m: PermitStatusMap = new Map([['제인 26-4585 호', { matched: true, active: false }]]);
    expect(classifyCandidate(cand(), m)).toBe('PERMIT_INACTIVE_RTRCN');
  });
  it('name 또는 manufacturer 결측 → REQUIRED_FIELD_MISSING', () => {
    expect(classifyCandidate(cand({ candidateManufacturer: null }), activeMap())).toBe('REQUIRED_FIELD_MISSING');
    expect(classifyCandidate(cand({ candidateName: null }), activeMap())).toBe('REQUIRED_FIELD_MISSING');
  });
});

describe('buildPromotionPlan', () => {
  it('통과/보류를 분류하고 hold breakdown 을 집계', () => {
    const cands = [
      cand({ id: 'a' }), // promotable
      cand({ id: 'b', identifierType: 'UDI_DI', identifierValue: '+J01' }), // NON_GTIN_HIBCC
      cand({ id: 'c', matchStatus: 'conflict' }), // DUP_CONFLICT
      cand({ id: 'd', permitNo: 'x' }), // PERMIT_NOT_FOUND
    ];
    const { promotable, holds } = buildPromotionPlan(cands, activeMap());
    expect(promotable.map((p) => p.id)).toEqual(['a']);
    expect(holds.NON_GTIN_HIBCC).toBe(1);
    expect(holds.DUP_CONFLICT).toBe(1);
    expect(holds.PERMIT_NOT_FOUND).toBe(1);
  });
});

describe('groupIntoMasters', () => {
  it('distinct barcode 기준 master + master 당 identifier 2개(GTIN+UDI_DI)', () => {
    const masters = groupIntoMasters([cand({ id: 'a' })]);
    expect(masters).toHaveLength(1);
    const m = masters[0];
    expect(m.barcode).toBe('08800158900007');
    expect(m.mfdsProductId).toBe('MFDS:MEDICAL_DEVICE:08800158900007');
    expect(m.identifiers.map((i) => i.identifierType)).toEqual(['GTIN', 'UDI_DI']);
    expect(m.identifiers[0].isPrimary).toBe(true);
    expect(m.identifiers[1].isPrimary).toBe(false);
  });
  it('동일 barcode 다건 → 1 master 병합 + duplicateCandidateIds', () => {
    const masters = groupIntoMasters([cand({ id: 'a' }), cand({ id: 'b' })]);
    expect(masters).toHaveLength(1);
    expect(masters[0].representativeCandidateId).toBe('a');
    expect(masters[0].duplicateCandidateIds).toEqual(['b']);
  });
  it('GTIN-13 은 zero-pad 하지 않고 원형 barcode', () => {
    const masters = groupIntoMasters([cand({ id: 'a', identifierValue: '8809878302719', permitNo: '제인 26-4585 호' })]);
    expect(masters[0].barcode).toBe('8809878302719');
    expect(masters[0].identifiers[0].normalizedValue).toBe('8809878302719');
  });
});

describe('parsePermitStatusMapTsv', () => {
  it('MATCHED/RTRCN_NULL 로 matched/active 판정', () => {
    const tsv = ['PERMIT_NO\tMATCHED\tRTRCN_NULL\tSTTEMNT\tRTRCN', 'P1\t1\t1\t4\t', 'P2\t1\t0\t2\t2', 'P3\t0\t0\t\t'].join('\n');
    const m = parsePermitStatusMapTsv(tsv);
    expect(m.get('P1')).toEqual({ matched: true, active: true });
    expect(m.get('P2')).toEqual({ matched: true, active: false }); // matched 이나 RTRCN non-null → inactive
    expect(m.get('P3')).toEqual({ matched: false, active: false });
  });
});
