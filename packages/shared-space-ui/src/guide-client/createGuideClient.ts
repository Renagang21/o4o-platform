/**
 * createGuideClient — O4O 공통 guide_contents API 클라이언트
 * WO-O4O-GUIDE-CLIENT-EXTRACTION-V1
 *
 * 4개 서비스(KPA-Society / GlycoPharm / K-Cosmetics / Neture)가 동일한 구조로
 * /api/v1/guide/contents 엔드포인트에 접근하기 위한 factory.
 *
 * 각 서비스 차이점은 (a) accessToken 획득 방식, (b) base URL 정도뿐 —
 * 둘 다 옵션으로 주입한다.
 *
 * 캐시는 factory 인스턴스 내부에 유지된다 (단일 렌더 사이클 + 사용자 명시적 invalidate).
 */

export interface GuideClientOptions {
  /**
   * Base URL prefix. 미지정 시:
   *   import.meta.env.VITE_API_BASE_URL ? `${VITE_API_BASE_URL}/api/v1/guide` : '/api/v1/guide'
   * 사용 측에서 명시적으로 전달하면 그 값을 사용.
   */
  baseUrl?: string;
  /**
   * 저장(POST) 호출 시 사용할 access token.
   * 각 서비스 AuthContext의 getAccessToken을 그대로 전달.
   */
  getAccessToken?: () => string | null | undefined;
}

export interface GuideClient {
  fetchGuidePageContent(serviceKey: string, pageKey: string): Promise<Record<string, string>>;
  clearGuidePageCache(serviceKey: string, pageKey: string): void;
  saveGuideContent(
    serviceKey: string,
    pageKey: string,
    sectionKey: string,
    content: string,
  ): Promise<void>;
  /**
   * 운영자 override 제거 → 코드 기본 콘텐츠로 복귀.
   * WO-O4O-NETURE-GUIDE-SECTION-BODY-EDITOR-V1
   */
  deleteGuideContent(
    serviceKey: string,
    pageKey: string,
    sectionKey: string,
  ): Promise<void>;
}

function resolveDefaultBaseUrl(): string {
  // Vite import.meta.env 안전 접근 (SSR/Node 환경에서도 throw하지 않도록)
  const env = (typeof import.meta !== 'undefined' && (import.meta as { env?: Record<string, string | undefined> }).env) || {};
  const apiBase = env.VITE_API_BASE_URL;
  return apiBase ? `${apiBase}/api/v1/guide` : '/api/v1/guide';
}

export function createGuideClient(options: GuideClientOptions = {}): GuideClient {
  const baseUrl = options.baseUrl ?? resolveDefaultBaseUrl();
  const getAccessToken = options.getAccessToken;

  const pageCache = new Map<string, Promise<Record<string, string>>>();

  const fetchGuidePageContent: GuideClient['fetchGuidePageContent'] = (serviceKey, pageKey) => {
    const cacheKey = `${serviceKey}::${pageKey}`;
    if (!pageCache.has(cacheKey)) {
      const promise = fetch(
        `${baseUrl}/contents?serviceKey=${encodeURIComponent(serviceKey)}&pageKey=${encodeURIComponent(pageKey)}`,
      )
        .then((r) => r.json())
        .then((data) => (data?.data?.sections ?? {}) as Record<string, string>)
        .catch(() => ({} as Record<string, string>));
      pageCache.set(cacheKey, promise);
    }
    return pageCache.get(cacheKey)!;
  };

  const clearGuidePageCache: GuideClient['clearGuidePageCache'] = (serviceKey, pageKey) => {
    pageCache.delete(`${serviceKey}::${pageKey}`);
  };

  const saveGuideContent: GuideClient['saveGuideContent'] = async (
    serviceKey,
    pageKey,
    sectionKey,
    content,
  ) => {
    const token = getAccessToken?.();
    const resp = await fetch(`${baseUrl}/contents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ serviceKey, pageKey, sectionKey, content }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error((err as { error?: string })?.error ?? '저장에 실패했습니다.');
    }
    // 저장 후 캐시 무효화
    clearGuidePageCache(serviceKey, pageKey);
  };

  const deleteGuideContent: GuideClient['deleteGuideContent'] = async (
    serviceKey,
    pageKey,
    sectionKey,
  ) => {
    const token = getAccessToken?.();
    const qs = `serviceKey=${encodeURIComponent(serviceKey)}&pageKey=${encodeURIComponent(pageKey)}&sectionKey=${encodeURIComponent(sectionKey)}`;
    const resp = await fetch(`${baseUrl}/contents?${qs}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error((err as { error?: string })?.error ?? '기본값 복귀에 실패했습니다.');
    }
    // 제거 후 캐시 무효화
    clearGuidePageCache(serviceKey, pageKey);
  };

  return { fetchGuidePageContent, clearGuidePageCache, saveGuideContent, deleteGuideContent };
}
