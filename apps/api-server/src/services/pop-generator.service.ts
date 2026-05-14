/**
 * POP Generator Service
 *
 * WO-O4O-QR-POP-AUTO-GENERATOR-V1
 * WO-O4O-POP-TEMPLATE-WORKFLOW-V1:
 *   - PopGenerateInput에 templateId + aiContent 추가
 *   - drawPopBlock → template별 layout 분기:
 *       pop-modern:       헤드라인 강조, 미니멀, 불릿 그리드
 *       pop-soft:         부드러운 설명형, 문장 중심, 이미지 소형
 *       pop-pharmacy-pro: 섹션 분리형 (헤드라인/핵심포인트/설명/QR)
 *       default:          기존 동작 유지
 *
 * Library 콘텐츠 + QR 코드를 조합하여 POP(Point of Purchase) PDF 자동 생성.
 * DB 저장 없이 온디맨드로 PDF 생성 → 바이너리 응답.
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

/** AI 생성 문구 세트 */
export interface PopAiContent {
  title: string;
  bullets: string[];
  shortText: string;
  longText: string;
}

export interface PopGenerateInput {
  title: string;
  description: string | null;
  imageUrl: string | null;
  qrUrl: string | null;
  qrLabel: string | null;
  layout: 'A4' | 'A5';
  /**
   * WO-O4O-POP-TEMPLATE-WORKFLOW-V1: template id
   * drawPopBlock layout 분기 기준
   */
  templateId?: string;
  /**
   * WO-O4O-POP-TEMPLATE-WORKFLOW-V1: AI 생성 문구
   * 제공 시 title/description 대신 사용
   */
  aiContent?: PopAiContent;
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

// ─── Layout: pop-modern ───────────────────────────────────────────────────────
/**
 * pop-modern: 헤드라인 강조, 미니멀 레이아웃
 * - 큰 타이틀 (중앙 상단)
 * - 이미지 (중간)
 * - 핵심 문구 (shortText)
 * - 불릿 3개 (하단)
 * - QR (우하단)
 */
function drawModernBlock(
  doc: InstanceType<typeof PDFDocument>,
  item: PopGenerateInput,
  imageBuffer: Buffer | null,
  qrBuffer: Buffer | null,
  bX: number, bY: number, bW: number, bH: number,
): void {
  const MARGIN = 36;
  const iX = bX + MARGIN;
  const iW = bW - MARGIN * 2;
  const isA4 = item.layout === 'A4';

  // 외곽 테두리 없음 — 미니멀

  // ── 제목 (상단, 강조) ──
  const titleY = bY + MARGIN;
  const titleSize = isA4 ? 26 : 18;
  doc.font('NotoSansKR').fontSize(titleSize).fillColor('#111111')
    .text(item.aiContent?.title || item.title, iX, titleY, {
      width: iW, align: 'center', lineBreak: true,
      height: isA4 ? 70 : 50, ellipsis: true,
    });

  // ── 이미지 (상단 제목 아래) ──
  const imageY = titleY + (isA4 ? 80 : 56);
  const imageAreaH = bH * 0.40;
  if (imageBuffer) {
    try {
      doc.image(imageBuffer, iX, imageY, {
        fit: [iW, imageAreaH],
        align: 'center',
        valign: 'center',
      });
    } catch { /* image parse fail */ }
  }

  // ── shortText (핵심 문구) ──
  const shortTextY = imageY + imageAreaH + (isA4 ? 12 : 8);
  const shortText = item.aiContent?.shortText || item.description || '';
  if (shortText) {
    doc.font('NotoSansKR').fontSize(isA4 ? 14 : 10).fillColor('#444444')
      .text(shortText, iX, shortTextY, {
        width: iW, align: 'center', lineBreak: true,
        height: isA4 ? 36 : 26, ellipsis: true,
      });
  }

  // ── 불릿 (하단 섹션) ──
  const bullets = item.aiContent?.bullets ?? [];
  if (bullets.length > 0) {
    const bulletsY = shortTextY + (isA4 ? 44 : 32);
    // 구분선
    doc.moveTo(iX, bulletsY - 8).lineTo(iX + iW, bulletsY - 8)
      .strokeColor('#e5e7eb').lineWidth(0.5).stroke();

    const bulletSize = isA4 ? 11 : 9;
    bullets.slice(0, 3).forEach((b, idx) => {
      doc.font('NotoSansKR').fontSize(bulletSize).fillColor('#374151')
        .text(`• ${b}`, iX, bulletsY + idx * (bulletSize + 7), {
          width: qrBuffer ? iW * 0.7 : iW,
          lineBreak: false, ellipsis: true,
        });
    });
  }

  // ── QR (우하단) ──
  if (qrBuffer) {
    const qrSize = isA4 ? 88 : 62;
    const qrX = bX + bW - MARGIN - qrSize;
    const qrY = bY + bH - MARGIN - qrSize - (isA4 ? 16 : 12);
    doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
    if (item.qrLabel) {
      doc.font('NotoSansKR').fontSize(7).fillColor('#9ca3af')
        .text(item.qrLabel, qrX, qrY + qrSize + 3, { width: qrSize, align: 'center' });
    }
  }
}

// ─── Layout: pop-soft ─────────────────────────────────────────────────────────
/**
 * pop-soft: 부드러운 설명형
 * - 이미지 좌측 상단 (소형)
 * - 타이틀 (중간 크기)
 * - 문장형 설명 (longText 활용)
 * - 불릿 소형
 * - 따뜻한 회색 배경 박스
 */
function drawSoftBlock(
  doc: InstanceType<typeof PDFDocument>,
  item: PopGenerateInput,
  imageBuffer: Buffer | null,
  qrBuffer: Buffer | null,
  bX: number, bY: number, bW: number, bH: number,
): void {
  const MARGIN = 32;
  const iX = bX + MARGIN;
  const iW = bW - MARGIN * 2;
  const isA4 = item.layout === 'A4';

  // 배경 박스 (연한 warm gray)
  doc.rect(bX + 4, bY + 4, bW - 8, bH - 8)
    .fillAndStroke('#fafaf9', '#f5f0eb');

  // ── 이미지 (상단 좌측, 소형) ──
  const imageSize = isA4 ? 120 : 85;
  if (imageBuffer) {
    try {
      doc.image(imageBuffer, iX, bY + MARGIN, {
        fit: [imageSize, imageSize],
      });
    } catch { /* image parse fail */ }
  }

  // ── 제목 (이미지 옆) ──
  const textX = imageBuffer ? iX + imageSize + (isA4 ? 16 : 12) : iX;
  const textW = imageBuffer ? iW - imageSize - (isA4 ? 16 : 12) : iW;
  const titleY = bY + MARGIN;
  const titleSize = isA4 ? 20 : 14;
  doc.font('NotoSansKR').fontSize(titleSize).fillColor('#1c1917')
    .text(item.aiContent?.title || item.title, textX, titleY, {
      width: textW, lineBreak: true,
      height: isA4 ? 56 : 40, ellipsis: true,
    });

  // ── shortText ──
  const shortText = item.aiContent?.shortText || '';
  if (shortText) {
    doc.font('NotoSansKR').fontSize(isA4 ? 12 : 9).fillColor('#78716c')
      .text(shortText, textX, titleY + (isA4 ? 62 : 46), {
        width: textW, lineBreak: false, ellipsis: true,
      });
  }

  // ── 본문 설명 (longText) ──
  const longText = item.aiContent?.longText || item.description || '';
  if (longText) {
    const bodyY = bY + MARGIN + imageSize + (isA4 ? 16 : 12);
    doc.font('NotoSansKR').fontSize(isA4 ? 11 : 9).fillColor('#57534e')
      .text(longText, iX, bodyY, {
        width: iW,
        lineBreak: true,
        height: isA4 ? 60 : 44,
        ellipsis: true,
      });
  }

  // ── 불릿 (소형, 심플) ──
  const bullets = item.aiContent?.bullets ?? [];
  if (bullets.length > 0) {
    const bulletsY = bY + MARGIN + imageSize + (isA4 ? 90 : 64);
    const bulletSize = isA4 ? 10 : 8;
    bullets.slice(0, 3).forEach((b, idx) => {
      doc.font('NotoSansKR').fontSize(bulletSize).fillColor('#a8a29e')
        .text(`✓  ${b}`, iX, bulletsY + idx * (bulletSize + 6), {
          width: qrBuffer ? iW * 0.72 : iW,
          lineBreak: false, ellipsis: true,
        });
    });
  }

  // ── QR (우하단) ──
  if (qrBuffer) {
    const qrSize = isA4 ? 80 : 56;
    const qrX = bX + bW - MARGIN - qrSize;
    const qrY = bY + bH - MARGIN - qrSize - (isA4 ? 12 : 8);
    doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
    if (item.qrLabel) {
      doc.font('NotoSansKR').fontSize(7).fillColor('#a8a29e')
        .text(item.qrLabel, qrX, qrY + qrSize + 2, { width: qrSize, align: 'center' });
    }
  }
}

// ─── Layout: pop-pharmacy-pro ─────────────────────────────────────────────────
/**
 * pop-pharmacy-pro: 전문 약국형, 섹션 분리
 * - 상단 헤드라인 박스 (강조색 배경)
 * - 핵심 포인트 (bullets, 번호형)
 * - 설명 본문
 * - 하단 약사 코멘트/주의 문구 라인
 * - QR
 */
function drawPharmacyProBlock(
  doc: InstanceType<typeof PDFDocument>,
  item: PopGenerateInput,
  imageBuffer: Buffer | null,
  qrBuffer: Buffer | null,
  bX: number, bY: number, bW: number, bH: number,
): void {
  const MARGIN = 28;
  const iX = bX + MARGIN;
  const iW = bW - MARGIN * 2;
  const isA4 = item.layout === 'A4';

  // ── 헤드라인 박스 (파란 배경) ──
  const headerH = isA4 ? 80 : 56;
  doc.rect(bX, bY, bW, headerH).fill('#1d4ed8');
  const titleSize = isA4 ? 22 : 15;
  doc.font('NotoSansKR').fontSize(titleSize).fillColor('#ffffff')
    .text(item.aiContent?.title || item.title, iX, bY + (isA4 ? 22 : 16), {
      width: iW, align: 'center', lineBreak: false, ellipsis: true,
    });
  const shortText = item.aiContent?.shortText || '';
  if (shortText && isA4) {
    doc.font('NotoSansKR').fontSize(11).fillColor('#bfdbfe')
      .text(shortText, iX, bY + 50, {
        width: iW, align: 'center', lineBreak: false, ellipsis: true,
      });
  }

  // ── 이미지 (우측, 소형, 헤드라인 아래) ──
  const contentY = bY + headerH + (isA4 ? 16 : 10);
  const imageSize = isA4 ? 90 : 64;
  if (imageBuffer) {
    try {
      doc.image(imageBuffer, bX + bW - MARGIN - imageSize, contentY, {
        fit: [imageSize, imageSize],
      });
    } catch { /* image parse fail */ }
  }

  // ── 핵심 포인트 라벨 ──
  const pointsX = iX;
  const pointsW = imageBuffer ? iW - imageSize - (isA4 ? 16 : 12) : iW;
  doc.font('NotoSansKR').fontSize(isA4 ? 10 : 8).fillColor('#6b7280')
    .text('핵심 포인트', pointsX, contentY, { width: pointsW });
  const bullet1Y = contentY + (isA4 ? 16 : 12);

  // ── 불릿 (번호형) ──
  const bullets = item.aiContent?.bullets ?? [];
  const bulletSize = isA4 ? 11 : 9;
  bullets.slice(0, 3).forEach((b, idx) => {
    doc.font('NotoSansKR').fontSize(bulletSize).fillColor('#1e3a5f')
      .text(`${idx + 1}.  ${b}`, pointsX, bullet1Y + idx * (bulletSize + 8), {
        width: pointsW, lineBreak: false, ellipsis: true,
      });
  });

  // ── 설명 본문 ──
  const bodyY = contentY + (isA4 ? 80 : 58) + (imageBuffer ? 0 : 0);
  const longText = item.aiContent?.longText || item.description || '';
  if (longText) {
    doc.moveTo(iX, bodyY - (isA4 ? 6 : 4))
      .lineTo(iX + iW, bodyY - (isA4 ? 6 : 4))
      .strokeColor('#e5e7eb').lineWidth(0.5).stroke();
    doc.font('NotoSansKR').fontSize(isA4 ? 10 : 8).fillColor('#374151')
      .text(longText, iX, bodyY, {
        width: iW, lineBreak: true,
        height: isA4 ? 56 : 40, ellipsis: true,
      });
  }

  // ── 하단 약사 코멘트 박스 ──
  const noteBoxY = bY + bH - (isA4 ? 52 : 38) - (qrBuffer ? (isA4 ? 20 : 14) : 0);
  doc.rect(bX, noteBoxY, bW, isA4 ? 36 : 26).fill('#f0f9ff');
  doc.font('NotoSansKR').fontSize(isA4 ? 9 : 7).fillColor('#1e40af')
    .text('※ 본 자료는 참고용이며, 복용 전 약사와 상담하세요.', iX, noteBoxY + (isA4 ? 12 : 8), {
      width: iW, align: 'center',
    });

  // ── QR (우하단) ──
  if (qrBuffer) {
    const qrSize = isA4 ? 72 : 52;
    const qrX = bX + bW - MARGIN - qrSize;
    const qrY = bY + bH - MARGIN - qrSize - (isA4 ? 8 : 6);
    doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
    if (item.qrLabel) {
      doc.font('NotoSansKR').fontSize(7).fillColor('#9ca3af')
        .text(item.qrLabel, qrX, qrY + qrSize + 2, { width: qrSize, align: 'center' });
    }
  }
}

// ─── Layout: default (기존) ───────────────────────────────────────────────────
/**
 * 기존 레이아웃 — template 미선택 또는 알 수 없는 templateId 시 사용.
 * WO-O4O-POP-TEMPLATE-WORKFLOW-V1: aiContent 있으면 title/description 오버라이드.
 */
function drawDefaultBlock(
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

  // 외곽선
  doc.save();
  doc.rect(blockX + 5, blockY + 5, blockW - 10, blockH - 10)
    .dash(4, { space: 4 })
    .strokeColor('#dddddd')
    .stroke();
  doc.restore();

  // 이미지 (상단 55%)
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
    } catch { /* image parse fail */ }
  }

  // 제목 (aiContent 있으면 override)
  const titleY = blockY + imageAreaH + 10;
  const titleFontSize = item.layout === 'A4' ? 20 : 14;
  const displayTitle = item.aiContent?.title || item.title;

  doc.font('NotoSansKR').fontSize(titleFontSize).fillColor('#111111')
    .text(displayTitle, innerX, titleY, {
      width: innerW,
      align: 'center',
      lineBreak: true,
      height: item.layout === 'A4' ? 60 : 40,
      ellipsis: true,
    });

  // 설명 (aiContent shortText 또는 원본 description)
  const displayDesc = item.aiContent?.shortText || item.description;
  if (displayDesc) {
    const descY = titleY + (item.layout === 'A4' ? 65 : 45);
    const descFontSize = item.layout === 'A4' ? 12 : 10;

    doc.font('NotoSansKR').fontSize(descFontSize).fillColor('#666666')
      .text(displayDesc, innerX, descY, {
        width: innerW,
        align: 'center',
        lineBreak: true,
        height: item.layout === 'A4' ? 50 : 30,
        ellipsis: true,
      });
  }

  // QR (하단 우측)
  if (qrBuffer) {
    const qrSize = item.layout === 'A4' ? 100 : 70;
    const qrX = blockX + blockW - MARGIN - qrSize;
    const qrY = blockY + blockH - MARGIN - qrSize - 20;

    doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

    if (item.qrLabel) {
      doc.font('NotoSansKR').fontSize(8).fillColor('#999999')
        .text(item.qrLabel, qrX, qrY + qrSize + 4, {
          width: qrSize,
          align: 'center',
        });
    }
  }
}

