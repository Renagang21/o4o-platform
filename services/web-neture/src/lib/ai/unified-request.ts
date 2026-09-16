/**
 * Unified AI Request — client
 *
 * WO-O4O-AI-COMPOSER-UNIFIED-REQUEST-AND-ATTACHMENT-UX-V1 §3·§4·§6
 *
 *   하나의 입력창 · 하나의 실행 버튼. 사용자는 "질문인지 작업 수행인지" 를 고르지 않는다 —
 *   `POST /api/ai/request` 의 서버 라우터가 판정해 `data.kind` (chat | work | confirm) 로 답한다.
 *
 *   첨부는 **범용**이다(이미지 · 문서 · 표). 어떤 파일이든 같은 진입점(＋ · drag&drop · 붙여넣기)으로 들어와
 *   같은 파이프라인(readAttachmentFile)을 지난다. 이미지는 기존 Work Agent 계약대로 1600px JPEG 로 줄여 보내고,
 *   그 밖은 원본 바이트를 base64 로 보낸다. 파일 · base64 · 응답은 React state 뿐 — 저장하지 않는다(§7).
 *
 *   `localDataSourceReference` 는 "내 PC 자료 연결"(PHASE 3 Local Data Source) 의 자리다. 이번 WO 는 계약 필드만
 *   열어 두고 보내지 않는다(§3 — 메뉴/진입 계약만).
 */

import { api, API_BASE_URL } from '../apiClient';
import type { WorkScope } from '../work-scope';
import { toHomeChatScope, type HomeChatResult } from './home-chat';
import { readWorkImage, type WorkAgentResult } from './work-agent';

export type UnifiedAttachmentKind = 'image' | 'document' | 'spreadsheet';

/** 서버 unified-request-contract 와 같은 표. 최종 판정은 서버가 한다. */
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

