/**
 * certificatePdf.ts
 *
 * WO-O4O-LMS-CERTIFICATE-PDF-V1
 *
 * pdfkit 기반 수료증 PDF 생성 유틸리티.
 * on-demand 생성 (파일 저장 없음).
 */

import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// ESM 환경에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FONT_PATH = path.resolve(
  __dirname,
  '../../../../assets/fonts/NotoSansKR-Regular.ttf',
);
const FONT_AVAILABLE = fs.existsSync(FONT_PATH);

export interface CertificatePdfData {
  userName: string;
  courseTitle: string;
  completedAt: Date;
  issuedAt: Date;
  certificateNumber: string;
  credits?: number;
  issuerName?: string;
  issuerTitle?: string;
  verificationUrl?: string;  // WO-O4O-LMS-CERTIFICATE-ACCESS-ENHANCEMENT-V1
}

/**
 * verificationUrl을 QR 코드 PNG 버퍼로 변환한다.
 * 실패 시 null 반환 (PDF 생성은 계속됨).
 */
async function buildQrBuffer(url: string): Promise<Buffer | null> {
  try {
    const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 200, errorCorrectionLevel: 'M' });
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    return Buffer.from(base64, 'base64');
  } catch {
    return null;
  }
}

/**
 * 수료증 PDF Buffer를 생성한다.
 * 폰트 파일이 있으면 한국어 렌더링, 없으면 Helvetica 폴백.
 */
export async function generateCertificatePdf(data: CertificatePdfData): Promise<Buffer> {
  // QR 코드는 PDF 스트림 시작 전에 준비 (async)
  const qrBuffer = data.verificationUrl ? await buildQrBuffer(data.verificationUrl) : null;

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    // A4 landscape
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width;   // 841.89
    const H = doc.page.height;  // 595.28

    // ── 배경 ──────────────────────────────────────────────────
    doc.rect(0, 0, W, H).fill('#fafafa');

    // 외곽 테두리 (이중)
    doc
      .rect(20, 20, W - 40, H - 40)
      .lineWidth(3)
      .stroke('#1e3a5f');
    doc
      .rect(28, 28, W - 56, H - 56)
      .lineWidth(1)
      .stroke('#c5a028');

    // 헤더 배경 띠
    doc.rect(0, 0, W, 90).fill('#1e3a5f');

    // ── 한국어 폰트 설정 ──────────────────────────────────────
    const setFont = (size: number, bold = false) => {
      if (FONT_AVAILABLE) {
        doc.font(FONT_PATH).fontSize(size);
      } else {
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size);
      }
    };

    // ── 헤더 텍스트 ───────────────────────────────────────────
    setFont(28, true);
    doc.fillColor('#ffffff').text('수료증', 0, 22, { align: 'center' });

    setFont(11);
    doc.fillColor('#a8c0d6').text('CERTIFICATE OF COMPLETION', 0, 58, { align: 'center' });

    // ── 메인 영역 ─────────────────────────────────────────────
    // 수여 대상
    setFont(14);
    doc.fillColor('#555555').text('다음 분은', 0, 118, { align: 'center' });

    // 이름
    setFont(36, true);
    doc.fillColor('#1e3a5f').text(data.userName, 0, 142, { align: 'center' });

    // 구분선
    doc
      .moveTo(W / 2 - 120, 198)
      .lineTo(W / 2 + 120, 198)
      .lineWidth(1.5)
      .stroke('#c5a028');

    // 이수 문구
    setFont(13);
    doc.fillColor('#444444').text('아래 과정을 성공적으로 이수하였음을 증명합니다.', 0, 214, { align: 'center' });

    // 강의명 배경
    doc.rect(W / 2 - 220, 242, 440, 52).fill('#eef4fb');
    setFont(18, true);
    doc
      .fillColor('#1e3a5f')
      .text(data.courseTitle, W / 2 - 210, 255, {
        width: 420,
        align: 'center',
        lineBreak: false,
        ellipsis: true,
      });

    // ── 하단 정보 영역 ────────────────────────────────────────
    const infoY = 322;
    const col1 = W / 2 - 200;
    const col2 = W / 2 + 20;

    // 완료일
    setFont(10);
    doc.fillColor('#888888').text('이수 완료일', col1, infoY);
    setFont(13, true);
    doc.fillColor('#1e3a5f').text(formatDate(data.completedAt), col1, infoY + 16);

    // 발급일
    setFont(10);
    doc.fillColor('#888888').text('발급일', col2, infoY);
    setFont(13, true);
    doc.fillColor('#1e3a5f').text(formatDate(data.issuedAt), col2, infoY + 16);

    // 인증번호
    const certY = infoY + 52;
    setFont(10);
    doc.fillColor('#888888').text('인증번호', col1, certY);
    setFont(13, true);
    doc.fillColor('#1e3a5f').text(data.certificateNumber, col1, certY + 16);

    // 이수 학점
    if (data.credits && data.credits > 0) {
      setFont(10);
      doc.fillColor('#888888').text('이수 학점', col2, certY);
      setFont(13, true);
      doc.fillColor('#1e3a5f').text(`${data.credits} 학점`, col2, certY + 16);
    }

    // ── QR 코드 (WO-O4O-LMS-CERTIFICATE-ACCESS-ENHANCEMENT-V1) ──
    if (qrBuffer) {
      const qrSize = 72;
      const qrX = W - 50 - qrSize;   // 오른쪽 여백 50pt
      const qrY = certY - 8;
      doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
      setFont(7);
      doc
        .fillColor('#aaaaaa')
        .text('온라인 검증', qrX, qrY + qrSize + 4, { width: qrSize, align: 'center' });
    }

    // ── 발급 기관 ─────────────────────────────────────────────
    const issuerY = H - 90;
    doc
      .moveTo(W / 2 - 80, issuerY - 8)
      .lineTo(W / 2 + 80, issuerY - 8)
      .lineWidth(1)
      .stroke('#999999');

    const issuerName = data.issuerName || '한국약사회';
    const issuerTitle = data.issuerTitle || 'Korea Pharmaceutical Association';
    setFont(12, true);
    doc.fillColor('#1e3a5f').text(issuerName, 0, issuerY, { align: 'center' });
    setFont(9);
    doc.fillColor('#888888').text(issuerTitle, 0, issuerY + 18, { align: 'center' });

    doc.end();
  });
}

function formatDate(date: Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}
