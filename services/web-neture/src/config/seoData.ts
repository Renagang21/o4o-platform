/** Browser/runtime and static HTML builds share these DOM-free brand values. */
import type { PageSeoConfig } from '@o4o/shared-space-ui';
import type { SubHost } from '../lib/hostIdentity';

/** O4O 대표 문구 — index.html 정적 title / description 과 같은 값 */
export const O4O_BRAND_TITLE = 'O4O — 소규모 사업자를 위한 통합 업무 공간';
export const O4O_BRAND_DESCRIPTION = '소규모 사업자를 위한 O4O(Online for Offline) 통합 업무 공간입니다.';

/** 하위 host 대표 화면(`/`) 메타 — Hero 확정 문구와 같은 값 */
export const SUBHOST_HOME_SEO: Readonly<Record<SubHost, PageSeoConfig>> = Object.freeze({
  carepharm: {
    title: 'CarePharm — 만성질환 관리 약국 협업 모임',
    description: '만성질환 관리에 함께하는 약국들이 현장의 경험과 자료를 나누고 협업하는 공간입니다.',
    ogType: 'website',
  },
  supplier: {
    title: '공급자 — 제품과 콘텐츠를 매장과 연결합니다 | O4O',
    description: '상품 등록부터 매장 연결과 운영까지 공급자 업무를 한곳에서 관리합니다.',
    ogType: 'website',
  },
  funding: {
    title: '유통참여형 펀딩 — 제품의 가능성을 유통 참여로 연결합니다 | O4O',
    description: '새로운 제품과 유통 기회를 함께 검토하고 참여합니다.',
    ogType: 'website',
  },
  community: {
    title: 'O4O 커뮤니티 — 현장의 경험과 정보를 함께 나눕니다',
    description: 'O4O 서비스 참여자들이 실무 정보와 경험을 공유하는 공간입니다.',
    ogType: 'website',
  },
});
