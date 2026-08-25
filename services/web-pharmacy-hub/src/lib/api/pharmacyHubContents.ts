/**
 * Pharmacy-Hub 회원 커뮤니티 콘텐츠 API 클라이언트
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §6 (#20·#21·#22·#23)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * §6 최종 판정 = MISSING_ADOPTION (INTENTIONAL_DIFFERENCE 아님)
 *
 *   KPA   `contentRouter.post('/', authenticate, …)`
 *   GP    `router.post('/', authenticate, write.create)`
 *   KCos  `router.post('/', authenticate, write.create)`
 *
 *   → 회원 콘텐츠 작성은 3개 원장 서비스 **공통의 회원 capability** 이며 operator role 을
 *     요구하지 않는다. 제품 정책(`O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1` — 일반 약사
 *     회원은 membership active 만으로 커뮤니티·콘텐츠를 이용한다)과도 어긋나지 않는다.
 *     따라서 PH 미보유는 의도된 차이가 아니라 미채택이었다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 원장 (신규 table 0 / migration 0 / schema 변경 0)
 *
 *   공통 `cms_contents` · serviceKey='pharmacy-hub' · type='knowledge'
 *   · authorRole='community' · metadata.subType='content'
 *
 *   `pharmacy_hub_contents` 를 만들지 않는다 (§6 제약).
 *   자료실 축(`metadata.subType='resource'`)과 같은 원장 안에서 subType 으로 갈린다 —
 *   KPA 가 `kpa_contents.sub_type` 으로 두 축을 나누는 것과 동일한 구조다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 상태 축 — 존재하지 않는 전이·CTA 를 노출하지 않는다 (§3 금지 패턴)
 *
 *   서버 정본 `CMS_ALLOWED_TRANSITIONS`:
 *     draft → pending|archived · pending → published|draft · published → archived
 *   회원 self-transition(서버 capability 가 강제하는 부분집합):
 *     draft → pending   검토 요청
 *     pending → draft   요청 취소
 *     draft|published → archived  삭제(보관)
 *
 *   회원은 스스로 published 로 만들 수 없다 — 게시는 운영자 검토 축이다.
 *   cms_contents 에는 hard/soft delete API 가 없으므로 "삭제"는 archived 전이로 구현한다.
 *   (없는 DELETE 엔드포인트를 호출하는 CTA 를 만들지 않는다.)
 *
 * ⚠️ 조회 실패를 빈 목록으로 삼키지 않는다 — 실패는 고정 코드로 throw 한다.
 */
import { api } from '../apiClient';
import type { CmsContentItem, CmsContentListResult } from './pharmacyHubResources';

const SERVICE_KEY = 'pharmacy-hub';
const BASE = '/cms/contents';
/** 공통 CMS 의 지식 콘텐츠 type. cms-core `ContentType` 은 동결이라 신규 type 을 만들지 않는다. */
const CONTENT_TYPE = 'knowledge';
/** 원장 하위 축 — 자료실(`resource`)과 구분되는 회원 커뮤니티 콘텐츠 축. */
const CONTENT_SUB_TYPE = 'content';

export type { CmsContentItem, CmsContentListResult };

function unwrap<T>(body: any, code: string): T {
  if (!body?.success) throw new Error(body?.error?.code || body?.error || code);
  return body.data as T;
}

export interface ListContentsParams {
  limit: number;
  offset: number;
  search?: string;
  /** true 면 본인이 작성한 행만 (초안·검토중 포함). 서버가 createdBy 로 좁힌다. */
  mine?: boolean;
  status?: string;
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
        subType: CONTENT_SUB_TYPE,
        limit: params.limit,
        offset: params.offset,
        ...(params.mine ? { mine: 'true' } : { status: params.status ?? 'published' }),
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
    const res = await api.get(`${BASE}/${encodeURIComponent(id)}`, {
      params: { serviceKey: SERVICE_KEY },
    });
    body = res.data;
  } catch {
    throw new Error('PH_CONTENT_DETAIL_FAILED');
  }
  const item = unwrap<CmsContentItem>(body, 'PH_CONTENT_DETAIL_FAILED');
  // 방어: 서비스 경계를 클라이언트에서도 재확인한다 (서버가 이미 404 로 막는다).
  if (item?.serviceKey && item.serviceKey !== SERVICE_KEY) {
    throw new Error('PH_CONTENT_SERVICE_MISMATCH');
  }
  return item;
}

export interface ContentWriteInput {
  title: string;
  summary?: string;
  body?: string;
}

