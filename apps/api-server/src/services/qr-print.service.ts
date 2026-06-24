/**
 * QR Print Service
 *
 * WO-O4O-QR-PRINT-MODULE-V1
 * WO-O4O-QR-PRINT-MODULE-V2
 *
 * QR 코드 생성 + A4 8분할 PDF 즉시 다운로드.
 * QR은 DB에 저장하지 않음 (온디맨드 생성).
 *
 * - generateQrDataUrl: QR PNG → base64 data URL
 * - generateQrPng: QR PNG → Buffer (지정 크기)
 * - generateQrSvg: QR SVG → string (지정 크기)
 * - generateQrPrintPdf: A4 8분할 (2열×4행) PDF Buffer
 */

import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * 폰트 경로 결정:
 * - tsc 빌드: dist/services/ → dist/assets/fonts/
 * - tsup 번들: dist/ → dist/assets/fonts/
 * - src 개발: src/services/ → src/assets/fonts/
 */
function resolveFontPath(): string {
  const candidates = [
    join(process.cwd(), 'dist', 'assets', 'fonts', 'NotoSansKR-Regular.ttf'),
    join(process.cwd(), 'src', 'assets', 'fonts', 'NotoSansKR-Regular.ttf'),
    join(process.cwd(), 'assets', 'fonts', 'NotoSansKR-Regular.ttf'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return candidates[0];
}

const FONT_PATH = resolveFontPath();

export interface QrPrintItem {
  url: string;
  title: string;
  subtitle?: string;
  price?: string;
}

/**
 * QR PNG를 base64 data URL로 생성
 * WO-O4O-KPA-STORE-QR-PRINT-EXPORT-FOUNDATION-V1: margin(quiet zone, 모듈 단위) 옵션 추가.
 *   기본값 1 유지(기존 호출 영향 없음). 인쇄 export 는 4 권장.
 */
export async function generateQrDataUrl(url: string, margin = 1): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 300,
    margin,
    errorCorrectionLevel: 'M',
  });
}

/**
 * QR PNG Buffer 생성 (지정 크기)
 * margin: quiet zone(모듈 단위). 기본 1(기존 동작 유지), export 는 4 권장.
 */
export async function generateQrPng(url: string, size?: number, margin = 1): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    width: size || 512,
    margin,
    errorCorrectionLevel: 'M',
  });
}

/**
 * QR SVG 문자열 생성 (지정 크기)
 * margin: quiet zone(모듈 단위). 기본 1(기존 동작 유지), export 는 4 권장.
 */
export async function generateQrSvg(url: string, size?: number, margin = 1): Promise<string> {
  return QRCode.toString(url, {
    type: 'svg',
    width: size || 512,
    margin,
    errorCorrectionLevel: 'M',
  });
}

/**
 * A4 8분할 (2열 × 4행) QR 인쇄 PDF 생성
 *
 * 각 블록: QR(120×120) + 제목 + 가격(선택) + "QR 스캔 후 관심 요청"
 */
