/**
 * CMS View Resolver
 *
 * Phase 3 Stabilization: CMS View → Frontend 연결 표준 경로
 *
 * === 이 유틸의 목적 ===
 * CMS View를 사용하고 싶은 경우의 "공식적이고 최소한의 연결 경로" 제공
 *
 * === 사용 원칙 ===
 * - 강제 사용 아님 (opt-in)
 * - Hook 강요 없음
 * - 단순 유틸/helper 수준
 * - 프론트엔드가 이 결과를 Design Core 컴포넌트에 전달
 *
 * === 사용 예시 ===
 * ```typescript
 * import { resolveCmsView } from '@o4o/cms-core';
 *
 * // 1. View 해석
 * const resolution = await resolveCmsView('product-list');
 *
 * // 2. Design Core 컴포넌트에 전달
 * <ProductList
 *   query={resolution.dataQuery}
 *   layout={resolution.layout}
 *   density={resolution.meta.density}
 * />
 * ```
 *
 * @package @o4o/cms-core
 * @since Phase 3
 */

import type {
  CmsViewResponse,
  CmsViewResolution,
  CmsViewResolverOptions,
  CmsViewQuery,
  CmsViewMeta,
  CmsViewLayout,
  CmsViewFilters,
  CmsViewType,
} from './frontend-types.js';

/**
 * CMS View 해석 유틸
 *
 * View ID 또는 slug로 CMS View를 조회하고,
 * 프론트엔드가 사용하기 쉬운 형태로 변환합니다.
 *
 * @param viewIdOrSlug - View ID(UUID) 또는 slug
 * @param options - 옵션 (API URL, 인증 등)
 * @returns View 해석 결과
 *
 * @example
 * ```typescript
 * // slug로 조회
 * const resolution = await resolveCmsView('product-list');
 *
 * // ID로 조회
 * const resolution = await resolveCmsView('550e8400-e29b-41d4-a716-446655440000');
 *
 * // 옵션 지정
 * const resolution = await resolveCmsView('product-list', {
 *   apiBaseUrl: 'https://api.example.com',
 *   authToken: 'Bearer xxx'
 * });
 * ```
 */
export async function resolveCmsView(
  viewIdOrSlug: string,
  options?: CmsViewResolverOptions
): Promise<CmsViewResolution> {
  const apiBaseUrl = options?.apiBaseUrl || getApiBaseUrl();

  // UUID 형태인지 확인
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(viewIdOrSlug);

  const endpoint = isUuid
    ? `${apiBaseUrl}/cms/views/${viewIdOrSlug}`
    : `${apiBaseUrl}/cms/views/slug/${viewIdOrSlug}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options?.authToken) {
    headers['Authorization'] = options.authToken;
  }

  const response = await fetch(endpoint, { headers });

  if (!response.ok) {
    throw new CmsViewResolverError(
      `Failed to resolve CMS View: ${response.status} ${response.statusText}`,
      viewIdOrSlug
    );
  }

  const view = (await response.json()) as CmsViewResponse;

  return buildResolution(view);
}

/**
 * CMS View 목록 조회
 *
 * @param filter - 필터 조건
 * @param options - 옵션
 * @returns View 목록
 */
export async function listCmsViews(
  filter?: {
    cptType?: string;
    type?: CmsViewType;
    isActive?: boolean;
  },
  options?: CmsViewResolverOptions
): Promise<CmsViewResponse[]> {
  const apiBaseUrl = options?.apiBaseUrl || getApiBaseUrl();

  const params = new URLSearchParams();
  if (filter?.cptType) params.append('cptType', filter.cptType);
  if (filter?.type) params.append('type', filter.type);
  if (filter?.isActive !== undefined) params.append('isActive', String(filter.isActive));

  const queryString = params.toString();
  const endpoint = `${apiBaseUrl}/cms/views${queryString ? `?${queryString}` : ''}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options?.authToken) {
    headers['Authorization'] = options.authToken;
  }

  const response = await fetch(endpoint, { headers });

  if (!response.ok) {
    throw new CmsViewResolverError(
      `Failed to list CMS Views: ${response.status} ${response.statusText}`,
      'list'
    );
  }

  return (await response.json()) as CmsViewResponse[];
}

/**
 * View 응답을 Resolution 객체로 변환
 *
 * 이 함수는 View 데이터를 프론트엔드가 사용하기 쉬운 형태로 정규화합니다.
 */
function buildResolution(view: CmsViewResponse): CmsViewResolution {
  // 쿼리 정규화 (기본값 적용)
  const dataQuery: CmsViewQuery = {
    orderBy: view.query?.orderBy || 'createdAt',
    order: view.query?.order || 'desc',
    limit: view.query?.limit || 20,
    where: view.query?.where || {},
    include: view.query?.include || [],
  };

  // 메타데이터 정규화 (기본값 적용)
  const meta: CmsViewMeta = {
    preferredSection: view.metadata?.preferredSection,
    density: view.metadata?.density || 'standard',
    actions: view.metadata?.actions || [],
    serviceGroup: view.metadata?.serviceGroup,
    custom: view.metadata?.custom || {},
  };

  // 레이아웃 정규화
  const layout: CmsViewLayout = {
    type: view.layout?.type || 'default',
    columns: view.layout?.columns,
    sidebarPosition: view.layout?.sidebarPosition,
    options: view.layout?.options || {},
  };

  // 필터 정규화
  const filters: CmsViewFilters = {
    available: view.filters?.available || [],
    defaults: view.filters?.defaults || {},
    searchable: view.filters?.searchable ?? true,
    searchFields: view.filters?.searchFields || [],
  };

  return {
    view,
    dataQuery,
    meta,
    viewType: (view.type || 'list') as CmsViewType,
    layout,
    filters,
  };
}

/**
 * API Base URL 가져오기
 *
 * 환경에 따라 적절한 API URL을 반환합니다.
 */
function getApiBaseUrl(): string {
  // 브라우저 환경
  if (typeof window !== 'undefined') {
    // Vite 환경변수
    if ((import.meta as any)?.env?.VITE_API_URL) {
      return (import.meta as any).env.VITE_API_URL;
    }
    // 기본 fallback
    return window.location.origin + '/api';
  }

  // Node.js 환경
  if (typeof process !== 'undefined' && process.env) {
    return process.env.API_URL || 'http://localhost:3001/api';
  }

  return '/api';
}

/**
 * CMS View Resolver 에러
 */
export class CmsViewResolverError extends Error {
  constructor(
    message: string,
    public readonly viewIdOrSlug: string
  ) {
    super(message);
    this.name = 'CmsViewResolverError';
  }
}

/**
 * View 해석 결과에서 빈 기본값 생성
 *
 * CMS View가 없거나 로드 실패 시 사용할 수 있는 기본값
 */
export function getEmptyResolution(): CmsViewResolution {
  return {
    view: {
      id: '',
      organizationId: '',
      name: '',
      slug: '',
      type: 'list',
      description: null,
      templateId: null,
      cptType: null,
      query: {},
      layout: {},
      filters: {},
      metadata: {},
      isActive: true,
      sortOrder: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    dataQuery: {
      orderBy: 'createdAt',
      order: 'desc',
      limit: 20,
      where: {},
      include: [],
    },
    meta: {
      density: 'standard',
      actions: [],
    },
    viewType: 'list',
    layout: {
      type: 'default',
    },
    filters: {
      available: [],
      defaults: {},
      searchable: true,
      searchFields: [],
    },
  };
}
