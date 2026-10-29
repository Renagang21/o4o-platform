/**
 * KPA-Society SEO Registry
 *
 * WO-O4O-KPA-NETURE-SEO-REGISTRY-USEPAGESEO-V1
 *
 * path → PageSeoConfig 매핑 (exact match).
 * 미등록 경로는 KPA_SEO_DEFAULTS 로 fallback.
 *
 * 유지 규칙:
 *   - 라우트 추가 시 동시 등록
 *   - 인증 필요 경로(store, operator 등)는 등록 불필요 (robots.txt Disallow 처리)
 *   - 블로그 게시물은 useBlogSeo 가 override — 이 파일에 개별 등록 불필요
 */

import { setMeta, setCanonical } from '@o4o/shared-space-ui';
import type { PageSeoConfig, SeoRegistry } from '@o4o/shared-space-ui';
import { PHARMACY_DISPLAY_NAME, PHARMACY_ORIGIN } from './brand';
import { BUSINESS_SITE } from './businessSite';

/**
 * WO-O4O-CROSS-SERVICE-PUBLIC-DESIGN-AND-BRAND-REFRESH-V1:
 * 표시 이름 = O4O 약국, 대표 주소 = pharmacy.neture.co.kr (index.html 정적 title · description 과 같은 값).
 */
export const PHARMACY_HOME_TITLE = BUSINESS_SITE.key === 'carepharm' ? 'CarePharm — 만성질환관리 약국 협업체' : `${PHARMACY_DISPLAY_NAME} — 약국의 정보와 업무를 하나로 연결합니다`;
export const PHARMACY_HOME_DESCRIPTION = BUSINESS_SITE.key === 'carepharm' ? '만성질환 관리 자료와 현장 경험을 함께 나누고 내 약국에서 활용합니다.' : '제품 정보와 콘텐츠를 활용하고, 매장 운영과 고객 서비스를 더 편리하게 시작하세요.';

export const KPA_SEO_DEFAULTS: PageSeoConfig = {
  title: PHARMACY_HOME_TITLE,
  description: PHARMACY_HOME_DESCRIPTION,
  ogType: 'website',
};

/**
 * og:url · canonical — usePageSeo 는 og:url 을 다루지 않으므로 여기서 대표 주소 기준으로 맞춘다.
 * canonical 은 registry 에 등록된 공개 경로에만 둔다(미등록 경로는 제거 — 블로그 상세는 useBlogSeo 가 뒤에서 다시 설정).
 */
export function applyPharmacyUrlMeta(pathname: string, registry: SeoRegistry = kpaSeoRegistry): string {
  const url = `${PHARMACY_ORIGIN}${pathname}`;
  setMeta('meta[property="og:url"]', 'property', 'og:url', url);
  setCanonical(pathname in registry ? url : null);
  return url;
}

export const kpaSeoRegistry: SeoRegistry = {
  '/': {
    title: PHARMACY_HOME_TITLE,
    description: PHARMACY_HOME_DESCRIPTION,
    ogType: 'website',
  },
  // WO-O4O-PHARMACY-BUSINESS-INDEPENDENCE-V1 D7: 옛 KPA 공개 화면(/forum · /resources · /content · /guide · /about)은 삭제했다.
  '/contact': {
    title: `협업과 연결 — ${PHARMACY_DISPLAY_NAME}`,
    description: `${PHARMACY_DISPLAY_NAME} 협업 안내.`,
    ogType: 'website',
  },
};