export async function generateQrPrintPdf(items: QrPrintItem[]): Promise<Buffer> {
  // A4 dimensions in points: 595.28 x 841.89
  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const MARGIN = 30;
  const COLS = 2;
  const ROWS = 4;
  const ITEMS_PER_PAGE = COLS * ROWS;

  const cellWidth = (PAGE_WIDTH - MARGIN * 2) / COLS;
  const cellHeight = (PAGE_HEIGHT - MARGIN * 2) / ROWS;

  const QR_SIZE = 120;

  const doc = new PDFDocument({ size: 'A4', margin: MARGIN });
  const chunks: Buffer[] = [];

  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  // Register Korean font
  doc.registerFont('NotoSansKR', FONT_PATH);

  // Pre-generate all QR data URLs
  const qrDataUrls: string[] = [];
  for (const item of items) {
    const dataUrl = await generateQrDataUrl(item.url);
    qrDataUrls.push(dataUrl);
  }

  for (let i = 0; i < items.length; i++) {
    // New page for every 8 items (skip for first page)
    if (i > 0 && i % ITEMS_PER_PAGE === 0) {
      doc.addPage();
    }

    const indexOnPage = i % ITEMS_PER_PAGE;
    const col = indexOnPage % COLS;
    const row = Math.floor(indexOnPage / COLS);

    const cellX = MARGIN + col * cellWidth;
    const cellY = MARGIN + row * cellHeight;

    const item = items[i];
    const qrDataUrl = qrDataUrls[i];

    // Draw cell border (light gray dashed)
    doc.save();
    doc.rect(cellX, cellY, cellWidth, cellHeight)
      .dash(3, { space: 3 })
      .strokeColor('#cccccc')
      .stroke();
    doc.restore();

    // QR code image (centered horizontally in cell)
    const qrX = cellX + (cellWidth - QR_SIZE) / 2;
    const qrY = cellY + 15;

    // Convert data URL to buffer for pdfkit
    const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
    const qrBuffer = Buffer.from(base64Data, 'base64');
    doc.image(qrBuffer, qrX, qrY, { width: QR_SIZE, height: QR_SIZE });

    // Title (below QR)
    const textStartY = qrY + QR_SIZE + 10;
    const textX = cellX + 10;
    const textWidth = cellWidth - 20;

    doc.font('NotoSansKR')
      .fontSize(11)
      .fillColor('#222222')
      .text(item.title, textX, textStartY, {
        width: textWidth,
        align: 'center',
        lineBreak: true,
        height: 30,
        ellipsis: true,
      });

    // Subtitle or price
    if (item.subtitle || item.price) {
      const line2 = item.price ? `${item.price}` : item.subtitle || '';
      doc.font('NotoSansKR')
        .fontSize(9)
        .fillColor('#666666')
        .text(line2, textX, textStartY + 32, {
          width: textWidth,
          align: 'center',
        });
    }

    // Bottom instruction
    doc.font('NotoSansKR')
      .fontSize(8)
      .fillColor('#999999')
      .text('QR 스캔 후 관심 요청', textX, cellY + cellHeight - 25, {
        width: textWidth,
        align: 'center',
      });
  }

  return new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// WO-O4O-KPA-STORE-QR-PRINT-EXPORT-FOUNDATION-V1
//   모든 QR 타입용 범용 per-QR export (preset 기반).
//   기존 generateQrPrintPdf(8분할, 상품성 문구)와 별개로, 단일 QR 의 A4 1장/4분할 poster 를
//   제목·설명·매장명·스캔 안내와 함께 생성한다.
// ─────────────────────────────────────────────────────────────────────────────

/** export preset — raster 해상도 + PDF 레이아웃 결정 (UX 단순화: mm 직접입력 대신 preset) */
export type QrExportPreset = 'small' | 'medium' | 'large' | 'a4' | 'a4_4up';

/** preset → PNG/SVG 픽셀 해상도 (인쇄 품질 보장: medium 이상 ≥1024px) */
export function presetToPixelSize(preset: QrExportPreset): number {
  switch (preset) {
    case 'small': return 640;
    case 'large': return 2048;
    case 'medium':
    default: return 1024;
  }
}

/** 기본 스캔 안내 문구 */
const DEFAULT_SCAN_NOTICE = '자세한 안내는 QR 코드를 스캔해 확인하세요.';

export interface QrPosterItem {
  url: string;
  title: string;
  description?: string;
  storeName?: string;
}

/**
 * 단일 QR 의 A4 poster PDF 생성.
 *   perPage=1 → A4 1장형(큰 QR + 제목 + 설명 + 매장명 + 안내문 + 작은 URL)
 *   perPage=4 → A4 4분할형(2×2, 절취선 — 동일 QR 4개를 caller 가 넣어 한 장에서 잘라 사용)
 */
export async function generateQrPosterPdf(items: QrPosterItem[], perPage: 1 | 4): Promise<Buffer> {
  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const MARGIN = 36;
  const COLS = perPage === 4 ? 2 : 1;
  const ROWS = perPage === 4 ? 2 : 1;
  const ITEMS_PER_PAGE = COLS * ROWS;

  const cellWidth = (PAGE_WIDTH - MARGIN * 2) / COLS;
  const cellHeight = (PAGE_HEIGHT - MARGIN * 2) / ROWS;
  const QR_SIZE = perPage === 4 ? 160 : 300;

  const doc = new PDFDocument({ size: 'A4', margin: MARGIN });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  doc.registerFont('NotoSansKR', FONT_PATH);

  // quiet zone 보장(margin=4)
  const qrDataUrls: string[] = [];
  for (const item of items) {
    qrDataUrls.push(await generateQrDataUrl(item.url, 4));
  }

  for (let i = 0; i < items.length; i++) {
    if (i > 0 && i % ITEMS_PER_PAGE === 0) doc.addPage();

    const indexOnPage = i % ITEMS_PER_PAGE;
    const col = indexOnPage % COLS;
    const row = Math.floor(indexOnPage / COLS);
    const cellX = MARGIN + col * cellWidth;
    const cellY = MARGIN + row * cellHeight;

    const item = items[i];
    const textX = cellX + 16;
    const textWidth = cellWidth - 32;

    // 4분할은 절취 가이드(점선) 표시
    if (perPage === 4) {
      doc.save();
      doc.rect(cellX, cellY, cellWidth, cellHeight)
        .dash(3, { space: 3 }).strokeColor('#dddddd').stroke();
      doc.restore();
    }

    // QR (셀 상단 중앙)
    const qrX = cellX + (cellWidth - QR_SIZE) / 2;
    const qrY = cellY + (perPage === 4 ? 24 : 60);
    const base64Data = qrDataUrls[i].replace(/^data:image\/png;base64,/, '');
    doc.image(Buffer.from(base64Data, 'base64'), qrX, qrY, { width: QR_SIZE, height: QR_SIZE });

    let cursorY = qrY + QR_SIZE + (perPage === 4 ? 10 : 24);

    // 제목
    doc.font('NotoSansKR').fontSize(perPage === 4 ? 13 : 22).fillColor('#1f2937')
      .text(item.title, textX, cursorY, { width: textWidth, align: 'center', height: perPage === 4 ? 34 : 56, ellipsis: true });
    cursorY += perPage === 4 ? 36 : 60;

    // 설명 (1장형만, 또는 짧게)
    if (item.description && perPage === 1) {
      doc.font('NotoSansKR').fontSize(12).fillColor('#6b7280')
        .text(item.description, textX, cursorY, { width: textWidth, align: 'center', height: 80, ellipsis: true });
      cursorY += 92;
    }

    // 매장명
    if (item.storeName) {
      doc.font('NotoSansKR').fontSize(perPage === 4 ? 10 : 13).fillColor('#374151')
        .text(item.storeName, textX, cursorY, { width: textWidth, align: 'center' });
      cursorY += perPage === 4 ? 16 : 22;
    }

    // 스캔 안내 문구
    doc.font('NotoSansKR').fontSize(perPage === 4 ? 9 : 12).fillColor('#9ca3af')
      .text(DEFAULT_SCAN_NOTICE, textX, cursorY, { width: textWidth, align: 'center' });

    // 작은 URL (셀 하단)
    doc.font('NotoSansKR').fontSize(perPage === 4 ? 6 : 8).fillColor('#cbd5e1')
      .text(item.url, textX, cellY + cellHeight - (perPage === 4 ? 16 : 28), { width: textWidth, align: 'center', ellipsis: true });
  }

  return new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}
