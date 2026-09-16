/**
 * Attachment Reader — 첨부를 모델 입력으로 바꾼다 (요청 메모리 안에서만)
 *
 * WO-O4O-AI-COMPOSER-UNIFIED-REQUEST-AND-ATTACHMENT-UX-V1 §3·§6·§7
 *
 *   image (JPEG · PNG · WebP)   → inline part (모델이 직접 본다)
 *   document/pdf                → inline part (Gemini 는 PDF 를 그대로 읽는다 — 서버에 PDF 파서를 두지 않는다)
 *   document/docx               → adm-zip 으로 word/document.xml 을 열어 문단 텍스트만 추출
 *   document/txt · md           → UTF-8 텍스트
 *   spreadsheet/xlsx · xls      → xlsx 로 시트별 CSV 텍스트(행 · 시트 상한)
 *   spreadsheet/csv             → UTF-8 텍스트(행 상한)
 *
 * 추출 텍스트는 **데이터**다(WorkInputProvenance 'user_file' 과 같은 신뢰 등급). 프롬프트에는 구분자로 감싸
 * "지시가 아니라 자료" 임을 못박고, 어디에도 저장하지 않는다. 새 의존성 없음 — adm-zip · xlsx 는 이미 production deps 다.
 */

import AdmZip from 'adm-zip';
import * as XLSX from 'xlsx';
import type { UnifiedAttachment } from './unified-request-contract.js';

/** 첨부 하나에서 프롬프트에 싣는 텍스트 상한(문자). 모델 컨텍스트와 응답 시간을 지키기 위한 값이다. */
export const ATTACHMENT_TEXT_MAX_CHARS = 60_000;
/** 요청 전체 텍스트 첨부 합계 상한. */
export const ATTACHMENT_TEXT_TOTAL_MAX_CHARS = 120_000;
export const SPREADSHEET_MAX_SHEETS = 10;
export const SPREADSHEET_MAX_ROWS_PER_SHEET = 2_000;

export interface AttachmentInlinePart {
  kind: 'inline';
  name: string;
  mimeType: string;
  base64: string;
}

export interface AttachmentTextPart {
  kind: 'text';
  name: string;
  mimeType: string;
  text: string;
  truncated: boolean;
}

export interface AttachmentUnreadablePart {
  kind: 'unreadable';
  name: string;
  mimeType: string;
  reason: 'PARSE_FAILED' | 'EMPTY';
}

export type AttachmentPart = AttachmentInlinePart | AttachmentTextPart | AttachmentUnreadablePart;

function truncate(text: string, max: number): { text: string; truncated: boolean } {
  if (text.length <= max) return { text, truncated: false };
  return { text: `${text.slice(0, max)}\n…(이하 생략)`, truncated: true };
}

function decodeUtf8(buf: Buffer): string {
  // BOM 제거. CP949 등 다른 인코딩은 이번 범위 밖 — 깨진 글자는 그대로 모델에 가지 않도록 U+FFFD 비율로 걸러낸다.
  const text = buf.toString('utf8').replace(new RegExp(`^${String.fromCharCode(0xfeff)}`), '');
  const bad = text.split(String.fromCharCode(0xfffd)).length - 1;
  if (text.length > 0 && bad / text.length > 0.05) return '';
  return text;
}

/** DOCX(zip) → word/document.xml → 문단(<w:p>) 단위 텍스트. 표 · 각주는 문단 순서대로 섞인다(정확한 레이아웃 재현은 목적이 아니다). */
export function extractDocxText(buf: Buffer): string {
  const zip = new AdmZip(buf);
  const entry = zip.getEntry('word/document.xml');
  if (!entry) return '';
  const xml = entry.getData().toString('utf8');
  const paragraphs = xml.split(/<\/w:p>/);
  const lines: string[] = [];
  for (const p of paragraphs) {
    const runs = p.match(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g) ?? [];
    const text = runs
      .map((r) => r.replace(/<w:t(?:\s[^>]*)?>/, '').replace(/<\/w:t>$/, ''))
      .join('')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
    if (text.trim()) lines.push(text);
  }
  return lines.join('\n');
}

