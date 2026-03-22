/**
 * XLSX Template Generator — WO-NETURE-BULK-IMPORT-TEMPLATE-UPGRADE-V1
 *
 * barcode 텍스트 보존 + 컬럼 설명 + validation hint 포함
 */
import ExcelJS from 'exceljs';

export async function generateProductTemplate(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();

  // ===== Sheet 1: Products =====
  const ws = wb.addWorksheet('Products');

  ws.columns = [
    { header: 'barcode*', key: 'barcode', width: 25 },
    { header: 'marketing_name*', key: 'marketing_name', width: 30 },
    { header: 'supply_price*', key: 'supply_price', width: 15 },
    { header: 'distribution_type', key: 'distribution_type', width: 18 },
    { header: 'manufacturer_name', key: 'manufacturer_name', width: 25 },
    { header: 'brand', key: 'brand', width: 20 },
    { header: 'image_url', key: 'image_url', width: 40 },
    { header: 'consumer_short_description', key: 'consumer_short_description', width: 40 },
    { header: 'msrp', key: 'msrp', width: 15 },
    { header: 'stock_qty', key: 'stock_qty', width: 15 },
  ];

  // barcode 텍스트 강제 (scientific notation 방지)
  ws.getColumn('barcode').numFmt = '@';

  // 헤더 스타일
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' },
    };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
  });

  // 샘플 데이터
  ws.addRow({
    barcode: '8801234567890',
    marketing_name: '비타민C 1000mg',
    supply_price: 5000,
    distribution_type: 'PRIVATE',
    manufacturer_name: '(주)헬스케어',
    brand: '헬스브랜드',
    image_url: 'https://example.com/image.jpg',
    consumer_short_description: '면역력에 도움을 주는 비타민C',
    msrp: 10000,
    stock_qty: 100,
  });

  ws.addRow({
    barcode: '8809876543210',
    marketing_name: '오메가3 EPA/DHA',
    supply_price: 8000,
    distribution_type: 'PUBLIC',
    consumer_short_description: '혈행 개선에 도움',
    msrp: 15000,
    stock_qty: 50,
  });

  // ===== Sheet 2: Guide =====
  const guide = wb.addWorksheet('Guide');

  guide.columns = [
    { header: '필드', key: 'field', width: 35 },
    { header: '필수', key: 'required', width: 10 },
    { header: '설명', key: 'desc', width: 60 },
  ];

  const guideData = [
    { field: 'barcode*', required: 'YES', desc: '상품 바코드 (GTIN). 텍스트 형식 유지 — 숫자 변환 금지' },
    { field: 'marketing_name*', required: 'YES', desc: '상품명 (또는 regulatory_name 중 1개 필수)' },
    { field: 'supply_price*', required: 'YES', desc: '공급가 (0보다 큰 정수)' },
    { field: 'distribution_type', required: 'NO', desc: 'PRIVATE (기본값) / PUBLIC. PUBLIC 시 consumer_short_description 필수' },
    { field: 'manufacturer_name', required: 'NO', desc: '제조사명' },
    { field: 'brand', required: 'NO', desc: '브랜드명 (자동 매칭/생성)' },
    { field: 'image_url', required: 'NO', desc: '대표 이미지 URL (1개)' },
    { field: 'consumer_short_description', required: '조건부', desc: 'B2C 간이 설명. distribution_type=PUBLIC일 때 필수' },
    { field: 'msrp', required: 'NO', desc: '소비자 참고가 (권장소비자가격)' },
    { field: 'stock_qty', required: 'NO', desc: '재고 수량 (정수)' },
  ];

  guideData.forEach((row) => guide.addRow(row));

  // Guide 헤더 스타일
  const guideHeader = guide.getRow(1);
  guideHeader.font = { bold: true };
  guideHeader.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' },
    };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
  });

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
