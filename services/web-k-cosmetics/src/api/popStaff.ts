/**
 * POP Staff API Client — Authenticated (K-Cosmetics)
 *
 * WO-O4O-KCOS-STORE-HUB-POP-QR-PORT-V1
 * GlycoPharm popStaff (KPA canonical) mirror — service param defaults to 'cosmetics'.
 *
 * 매장 owner 가 운영자 발행 POP 을 자기 매장 store_pops 사본(author_role='store')으로 가져오는 staff-only API.
 * Backend: o4o-store pop.controller — /api/v1/cosmetics/stores/:slug/pop/staff/import (serviceKey='cosmetics').
 * sourceId 만 전송 — serviceKey / authorRole / organizationId / status 는 backend 가 강제.
 */

import { getAccessToken } from '@o4o/auth-client';

function getApiBase(service: string = 'cosmetics'): string {
  const base = import.meta.env.VITE_API_BASE_URL || '';
  return `${base}/api/v1/${service}`;
}

export interface ImportedOperatorPopPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  status: 'draft' | 'published' | 'archived';
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  importSource: {
    sourceId: string;
    sourceTitle: string;
    sourceServiceKey: string;
    sourceAuthorRole: string;
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
 * 운영자 HUB 게시 POP 을 매장 사본으로 가져오기.
 * 권한: store_owner (verifyOwner backend 검증).
 */
export async function importOperatorPop(
  slug: string,
  sourceId: string,
  service?: string,
): Promise<ImportedOperatorPopPost> {
  const url = `${getApiBase(service)}/stores/${encodeURIComponent(slug)}/pop/staff/import`;
  const json = await authFetch(url, {
    method: 'POST',
    body: JSON.stringify({ sourceId }),
  });
  return json.data as ImportedOperatorPopPost;
}
