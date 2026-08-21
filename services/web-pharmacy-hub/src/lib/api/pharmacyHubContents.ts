/**
 * Pharmacy-Hub 회원 콘텐츠 API 클라이언트
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1
 *
 * 계약 (backend 무변경 — 기존 공통 CMS 조회 API 를 그대로 소비한다):
 *   GET /api/v1/cms/contents?serviceKey=pharmacy-hub&type=content
 *   GET /api/v1/cms/contents/:id
 *
 * 원장은 공통 `cms_contents` 다 — **신규 table 0 / migration 0 / 신규 backend API 0**.
 * 서비스 격리는 `cms_contents.serviceKey` 가 담당한다.
 *
 * 선행 판정 승계 (WO-O4O-PHARMACYHUB-COMMUNITY-CONTENT-RESOURCE-TABLE-AND-ADOPTION-V1 §8):
 *   `pharmacy_hub_contents` 신규 테이블을 만들지 않는다. 원장은 하나이고
 *   화면 구분자는 `cms_contents.type` 이다 — `resource`(받는 것) vs `content`(읽는 것).
 *
 * ⚠️ 회원 **작성**(create/edit)은 이 클라이언트에 없다. 공통 CMS 쓰기 경로
 *    (`cms-content-mutation.handler.ts` `authorizeCmsMutation`)는
 *    `platform:super_admin` 또는 `{serviceKey}:admin|operator` 만 인가한다.
 *    일반 회원 작성은 그 인가 계약을 바꿔야 하므로(전 서비스 공통 영향) 여기서 다루지 않는다.
 *
 * ⚠️ 조회 실패를 빈 목록으로 삼키지 않는다. 실패는 고정 코드로 throw 하고
 *    "정상 0건" 만 빈 상태로 통과시킨다 (O4O load-error 계약).
 */
import { api } from '../apiClient';
import type { CmsContentItem, CmsContentListResult } from './pharmacyHubResources';

/** cms_contents 의 서비스 경계 값. URL·본문 어디서도 다른 서비스 키를 쓰지 않는다. */
const SERVICE_KEY = 'pharmacy-hub';
const BASE = '/cms/contents';

/** 콘텐츠(읽는 것). 자료(받는 것 = type='resource')와 섞지 않는다. */
const CONTENT_TYPE = 'content';

function unwrap<T>(body: any, code: string): T {
  if (!body?.success) {
    throw new Error(body?.error || code);
  }
  return body.data as T;
}

export interface ListContentsParams {
  limit: number;
  offset: number;
  search?: string;
}

export async function listPharmacyHubContents(
  params: ListContentsParams,
): Promise<CmsContentListResult> {
  let body: any;
  try {
    const res = await api.get(BASE, {
      params: {
        serviceKey: SERVICE_KEY,
        type: CONTENT_TYPE,
        status: 'published',
        limit: params.limit,
        offset: params.offset,
        ...(params.search?.trim() ? { search: params.search.trim() } : {}),
      },
    });
    body = res.data;
  } catch {
    throw new Error('PH_CONTENT_LIST_FAILED');
  }
  const items = unwrap<CmsContentItem[]>(body, 'PH_CONTENT_LIST_FAILED') ?? [];
  return { items, total: body?.pagination?.total ?? items.length };
}

export async function getPharmacyHubContent(id: string): Promise<CmsContentItem> {
  let body: any;
  try {
    const res = await api.get(`${BASE}/${encodeURIComponent(id)}`);
    body = res.data;
  } catch {
    throw new Error('PH_CONTENT_DETAIL_FAILED');
  }
  const item = unwrap<CmsContentItem>(body, 'PH_CONTENT_DETAIL_FAILED');
  // 방어: 공통 API 는 id 단독 조회를 허용하므로 서비스 경계를 클라이언트에서도 재확인한다.
  if (item?.serviceKey && item.serviceKey !== SERVICE_KEY) {
    throw new Error('PH_CONTENT_SERVICE_MISMATCH');
  }
  return item;
}

export type { CmsContentItem, CmsContentListResult };
