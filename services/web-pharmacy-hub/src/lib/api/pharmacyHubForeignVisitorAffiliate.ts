/**
 * Pharmacy-Hub 제휴 QR public resolve (비인증)
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §8 (#79)
 *
 * backend: GET /api/v1/foreign-visitor/affiliate/:shortCode/resolve (공통, no auth).
 * 외국인 고객이 QR 을 스캔해 들어오는 경로라 토큰을 붙이지 않는다.
 */

export interface AffiliateResolve {
  shortCode: string;
  serviceKey: string;
  storeName: string | null;
  storeSlug: string | null;
  campaignName: string | null;
  language: string | null;
}

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
