/**
 * XLSX Template Generator
 *
 * WO-NETURE-BULK-IMPORT-TEMPLATE-UPGRADE-V1
 * WO-NETURE-XLSX-TEMPLATE-FINAL-V2 — 컬럼 단순화, 필수 표시 제거, 가이드 시트 재작성
 *
 * 11 컬럼 고정. barcode 텍스트 보존. 2행 설명. 가이드 시트 포함.
 */
import ExcelJS from 'exceljs';

/** 컬럼 정의 (순서 고정) */
const COLUMNS = [
  { key: 'barcode', header: 'barcode', width: 25, desc: '상품 바코드 (선택 입력, 없으면 자동 생성되며 이후 변경 불가)' },
  { key: 'name', header: 'name', width: 30, desc: '상품명 (구매자 표시용, 검색/노출용)' },
  { key: 'manufacturer_name', header: 'manufacturer_name', width: 25, desc: '제조사' },
  { key: 'brand', header: 'brand', width: 20, desc: '브랜드' },
  { key: 'origin_country', header: 'origin_country', width: 15, desc: '원산지' },
  { key: 'supply_price', header: 'supply_price', width: 15, desc: '공급가 (필수 입력, 숫자만 입력)' },
  { key: 'consumer_price', header: 'consumer_price', width: 15, desc: '소비자 가격' },
  { key: 'stock_qty', header: 'stock_qty', width: 12, desc: '재고 수량 (선택 입력, 미입력 시 0 처리)' },
  { key: 'short_description', header: 'short_description', width: 35, desc: '목록에 표시되는 간단 설명' },
  { key: 'detail_description', header: 'detail_description', width: 40, desc: '상세 페이지에 표시되는 설명' },
  { key: 'image_url', header: 'image_url', width: 40, desc: '썸네일용 대표 이미지 URL (1개 권장)' },
];

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF1F5F9' },
};
const HEADER_BORDER: Partial<ExcelJS.Borders> = {
  bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
};
const DESC_FONT: Partial<ExcelJS.Font> = { size: 9, color: { argb: 'FF94A3B8' }, italic: true };

export async function generateProductTemplate(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();

  // ===== Sheet 1: 상품 입력 =====
  const ws = wb.addWorksheet('Products');

  ws.columns = COLUMNS.map(c => ({ header: c.header, key: c.key, width: c.width }));

  // barcode 텍스트 강제 (scientific notation 방지)
  ws.getColumn('barcode').numFmt = '@';

  // Row 1: 헤더 스타일
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.border = HEADER_BORDER;
  });

  // Row 2: 컬럼 설명
  const descRow = ws.addRow(
    COLUMNS.reduce((acc, c) => ({ ...acc, [c.key]: c.desc }), {} as Record<string, string>),
  );
  descRow.eachCell((cell) => {
    cell.font = DESC_FONT;
  });

  // Row 3~4: 샘플 데이터
  ws.addRow({
    barcode: '8801234567890',
    name: '비타민C 1000mg',
    manufacturer_name: '(주)헬스케어',
    brand: '헬스브랜드',
    origin_country: '대한민국',
    supply_price: 5000,
    consumer_price: 10000,
    stock_qty: 100,
    short_description: '면역력에 도움을 주는 비타민C',
    detail_description: '1일 1회 1정, 식후 30분에 복용',
    image_url: 'https://example.com/vitaminc.jpg',
  });

  ws.addRow({
    name: '오메가3 EPA/DHA',
    supply_price: 8000,
    consumer_price: 15000,
    stock_qty: 50,
    short_description: '혈행 개선에 도움',
  });

  // ===== Sheet 2: 사용방법 안내 =====
  const guide = wb.addWorksheet('사용방법 안내');
  guide.getColumn(1).width = 25;
  guide.getColumn(2).width = 55;

  const addSection = (title: string) => {
    const r = guide.addRow([title, '']);
    r.font = { bold: true, size: 11 };
    r.getCell(1).fill = HEADER_FILL;
    r.getCell(2).fill = HEADER_FILL;
  };
  const addPair = (a: string, b: string) => {
    guide.addRow([a, b]);
  };
  const addBlank = () => guide.addRow(['', '']);

  // 상단 안내
  const intro = guide.addRow(['이 엑셀은 상품을 빠르게 등록하기 위한 도구입니다.', '']);
  intro.font = { bold: true, size: 11 };
  guide.addRow(['필수 정보만 입력하고 등록한 후, 상세 정보는 공급자 대시보드에서 수정하세요.', '']);
  addBlank();

  // 1. 작업 흐름
  addSection('1. 작업 흐름');
  addPair('1', '엑셀에 기본 정보 입력');
  addPair('2', '파일 업로드');
  addPair('3', '상품 리스트에서 확인');
  addPair('4', '가격, 이미지, 설명 등 추가 수정');
  addPair('5', '승인 후 서비스에 노출');
  addBlank();

  // 2. 입력 기준
  addSection('2. 입력 기준');
  addPair('입력 원칙', '가능한 간단하게 입력');
  addPair('필수 입력', 'supply_price');
  addPair('권장 입력', 'name');
  addPair('선택 입력', '나머지 모든 항목');
  addPair('카테고리', '입력하지 않음');
  addPair('서비스 설정', '입력하지 않음');
  addBlank();

  // 3. 주요 컬럼 안내
  addSection('3. 주요 컬럼 안내');
  for (const col of COLUMNS) {
    addPair(col.key, col.desc);
  }
  addBlank();

  // 4. 바코드 안내
  addSection('4. 바코드 안내');
  addPair('바코드 입력', '선택');
  addPair('미입력 시', '시스템에서 자동 생성');
  addPair('자동 생성 코드', '내부 관리용 코드 (INTERNAL)로 표시됨');
  addBlank();

  // 5. 설명 입력 안내
  addSection('5. 설명 입력 안내');
  addPair('short_description', '상품의 간단 설명');
  addPair('detail_description', '상품의 상세 설명');
  addPair('작성 방식', '자유 입력');
  addPair('활용', '서비스에 따라 일부 또는 전체가 노출될 수 있음');
  addBlank();

  // 6. 업로드 후 작업
  addSection('6. 업로드 후 작업');
  addPair('가격 수정', '상품 리스트에서 수정');
  addPair('이미지 추가', '업로드 후 추가 가능');
  addPair('설명 수정', '언제든지 수정 가능');
  addPair('서비스 설정', '등록 후 설정');
  addPair('태그', '시스템에서 생성 가능');
  addBlank();

  // 7. 주의 사항
  addSection('7. 주의 사항');
  addPair('중복 상품', '동일 상품이 있는지 확인');
  addPair('가격 입력', '숫자만 입력');
  addPair('이미지 URL', '외부에서 접근 가능한 URL 사용');
  addPair('엑셀 형식', '컬럼 순서 변경 금지');
  addBlank();

  // 핵심
  const summary = guide.addRow(['엑셀은 상품 등록을 위한 시작 단계이며, 실제 작업은 공급자 대시보드에서 이루어집니다.', '']);
  summary.font = { bold: true, color: { argb: 'FF1E40AF' } };

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