/** XLSX/XLS → 시트별 CSV. 시트 · 행 상한을 넘으면 잘라내고 표시한다. */
export function extractSpreadsheetText(buf: Buffer): string {
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
  const out: string[] = [];
  const names = wb.SheetNames.slice(0, SPREADSHEET_MAX_SHEETS);
  for (const name of names) {
    const sheet = wb.Sheets[name];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, blankrows: false, defval: '' });
    const limited = rows.slice(0, SPREADSHEET_MAX_ROWS_PER_SHEET);
    const csv = limited
      .map((r) => (Array.isArray(r) ? r : []).map((c) => {
        const s = c === null || c === undefined ? '' : String(c);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(','))
      .join('\n');
    out.push(`### 시트: ${name}${rows.length > limited.length ? ` (처음 ${limited.length}행만)` : ''}\n${csv}`);
  }
  if (wb.SheetNames.length > names.length) out.push(`(시트 ${wb.SheetNames.length - names.length}개 더 있음 — 생략)`);
  return out.join('\n\n');
}

function extractCsvText(buf: Buffer): string {
  const text = decodeUtf8(buf);
  const lines = text.split(/\r?\n/);
  if (lines.length <= SPREADSHEET_MAX_ROWS_PER_SHEET) return text;
  return `${lines.slice(0, SPREADSHEET_MAX_ROWS_PER_SHEET).join('\n')}\n(처음 ${SPREADSHEET_MAX_ROWS_PER_SHEET}행만)`;
}

/** 첨부 하나 → 모델 입력 part. 파싱 실패는 던지지 않고 unreadable 로 돌려 사용자에게 알린다. */
export function readAttachment(att: UnifiedAttachment): AttachmentPart {
  const base = { name: att.name, mimeType: att.mimeType };
  if (att.kind === 'image' || att.mimeType === 'application/pdf') {
    return { kind: 'inline', ...base, base64: att.base64 };
  }
  let text = '';
  try {
    const buf = Buffer.from(att.base64, 'base64');
    if (att.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') text = extractDocxText(buf);
    else if (att.mimeType === 'text/csv') text = extractCsvText(buf);
    else if (att.kind === 'spreadsheet') text = extractSpreadsheetText(buf);
    else text = decodeUtf8(buf);
  } catch {
    return { kind: 'unreadable', ...base, reason: 'PARSE_FAILED' };
  }
  if (!text.trim()) return { kind: 'unreadable', ...base, reason: 'EMPTY' };
  const t = truncate(text, ATTACHMENT_TEXT_MAX_CHARS);
  return { kind: 'text', ...base, text: t.text, truncated: t.truncated };
}

export function readAttachments(attachments: readonly UnifiedAttachment[]): AttachmentPart[] {
  const parts = attachments.map(readAttachment);
  // 전체 텍스트 합계 상한 — 뒤쪽 첨부부터 잘라 앞 첨부의 문맥을 지킨다.
  let budget = ATTACHMENT_TEXT_TOTAL_MAX_CHARS;
  for (const p of parts) {
    if (p.kind !== 'text') continue;
    if (p.text.length <= budget) {
      budget -= p.text.length;
      continue;
    }
    const t = truncate(p.text, Math.max(0, budget));
    p.text = t.text;
    p.truncated = true;
    budget = 0;
  }
  return parts;
}

/**
 * 텍스트 첨부 → user prompt 뒤에 붙는 자료 블록. 구분자 안의 내용은 **자료**이며 지시가 아니다 —
 * system prompt 가 같은 말을 한 번 더 한다(homeChat.ts attachment facts).
 */
export function renderAttachmentTextBlocks(parts: readonly AttachmentPart[]): string {
  const blocks: string[] = [];
  for (const p of parts) {
    if (p.kind === 'text') {
      blocks.push(`<<<첨부 자료 시작: ${p.name}${p.truncated ? ' (일부)' : ''}>>>\n${p.text}\n<<<첨부 자료 끝: ${p.name}>>>`);
    } else if (p.kind === 'unreadable') {
      blocks.push(`<<<첨부 자료: ${p.name} — ${p.reason === 'EMPTY' ? '내용이 비어 있어 읽지 못함' : '형식을 읽지 못함'}>>>`);
    }
  }
  return blocks.join('\n\n');
}