// ─── Router (template별 분기) ─────────────────────────────────────────────────
/**
 * WO-O4O-POP-TEMPLATE-WORKFLOW-V1: templateId에 따라 layout 함수 분기.
 */
function drawPopBlock(
  doc: InstanceType<typeof PDFDocument>,
  item: PopGenerateInput,
  imageBuffer: Buffer | null,
  qrBuffer: Buffer | null,
  bX: number, bY: number, bW: number, bH: number,
): void {
  switch (item.templateId) {
    case 'pop-modern':
      drawModernBlock(doc, item, imageBuffer, qrBuffer, bX, bY, bW, bH);
      break;
    case 'pop-soft':
      drawSoftBlock(doc, item, imageBuffer, qrBuffer, bX, bY, bW, bH);
      break;
    case 'pop-pharmacy-pro':
      drawPharmacyProBlock(doc, item, imageBuffer, qrBuffer, bX, bY, bW, bH);
      break;
    default:
      drawDefaultBlock(doc, item, imageBuffer, qrBuffer, bX, bY, bW, bH);
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
    for (let i = 0; i < items.length; i++) {
      if (i > 0) doc.addPage();
      drawPopBlock(doc, items[i], imageBuffers[i], qrBuffers[i], 0, 0, PAGE_WIDTH, PAGE_HEIGHT);
    }
  } else {
    // A5: 2 POP per page (상/하)
    const halfH = PAGE_HEIGHT / 2;
    for (let i = 0; i < items.length; i++) {
      const pageIndex = Math.floor(i / 2);
      const slot = i % 2;

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
