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

/**
 * 자료실이 다루는 CMS type.
 *
 * WO-O4O-OPERATOR-CROSSSERVICE-CAPABILITY-ADOPTION-FINAL-AUDIT-AND-GAP-CLOSURE-V1:
 *   기존 값 `'resource'` 는 공통 CMS 계약에 존재하지 않는 type 이었다
 *   (`packages/cms-core` ContentType · `VALID_CONTENT_TYPES` 어디에도 없음).
 *   → 조회는 항상 0건이고 등록은 400 이라 자료실이 구조적으로 채워질 수 없었다.
 *   공통 CMS 의 자료실 type 은 `'knowledge'` 다
 *   (admin ContentFormModal 라벨: "자료실 (Rich Editor + 첨부파일)").
 *   프로덕션 확인 결과 pharmacy-hub 의 resource/knowledge 양쪽 모두 0건이라
 *   type 정렬로 유실되는 데이터가 없다. cms-core(동결) · schema · migration 무변경.
 */
const RESOURCE_TYPE = 'knowledge';

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
    // WO-O4O-CMS-CONTENT-DETAIL-SERVICE-SCOPE-GUARD-V1:
    //   목록과 동일하게 상세에도 serviceKey 를 보낸다. 서버가 **조회 자체를** 이 서비스로 제한하므로
    //   타 서비스 UUID 는 404 가 된다(아래 클라이언트 검사는 방어층으로 남긴다).
    const res = await api.get(`${BASE}/${encodeURIComponent(id)}`, {
      params: { serviceKey: SERVICE_KEY },
    });
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

// ─── 운영자 쓰기 경로 (WO-O4O-OPERATOR-CROSSSERVICE-CAPABILITY-ADOPTION-FINAL-AUDIT-AND-GAP-CLOSURE-V1) ───
//
// 전부 **기존 공통 CMS 엔드포인트** 다 — 신규 backend route 0 / 신규 table 0 / migration 0 /
// 권한 모델 변경 0. `pharmacy-hub:operator|admin` 은 authorizeCmsMutation 이 이미 인가한다.
//   GET   /cms/contents?serviceKey=pharmacy-hub&type=knowledge&status=...
//   POST  /cms/contents
//   PUT   /cms/contents/:id
//   PATCH /cms/contents/:id/status
//
// serviceKey 는 이 모듈의 상수만 사용한다 (write fan-out 0).

/** 운영자 목록. status 를 주면 해당 상태만, 없으면 전체 상태를 본다. */
export async function listPharmacyHubResourcesForOperator(params: {
  limit: number;
  offset: number;
  search?: string;
  status?: string;
}): Promise<CmsContentListResult> {
  let body: any;
  try {
    const res = await api.get(BASE, {
      params: {
        serviceKey: SERVICE_KEY,
        type: RESOURCE_TYPE,
        limit: params.limit,
        offset: params.offset,
        ...(params.status ? { status: params.status } : {}),
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

export interface ResourceWriteInput {
  title: string;
  summary?: string;
  body?: string;
  linkUrl?: string;
  linkText?: string;
}

/** 신규 자료 생성. backend 가 status='draft' 로 고정 생성한다. */
export async function createPharmacyHubResource(input: ResourceWriteInput): Promise<CmsContentItem> {
  let resBody: any;
  try {
    const res = await api.post(BASE, {
      serviceKey: SERVICE_KEY,
      type: RESOURCE_TYPE,
      title: input.title,
      summary: input.summary || null,
      body: input.body || null,
      linkUrl: input.linkUrl || null,
      linkText: input.linkText || null,
    });
    resBody = res.data;
  } catch {
    throw new Error('PH_RESOURCE_CREATE_FAILED');
  }
  return unwrap<CmsContentItem>(resBody, 'PH_RESOURCE_CREATE_FAILED');
}

/** 수정. serviceKey 는 보내지 않는다 — 서버가 기존 콘텐츠의 serviceKey 로 인가하며
 *  비 platform admin 의 serviceKey 변경은 403 이다. */
export async function updatePharmacyHubResource(
  id: string,
  input: ResourceWriteInput,
): Promise<CmsContentItem> {
  let resBody: any;
  try {
    const res = await api.put(`${BASE}/${encodeURIComponent(id)}`, {
      title: input.title,
      summary: input.summary || null,
      body: input.body || null,
      linkUrl: input.linkUrl || null,
      linkText: input.linkText || null,
    });
    resBody = res.data;
  } catch {
    throw new Error('PH_RESOURCE_UPDATE_FAILED');
  }
  return unwrap<CmsContentItem>(resBody, 'PH_RESOURCE_UPDATE_FAILED');
}

/** 상태 전이. 허용 전이는 서버(CMS_ALLOWED_TRANSITIONS)가 정본이다:
 *  draft → pending|archived · pending → published|draft · published → archived · archived → (없음). */
export async function setPharmacyHubResourceStatus(
  id: string,
  status: string,
): Promise<CmsContentItem> {
  let resBody: any;
  try {
    const res = await api.patch(`${BASE}/${encodeURIComponent(id)}/status`, { status });
    resBody = res.data;
  } catch {
    throw new Error('PH_RESOURCE_STATUS_FAILED');
  }
  return unwrap<CmsContentItem>(resBody, 'PH_RESOURCE_STATUS_FAILED');
}
