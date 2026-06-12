/**
 * KPA Society 공개 정책 문서 loader
 * WO-O4O-KPA-LEGAL-POLICY-ROUTES-ALIGNMENT-V1
 *
 * 기존 kpa_legal_documents 의 public read API(published only)를 조회한다.
 * 공개 페이지(/policy=이용약관, /privacy)가 localStorage/static fallback 대신 운영자 입력 DB 를 표시하도록 정렬.
 * backend 무변경 — 기존 `GET /api/v1/kpa/legal/documents/published/:documentType` 재사용.
 * public endpoint 이므로 인증 없이 plain fetch (KPA public 호출 관례).
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export interface KpaLegalDocument {
  id: string;
  document_type: string;
  title: string;
  content: string;
  published_at: string | null;
  updated_at: string;
}

export type LoadLegalResult =
  | { status: 'ok'; doc: KpaLegalDocument }
  | { status: 'empty' }
  | { status: 'error' };

/** published 문서 조회. 없음(404) → empty. 오류 → error. */
export async function loadPublishedLegalDocument(documentType: string): Promise<LoadLegalResult> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/kpa/legal/documents/published/${documentType}`);
    if (res.status === 404) return { status: 'empty' };
    if (!res.ok) return { status: 'error' };
    const json = await res.json();
    const doc = json?.data;
    if (!doc) return { status: 'empty' };
    return { status: 'ok', doc };
  } catch {
    return { status: 'error' };
  }
}
