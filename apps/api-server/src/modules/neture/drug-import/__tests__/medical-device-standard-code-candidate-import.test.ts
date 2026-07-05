/**
 * Unit tests — WO-O4O-MEDICAL-DEVICE-PUBLIC-CANDIDATE-IMPORT-V1
 *
 * 의료기기 표준코드 raw JSONL parser + candidate mapper 검증. 실 DB 불필요.
 * 실 raw 표본값 사용: GTIN-14 08800158900007 / GTIN-13 8809878302719 / HIBCC +J014660387510
 */
import {
  parseMedicalDeviceJsonl,
  parseMedicalDeviceLine,
} from '../medical-device-standard-code-jsonl.parser.js';
import {
  mapMedicalDeviceItem,
  MDS_SOURCE_LABEL,
} from '../medical-device-standard-code-candidate.mapper.js';
import { MedicalDeviceStandardCodeCandidateImportService } from '../medical-device-standard-code-candidate-import.service.js';

const wrap = (item: Record<string, unknown>): string =>
  JSON.stringify({ sourceDataset: 'MFDS', fetchedAt: '2026-07-02T06:36:25Z', pageNo: 1, rowIndex: 0, item });

describe('parseMedicalDeviceJsonl', () => {
  it('wrapper 를 언랩하고 item 을 보존한다', () => {
    const text = [wrap({ UDIDI_CD: '08800158900007', PRDLST_NM: 'A' }), wrap({ UDIDI_CD: '8809878302719' })].join('\n');
    const r = parseMedicalDeviceJsonl(text);
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0].item.UDIDI_CD).toBe('08800158900007');
    expect(r.rows[0].fetchedAt).toBe('2026-07-02T06:36:25Z');
    expect(r.errors).toHaveLength(0);
  });

  it('빈 줄은 skip, invalid JSON 은 errors 에 누적(throw 안 함)', () => {
    const text = ['', wrap({ UDIDI_CD: 'x' }), '{not json', '   '].join('\n');
    const r = parseMedicalDeviceJsonl(text);
    expect(r.rows).toHaveLength(1);
    expect(r.blankLines).toBe(2);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].reason).toMatch(/JSON_PARSE_ERROR/);
  });

  it('평면 item(래핑 없음)도 관대하게 처리', () => {
    const row = parseMedicalDeviceLine(JSON.stringify({ UDIDI_CD: '08800158900007' }), 1);
    expect(row.item.UDIDI_CD).toBe('08800158900007');
    expect(row.fetchedAt).toBeNull();
  });
});

describe('mapMedicalDeviceItem — identifierType 분류', () => {
  it('GTIN-14 (check-digit pass) → GTIN, normalized 숫자 원형', () => {
    const m = mapMedicalDeviceItem({ UDIDI_CD: '08800158900007', PRDLST_NM: '치과합금', MNFT_IPRT_ENTP_NM: '(주)에이디에이', PERMIT_NO: '제인 26-4585 호' });
    expect(m.candidateInput.identifierType).toBe('GTIN');
    expect(m.candidateInput.normalizedIdentifierValue).toBe('08800158900007');
    expect(m.candidateInput.sourceLabel).toBe(MDS_SOURCE_LABEL);
    expect(m.reviewFlags).toContain('UDI_DI_GTIN14_CHECKDIGIT_PASS');
  });

  it('GTIN-13 (check-digit pass) → GTIN, zero-pad 하지 않음(원형 13자리)', () => {
    const m = mapMedicalDeviceItem({ UDIDI_CD: '8809878302719', PRDLST_NM: 'B' });
    expect(m.candidateInput.identifierType).toBe('GTIN');
    expect(m.candidateInput.normalizedIdentifierValue).toBe('8809878302719');
    expect(m.candidateInput.identifierValue).toBe('8809878302719');
    expect(m.reviewFlags).toContain('UDI_DI_GTIN13');
  });

  it("HIBCC('+') → UDI_DI, '+' prefix 보존", () => {
    const m = mapMedicalDeviceItem({ UDIDI_CD: '+J014660387510', PRDLST_NM: 'C' });
    expect(m.candidateInput.identifierType).toBe('UDI_DI');
    expect(m.candidateInput.normalizedIdentifierValue).toBe('+J014660387510');
    expect(m.reviewFlags).toContain('UDI_DI_NON_GTIN');
  });

  it('숫자 13/14 이나 check-digit fail → UDI_DI + fail flag', () => {
    // 08800158900007 의 마지막 자리를 변조 → check-digit fail
    const m = mapMedicalDeviceItem({ UDIDI_CD: '08800158900008', PRDLST_NM: 'D' });
    expect(m.candidateInput.identifierType).toBe('UDI_DI');
    expect(m.reviewFlags).toContain('UDI_DI_GTIN_CHECKDIGIT_FAIL');
  });

  it('UDIDI_CD 결측 → identifierType null + UDI_DI_MISSING', () => {
    const m = mapMedicalDeviceItem({ PRDLST_NM: 'E' });
    expect(m.candidateInput.identifierType).toBeNull();
    expect(m.candidateInput.normalizedIdentifierValue).toBeNull();
    expect(m.reviewFlags).toContain('UDI_DI_MISSING');
  });
});

