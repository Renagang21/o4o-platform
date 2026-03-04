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
 */
export async function generateQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 300,
    margin: 1,
    errorCorrectionLevel: 'M',
  });
}

/**
 * QR PNG Buffer 생성 (지정 크기)
 */
export async function generateQrPng(url: string, size?: number): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    width: size || 512,
    margin: 1,
    errorCorrectionLevel: 'M',
  });
}

/**
 * QR SVG 문자열 생성 (지정 크기)
 */
export async function generateQrSvg(url: string, size?: number): Promise<string> {
  return QRCode.toString(url, {
    type: 'svg',
    width: size || 512,
    margin: 1,
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
