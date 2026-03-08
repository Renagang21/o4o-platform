/**
 * QR Flyer Service
 *
 * WO-O4O-QR-FLYER-SYSTEM-V1
 *
 * 매장 상품 QR 전단지 PDF 생성.
 * 기존 qr-print.service.ts 패턴 기반 (pdfkit + qrcode + NotoSansKR).
 *
 * 3가지 템플릿:
 * - template=1: A4 1분할 (카운터 안내, 대형 POP)
 * - template=4: A4 4분할 (상품 안내 전단)
 * - template=8: A4 8분할 (진열대 POP, QR 카드)
 */

import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import { join } from 'path';
import { existsSync } from 'fs';

// ── Font ──

function resolveFontPath(name: string): string {
  const candidates = [
    join(process.cwd(), 'dist', 'assets', 'fonts', name),
    join(process.cwd(), 'src', 'assets', 'fonts', name),
    join(process.cwd(), 'assets', 'fonts', name),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return candidates[0];
}

const FONT_REGULAR = resolveFontPath('NotoSansKR-Regular.ttf');
const FONT_BOLD = resolveFontPath('NotoSansKR-Bold.ttf');

// ── Types ──

export interface FlyerProduct {
  productName: string;
  brandName?: string;
  price: number;
  pharmacistComment?: string;
  imageUrl?: string;
  storeName: string;
  storePhone?: string;
  qrUrl: string;
}

type FlyerTemplate = 1 | 4 | 8;

// ── Helpers ──

async function generateQrBuffer(url: string, size: number): Promise<Buffer> {
  const dataUrl = await QRCode.toDataURL(url, {
    width: size,
    margin: 1,
    errorCorrectionLevel: 'M',
  });
  const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  } catch {
    return null;
  }
}

function formatPrice(price: number): string {
  return `₩${price.toLocaleString('ko-KR')}`;
}

function registerFonts(doc: PDFKit.PDFDocument): void {
  doc.registerFont('NotoSansKR', FONT_REGULAR);
  if (existsSync(FONT_BOLD)) {
    doc.registerFont('NotoSansKR-Bold', FONT_BOLD);
  } else {
    doc.registerFont('NotoSansKR-Bold', FONT_REGULAR);
  }
}

// A4 in points
const PW = 595.28;
const PH = 841.89;

// ── Template 1: A4 Full Page ──