describe('mapMedicalDeviceItem — 필드/플래그', () => {
  it('candidateName 은 PRDLST_NM 우선, 없으면 PRDT_NM_INFO', () => {
    const a = mapMedicalDeviceItem({ UDIDI_CD: '08800158900007', PRDLST_NM: '품목명', PRDT_NM_INFO: '제품명' });
    expect(a.candidateInput.candidateName).toBe('품목명');
    const b = mapMedicalDeviceItem({ UDIDI_CD: '08800158900007', PRDT_NM_INFO: '제품명만' });
    expect(b.candidateInput.candidateName).toBe('제품명만');
  });

  it('제조/수입업체명 결측 → MANUFACTURER_MISSING, 이름 결측 → PRODUCT_NAME_MISSING', () => {
    const m = mapMedicalDeviceItem({ UDIDI_CD: '08800158900007' });
    expect(m.reviewFlags).toContain('MANUFACTURER_MISSING');
    expect(m.reviewFlags).toContain('PRODUCT_NAME_MISSING');
  });

  it('허가 상태 미조인 → 전건 STATUS_UNCHECKED, rawPayload.statusJoined=false', () => {
    const m = mapMedicalDeviceItem({ UDIDI_CD: '08800158900007', PRDLST_NM: 'A' });
    expect(m.reviewFlags).toContain('STATUS_UNCHECKED');
    expect((m.candidateInput.rawPayload as { statusJoined: boolean }).statusJoined).toBe(false);
  });

  it('rowSignature 는 제품 식별 필드 조합 — 같은 UDIDI 다른 제품은 다른 signature', () => {
    const a = mapMedicalDeviceItem({ UDIDI_CD: '08800158900007', PRDLST_NM: 'X', PERMIT_NO: '제1', MNFT_IPRT_ENTP_NM: 'M1' });
    const b = mapMedicalDeviceItem({ UDIDI_CD: '08800158900007', PRDLST_NM: 'X', PERMIT_NO: '제2', MNFT_IPRT_ENTP_NM: 'M2' });
    expect(a.dedupKey.rowSignature).not.toBe(b.dedupKey.rowSignature);
    // 같은 제품 반복은 같은 signature
    const c = mapMedicalDeviceItem({ UDIDI_CD: '08800158900007', PRDLST_NM: 'X', PERMIT_NO: '제1', MNFT_IPRT_ENTP_NM: 'M1' });
    expect(a.dedupKey.rowSignature).toBe(c.dedupKey.rowSignature);
  });
});

describe('baseline 보호 가드 (재import dry-run)', () => {
  const itemA = { UDIDI_CD: '08800158900007', PRDLST_NM: 'PA', FOML_INFO: 'FA', PERMIT_NO: 'PMA', MNFT_IPRT_ENTP_NM: 'MA', MDEQ_CLSF_NO: 'CA' };
  const itemB = { UDIDI_CD: '08800209331613', PRDLST_NM: 'PB', FOML_INFO: 'FB', PERMIT_NO: 'PMB', MNFT_IPRT_ENTP_NM: 'MB', MDEQ_CLSF_NO: 'CB' };
  const itemC = { UDIDI_CD: '08809878302713', PRDLST_NM: 'PC', FOML_INFO: 'FC', PERMIT_NO: 'PMC', MNFT_IPRT_ENTP_NM: 'MC', MDEQ_CLSF_NO: 'CC' };
  const sigA = mapMedicalDeviceItem(itemA).dedupKey.rowSignature;
  const sigB = mapMedicalDeviceItem(itemB).dedupKey.rowSignature;

  it('approved_new_master 기존행은 protected skip, pending은 update, 신규는 insert (dry-run, DB write 0)', async () => {
    const text = [wrap(itemA), wrap(itemB), wrap(itemC)].join('\n');
    const queries: string[] = [];
    // fake DataSource: SELECT 만 응답, INSERT/UPDATE 호출 시 실패시킴(write 0 보장)
    const fakeDs = {
      isInitialized: true,
      query: async (sql: string) => {
        queries.push(sql);
        if (/^\s*SELECT/i.test(sql)) {
          return [
            { sig: sigA, status: 'approved_new_master' },
            { sig: sigB, status: 'pending' },
          ];
        }
        throw new Error('WRITE_ATTEMPTED_IN_DRYRUN');
      },
    };
    const svc = new MedicalDeviceStandardCodeCandidateImportService();
    const report = await svc.run({ text, sourceFileName: 't', apply: false, dataSource: fakeDs as never });

    expect(report.dedupChecked).toBe(true);
    expect(report.protectedBaselineSkipped).toBe(1); // A
    expect(report.counts.updatedExpected).toBe(1); // B
    expect(report.counts.createdExpected).toBe(1); // C
    // dry-run 은 SELECT 만 (INSERT/UPDATE 없음)
    expect(queries.every((q) => /^\s*SELECT/i.test(q))).toBe(true);
  });

  it('merged 상태도 protected skip', async () => {
    const text = [wrap(itemA)].join('\n');
    const fakeDs = {
      isInitialized: true,
      query: async (sql: string) => (/^\s*SELECT/i.test(sql) ? [{ sig: sigA, status: 'merged' }] : []),
    };
    const svc = new MedicalDeviceStandardCodeCandidateImportService();
    const report = await svc.run({ text, sourceFileName: 't', apply: false, dataSource: fakeDs as never });
    expect(report.protectedBaselineSkipped).toBe(1);
    expect(report.counts.updatedExpected).toBe(0);
    expect(report.counts.createdExpected).toBe(0);
  });
});
