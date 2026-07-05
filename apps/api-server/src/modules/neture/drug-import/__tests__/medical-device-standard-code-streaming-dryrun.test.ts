/**
 * Unit tests — WO-O4O-MEDICAL-DEVICE-STREAMING-IMPORTER-DRYRUN-V1
 *
 * streaming dry-run(runFromLines) 이 비streaming offline dry-run(service.run) 과
 * 동일 지표를 산출함을 검증(회귀 기준). 실 DB 불필요, 파일 불필요.
 */
import { MedicalDeviceStandardCodeCandidateImportService } from '../medical-device-standard-code-candidate-import.service.js';
import { MedicalDeviceStandardCodeStreamingDryRunService } from '../medical-device-standard-code-streaming-dryrun.service.js';

const wrap = (item: Record<string, unknown>): string =>
  JSON.stringify({ sourceDataset: 'MFDS', fetchedAt: '2026-07-02T06:36:25Z', pageNo: 1, rowIndex: 0, item });

// 교차행/중복/결측을 모두 포함하는 표본:
const LINES: string[] = [
  // 정상 GTIN-14
  wrap({ UDIDI_CD: '08800158900007', PRDLST_NM: '치과합금', FOML_INFO: 'F1', PERMIT_NO: 'P1', MNFT_IPRT_ENTP_NM: 'M1', MDEQ_CLSF_NO: 'C1' }),
  // 같은 정규화 UDIDI, 다른 제품(rowSignature 상이) → UDI_DI_DUP_CONFLICT (2행)
  wrap({ UDIDI_CD: '08800158900007', PRDLST_NM: '다른제품', FOML_INFO: 'F2', PERMIT_NO: 'P2', MNFT_IPRT_ENTP_NM: 'M2', MDEQ_CLSF_NO: 'C2' }),
  // GTIN-13
  wrap({ UDIDI_CD: '8809878302719', PRDLST_NM: 'B', FOML_INFO: 'FB', PERMIT_NO: 'PMULTI', MNFT_IPRT_ENTP_NM: 'MB', MDEQ_CLSF_NO: 'CB' }),
  // 같은 PERMIT(PMULTI) + 다른 UDIDI → MULTI_UDI_PER_PERMIT
  wrap({ UDIDI_CD: '08800209331613', PRDLST_NM: 'C', FOML_INFO: 'FC', PERMIT_NO: 'PMULTI', MNFT_IPRT_ENTP_NM: 'MC', MDEQ_CLSF_NO: 'CC' }),
  // HIBCC UDI_DI
  wrap({ UDIDI_CD: '+J014660387510', PRDLST_NM: 'D', FOML_INFO: 'FD', PERMIT_NO: 'PD', MNFT_IPRT_ENTP_NM: 'MD', MDEQ_CLSF_NO: 'CD' }),
  // 정확 중복행 (rowSignature 동일) → skipped 1
  wrap({ UDIDI_CD: '08800158900007', PRDLST_NM: '치과합금', FOML_INFO: 'F1', PERMIT_NO: 'P1', MNFT_IPRT_ENTP_NM: 'M1', MDEQ_CLSF_NO: 'C1' }),
  // 결측: UDIDI 없음, 이름 없음, 업체 없음
  wrap({ PERMIT_NO: 'PE' }),
  // 빈 줄 + invalid json
  '',
  '{not valid json',
];

async function* toAsync(lines: string[]): AsyncGenerator<string> {
  for (const l of lines) yield l;
}

describe('MedicalDeviceStandardCodeStreamingDryRunService — 비streaming 과 지표 일치', () => {
  it('streaming(runFromLines) 이 비streaming offline dry-run 과 동일 수치를 낸다', async () => {
    const text = LINES.join('\n');

    const nonStreaming = await new MedicalDeviceStandardCodeCandidateImportService().run({
      text,
      sourceFileName: 't',
      apply: false,
      dataSource: null,
    });

    const streaming = await new MedicalDeviceStandardCodeStreamingDryRunService().runFromLines(
      toAsync(LINES),
      { sourceFileName: 't' },
    );

    // 파싱/매핑 수
    expect(streaming.totalRows).toBe(nonStreaming.totalRows);
    expect(streaming.processedRows).toBe(nonStreaming.processedRows);
    expect(streaming.blankLines).toBe(nonStreaming.blankLines);
    expect(streaming.invalidJsonLines).toBe(nonStreaming.invalidJsonLines);

    // identifier / format
    expect(streaming.identifierTypeCounts).toEqual(nonStreaming.identifierTypeCounts);
    expect(streaming.formatCounts).toEqual(nonStreaming.formatCounts);

    // dedup 예측
    expect(streaming.counts.createdExpected).toBe(nonStreaming.counts.createdExpected);
    expect(streaming.counts.skipped).toBe(nonStreaming.counts.skipped);
    expect(streaming.counts.errored).toBe(nonStreaming.counts.errored);

    // 결측/절단
    expect(streaming.candidateNameMissing).toBe(nonStreaming.candidateNameMissing);
    expect(streaming.manufacturerMissing).toBe(nonStreaming.manufacturerMissing);
    expect(streaming.nameTruncatedCount).toBe(nonStreaming.nameTruncatedCount);

    // 교차행
    expect(streaming.dupConflictKeyCount).toBe(nonStreaming.dupConflictKeyCount);
    expect(streaming.dupConflictRowCount).toBe(nonStreaming.dupConflictRowCount);
    expect(streaming.multiUdiPermitCount).toBe(nonStreaming.multiUdiPermitCount);

    // reviewFlag 전체 카운트 일치 (교차행 플래그 포함)
    expect(streaming.reviewFlagCounts).toEqual(nonStreaming.reviewFlagCounts);
  });

  it('교차행/중복 표본의 절대 수치가 기대와 일치', async () => {
    const streaming = await new MedicalDeviceStandardCodeStreamingDryRunService().runFromLines(
      toAsync(LINES),
      { sourceFileName: 't' },
    );

    expect(streaming.totalRows).toBe(7); // 유효 파싱 7 (blank 1, invalid 1 제외)
    expect(streaming.processedRows).toBe(7);
    expect(streaming.blankLines).toBe(1);
    expect(streaming.invalidJsonLines).toBe(1);
    expect(streaming.counts.skipped).toBe(1); // 정확 중복행 1
    expect(streaming.counts.createdExpected).toBe(6); // 7 - 1 dup
    expect(streaming.dupConflictKeyCount).toBe(1); // UDIDI 08800158900007
    expect(streaming.dupConflictRowCount).toBe(3); // 두 다른제품 + 중복행 모두 같은 UDIDI
    expect(streaming.multiUdiPermitCount).toBe(1); // PMULTI
    expect(streaming.reviewFlagCounts.UDI_DI_DUP_CONFLICT).toBe(3);
    expect(streaming.reviewFlagCounts.MULTI_UDI_PER_PERMIT).toBe(2); // PMULTI 소속 2행
  });

  it('runFromLines 는 원본 row 배열을 만들지 않는다(lazy async 소비)', async () => {
    let yielded = 0;
    async function* counting(): AsyncGenerator<string> {
      for (const l of LINES) {
        yielded += 1;
        yield l;
      }
    }
    const svc = new MedicalDeviceStandardCodeStreamingDryRunService();
    const report = await svc.runFromLines(counting(), { sourceFileName: 't' });
    // 모든 라인이 소비됐고 결과가 나옴 — 스트림 소비 방식 확인
    expect(yielded).toBe(LINES.length);
    expect(report.streaming).toBe(true);
  });
});
