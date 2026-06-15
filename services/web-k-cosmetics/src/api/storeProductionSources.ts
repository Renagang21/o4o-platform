/**
 * Store Production Materials — 추가 소스 client (QR / direct content)
 *
 * WO-O4O-STORE-PRODUCTION-MATERIAL-GP-KCOS-SOURCE-COMPLETION-V1
 *
 * `/store/library/production-materials` 의 QR/direct 소스를 KPA 와 동일 backend 에서 조회.
 * - QR: GET /cosmetics/pharmacy/qr (store-qr-landing controller) → { data: { items } }
 * - direct: GET /cosmetics/store-contents → { data: [...] } 중 sourceType='direct' 필터 (KPA 동일)
 * 신규 backend/route 없음 — 기존 마운트된 엔드포인트 재사용. 결과는 mergeProductionMaterials 에 주입.
 */

import { api } from '@/lib/apiClient';

/** 내 매장 QR 코드 목록 (production-materials 표시용) */
export async function getStoreQrCodes(opts?: { limit?: number }): Promise<any[]> {
  const params = new URLSearchParams();
  if (opts?.limit) params.set('limit', String(opts.limit));
  const qs = params.toString();
  const res = await api.get(`/cosmetics/pharmacy/qr${qs ? `?${qs}` : ''}`);
  return res.data?.data?.items ?? res.data?.items ?? [];
}

/** 내 매장 direct 콘텐츠 목록 (GET /store-contents 에서 sourceType='direct' 필터 — KPA 동일) */
export async function getStoreDirectContents(): Promise<any[]> {
  const res = await api.get('/cosmetics/store-contents');
  const list = res.data?.data ?? res.data ?? [];
  return Array.isArray(list) ? list.filter((c: any) => c?.sourceType === 'direct') : [];
}
