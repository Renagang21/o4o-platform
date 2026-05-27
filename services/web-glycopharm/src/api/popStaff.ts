/**
 * POP Staff API Client — Authenticated (GlycoPharm)
 *
 * WO-O4O-GLYCOPHARM-HUB-IMPORT-BLOG-POP-QR-V1
 *
 * 매장 owner 가 운영자 발행 POP 을 자기 매장 store_pops 사본 (author_role='store')
 * 으로 가져오는 staff-only API client.
 *
 * Backend: WO-O4O-GLYCOPHARM-STORE-HUB-POP-QR-STAFF-BACKEND-V1
 *   /api/v1/glycopharm/stores/:slug/pop/staff/import
 *
 * 패턴: KPA popStaff.ts mirror — sourceId 만 전송.
 *   - serviceKey / authorRole / organizationId / status 는 backend 가 강제.
 */

import { getAccessToken } from '@o4o/auth-client';

function getApiBase(service: string = 'glycopharm'): string {
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
 *
 * Backend 가 author_role='store' + storeId=매장id + service_key='glycopharm' +
 * status='draft' 로 store_pops INSERT. excerpt 앞에 "[운영자 자료 가져옴] " 접두어로
 * 출처 표시.
 *
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
