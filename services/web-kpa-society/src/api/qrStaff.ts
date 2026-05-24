/**
 * QR Staff API Client — Authenticated (Store Hub QR Import)
 *
 * WO-O4O-KPA-STORE-HUB-QR-CONTENT-IMPORT-V1 (2026-05-24)
 *
 * 매장 owner 가 운영자 발행 QR 템플릿 (operator_qr_templates) 을 가져가 자기 매장
 * store_qr_codes 의 사본 row 로 변환·생성하는 staff-only API client.
 *
 * 본 client 는 **변환 흐름 전용**. 매장 owner CRUD (생성/수정/삭제/scan/print) 는
 * 기존 storeQr.ts (/pharmacy/qr/*) 가 모두 cover.
 *
 * Backend: WO-O4O-KPA-STORE-HUB-QR-CONTENT-IMPORT-V1
 *   POST /api/v1/kpa/stores/:slug/qr/staff/import
 *
 * 패턴: popStaff.ts importOperatorPop mirror — sourceId 만 전송.
 *   - serviceKey / authorRole / organizationId / landingType / landingTargetId / slug
 *     모두 backend 가 변환·강제 (프론트 전송 금지).
 */

import { getAccessToken } from '../contexts/AuthContext';

function getApiBase(service: string = 'kpa'): string {
  const base = import.meta.env.VITE_API_BASE_URL || '';
  return `${base}/api/v1/${service}`;
}

/**
 * 가져온 QR 사본 — store_qr_codes row 형태 + importSource metadata.
 *
 * frontend 는 본 응답을 가져가기 직후 토스트/표시 용도로만 사용 — 사본 관리는 기존
 * StoreQRPage (/store/marketing/qr) 가 store_qr_codes 목록 조회로 표시.
 */
export interface ImportedOperatorQr {
  id: string;
  organizationId: string;
  type: string;
  title: string;
  description: string | null;
  libraryItemId: string | null;
  landingType: string;
  landingTargetId: string | null;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  importSource: {
    sourceId: string;
    sourceTitle: string;
    sourceServiceKey: string;
    sourceAuthorRole: string;
    sourceTargetType: 'url' | 'content';
    importedAt: string;
  };
}

async function authFetch(url: string, options: RequestInit = {}): Promise<any> {
  const token = getAccessToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || 'Request failed');
  return json;
}

/**
 * 운영자 발행 QR 템플릿을 매장 사본 (store_qr_codes row) 으로 가져오기.
 *
 * Backend 가:
 *   - 원본 검증: author_role='operator' AND status='published' AND service_key=서비스
 *   - landing 변환: targetType='url'→link, targetType='content'→page
 *   - slug 발급 (충돌 시 timestamp suffix)
 *   - store_qr_codes INSERT (organization_id=매장 owner org, is_active=true)
 *
 * 권한: store_owner (verifyOwner backend 검증).
 */
export async function importOperatorQr(
  slug: string,
  sourceId: string,
  service?: string,
): Promise<ImportedOperatorQr> {
  const url = `${getApiBase(service)}/stores/${encodeURIComponent(slug)}/qr/staff/import`;
  const json = await authFetch(url, {
    method: 'POST',
    body: JSON.stringify({ sourceId }),
  });
  return json.data as ImportedOperatorQr;
}
