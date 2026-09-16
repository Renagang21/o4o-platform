/**
 * Unified AI Request — 상위 입력 계약 (pure)
 *
 * WO-O4O-AI-COMPOSER-UNIFIED-REQUEST-AND-ATTACHMENT-UX-V1 §6·§7
 *
 *   userInput
 *   ├─ text
 *   ├─ attachments[]   image | document | spreadsheet
 *   ├─ runId(optional) PHASE 1 same-run 재개 앵커(WEB-AUTOMATION-RESUME-V1) — 있으면 Work Agent 로 간다
 *   └─ localDataSourceReference(optional) 반복 사용 자료(PHASE 3 Local Data Source) — **이번 WO 는 자리만 연다**
 *
 * 첨부는 **이번 요청에서만** 읽고 버린다(§7 Attachment ≠ Persistent Knowledge). 파일 · base64 · 추출 텍스트를
 * DB · 로그 · 파일에 쓰는 경로는 없다. 여기서는 형상 · 종류 · 크기만 판정하고 본문은 읽지 않는다.
 *
 * DB · 네트워크 의존 없음 — 테스트 가능한 순수 계층만 둔다.
 */

export type UnifiedAttachmentKind = 'image' | 'document' | 'spreadsheet';

/** 서버가 받아들이는 MIME → 종류. 클라이언트 확장자 판정은 편의일 뿐, 최종 판정은 이 표다. */
export const UNIFIED_ATTACHMENT_MIME_KINDS: Readonly<Record<string, UnifiedAttachmentKind>> = Object.freeze({
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'application/pdf': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'text/plain': 'document',
  'text/markdown': 'document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'spreadsheet',
  'application/vnd.ms-excel': 'spreadsheet',
  'text/csv': 'spreadsheet',
});

/** 확장자 → MIME. 브라우저가 `File.type` 을 비워 보내는 경우(특히 .md · .csv · .xls)의 보정용. */
export const UNIFIED_ATTACHMENT_EXTENSION_MIMES: Readonly<Record<string, string>> = Object.freeze({
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  md: 'text/markdown',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  csv: 'text/csv',
});

/** 사용자 안내용 지원 목록(확장자). UI 의 accept 와 오류 문구가 같은 표를 본다. */
export const UNIFIED_ATTACHMENT_EXTENSIONS: readonly string[] = Object.freeze(Object.keys(UNIFIED_ATTACHMENT_EXTENSION_MIMES));

export const UNIFIED_ATTACHMENT_MAX_COUNT = 5;
/** 파일 하나(원본 바이트) 상한. 이미지는 클라이언트가 1600px JPEG 로 줄여 보내므로 실제로는 훨씬 작다. */
export const UNIFIED_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
/** 요청 전체(원본 바이트 합) 상한. express json limit(50mb) 아래에 base64 팽창(4/3)을 감안해 둔다. */
export const UNIFIED_ATTACHMENT_TOTAL_MAX_BYTES = 20 * 1024 * 1024;
export const UNIFIED_ATTACHMENT_NAME_MAX_LENGTH = 200;

export interface UnifiedAttachment {
  kind: UnifiedAttachmentKind;
  mimeType: string;
  /** 표시용 파일명(경로 없음). 프롬프트에는 이름만 싣는다. */
  name: string;
  /** 순수 base64. */
  base64: string;
  /** 원본 바이트 수(base64 길이에서 계산). */
  bytes: number;
}

export type UnifiedAttachmentError =
  | 'ATTACHMENT_INVALID'
  | 'ATTACHMENT_TYPE_UNSUPPORTED'
  | 'ATTACHMENT_TOO_LARGE'
  | 'ATTACHMENT_TOO_MANY';

export interface UnifiedAttachmentValidation {
  ok: boolean;
  attachments: UnifiedAttachment[];
  error?: UnifiedAttachmentError;
  /** 오류가 난 첨부의 표시 이름(있으면). 사용자 문구에만 쓴다. */
  errorName?: string;
}

function extensionOf(name: string): string {
  const m = /\.([A-Za-z0-9]{1,8})$/.exec(name);
  return m ? m[1].toLowerCase() : '';
}

/** 파일명에서 경로 구분자 · 제어문자를 제거한 표시 이름. */
export function sanitizeAttachmentName(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const base = raw.split(/[\\/]/).pop() ?? '';
  // 제어문자(U+0000~U+001F · U+007F)는 정규식 리터럴 대신 코드값으로 거른다 — 소스에 제어문자를 두지 않기 위해서다.
  const printable = Array.from(base).filter((ch) => {
    const code = ch.charCodeAt(0);
    return code >= 0x20 && code !== 0x7f;
  }).join('');
  return printable.trim().slice(0, UNIFIED_ATTACHMENT_NAME_MAX_LENGTH);
}

