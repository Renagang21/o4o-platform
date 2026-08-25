/**
 * Pharmacy-Hub 공통 CMS engagement (조회수 · 추천)
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 (audit #28)
 *
 * 계약은 KPA 정본(`POST /kpa/contents/:id/{view,recommend}`)과 같고, 엔드포인트만
 * 공통 CMS 경로다 — 원장이 공통 `cms_contents` 이기 때문이다:
 *
 *   POST /api/v1/cms/contents/:id/view       → { viewCount }
 *   POST /api/v1/cms/contents/:id/recommend  → { recommendCount, isRecommendedByMe }
 *
 * 두 축의 저장소(`cms_contents."viewCount"`, `cms_content_recommendations`)는
 * migration `20260210000001` 로 이미 존재한다 — 신규 table 0 / migration 0.
 *
 * 콘텐츠(`subType='content'`)와 자료실(`subType='resource'`)이 같은 원장을 쓰므로
 * 이 모듈은 두 축이 공유한다.
 */
import { api } from '../apiClient';

const BASE = '/cms/contents';

/**
 * 조회수 +1.
 *
 * 열람 자체를 막지 않는다 — 집계 실패는 화면에 영향을 주지 않고 조용히 무시한다.
 * (본문 조회는 별도 호출이며 그 실패는 지금까지처럼 그대로 드러난다.)
 */
export async function trackPharmacyHubCmsView(id: string): Promise<void> {
  try {
    await api.post(`${BASE}/${encodeURIComponent(id)}/view`);
  } catch {
    /* 조회수 집계 실패는 열람을 막지 않는다 */
  }
}

export interface CmsRecommendResult {
  recommendCount: number;
  isRecommendedByMe: boolean;
}

/** 추천 toggle (1인 1추천). 실패는 삼키지 않는다 — 사용자가 누른 액션이다. */
export async function togglePharmacyHubCmsRecommend(id: string): Promise<CmsRecommendResult> {
  let body: any;
  try {
    const res = await api.post(`${BASE}/${encodeURIComponent(id)}/recommend`);
    body = res.data;
  } catch {
    throw new Error('PH_CMS_RECOMMEND_FAILED');
  }
  if (!body?.success) throw new Error(body?.error?.code || 'PH_CMS_RECOMMEND_FAILED');
  return {
    recommendCount: Number(body.data?.recommendCount ?? 0),
    isRecommendedByMe: body.data?.isRecommendedByMe === true,
  };
}
