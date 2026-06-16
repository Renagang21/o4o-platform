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

/** published 문서 조회(legacy kpa_legal_documents). 없음(404) → empty. 오류 → error. */
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

// ─── Canonical 정책문서 (service_policy_documents) + legacy fallback ───────────
// WO-O4O-KPA-POLICY-DOCUMENTS-SERVICE-POLICY-MIGRATION-V1

const POLICY_SERVICE_KEY = 'kpa-society';

export interface PublicPolicyDocument {
  title: string;
  content: string;
  published_at: string | null;
  updated_at: string | null;
  /** 'service' = 표준(service_policy_documents) / 'legacy' = 전환 안전망(kpa_legal_documents) */
  source: 'service' | 'legacy';
}

export type LoadPolicyResult =
  | { status: 'ok'; doc: PublicPolicyDocument }
  | { status: 'empty' }
  | { status: 'error' };

/**
 * KPA 정책문서 공개 조회 — 표준 소스 `service_policy_documents` 우선.
 *
 * 전환 안전망(WO §5.6): service_policy_documents 에 published 문서가 없으면 legacy
 *   `kpa_legal_documents` 로 fallback 한다. → 표준 위치로 재게시/이관 전까지도 공개 route 가
 *   갑자기 빈 문서를 보여주지 않는다. DB migration 없이 점진 전환. 표준 게시 시 표준이 우선.
 */
export async function loadPublishedPolicyDocument(documentType: string): Promise<LoadPolicyResult> {
  // 1) service_policy_documents (canonical)
  try {
    const res = await fetch(`${API_BASE}/api/v1/public/services/${POLICY_SERVICE_KEY}/policies/${documentType}`);
    if (res.ok) {
      const json = await res.json();
      const d = json?.data;
      if (d && typeof d.content === 'string' && d.content.trim().length > 0) {
        return {
          status: 'ok',
          doc: {
            title: d.title ?? '',
            content: d.content,
            published_at: d.publishedAt ?? null,
            updated_at: d.updatedAt ?? null,
            source: 'service',
          },
        };
      }
    }
    // 404 / 비어있음 → legacy fallback
  } catch {
    // 네트워크 오류 → legacy fallback (표준 조회 실패가 공개를 막지 않도록)
  }

  // 2) legacy kpa_legal_documents (전환 안전망)
  const legacy = await loadPublishedLegalDocument(documentType);
  if (legacy.status === 'ok') {
    return {
      status: 'ok',
      doc: {
        title: legacy.doc.title,
        content: legacy.doc.content,
        published_at: legacy.doc.published_at,
        updated_at: legacy.doc.updated_at,
        source: 'legacy',
      },
    };
  }
  if (legacy.status === 'empty') return { status: 'empty' };
  return { status: 'error' };
}
