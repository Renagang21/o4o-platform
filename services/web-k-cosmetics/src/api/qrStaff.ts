/**
 * QR Staff API Client — Authenticated (K-Cosmetics Store HUB QR Import)
 *
 * WO-O4O-KCOS-STORE-HUB-POP-QR-PORT-V1
 * GlycoPharm qrStaff (KPA canonical) mirror — service param defaults to 'cosmetics'.
 *
 * 매장 owner 가 운영자 발행 QR 템플릿(operator_qr_templates)을 가져가 자기 매장 store_qr_codes 사본으로 변환.
 * Backend: o4o-store qr.controller — POST /api/v1/cosmetics/stores/:slug/qr/staff/import (serviceKey='cosmetics').
 * sourceId 만 전송 — serviceKey / authorRole / landingType / landingTargetId / slug 는 backend 가 변환·강제.
 */

import { getAccessToken } from '@o4o/auth-client';

function getApiBase(service: string = 'cosmetics'): string {
  const base = import.meta.env.VITE_API_BASE_URL || '';
  return `${base}/api/v1/${service}`;
}

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
 * 운영자 발행 QR 템플릿을 매장 사본(store_qr_codes row)으로 가져오기.
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
