/**
 * XLSX Parser — WO-NETURE-XLSX-DIRECT-UPLOAD-V1
 *
 * XLSX 파일을 Record<string, string>[] 로 변환하여
 * 기존 CSV validation 파이프라인에 그대로 전달한다.
 */
import * as XLSX from 'xlsx';

export function parseXlsxToRecords(buffer: Buffer): Record<string, string>[] {
  const wb = XLSX.read(buffer, { type: 'buffer', cellText: true, raw: false });

  // Products 시트 우선, 없으면 첫 번째 시트
  const sheet = wb.Sheets['Products'] || wb.Sheets[wb.SheetNames[0]];
  if (!sheet) {
    throw new Error('XLSX_NO_SHEET: 시트를 찾을 수 없습니다');
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  // 모든 값을 string으로 정규화 (csv-parse 출력과 동일한 형식)
  return rows.map((row) => {
    const normalized: Record<string, string> = {};
    for (const [key, val] of Object.entries(row)) {
      // 템플릿 헤더의 '*' suffix 제거 (barcode* → barcode)
      const cleanKey = key.replace(/\*$/, '').trim();
      normalized[cleanKey] = val == null ? '' : String(val).trim();
    }
    return normalized;
  });
}