const MIME_KINDS: Readonly<Record<string, UnifiedAttachmentKind>> = Object.freeze({
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

export const UNIFIED_ATTACHMENT_EXTENSIONS: readonly string[] = Object.freeze(Object.keys(UNIFIED_ATTACHMENT_EXTENSION_MIMES));
/** `<input type="file" accept>` 값. 확장자 기준 — Windows 탐색기가 .csv 를 vnd.ms-excel 로 보고하는 문제를 피한다. */
export const UNIFIED_ATTACHMENT_ACCEPT = UNIFIED_ATTACHMENT_EXTENSIONS.map((e) => `.${e}`).join(',');
export const UNIFIED_ATTACHMENT_MAX_COUNT = 5;
export const UNIFIED_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const UNIFIED_ATTACHMENT_TOTAL_MAX_BYTES = 20 * 1024 * 1024;

export interface PendingAttachment {
  /** 화면용 안정 키. */
  id: string;
  name: string;
  mimeType: string;
  kind: UnifiedAttachmentKind;
  file: File | Blob;
  bytes: number;
}

export interface UnifiedAttachmentPayload {
  name: string;
  mimeType: string;
  base64: string;
}

export class UnifiedRequestError extends Error {
  constructor(message: string, readonly code: string, readonly status?: number) {
    super(message);
    this.name = 'UnifiedRequestError';
  }
}

function extensionOf(name: string): string {
  const m = /\.([A-Za-z0-9]{1,8})$/.exec(name);
  return m ? m[1].toLowerCase() : '';
}

/**
 * 파일 → (mime, kind). 확장자가 표에 있으면 확장자 우선(브라우저 MIME 은 비거나 틀리는 일이 흔하다),
 * 없으면 `File.type` 으로 본다(붙여넣은 이미지 Blob 은 이름이 없다).
 */
export function resolveAttachmentType(file: File | Blob): { mimeType: string; kind: UnifiedAttachmentKind } | null {
  const name = 'name' in file && typeof file.name === 'string' ? file.name : '';
  const byExt = UNIFIED_ATTACHMENT_EXTENSION_MIMES[extensionOf(name)];
  const mime = byExt ?? (file.type || '').toLowerCase().split(';')[0];
  const kind = MIME_KINDS[mime];
  return kind ? { mimeType: mime, kind } : null;
}

export function unsupportedAttachmentMessage(name?: string): string {
  return `${name ? `'${name}' ` : ''}파일 형식은 지원하지 않습니다. 지원: ${UNIFIED_ATTACHMENT_EXTENSIONS.map((e) => e.toUpperCase()).join(' · ')}`;
}

/**
 * 첨부 목록에 파일을 더한다. 실패는 던지지 않고 사유를 돌려준다 — 여러 파일을 한 번에 떨어뜨렸을 때
 * 되는 것은 받고 안 되는 것만 알린다.
 */
export function addPendingAttachments(
  current: readonly PendingAttachment[],
  files: readonly (File | Blob)[],
): { next: PendingAttachment[]; rejected: string[] } {
  const next = [...current];
  const rejected: string[] = [];
  let total = next.reduce((s, a) => s + a.bytes, 0);
  for (const file of files) {
    const name = 'name' in file && typeof file.name === 'string' && file.name ? file.name : '붙여넣은 이미지';
    const type = resolveAttachmentType(file);
    if (!type) {
      rejected.push(unsupportedAttachmentMessage(name));
      continue;
    }
    if (next.length >= UNIFIED_ATTACHMENT_MAX_COUNT) {
      rejected.push(`첨부는 한 번에 ${UNIFIED_ATTACHMENT_MAX_COUNT}개까지입니다.`);
      break;
    }
    if (file.size > UNIFIED_ATTACHMENT_MAX_BYTES) {
      rejected.push(`'${name}' 파일이 너무 큽니다(파일당 ${UNIFIED_ATTACHMENT_MAX_BYTES / (1024 * 1024)}MB 이하).`);
      continue;
    }
    if (total + file.size > UNIFIED_ATTACHMENT_TOTAL_MAX_BYTES) {
      rejected.push(`첨부 전체가 ${UNIFIED_ATTACHMENT_TOTAL_MAX_BYTES / (1024 * 1024)}MB 를 넘습니다.`);
      continue;
    }
    total += file.size;
    next.push({
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      mimeType: type.mimeType,
      kind: type.kind,
      file,
      bytes: file.size,
    });
  }
  return { next, rejected };
}

async function readAsBase64(file: File | Blob): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(bin);
}

/** 전송 직전 읽기. 이미지는 기존 계약(1600px JPEG 재인코딩 — EXIF 제거)을 그대로 따른다. */
export async function readAttachmentFile(att: PendingAttachment): Promise<UnifiedAttachmentPayload> {
  if (att.kind === 'image') {
    const img = await readWorkImage(att.file);
    const name = /\.(jpe?g)$/i.test(att.name) ? att.name : `${att.name.replace(/\.[A-Za-z0-9]+$/, '')}.jpg`;
    return { name: name === '.jpg' ? '붙여넣은 이미지.jpg' : name, mimeType: img.mimeType, base64: img.base64 };
  }
  return { name: att.name, mimeType: att.mimeType, base64: await readAsBase64(att.file) };
}

export type UnifiedRequestResult =
  | { kind: 'chat'; route: string; reason: string; chat: HomeChatResult & { attachments?: { name: string; kind: UnifiedAttachmentKind; readable: boolean }[] } }
  | { kind: 'work'; route: string; reason: string; work: WorkAgentResult }
  | { kind: 'confirm'; route: string; reason: string; confirm: { message: string; target: { targetType: 'browser_site' | 'windows_app'; displayName: string } } };

export interface UnifiedRequestInput {
  text: string;
  attachments: readonly PendingAttachment[];
  workScope: WorkScope;
  /** 직전 Work 응답이 resumable 이었을 때 같은 업무를 잇는 앵커(PHASE 1). */
  runId?: string;
  /** confirm 응답에 사용자가 "진행" 으로 답했을 때만. UI 모드가 아니다. */
  routeHint?: 'work';
}

export async function sendUnifiedRequest(input: UnifiedRequestInput): Promise<UnifiedRequestResult> {
  const attachments = await Promise.all(input.attachments.map(readAttachmentFile));
  try {
    const res = await api.post(`${API_BASE_URL}/api/ai/request`, {
      text: input.text,
      ...(attachments.length > 0 ? { attachments } : {}),
      ...(input.runId ? { runId: input.runId } : {}),
      ...(input.routeHint ? { routeHint: input.routeHint } : {}),
      workScope: toHomeChatScope(input.workScope),
    });
    const data = res?.data?.data as UnifiedRequestResult | undefined;
    if (!data || typeof data.kind !== 'string') throw new UnifiedRequestError('응답을 생성하지 못했습니다. 다시 시도해 주세요.', 'AI_ERROR');
    return data;
  } catch (err) {
    if (err instanceof UnifiedRequestError) throw err;
    const resp = (err as { response?: { status?: number; data?: { error?: string; code?: string } } }).response;
    if (resp) throw new UnifiedRequestError(resp.data?.error || '응답을 생성하지 못했습니다. 다시 시도해 주세요.', resp.data?.code || 'AI_ERROR', resp.status);
    throw new UnifiedRequestError('네트워크 오류가 발생했습니다. 다시 시도해 주세요.', 'NETWORK_ERROR');
  }
}
