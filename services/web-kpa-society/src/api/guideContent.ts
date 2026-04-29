/**
 * WO-O4O-GUIDE-INLINE-EDIT-V1
 *
 * Guide Contents API 클라이언트
 *
 * GET  /api/v1/guide/contents?serviceKey=kpa-society&pageKey=guide/intro
 * POST /api/v1/guide/contents
 */

import { getAccessToken } from '../contexts/AuthContext';

const GUIDE_API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api/v1/guide`
  : '/api/v1/guide';

// 페이지별 섹션 콘텐츠 캐시 (단일 렌더 사이클 내 중복 fetch 방지)
const pageCache = new Map<string, Promise<Record<string, string>>>();

export function fetchGuidePageContent(
  serviceKey: string,
  pageKey: string
): Promise<Record<string, string>> {
  const cacheKey = `${serviceKey}::${pageKey}`;
  if (!pageCache.has(cacheKey)) {
    const promise = fetch(
      `${GUIDE_API_BASE}/contents?serviceKey=${encodeURIComponent(serviceKey)}&pageKey=${encodeURIComponent(pageKey)}`
    )
      .then((r) => r.json())
      .then((data) => (data?.data?.sections ?? {}) as Record<string, string>)
      .catch(() => ({} as Record<string, string>));
    pageCache.set(cacheKey, promise);
  }
  return pageCache.get(cacheKey)!;
}

export function clearGuidePageCache(serviceKey: string, pageKey: string): void {
  pageCache.delete(`${serviceKey}::${pageKey}`);
}

export async function saveGuideContent(
  serviceKey: string,
  pageKey: string,
  sectionKey: string,
  content: string
): Promise<void> {
  const token = getAccessToken();
  const resp = await fetch(`${GUIDE_API_BASE}/contents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ serviceKey, pageKey, sectionKey, content }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error ?? '저장에 실패했습니다.');
  }
  // 저장 후 캐시 무효화
  clearGuidePageCache(serviceKey, pageKey);
}
