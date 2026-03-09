/**
 * ProductPopPdfService — WO-O4O-POP-PDF-GENERATOR-V1
 *
 * Product AI Content (pop_short, pop_long) + Product Image + QR 코드를 조합하여
 * A4/A5/A6 POP PDF 생성.
 *
 * - A4: 1 POP per page (595×842pt)
 * - A5: 2 POP per page (상/하 분할)
 * - A6: 4 POP per page (2×2 분할)
 *
 * 패턴 참조: services/pop-generator.service.ts
 */

import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { join } from 'path';
import { existsSync } from 'fs';

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

export type PopPdfLayout = 'A4' | 'A5' | 'A6';

export interface PopPdfInput {
  title: string;
  shortText: string | null;
  longText: string | null;
  imageUrl: string | null;
  qrUrl: string | null;
}

// ─── Layout Config ───────────────────────────────────────────────

interface LayoutConfig {
  cols: number;
  rows: number;
  titleFontSize: number;
  descFontSize: number;
  qrSize: number;
  imageRatio: number; // 이미지 영역 비율 (0~1)
  titleHeight: number;
  descHeight: number;
}

const LAYOUT_CONFIG: Record<PopPdfLayout, LayoutConfig> = {
  A4: { cols: 1, rows: 1, titleFontSize: 22, descFontSize: 13, qrSize: 120, imageRatio: 0.50, titleHeight: 60, descHeight: 60 },
  A5: { cols: 1, rows: 2, titleFontSize: 16, descFontSize: 11, qrSize: 80, imageRatio: 0.45, titleHeight: 45, descHeight: 40 },
  A6: { cols: 2, rows: 2, titleFontSize: 12, descFontSize: 9, qrSize: 60, imageRatio: 0.40, titleHeight: 35, descHeight: 30 },
};

// ─── Image Fetch ─────────────────────────────────────────────────

async function fetchImage(url: string): Promise<Buffer | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

async function generateQrBuffer(url: string, size: number): Promise<Buffer> {
  const dataUrl = await QRCode.toDataURL(url, {
    width: size,
    margin: 1,
    errorCorrectionLevel: 'M',
  });
  const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

// ─── Draw POP Block ──────────────────────────────────────────────

function drawPopBlock(
  doc: InstanceType<typeof PDFDocument>,
  item: PopPdfInput,
  config: LayoutConfig,
  imageBuffer: Buffer | null,
  qrBuffer: Buffer | null,
  blockX: number,
  blockY: number,
  blockW: number,
  blockH: number,
): void {
  const MARGIN = config.cols === 1 && config.rows === 1 ? 30 : 20;
  const innerX = blockX + MARGIN;
  const innerW = blockW - MARGIN * 2;

  // ── 외곽선 (dashed border) ──
  doc.save();
  doc.rect(blockX + 4, blockY + 4, blockW - 8, blockH - 8)
    .dash(4, { space: 4 })
    .strokeColor('#dddddd')
    .stroke();
  doc.restore();

  // ── 이미지 영역 (상단) ──
  const imageAreaH = blockH * config.imageRatio;
  const imageMaxW = innerW;
  const imageMaxH = imageAreaH - 20;

  if (imageBuffer) {
    try {
      doc.image(imageBuffer, innerX, blockY + 12, {
        fit: [imageMaxW, imageMaxH],
        align: 'center',
        valign: 'center',
      });
    } catch {
      // image parse failed — skip
    }
  }

  // ── 제목 ──
  const titleY = blockY + imageAreaH + 8;
  doc.font('NotoSansKR')
    .fontSize(config.titleFontSize)
    .fillColor('#111111')
    .text(item.title, innerX, titleY, {
      width: innerW,
      align: 'center',
      lineBreak: true,
      height: config.titleHeight,
      ellipsis: true,
    });

  // ── 설명 (pop_long > pop_short 우선) ──
  const descText = item.longText || item.shortText;
  if (descText) {
    const descY = titleY + config.titleHeight + 4;
    doc.font('NotoSansKR')
      .fontSize(config.descFontSize)
      .fillColor('#666666')
      .text(descText, innerX, descY, {
        width: innerW,
        align: 'center',
        lineBreak: true,
        height: config.descHeight,
        ellipsis: true,
      });
  }

  // ── QR (하단 우측) ──
  if (qrBuffer) {
    const qrX = blockX + blockW - MARGIN - config.qrSize;
    const qrY = blockY + blockH - MARGIN - config.qrSize - 18;

    doc.image(qrBuffer, qrX, qrY, { width: config.qrSize, height: config.qrSize });

    doc.font('NotoSansKR')
      .fontSize(7)
      .fillColor('#999999')
      .text('스캔 후 상세보기', qrX, qrY + config.qrSize + 3, {
        width: config.qrSize,
        align: 'center',
      });
  }
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Product POP PDF 생성.
 *
 * @param item POP 데이터 (제목, AI 텍스트, 이미지, QR URL)
 * @param layout 'A4' | 'A5' | 'A6'
 * @param copies 인쇄 매수 (A5=2장/페이지, A6=4장/페이지 자동 반복)
 */
export async function generateProductPopPdf(
  item: PopPdfInput,
  layout: PopPdfLayout,
  copies: number = 1,
): Promise<Buffer> {
  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const config = LAYOUT_CONFIG[layout];
  const perPage = config.cols * config.rows;

  // 총 블록 수 = copies (perPage 단위로 페이지 분할)
  const totalBlocks = Math.max(copies, 1);

  const doc = new PDFDocument({ size: 'A4', margin: 0 });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  doc.registerFont('NotoSansKR', FONT_PATH);

  // Pre-fetch image & QR
  const imageBuffer = item.imageUrl ? await fetchImage(item.imageUrl) : null;
  const qrBuffer = item.qrUrl ? await generateQrBuffer(item.qrUrl, config.qrSize * 3) : null;

  const blockW = PAGE_WIDTH / config.cols;
  const blockH = PAGE_HEIGHT / config.rows;

  for (let i = 0; i < totalBlocks; i++) {
    const pageIndex = Math.floor(i / perPage);
    const slotIndex = i % perPage;

    if (pageIndex > 0 && slotIndex === 0) doc.addPage();

    const col = slotIndex % config.cols;
    const row = Math.floor(slotIndex / config.cols);
    const blockX = col * blockW;
    const blockY = row * blockH;

    drawPopBlock(doc, item, config, imageBuffer, qrBuffer, blockX, blockY, blockW, blockH);
  }

  return new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}
