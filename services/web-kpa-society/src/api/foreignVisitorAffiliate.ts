/**
 * Foreign Visitor Affiliate landing API (public, no auth)
 * WO-O4O-FOREIGN-VISITOR-AFFILIATE-LANDING-V1
 *
 * 제휴마케팅 QR(shortCode) 스캔 시 public landing 이 호출하는 비인증 resolve.
 * backend: GET /api/v1/foreign-visitor/affiliate/:shortCode/resolve (no auth, scan event 미기록).
 * 결제/scan 무관 — store 식별 + 다국어 안내 연결만.
 */

export interface AffiliateResolve {
  shortCode: string;
  serviceKey: string;
  storeName: string | null;
  storeSlug: string | null;
  campaignName: string | null;
  language: string | null;
}

/** 비인증 public resolve — 토큰 없이 호출(외국인 고객 스캔 진입). */
export async function resolveAffiliate(shortCode: string): Promise<AffiliateResolve> {
  const base = import.meta.env.VITE_API_BASE_URL || '';
  const res = await fetch(
    `${base}/api/v1/foreign-visitor/affiliate/${encodeURIComponent(shortCode)}/resolve`,
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    const err: any = new Error(json.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = json.code;
    throw err;
  }
  return json.data as AffiliateResolve;
}
