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

/**
 * 원장 하위 축 (`metadata.subType`).
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §6:
 *   KPA 는 한 원장(`kpa_contents`)을 `sub_type` 으로 **콘텐츠 / 자료실** 두 축으로 나눈다.
 *   PH 원장인 공통 `cms_contents` 에는 그 컬럼이 없으므로 기존 `metadata` jsonb 에 같은 축을 둔다
 *   (신규 컬럼·migration 0). 공통 read 는 `subType` 쿼리 파라미터로 이 축을 필터한다.
 *
 *   프로덕션 실측상 pharmacy-hub 의 knowledge 행은 0건이라 소급 대상 데이터가 없다.
 */
const RESOURCE_SUB_TYPE = 'resource';

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
  /** 작성자 ID. 상세는 `createdBy`, 목록은 ContentMeta `producerRef` 로 온다. */
  createdBy?: string | null;
  producerRef?: string | null;
  /**
   * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 (audit #28):
   *   공통 CMS 가 engagement 축을 공급할 때만 존재한다. 서버가 조회에 실패하면
   *   **필드 자체가 생략**되므로 undefined 를 0 으로 바꾸지 않는다.
   */
  viewCount?: number;
  recommendCount?: number;
  isRecommendedByMe?: boolean;
}

/** 목록/상세 어느 쪽 응답이든 작성자 ID 를 하나로 읽는다. */
export function cmsAuthorId(c: CmsContentItem | null | undefined): string | null {
  return c?.createdBy ?? c?.producerRef ?? null;
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
        subType: RESOURCE_SUB_TYPE,
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
        subType: RESOURCE_SUB_TYPE,
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
      metadata: { subType: RESOURCE_SUB_TYPE },
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

// ─── 회원 쓰기 경로 (WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1, audit #27) ───
//
// KPA 는 `/resources/new` · `/resources/:id/edit` 로 **회원**이 자료를 등록·수정한다.
// PH 도 같은 capability 를 갖는다 — 원장은 그대로 공통 `cms_contents`,
// `authorRole='community'` · `metadata.subType='resource'`. 신규 table 0 / migration 0.
//
// 위의 운영자 함수들과 갈리는 축은 **본문 subType 전달 방식** 하나다:
//   운영자 경로 : metadata.subType   (mutation handler 가 metadata 를 그대로 저장)
//   회원 경로   : top-level subType  (handler 가 capability 화이트리스트로 정규화)
// 서버가 요청자 권한에 따라 두 경로 중 하나를 타므로 **양쪽 모두** 실어 보낸다 —
// 어느 분기로 저장되든 자료실 축(`subType='resource'`)이 유실되지 않는다.

/** 회원 자료 등록. 서버가 authorRole='community' · status='draft' 로 고정 생성한다. */
export async function createPharmacyHubMemberResource(
  input: ResourceWriteInput,
): Promise<CmsContentItem> {
  let resBody: any;
  try {
    const res = await api.post(BASE, {
      serviceKey: SERVICE_KEY,
      type: RESOURCE_TYPE,
      subType: RESOURCE_SUB_TYPE,
      metadata: { subType: RESOURCE_SUB_TYPE },
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

/** 검토 요청 (draft → pending). 회원은 스스로 게시하지 못한다. */
export const submitPharmacyHubResource = (id: string) =>
  setPharmacyHubResourceStatus(id, 'pending');

/**
 * 회원 축의 "삭제" (draft|published → archived).
 * 공통 `cms_contents` 에는 DELETE 엔드포인트가 없다 — 없는 CTA 를 만들지 않고
 * 실제로 존재하는 보관 전이로 구현한다 (§3 금지 패턴).
 */
export const archivePharmacyHubResource = (id: string) =>
  setPharmacyHubResourceStatus(id, 'archived');
