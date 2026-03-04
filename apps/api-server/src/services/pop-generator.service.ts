/**
 * POP Generator Service
 *
 * WO-O4O-QR-POP-AUTO-GENERATOR-V1
 *
 * Library 콘텐츠 + QR 코드를 조합하여 POP(Point of Purchase) PDF 자동 생성.
 * DB 저장 없이 온디맨드로 PDF 생성 → 바이너리 응답.
 *
 * - generatePopPdf: 단건/복수 POP A4/A5 PDF Buffer
 */

import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import axios from 'axios';
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

export interface PopGenerateInput {
  title: string;
  description: string | null;
  imageUrl: string | null;
  qrUrl: string | null;
  qrLabel: string | null;
  layout: 'A4' | 'A5';
}

/**
 * 이미지 URL에서 Buffer 가져오기 (5초 타임아웃, 실패 시 null)
 */
async function fetchImage(url: string): Promise<Buffer | null> {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 5000,
    });
    return Buffer.from(response.data);
  } catch {
    return null;
  }
}

/**
 * QR data URL → Buffer
 */
async function generateQrBuffer(url: string, size: number): Promise<Buffer> {
  const dataUrl = await QRCode.toDataURL(url, {
    width: size,
    margin: 1,
    errorCorrectionLevel: 'M',
  });
  const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

/**
 * 단일 POP 블록을 PDF 페이지(또는 반 페이지)에 그린다.
 */
function drawPopBlock(
  doc: InstanceType<typeof PDFDocument>,
  item: PopGenerateInput,
  imageBuffer: Buffer | null,
  qrBuffer: Buffer | null,
  blockX: number,
  blockY: number,
  blockW: number,
  blockH: number,
): void {
  const MARGIN = 30;
  const innerX = blockX + MARGIN;
  const innerW = blockW - MARGIN * 2;

  // ── 외곽선 (light dashed border) ──
  doc.save();
  doc.rect(blockX + 5, blockY + 5, blockW - 10, blockH - 10)
    .dash(4, { space: 4 })
    .strokeColor('#dddddd')
    .stroke();
  doc.restore();

  // ── 이미지 영역 (상단 55%) ──
  const imageAreaH = blockH * 0.55;
  const imageMaxW = innerW;
  const imageMaxH = imageAreaH - 20;

  if (imageBuffer) {
    try {
      doc.image(imageBuffer, innerX, blockY + 15, {
        fit: [imageMaxW, imageMaxH],
        align: 'center',
        valign: 'center',
      });
    } catch {
      // image parse failed — fallback to title-only
    }
  }

  // ── 제목 (중앙) ──
  const titleY = blockY + imageAreaH + 10;
  const titleFontSize = item.layout === 'A4' ? 20 : 14;

  doc.font('NotoSansKR')
    .fontSize(titleFontSize)
    .fillColor('#111111')
    .text(item.title, innerX, titleY, {
      width: innerW,
      align: 'center',
      lineBreak: true,
      height: item.layout === 'A4' ? 60 : 40,
      ellipsis: true,
    });

  // ── 설명 ──
  if (item.description) {
    const descY = titleY + (item.layout === 'A4' ? 65 : 45);
    const descFontSize = item.layout === 'A4' ? 12 : 10;

    doc.font('NotoSansKR')
      .fontSize(descFontSize)
      .fillColor('#666666')
      .text(item.description, innerX, descY, {
        width: innerW,
        align: 'center',
        lineBreak: true,
        height: item.layout === 'A4' ? 50 : 30,
        ellipsis: true,
      });
  }

  // ── QR (하단 우측) ──
  if (qrBuffer) {
    const qrSize = item.layout === 'A4' ? 100 : 70;
    const qrX = blockX + blockW - MARGIN - qrSize;
    const qrY = blockY + blockH - MARGIN - qrSize - 20;

    doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

    if (item.qrLabel) {
      doc.font('NotoSansKR')
        .fontSize(8)
        .fillColor('#999999')
        .text(item.qrLabel, qrX, qrY + qrSize + 4, {
          width: qrSize,
          align: 'center',
        });
    }
  }
}

/**
 * POP PDF 생성
 *
 * A4: 1 POP per page
 * A5: 2 POP per page (상/하 분할)
 */
export async function generatePopPdf(items: PopGenerateInput[]): Promise<Buffer> {
  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;

  const doc = new PDFDocument({ size: 'A4', margin: 0 });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  doc.registerFont('NotoSansKR', FONT_PATH);

  // Pre-fetch all images and QR codes
  const imageBuffers: (Buffer | null)[] = [];
  const qrBuffers: (Buffer | null)[] = [];

  for (const item of items) {
    imageBuffers.push(item.imageUrl ? await fetchImage(item.imageUrl) : null);
    qrBuffers.push(item.qrUrl ? await generateQrBuffer(item.qrUrl, 300) : null);
  }

  const layout = items[0]?.layout || 'A4';

  if (layout === 'A4') {
    // 1 POP per page
    for (let i = 0; i < items.length; i++) {
      if (i > 0) doc.addPage();
      drawPopBlock(doc, items[i], imageBuffers[i], qrBuffers[i], 0, 0, PAGE_WIDTH, PAGE_HEIGHT);
    }
  } else {
    // A5: 2 POP per page (상/하)
    const halfH = PAGE_HEIGHT / 2;
    for (let i = 0; i < items.length; i++) {
      const pageIndex = Math.floor(i / 2);
      const slot = i % 2; // 0 = top, 1 = bottom

      if (pageIndex > 0 && slot === 0) doc.addPage();

      drawPopBlock(doc, items[i], imageBuffers[i], qrBuffers[i], 0, slot * halfH, PAGE_WIDTH, halfH);
    }
  }

  return new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}
