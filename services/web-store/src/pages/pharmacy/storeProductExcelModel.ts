import { registerStandardProductToStore } from '../../api/o4oStandardProducts';
import type { ProductFileRow, ProductFilePreview } from '../../api/storeProductAi';

export function productFileMapping(barcodeColumn: string, nameColumn: string, language: string) {
  return { language, barcodeColumn: barcodeColumn === '' ? undefined : Number(barcodeColumn), nameColumn: nameColumn === '' ? undefined : Number(nameColumn) };
}
export function guessProductFileColumns(columns: ProductFilePreview['columns']) {
  const normalized = columns.map(c => ({ ...c, label: c.label.replace(/\s/g, '') }));
  const barcode = normalized.find(c => /^(바코드|관리번호\(바코드\)|표준코드|barcode|gtin|ean13)$/i.test(c.label));
  const name = normalized.find(c => /^(상품명|제품명|품명|품목명|name|product_name)$/i.test(c.label));
  return { barcode: barcode ? String(barcode.index) : '', name: name ? String(name.index) : '' };
}
/** Serial requests preserve the existing per-item API and stop immediately on store change. */
export async function registerProductFileSelection(rows: ProductFileRow[], selected: Record<number, string>, isCurrent: () => boolean,
  onOutcome: (row: number, outcome: string) => void) {
  const registered = new Set<string>(); let changed = false;
  await rows.reduce(async (previous, row) => {
    await previous;
    if (!isCurrent()) return;
    const id = selected[row.row];
    try {
      if (!registered.has(id)) await registerStandardProductToStore(id);
      if (!isCurrent()) return;
      registered.add(id); changed = true; onOutcome(row.row, 'registered');
    } catch { if (isCurrent()) onOutcome(row.row, 'failed'); }
  }, Promise.resolve());
  return changed;
}
export function fileRowLabels(row: ProductFileRow, target: ProductFileRow['candidates'][number] | undefined, outcome: string) {
  let material = '선택 대기', registration = '', missing = '식별 대기·자동 생성 안 함';
  if (target) material = target.hasAiDescription ? '승인 구조화 자료 준비됨'
    : target.aiState === 'legacy' ? '기존 설명만 있음 · 구조화 자료 준비 필요'
    : target.aiState === 'unclassified' ? '미분류 자료 · 근거 검토 필요' : '공개 근거 준비 필요';
  if (row.state === 'invalid') missing = '바코드·입력 확인 필요';
  if (outcome === 'registered') registration = '매장 등록 완료';
  else if (outcome === 'failed') registration = '등록 실패·다시 시도 가능';
  else if (target?.registered) registration = '이미 등록된 상품';
  return { material, registration, missing };
}
