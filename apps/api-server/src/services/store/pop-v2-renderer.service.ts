/**
 * POP V2 Renderer — 하나의 Render Model 위에 출력 backend 2개 (PDF / PNG)
 * WO-O4O-STORE-POP-V2-CANONICAL-REBUILD-KPA-PH-V1
 *
 * 정본 계약: docs/architecture/O4O-STORE-POP-V2-CANONICAL-MODEL-V1.md §4-4
 *
 *   PopV2RenderModel ──> renderPopV2Pdf  (pdfkit · 기존 generatePopPdf 위임 · 벡터 + 폰트 임베드)
 *                    └─> renderPopV2Png  (SVG → sharp · 신규)
 *
 * PDF 는 검증된 기존 생성기에 위임한다 — V2 를 위해 PDF 품질을 후퇴시키지 않는다.
 * PNG 는 신규 경로다. 런타임(node:22-slim)에 CJK 시스템 폰트가 없으므로
 * 앱 내장 `NotoSansKR-Regular.ttf` 를 fontconfig 에 노출해 사용한다.
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import sharp from 'sharp';
import QRCode from 'qrcode';
import { generatePopPdf, type PopGenerateInput } from '../pop-generator.service.js';

export interface PopV2RenderModel {
  title: string;
  bullets: string[];
  shortText: string;
  longText: string;
  imageUrl: string | null;
  qrUrl: string | null;
  qrLabel: string | null;
  layout: 'A4' | 'A5';
  templateId: string;
}

/** 템플릿별 accent — 기존 POP 템플릿 id 를 그대로 쓴다(신규 어휘 도입 없음). */
const TEMPLATE_ACCENT: Record<string, string> = {
  'pop-modern': '#2563EB',
  'pop-soft': '#DB2777',
  'pop-pharmacy-pro': '#059669',
};

function accentOf(templateId: string): string {
  return TEMPLATE_ACCENT[templateId] ?? '#2563EB';
}

// ── PDF ────────────────────────────────────────────────────────────────────

export async function renderPopV2Pdf(model: PopV2RenderModel): Promise<Buffer> {
  return generatePopPdf([
    {
      title: model.title,
      description: model.longText || model.shortText || null,
      imageUrl: model.imageUrl,
      qrUrl: model.qrUrl,
      qrLabel: model.qrLabel,
      layout: model.layout,
      templateId: model.templateId,
      aiContent: {
        title: model.title,
        bullets: model.bullets,
        shortText: model.shortText,
        longText: model.longText,
      },
    },
  ]);
}

// ── PNG ────────────────────────────────────────────────────────────────────

const FONT_FAMILY = 'Noto Sans KR';

function resolveFontDir(): string {
  const candidates = [
    join(process.cwd(), 'dist', 'assets', 'fonts'),
    join(process.cwd(), 'src', 'assets', 'fonts'),
    join(process.cwd(), 'assets', 'fonts'),
  ];
  for (const c of candidates) {
    if (existsSync(join(c, 'NotoSansKR-Regular.ttf'))) return c;
  }
  return candidates[0];
}

let fontconfigReady = false;

/**
 * sharp(libvips → librsvg → pango) 가 앱 내장 한글 폰트를 찾게 한다.
 * fontconfig 은 첫 텍스트 렌더 시점에 초기화되므로 렌더 직전에 세팅해도 늦지 않다.
 * 실패해도 예외를 던지지 않는다 — PNG 품질 문제이지 API 실패 사유가 아니다.
 */
function ensureFontconfig(): void {
  if (fontconfigReady) return;
  fontconfigReady = true;
  try {
    const fontDir = resolveFontDir();
    const confDir = join(tmpdir(), 'o4o-pop-fontconfig');
    const confFile = join(confDir, 'fonts.conf');
    mkdirSync(join(confDir, 'cache'), { recursive: true });
    writeFileSync(
      confFile,
      [
        '<?xml version="1.0"?>',
        '<!DOCTYPE fontconfig SYSTEM "fonts.dtd">',
        '<fontconfig>',
        `  <dir>${fontDir}</dir>`,
        `  <cachedir>${join(confDir, 'cache')}</cachedir>`,
        '</fontconfig>',
        '',
      ].join('\n'),
      'utf-8',
    );
    process.env.FONTCONFIG_FILE = confFile;
    process.env.FONTCONFIG_PATH = confDir;
  } catch {
    // 폰트 설정 실패 시에도 렌더는 계속한다(라틴 문자는 기본 폰트로 나온다).
  }
}

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** 한글 1자 ≈ 1em, 그 외 ≈ 0.55em 으로 보고 줄바꿈한다 (SVG 는 자동 줄바꿈이 없다). */
function wrapText(text: string, fontSize: number, maxWidth: number, maxLines: number): string[] {
  const lines: string[] = [];
  let cur = '';
  let curW = 0;
  for (const ch of String(text)) {
    if (ch === '\n') {
      lines.push(cur);
      cur = '';
      curW = 0;
      if (lines.length >= maxLines) return lines;
      continue;
    }
    const w = /[ᄀ-퟿豈-﫿]/.test(ch) ? fontSize : fontSize * 0.55;
    if (curW + w > maxWidth) {
      lines.push(cur);
      cur = '';
      curW = 0;
      if (lines.length >= maxLines) return lines;
    }
    cur += ch;
    curW += w;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, maxLines);
}

const PAGE_PT = {
  A4: { w: 595, h: 842 },
  A5: { w: 420, h: 595 },
} as const;

/** PNG 배율 — A4 기준 약 300dpi 인쇄 품질 */
/** SVG 는 pt 단위 그대로 두고 배율은 여기(density)에서만 준다 — 이중 확대 금지. */
const PNG_SCALE = 3;

