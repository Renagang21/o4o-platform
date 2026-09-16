/**
 * WO-O4O-AI-COMPOSER-UNIFIED-REQUEST-AND-ATTACHMENT-UX-V1 §3·§6·§14 — 범용 첨부 파이프라인(client, 순수 계층)
 *
 *   - 이미지 · 문서 · 표가 **같은 진입점** 으로 들어와 종류만 갈린다(종류별 업로드 UX 없음).
 *   - 브라우저 MIME 이 비거나 틀려도 확장자로 판정한다(.csv → vnd.ms-excel 문제).
 *   - 지원하지 않는 파일은 명확한 문구 + 지원 목록, 되는 파일은 그대로 받는다(부분 수용).
 *   - 개수 · 크기 상한.
 */

import { describe, expect, it } from 'vitest';
import {
  addPendingAttachments,
  resolveAttachmentType,
  unsupportedAttachmentMessage,
  UNIFIED_ATTACHMENT_ACCEPT,
  UNIFIED_ATTACHMENT_MAX_BYTES,
  UNIFIED_ATTACHMENT_MAX_COUNT,
} from '../ai/unified-request';

const file = (name: string, type: string, size = 10) => new File([new Uint8Array(size)], name, { type });

describe('unified attachment — 종류 판정', () => {
  it('이미지 · 문서 · 표를 하나의 파이프라인으로 받는다', () => {
    expect(resolveAttachmentType(file('a.png', 'image/png'))).toEqual({ mimeType: 'image/png', kind: 'image' });
    expect(resolveAttachmentType(file('m.pdf', 'application/pdf'))).toEqual({ mimeType: 'application/pdf', kind: 'document' });
    expect(resolveAttachmentType(file('m.docx', ''))).toEqual(expect.objectContaining({ kind: 'document' }));
    expect(resolveAttachmentType(file('l.xlsx', ''))).toEqual(expect.objectContaining({ kind: 'spreadsheet' }));
    expect(resolveAttachmentType(file('n.md', ''))).toEqual({ mimeType: 'text/markdown', kind: 'document' });
  });

  it('확장자 우선 — Windows 가 .csv 를 vnd.ms-excel 로 보고해도 CSV 로 본다', () => {
    expect(resolveAttachmentType(file('d.csv', 'application/vnd.ms-excel'))).toEqual({ mimeType: 'text/csv', kind: 'spreadsheet' });
  });

  it('이름 없는 붙여넣기 Blob 은 MIME 으로 본다', () => {
    expect(resolveAttachmentType(new Blob([new Uint8Array(3)], { type: 'image/jpeg' }))).toEqual({ mimeType: 'image/jpeg', kind: 'image' });
  });

  it('미지원 형식은 null · 안내 문구에 지원 목록', () => {
    expect(resolveAttachmentType(file('setup.exe', 'application/x-msdownload'))).toBeNull();
    expect(resolveAttachmentType(file('a.zip', ''))).toBeNull();
    const msg = unsupportedAttachmentMessage('setup.exe');
    expect(msg).toContain('setup.exe');
    expect(msg).toContain('PDF');
    expect(msg).toContain('XLSX');
  });

  it('file input accept 는 확장자 목록', () => {
    expect(UNIFIED_ATTACHMENT_ACCEPT).toContain('.pdf');
    expect(UNIFIED_ATTACHMENT_ACCEPT).toContain('.xlsx');
    expect(UNIFIED_ATTACHMENT_ACCEPT).toContain('.png');
  });
});

describe('unified attachment — 목록 추가', () => {
  it('되는 파일은 받고 안 되는 파일만 사유를 돌려준다', () => {
    const { next, rejected } = addPendingAttachments([], [file('a.png', 'image/png'), file('x.exe', ''), file('m.pdf', 'application/pdf')]);
    expect(next.map((a) => a.name)).toEqual(['a.png', 'm.pdf']);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]).toContain('x.exe');
  });

  it('개수 상한', () => {
    const files = Array.from({ length: UNIFIED_ATTACHMENT_MAX_COUNT + 2 }, (_, i) => file(`f${i}.txt`, 'text/plain'));
    const { next, rejected } = addPendingAttachments([], files);
    expect(next).toHaveLength(UNIFIED_ATTACHMENT_MAX_COUNT);
    expect(rejected.join(' ')).toContain(`${UNIFIED_ATTACHMENT_MAX_COUNT}개`);
  });

  it('크기 상한', () => {
    const { next, rejected } = addPendingAttachments([], [file('big.pdf', 'application/pdf', UNIFIED_ATTACHMENT_MAX_BYTES + 1)]);
    expect(next).toHaveLength(0);
    expect(rejected[0]).toContain('big.pdf');
  });

  it('기존 목록을 보존하고 뒤에 더한다', () => {
    const first = addPendingAttachments([], [file('a.png', 'image/png')]).next;
    const { next } = addPendingAttachments(first, [file('b.csv', '')]);
    expect(next.map((a) => a.kind)).toEqual(['image', 'spreadsheet']);
    expect(next[0].id).toBe(first[0].id);
  });
});