/**
 * 클라이언트 MIME 이 비었거나 generic(`application/octet-stream`)이면 확장자로 보정한다.
 * 확장자와 MIME 이 둘 다 있고 서로 다른 종류를 가리키면 **MIME 을 믿지 않고** 확장자 표를 쓴다 —
 * Windows 는 .csv 를 `application/vnd.ms-excel` 로 보내는 일이 흔하다.
 */
export function resolveAttachmentMime(name: string, clientMime: unknown): string | null {
  const ext = extensionOf(name);
  const byExt = ext ? UNIFIED_ATTACHMENT_EXTENSION_MIMES[ext] : undefined;
  const mime = typeof clientMime === 'string' ? clientMime.trim().toLowerCase().split(';')[0] : '';
  if (byExt) return byExt;
  if (mime && UNIFIED_ATTACHMENT_MIME_KINDS[mime]) return mime;
  return null;
}

function base64ByteLength(b64: string): number {
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

/**
 * `attachments[]` 검증. 하나라도 틀리면 전체를 거부한다(부분 수용으로 사용자가 "첨부됐다" 고 오해하지 않게).
 * 비어 있거나 undefined 면 ok · 빈 배열.
 */
export function validateUnifiedAttachments(raw: unknown): UnifiedAttachmentValidation {
  if (raw === undefined || raw === null) return { ok: true, attachments: [] };
  if (!Array.isArray(raw)) return { ok: false, attachments: [], error: 'ATTACHMENT_INVALID' };
  if (raw.length > UNIFIED_ATTACHMENT_MAX_COUNT) return { ok: false, attachments: [], error: 'ATTACHMENT_TOO_MANY' };
  const out: UnifiedAttachment[] = [];
  let total = 0;
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return { ok: false, attachments: [], error: 'ATTACHMENT_INVALID' };
    const r = item as Record<string, unknown>;
    const name = sanitizeAttachmentName(r.name) || '첨부';
    const mimeType = resolveAttachmentMime(name, r.mimeType);
    if (!mimeType) return { ok: false, attachments: [], error: 'ATTACHMENT_TYPE_UNSUPPORTED', errorName: name };
    const kind = UNIFIED_ATTACHMENT_MIME_KINDS[mimeType];
    if (typeof r.base64 !== 'string' || r.base64.length === 0) return { ok: false, attachments: [], error: 'ATTACHMENT_INVALID', errorName: name };
    const base64 = r.base64.replace(/^data:[^;]+;base64,/, '').replace(/\s+/g, '');
    if (base64.length === 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return { ok: false, attachments: [], error: 'ATTACHMENT_INVALID', errorName: name };
    const bytes = base64ByteLength(base64);
    if (bytes > UNIFIED_ATTACHMENT_MAX_BYTES) return { ok: false, attachments: [], error: 'ATTACHMENT_TOO_LARGE', errorName: name };
    total += bytes;
    if (total > UNIFIED_ATTACHMENT_TOTAL_MAX_BYTES) return { ok: false, attachments: [], error: 'ATTACHMENT_TOO_LARGE', errorName: name };
    out.push({ kind, mimeType, name, base64, bytes });
  }
  return { ok: true, attachments: out };
}

/** 검증 오류 → 사용자 문구. 지원 목록을 함께 알려 준다(WO §14 "지원하지 않는 파일은 명확한 메시지"). */
export function unifiedAttachmentErrorMessage(code: UnifiedAttachmentError, name?: string): string {
  const who = name ? `'${name}' ` : '';
  switch (code) {
    case 'ATTACHMENT_TYPE_UNSUPPORTED':
      return `${who}파일 형식은 지원하지 않습니다. 지원: ${UNIFIED_ATTACHMENT_EXTENSIONS.map((e) => e.toUpperCase()).join(' · ')}`;
    case 'ATTACHMENT_TOO_LARGE':
      return `${who}파일이 너무 큽니다(파일당 ${UNIFIED_ATTACHMENT_MAX_BYTES / (1024 * 1024)}MB · 전체 ${UNIFIED_ATTACHMENT_TOTAL_MAX_BYTES / (1024 * 1024)}MB 이하).`;
    case 'ATTACHMENT_TOO_MANY':
      return `첨부는 한 번에 ${UNIFIED_ATTACHMENT_MAX_COUNT}개까지입니다.`;
    case 'ATTACHMENT_INVALID':
    default:
      return `${who}첨부를 읽지 못했습니다. 다시 선택해 주세요.`;
  }
}

/** Work Agent 에 넘길 수 있는 첫 이미지(기존 `image` 계약 그대로). 문서 · 표는 Work Agent 로 흐르지 않는다. */
export function firstImageAttachment(attachments: readonly UnifiedAttachment[]): { mimeType: string; base64: string } | undefined {
  const img = attachments.find((a) => a.kind === 'image');
  return img ? { mimeType: img.mimeType, base64: img.base64 } : undefined;
}