/** 신규 콘텐츠. 서버가 authorRole='community' · status='draft' 로 고정 생성한다. */
export async function createPharmacyHubContent(input: ContentWriteInput): Promise<CmsContentItem> {
  let resBody: any;
  try {
    const res = await api.post(BASE, {
      serviceKey: SERVICE_KEY,
      type: CONTENT_TYPE,
      subType: CONTENT_SUB_TYPE,
      title: input.title,
      summary: input.summary || null,
      body: input.body || null,
    });
    resBody = res.data;
  } catch {
    throw new Error('PH_CONTENT_CREATE_FAILED');
  }
  return unwrap<CmsContentItem>(resBody, 'PH_CONTENT_CREATE_FAILED');
}

/** 본문 수정. 서버는 작성자 본인의 draft/pending 만 허용한다. */
export async function updatePharmacyHubContent(
  id: string,
  input: ContentWriteInput,
): Promise<CmsContentItem> {
  let resBody: any;
  try {
    const res = await api.put(`${BASE}/${encodeURIComponent(id)}`, {
      title: input.title,
      summary: input.summary || null,
      body: input.body || null,
    });
    resBody = res.data;
  } catch {
    throw new Error('PH_CONTENT_UPDATE_FAILED');
  }
  return unwrap<CmsContentItem>(resBody, 'PH_CONTENT_UPDATE_FAILED');
}

async function transition(id: string, status: string, failCode: string): Promise<CmsContentItem> {
  let resBody: any;
  try {
    const res = await api.patch(`${BASE}/${encodeURIComponent(id)}/status`, { status });
    resBody = res.data;
  } catch {
    throw new Error(failCode);
  }
  return unwrap<CmsContentItem>(resBody, failCode);
}

/** 검토 요청 (draft → pending). 게시는 운영자 축이 결정한다. */
export const submitPharmacyHubContent = (id: string) =>
  transition(id, 'pending', 'PH_CONTENT_SUBMIT_FAILED');

/** 요청 취소 (pending → draft). */
export const withdrawPharmacyHubContent = (id: string) =>
  transition(id, 'draft', 'PH_CONTENT_WITHDRAW_FAILED');

/** 삭제 (draft|published → archived). cms_contents 에 delete API 가 없어 보관 전이로 구현한다. */
export const archivePharmacyHubContent = (id: string) =>
  transition(id, 'archived', 'PH_CONTENT_ARCHIVE_FAILED');

// ─── 표시 모델 매핑 ──────────────────────────────────────────────────────────

/** 공통 CMS 상태 → 회원 화면 배지 문구. 없는 상태를 지어내지 않는다. */
export const PH_CONTENT_STATUS_LABEL: Record<string, string> = {
  draft: '초안',
  pending: '검토중',
  published: '공개',
  archived: '보관',
};

/** 작성자 본인이 지금 수행할 수 있는 전이 (서버 capability 의 화면측 거울). */
export function phContentSelfActions(status: string): Array<'submit' | 'withdraw' | 'archive' | 'edit'> {
  switch (status) {
    case 'draft':
      return ['edit', 'submit', 'archive'];
    case 'pending':
      return ['edit', 'withdraw'];
    case 'published':
      return ['archive'];
    default:
      return [];
  }
}

// ─── 운영자 검토 경로 (WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §4, audit #93) ───
//
// 회원이 '검토 요청'(draft → pending) 을 눌러도 **검토하는 화면이 없으면 게시가 영원히 일어나지
// 않는다** — 신청 큐에 유입만 있고 처리가 없는 dead flow 다. 자료실(`subType='resource'`)과
// 같은 공통 console 을 소비하고, 축은 subType 으로만 갈린다 (console 사본 0 / 신규 backend 0).

/** 운영자 목록. status 를 주면 해당 상태만, 없으면 전체 상태를 본다(초안·검토 대기 포함). */
export async function listPharmacyHubContentsForOperator(params: {
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
        type: CONTENT_TYPE,
        subType: CONTENT_SUB_TYPE,
        limit: params.limit,
        offset: params.offset,
        ...(params.status ? { status: params.status } : {}),
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

/** 운영자 상태 전이. 허용 전이는 서버(CMS_ALLOWED_TRANSITIONS)가 정본이다. */
export const setPharmacyHubContentStatus = (id: string, status: string) =>
  transition(id, status, 'PH_CONTENT_STATUS_FAILED');

/** 운영자 등록 — 회원 경로와 달리 metadata 로 subType 을 남긴다(운영자 분기 저장 형태). */
export async function createPharmacyHubContentAsOperator(
  input: ContentWriteInput,
): Promise<CmsContentItem> {
  let resBody: any;
  try {
    const res = await api.post(BASE, {
      serviceKey: SERVICE_KEY,
      type: CONTENT_TYPE,
      subType: CONTENT_SUB_TYPE,
      metadata: { subType: CONTENT_SUB_TYPE },
      title: input.title,
      summary: input.summary || null,
      body: input.body || null,
    });
    resBody = res.data;
  } catch {
    throw new Error('PH_CONTENT_CREATE_FAILED');
  }
  return unwrap<CmsContentItem>(resBody, 'PH_CONTENT_CREATE_FAILED');
}
