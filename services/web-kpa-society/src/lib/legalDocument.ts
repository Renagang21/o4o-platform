import { BUSINESS_SITE } from '../config/businessSite';

// Published policies belong to this business; no other service or legacy fallback.
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export interface PublicPolicyDocument {
  title: string;
  content: string;
  published_at: string | null;
  updated_at: string | null;
  source: 'service';
}

export type LoadPolicyResult =
  | { status: 'ok'; doc: PublicPolicyDocument }
  | { status: 'empty' }
  | { status: 'error' };

export async function loadPublishedPolicyDocument(documentType: string): Promise<LoadPolicyResult> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/neture/businesses/${encodeURIComponent(BUSINESS_SITE.key)}/legal/policies/${encodeURIComponent(documentType)}`);
    if (res.status === 404) return { status: 'empty' };
    if (!res.ok) return { status: 'error' };
    const { data } = await res.json();
    if (!data || typeof data.content !== 'string' || !data.content.trim()) return { status: 'empty' };
    return { status: 'ok', doc: { title: data.title, content: data.content, published_at: data.publishedAt, updated_at: data.updatedAt, source: 'service' } };
  } catch { return { status: 'error' }; }
}

// ─── Canonical 문서 식별자 loader (acceptance 용) ───────────────────────────────
// WO-O4O-INTEGRATED-TERMS-ACCEPTANCE-AND-SIGNUP-ALIGNMENT-V1 §9 · §13 · §17
//
// 가입 화면·재동의 게이트는 승낙 대상이 `service_policy_documents` row 여야 하므로 legacy fallback 없이
// 표준 public API 만 조회한다(id · version · contentHash 포함). 공개 /policy 페이지의 fallback 과는 별개.

export interface CanonicalPolicyDocument {
  id?: string;
  contentHash?: string;
  serviceKey: string;
  documentType: string;
  title: string;
  slug: string | null;
  content: string;
  version: number;
  effectiveDate: string | null;
  publishedAt: string | null;
  updatedAt: string;
}

/** published 표준 문서 조회. 미게시/없음(404) → null. 그 외 오류는 throw. */
export async function loadPolicy(serviceKey: string, documentType: string): Promise<CanonicalPolicyDocument | null> {
  const res = await fetch(`${API_BASE}/api/v1/public/services/${serviceKey}/policies/${documentType}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`policy load failed: ${res.status}`);
  const json = await res.json();
  return (json?.data as CanonicalPolicyDocument | undefined) ?? null;
}