async function generateTemplate1(product: FlyerProduct): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  registerFonts(doc);

  const M = 40; // margin
  const contentW = PW - M * 2;

  // ── Product Image (top, centered) ──
  let yPos = M;
  const imgHeight = 260;

  if (product.imageUrl) {
    const imgBuf = await fetchImageBuffer(product.imageUrl);
    if (imgBuf) {
      try {
        doc.image(imgBuf, M, yPos, {
          width: contentW,
          height: imgHeight,
          fit: [contentW, imgHeight],
          align: 'center',
          valign: 'center',
        });
      } catch {
        // If image fails, draw placeholder
        doc.rect(M, yPos, contentW, imgHeight)
          .fillColor('#f1f5f9')
          .fill();
        doc.font('NotoSansKR').fontSize(14).fillColor('#94a3b8')
          .text('상품 이미지', M, yPos + imgHeight / 2 - 10, { width: contentW, align: 'center' });
      }
    } else {
      doc.rect(M, yPos, contentW, imgHeight).fillColor('#f1f5f9').fill();
    }
  } else {
    doc.rect(M, yPos, contentW, imgHeight).fillColor('#f1f5f9').fill();
    doc.font('NotoSansKR').fontSize(14).fillColor('#94a3b8')
      .text('상품 이미지', M, yPos + imgHeight / 2 - 10, { width: contentW, align: 'center' });
  }
  yPos += imgHeight + 24;

  // ── Brand ──
  if (product.brandName) {
    doc.font('NotoSansKR').fontSize(11).fillColor('#64748b')
      .text(product.brandName, M, yPos, { width: contentW, align: 'center' });
    yPos += 18;
  }

  // ── Product Name ──
  doc.font('NotoSansKR-Bold').fontSize(24).fillColor('#0f172a')
    .text(product.productName, M, yPos, { width: contentW, align: 'center' });
  yPos += 40;

  // ── Price ──
  doc.font('NotoSansKR-Bold').fontSize(32).fillColor('#0f172a')
    .text(formatPrice(product.price), M, yPos, { width: contentW, align: 'center' });
  yPos += 50;

  // ── Pharmacist Comment ──
  if (product.pharmacistComment) {
    // Comment box
    const boxX = M + 20;
    const boxW = contentW - 40;
    doc.roundedRect(boxX, yPos, boxW, 80, 8)
      .fillColor('#f0fdf4')
      .fill();
    doc.roundedRect(boxX, yPos, boxW, 80, 8)
      .strokeColor('#bbf7d0')
      .stroke();

    doc.font('NotoSansKR-Bold').fontSize(10).fillColor('#166534')
      .text('약사 추천', boxX + 12, yPos + 10, { width: boxW - 24 });
    doc.font('NotoSansKR').fontSize(9).fillColor('#374151')
      .text(product.pharmacistComment, boxX + 12, yPos + 26, {
        width: boxW - 24,
        height: 46,
        ellipsis: true,
      });
    yPos += 96;
  }

  // ── Bottom section: QR + Store Info ──
  const qrSize = 140;
  const qrBuf = await generateQrBuffer(product.qrUrl, qrSize * 2);
  const bottomY = PH - M - qrSize - 40;

  // QR code (right)
  const qrX = PW - M - qrSize;
  doc.image(qrBuf, qrX, bottomY, { width: qrSize, height: qrSize });

  // QR label
  doc.font('NotoSansKR').fontSize(8).fillColor('#94a3b8')
    .text('QR 스캔으로 상품 보기', qrX, bottomY + qrSize + 4, {
      width: qrSize,
      align: 'center',
    });

  // Store info (left)
  doc.font('NotoSansKR-Bold').fontSize(13).fillColor('#0f172a')
    .text(product.storeName, M, bottomY + 10, { width: contentW - qrSize - 20 });
  if (product.storePhone) {
    doc.font('NotoSansKR').fontSize(10).fillColor('#64748b')
      .text(product.storePhone, M, bottomY + 30, { width: contentW - qrSize - 20 });
  }

  // Divider line
  doc.moveTo(M, bottomY - 10).lineTo(PW - M, bottomY - 10)
    .strokeColor('#e2e8f0').lineWidth(1).stroke();

  return new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

// ── Template 4: A4 4-split (2×2) ──

