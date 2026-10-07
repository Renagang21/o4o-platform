/**
 * Hospital Pharmacy V1 — 무로그인 구조 이해 경계 (StructureProfile 만 받는다)
 *
 * WO-O4O-HOSPITAL-PHARMACY-V1-FIXED-LOCAL-FILE-AND-LOGINLESS-SIMPLIFICATION §6·§18
 *
 *   - 브라우저가 공용 @o4o/file-understanding-core 로 만든 profile 은 그대로 통과한다(같은 구현).
 *   - 표본 상한을 넘는 profile(= 전체 행이 실려 온 경우)은 거부한다 — 전체 파일/행 서버 전송 차단.
 *   - 알 수 없는 키는 AI 로 흘리지 않는다(재조립).
 */
import * as XLSX from 'xlsx';
import {
  decodeWorkbook,
  profileWorkbook,
  STRUCTURE_PROFILE_SAMPLE_ROWS,
} from '@o4o/file-understanding-core';
import { validateStructureProfile } from '../routes/hospital/hospital.routes.js';

function xlsxBytes(rows: string[][]): Uint8Array {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), '원내약');
  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
}

function sampleProfile(dataRows = 50) {
  const rows: string[][] = [['제품명', '성분', '함량']];
  for (let i = 0; i < dataRows; i += 1) rows.push([`테스트정${i}`, '아세트아미노펜', '500mg']);
  return profileWorkbook(decodeWorkbook(xlsxBytes(rows)));
}

describe('hospital /ai/structure — StructureProfile boundary', () => {
  it('공용 Core 가 만든 profile 은 통과하고 표본만 담는다', () => {
    const profile = sampleProfile(50);
    const { profile: checked, code } = validateStructureProfile(profile);
    expect(code).toBeNull();
    expect(checked).not.toBeNull();
    expect(checked!.sheets[0].totalRows).toBe(51);
    expect(checked!.sheets[0].sampleRows.length).toBeLessThanOrEqual(STRUCTURE_PROFILE_SAMPLE_ROWS);
  });

  it('전체 행이 실린 profile(표본 상한 초과)은 거부한다', () => {
    const profile = sampleProfile(50);
    const tampered = {
      ...profile,
      sheets: profile.sheets.map((s) => ({
        ...s,
        sampleRows: Array.from({ length: 51 }, (_, i) => [`테스트정${i}`, '아세트아미노펜', '500mg']),
      })),
    };
    expect(validateStructureProfile(tampered)).toEqual({ profile: null, code: 'PROFILE_SAMPLE_ROWS_INVALID' });
  });

  it('긴 셀 · 과다 열 통계 표본 · 잘못된 형식을 거부한다', () => {
    const profile = sampleProfile(5);
    const longCell = {
      ...profile,
      sheets: [{ ...profile.sheets[0], sampleRows: [['x'.repeat(201), '', '']] }],
    };
    expect(validateStructureProfile(longCell).code).toBe('PROFILE_SAMPLE_ROW_INVALID');

    const manySamples = {
      ...profile,
      sheets: [{
        ...profile.sheets[0],
        columnStats: profile.sheets[0].columnStats.map((c) => ({ ...c, samples: ['a', 'b', 'c', 'd'] })),
      }],
    };
    expect(validateStructureProfile(manySamples).code).toBe('PROFILE_COLUMN_STAT_INVALID');

    expect(validateStructureProfile({ ...profile, sourceFormat: 'pdf' }).code).toBe('PROFILE_FORMAT_INVALID');
    expect(validateStructureProfile(null).code).toBe('PROFILE_REQUIRED');
  });

  it('알 수 없는 키는 재조립 과정에서 떨어진다', () => {
    const profile = sampleProfile(3);
    const withExtra = {
      ...profile,
      rawFile: 'AAAA',
      sheets: profile.sheets.map((s) => ({ ...s, allRows: [['leak']] })),
    };
    const { profile: checked } = validateStructureProfile(withExtra);
    expect(checked).not.toBeNull();
    expect(Object.keys(checked!)).toEqual(['sourceFormat', 'sheets']);
    expect(Object.keys(checked!.sheets[0]).sort()).toEqual(['columnCount', 'columnStats', 'sampleRows', 'sheetName', 'totalRows']);
  });
});
