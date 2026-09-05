/**
 * Pharmacy-Hub 뉴스 API 클라이언트
 *
 * WO-O4O-PHARMACYHUB-HOME-NEWS-AND-USAGE-GUIDE-REALIGNMENT-V1 §5
 *
 * 판정 = A (기존 공통 원장 재사용). 신규 table 0 / migration 0 / 신규 backend API 0.
 *
 * 계약 (이미 마운트된 공통 news controller 를 그대로 소비한다):
 *   GET /api/v1/pharmacy-hub/news?type=news   공개 목록 (published only · optionalAuth)
 *   GET /api/v1/pharmacy-hub/news/:id         공개 상세 (optionalAuth)
 *
 * 원장은 공통 `cms_contents` (serviceKey='pharmacy-hub', type='news') 다.
 * 등록 경로도 이미 있다 — 운영자 `/operator/content`(공통 CmsContentManager) 가
 * 같은 원장에 notice/news/event 를 쓴다. 뉴스를 위해 PH 전용 CMS 를 만들지 않는다.
 *
 * 회원 콘텐츠(`type='knowledge'` · metadata.subType='content')와는 type 축으로 갈린다 —
 * 같은 물리 테이블이지만 서로의 목록에 섞이지 않는다.
 *
 * ⚠️ 조회 실패를 빈 목록으로 삼키지 않는다. 실패는 고정 코드로 throw 하고
 *    "정상 0건" 만 빈 상태로 통과시킨다 (O4O load-error 계약).
 */
import { api } from '../apiClient';

/** 공통 news controller 의 ALLOWED_TYPES 중 뉴스 축. 공지(notice)는 포럼 pinned 가 canonical 이다. */
const NEWS_TYPE = 'news';
const BASE = '/pharmacy-hub/news';

export interface PharmacyHubNewsItem {
  id: string;
  type: string;
  title: string;
  summary?: string | null;
  imageUrl?: string | null;
  /** 운영자가 지정한 외부 원문 링크 (선택). */
  linkUrl?: string | null;
  linkText?: string | null;
  isPinned?: boolean;
  publishedAt?: string | null;
  createdAt?: string | null;
  viewCount?: number;
  /** 상세 조회에서만 채워진다. */
  body?: string | null;
}

export interface PharmacyHubNewsListResult {
  items: PharmacyHubNewsItem[];
  total: number;
}

export async function listPharmacyHubNews(params: {
  page?: number;
  limit: number;
}): Promise<PharmacyHubNewsListResult> {
  let body: any;
  try {
    const res = await api.get(BASE, {
      params: { type: NEWS_TYPE, sort: 'latest', page: params.page ?? 1, limit: params.limit },
    });
    body = res.data;
  } catch {
    throw new Error('PH_NEWS_LIST_FAILED');
  }
  if (!body?.success) throw new Error('PH_NEWS_LIST_FAILED');
  const items: PharmacyHubNewsItem[] = body.data ?? [];
  return { items, total: body?.pagination?.total ?? items.length };
}

export async function getPharmacyHubNews(id: string): Promise<PharmacyHubNewsItem | null> {
  let body: any;
  try {
    const res = await api.get(`${BASE}/${encodeURIComponent(id)}`);
    body = res.data;
  } catch (error: any) {
    // 404 는 "없음"이고 그 외는 조회 실패다 — 둘을 같은 화면으로 뭉개지 않는다.
    if (error?.response?.status === 404) return null;
    throw new Error('PH_NEWS_DETAIL_FAILED');
  }
  if (!body?.success) throw new Error('PH_NEWS_DETAIL_FAILED');
  return (body.data as PharmacyHubNewsItem) ?? null;
}

/** 목록·홈 카드 공통 날짜 라벨. publishedAt 우선(게시 시점), 없으면 생성 시점. */
export function pharmacyHubNewsDate(item: PharmacyHubNewsItem): string {
  return item.publishedAt ?? item.createdAt ?? '';
}