async function generateTemplate4(product: FlyerProduct): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 20 });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  registerFonts(doc);

  const M = 20;
  const COLS = 2;
  const ROWS = 2;
  const cellW = (PW - M * 2) / COLS;
  const cellH = (PH - M * 2) / ROWS;
  const qrSize = 100;

  const qrBuf = await generateQrBuffer(product.qrUrl, qrSize * 2);

  let imgBuf: Buffer | null = null;
  if (product.imageUrl) {
    imgBuf = await fetchImageBuffer(product.imageUrl);
  }

  for (let i = 0; i < 4; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const cx = M + col * cellW;
    const cy = M + row * cellH;

    // Cell border
    doc.save();
    doc.rect(cx, cy, cellW, cellH).dash(3, { space: 3 }).strokeColor('#d1d5db').stroke();
    doc.restore();

    const pad = 12;
    const innerW = cellW - pad * 2;

    // Product image
    const imgH = 120;
    if (imgBuf) {
      try {
        doc.image(imgBuf, cx + pad, cy + pad, {
          width: innerW,
          height: imgH,
          fit: [innerW, imgH],
          align: 'center',
          valign: 'center',
        });
      } catch {
        doc.rect(cx + pad, cy + pad, innerW, imgH).fillColor('#f8fafc').fill();
      }
    } else {
      doc.rect(cx + pad, cy + pad, innerW, imgH).fillColor('#f8fafc').fill();
    }

    let ty = cy + pad + imgH + 10;

    // Brand
    if (product.brandName) {
      doc.font('NotoSansKR').fontSize(8).fillColor('#94a3b8')
        .text(product.brandName, cx + pad, ty, { width: innerW, align: 'center' });
      ty += 14;
    }

    // Product name
    doc.font('NotoSansKR-Bold').fontSize(12).fillColor('#1e293b')
      .text(product.productName, cx + pad, ty, {
        width: innerW,
        align: 'center',
        height: 32,
        ellipsis: true,
      });
    ty += 36;

    // Price
    doc.font('NotoSansKR-Bold').fontSize(16).fillColor('#0f172a')
      .text(formatPrice(product.price), cx + pad, ty, { width: innerW, align: 'center' });
    ty += 28;

    // QR code (centered)
    const qrX = cx + (cellW - qrSize) / 2;
    doc.image(qrBuf, qrX, ty, { width: qrSize, height: qrSize });

    // QR label
    doc.font('NotoSansKR').fontSize(7).fillColor('#94a3b8')
      .text('QR 스캔으로 구매하기', cx + pad, ty + qrSize + 4, {
        width: innerW,
        align: 'center',
      });

    // Store name at bottom
    doc.font('NotoSansKR').fontSize(7).fillColor('#94a3b8')
      .text(product.storeName, cx + pad, cy + cellH - pad - 12, {
        width: innerW,
        align: 'center',
      });
  }

  return new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

// ── Template 8: A4 8-split (2×4) — compact QR cards ──

async function generateTemplate8(product: FlyerProduct): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 20 });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  registerFonts(doc);

  const M = 20;
  const COLS = 2;
  const ROWS = 4;
  const cellW = (PW - M * 2) / COLS;
  const cellH = (PH - M * 2) / ROWS;
  const qrSize = 90;

  const qrBuf = await generateQrBuffer(product.qrUrl, qrSize * 2);

  for (let i = 0; i < 8; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const cx = M + col * cellW;
    const cy = M + row * cellH;

    // Cell border
    doc.save();
    doc.rect(cx, cy, cellW, cellH).dash(3, { space: 3 }).strokeColor('#d1d5db').stroke();
    doc.restore();

    const pad = 10;
    const innerW = cellW - pad * 2;

    // QR code (centered, top)
    const qrX = cx + (cellW - qrSize) / 2;
    const qrY = cy + pad;
    doc.image(qrBuf, qrX, qrY, { width: qrSize, height: qrSize });

    let ty = qrY + qrSize + 8;

    // Product name
    doc.font('NotoSansKR-Bold').fontSize(10).fillColor('#1e293b')
      .text(product.productName, cx + pad, ty, {
        width: innerW,
        align: 'center',
        height: 28,
        ellipsis: true,
      });
    ty += 30;

    // Price
    doc.font('NotoSansKR-Bold').fontSize(14).fillColor('#0f172a')
      .text(formatPrice(product.price), cx + pad, ty, { width: innerW, align: 'center' });

    // QR scan instruction
    doc.font('NotoSansKR').fontSize(7).fillColor('#94a3b8')
      .text('QR 스캔으로 구매하기', cx + pad, cy + cellH - pad - 18, {
        width: innerW,
        align: 'center',
      });

    // Store name
    doc.font('NotoSansKR').fontSize(6).fillColor('#cbd5e1')
      .text(product.storeName, cx + pad, cy + cellH - pad - 8, {
        width: innerW,
        align: 'center',
      });
  }

  return new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

// ── Public API ──

export async function generateProductFlyer(
  product: FlyerProduct,
  template: FlyerTemplate,
): Promise<Buffer> {
  switch (template) {
    case 1:
      return generateTemplate1(product);
    case 4:
      return generateTemplate4(product);
    case 8:
      return generateTemplate8(product);
    default:
      return generateTemplate4(product);
  }
}