async function fetchImageDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    // 지면 폭 이상은 불필요하다 — 과대 이미지로 SVG 가 부풀지 않게 축소한다.
    const png = await sharp(buf).resize({ width: 1200, withoutEnlargement: true }).png().toBuffer();
    return `data:image/png;base64,${png.toString('base64')}`;
  } catch {
    return null;
  }
}

export async function buildPopV2Svg(model: PopV2RenderModel): Promise<string> {
  const page = PAGE_PT[model.layout] ?? PAGE_PT.A4;
  const accent = accentOf(model.templateId);
  const M = 40;
  const contentW = page.w - M * 2;
  let y = 0;

  const parts: string[] = [];
  parts.push(`<rect x="0" y="0" width="${page.w}" height="${page.h}" fill="#FFFFFF"/>`);

  // 상단 accent 바
  parts.push(`<rect x="0" y="0" width="${page.w}" height="14" fill="${accent}"/>`);
  y = 14 + 46;

  // 제목
  const titleSize = model.layout === 'A4' ? 30 : 24;
  for (const line of wrapText(model.title, titleSize, contentW, 3)) {
    parts.push(
      `<text x="${M}" y="${y}" font-family="${FONT_FAMILY}" font-size="${titleSize}" font-weight="700" fill="#111827">${esc(line)}</text>`,
    );
    y += titleSize * 1.35;
  }
  y += 10;
  parts.push(
    `<rect x="${M}" y="${y}" width="72" height="5" rx="2.5" fill="${accent}"/>`,
  );
  y += 34;

  // 대표 이미지
  if (model.imageUrl) {
    const dataUri = await fetchImageDataUri(model.imageUrl);
    if (dataUri) {
      const imgH = model.layout === 'A4' ? 260 : 190;
      parts.push(
        `<image x="${M}" y="${y}" width="${contentW}" height="${imgH}" href="${esc(dataUri)}" preserveAspectRatio="xMidYMid slice"/>`,
      );
      y += imgH + 28;
    }
  }

  // 핵심 문구
  if (model.shortText) {
    const s = model.layout === 'A4' ? 19 : 16;
    for (const line of wrapText(model.shortText, s, contentW, 4)) {
      parts.push(
        `<text x="${M}" y="${y}" font-family="${FONT_FAMILY}" font-size="${s}" font-weight="600" fill="${accent}">${esc(line)}</text>`,
      );
      y += s * 1.5;
    }
    y += 14;
  }

  // bullets
  const bs = model.layout === 'A4' ? 16 : 14;
  for (const b of model.bullets.slice(0, 6)) {
    const lines = wrapText(b, bs, contentW - 20, 2);
    let first = true;
    for (const line of lines) {
      if (first) {
        parts.push(`<circle cx="${M + 4}" cy="${y - bs * 0.32}" r="3.5" fill="${accent}"/>`);
      }
      parts.push(
        `<text x="${M + 20}" y="${y}" font-family="${FONT_FAMILY}" font-size="${bs}" fill="#374151">${esc(line)}</text>`,
      );
      y += bs * 1.55;
      first = false;
    }
    y += 4;
  }
  if (model.bullets.length) y += 10;

  // 본문
  if (model.longText) {
    const ls = model.layout === 'A4' ? 14 : 12;
    const room = Math.max(0, page.h - 170 - y);
    const maxLines = Math.max(0, Math.floor(room / (ls * 1.6)));
    for (const line of wrapText(model.longText, ls, contentW, maxLines)) {
      parts.push(
        `<text x="${M}" y="${y}" font-family="${FONT_FAMILY}" font-size="${ls}" fill="#4B5563">${esc(line)}</text>`,
      );
      y += ls * 1.6;
    }
  }

  // QR (선택) — 지면 삽입일 뿐 매장 배치를 뜻하지 않는다(I5)
  if (model.qrUrl) {
    const qrSize = model.layout === 'A4' ? 110 : 88;
    const qx = page.w - M - qrSize;
    const qy = page.h - M - qrSize - 22;
    try {
      const qrDataUri = await QRCode.toDataURL(model.qrUrl, { margin: 1, width: 400 });
      parts.push(
        `<image x="${qx}" y="${qy}" width="${qrSize}" height="${qrSize}" href="${esc(qrDataUri)}"/>`,
      );
      const label = model.qrLabel || '자세히 보기';
      parts.push(
        `<text x="${qx + qrSize / 2}" y="${qy + qrSize + 16}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="11" fill="#6B7280">${esc(label)}</text>`,
      );
    } catch {
      // QR 생성 실패는 POP 출력을 막지 않는다.
    }
  }

  // 하단 accent 바
  parts.push(
    `<rect x="0" y="${page.h - 8}" width="${page.w}" height="8" fill="${accent}"/>`,
  );

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${page.w}" height="${page.h}" viewBox="0 0 ${page.w} ${page.h}">`,
    ...parts,
    '</svg>',
  ].join('\n');
}

export async function renderPopV2Png(model: PopV2RenderModel): Promise<Buffer> {
  ensureFontconfig();
  const svg = await buildPopV2Svg(model);
  return sharp(Buffer.from(svg), { density: 72 * PNG_SCALE })
    .png()
    .toBuffer();
}

export type PopV2RenderFormat = 'pdf' | 'png';

export async function renderPopV2(
  model: PopV2RenderModel,
  format: PopV2RenderFormat,
): Promise<{ buffer: Buffer; mimeType: string; extension: string }> {
  if (format === 'png') {
    return { buffer: await renderPopV2Png(model), mimeType: 'image/png', extension: 'png' };
  }
  return { buffer: await renderPopV2Pdf(model), mimeType: 'application/pdf', extension: 'pdf' };
}
