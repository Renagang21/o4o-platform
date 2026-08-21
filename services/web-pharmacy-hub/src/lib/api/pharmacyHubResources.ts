/**
 * Pharmacy-Hub 회원 자료실 API 클라이언트
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-CONTENT-RESOURCE-TABLE-AND-ADOPTION-V1
 *
 * 계약 (backend 무변경 — 기존 공통 CMS 조회 API 를 그대로 소비한다 §14 tier 1):
 *   GET /api/v1/cms/contents?serviceKey=pharmacy-hub&type=resource
 *   GET /api/v1/cms/contents/:id
 *
 * 원장은 공통 `cms_contents` 다 — **신규 table 0 / migration 0 / 신규 backend API 0**.
 * 서비스 격리는 `cms_contents.serviceKey` 컬럼이 담당한다 (§7).
 * 쓰기 경로도 공통이며 `pharmacy-hub:operator|admin` 이 이미 인가된다
 * (routes/cms-content/cms-content-mutation.handler.ts `authorizeCmsMutation`) —
 * 권한 모델 변경 없이 운영자가 자료를 등록할 수 있다.
 *
 * ⚠️ 조회 실패를 빈 목록으로 삼키지 않는다. 실패는 고정 코드로 throw 하고
 *    "정상 0건" 만 빈 상태로 통과시킨다 (O4O load-error 계약).
 */
import { api } from '../apiClient';

/** cms_contents 의 서비스 경계 값. URL·본문 어디서도 다른 서비스 키를 쓰지 않는다. */
const SERVICE_KEY = 'pharmacy-hub';
const BASE = '/cms/contents';

/** 자료실이 다루는 type. 콘텐츠(읽는 것)와 자료(받는 것)를 섞지 않는다 (§10). */
const RESOURCE_TYPE = 'resource';

export interface CmsAttachment {
  url: string;
  name: string;
  size?: number;
  mimeType?: string;
}

export interface CmsContentItem {
  id: string;
  serviceKey: string;
  type: string;
  title: string;
  summary?: string | null;
  body?: string | null;
  attachments?: CmsAttachment[] | null;
  linkUrl?: string | null;
  linkText?: string | null;
  status: string;
  publishedAt?: string | null;
  createdAt: string;
  authorRole?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface CmsContentListResult {
  items: CmsContentItem[];
  total: number;
}

function unwrap<T>(body: any, code: string): T {
  if (!body?.success) {
    throw new Error(body?.error || code);
  }
  return body.data as T;
}

export interface ListResourcesParams {
  limit: number;
  offset: number;
  search?: string;
}

export async function listPharmacyHubResources(
  params: ListResourcesParams,
): Promise<CmsContentListResult> {
  let body: any;
  try {
    const res = await api.get(BASE, {
      params: {
        serviceKey: SERVICE_KEY,
        type: RESOURCE_TYPE,
        status: 'published',
        limit: params.limit,
        offset: params.offset,
        ...(params.search?.trim() ? { search: params.search.trim() } : {}),
      },
    });
    body = res.data;
  } catch {
    throw new Error('PH_RESOURCE_LIST_FAILED');
  }
  const items = unwrap<CmsContentItem[]>(body, 'PH_RESOURCE_LIST_FAILED') ?? [];
  return { items, total: body?.pagination?.total ?? items.length };
}

export async function getPharmacyHubResource(id: string): Promise<CmsContentItem> {
  let body: any;
  try {
    const res = await api.get(`${BASE}/${encodeURIComponent(id)}`);
    body = res.data;
  } catch {
    throw new Error('PH_RESOURCE_DETAIL_FAILED');
  }
  const item = unwrap<CmsContentItem>(body, 'PH_RESOURCE_DETAIL_FAILED');
  // 방어: 공통 API 는 id 단독 조회를 허용하므로 서비스 경계를 클라이언트에서도 재확인한다.
  if (item?.serviceKey && item.serviceKey !== SERVICE_KEY) {
    throw new Error('PH_RESOURCE_SERVICE_MISMATCH');
  }
  return item;
}
