/**
 * Neture 번들 하위 host 대표 화면 Hero — WO-O4O-CROSS-SERVICE-PUBLIC-DESIGN-AND-BRAND-REFRESH-V1
 *
 * supplier · funding · community 의 `/` 공개 Hero 문구(WO 확정 문구)와 accent.
 * 렌더는 공통 `O4OPublicHero`(@o4o/auth-react). SEO 메타는 seoRegistry `SUBHOST_HOME_SEO`.
 */

export interface PublicHeroCopy {
  eyebrow: string;
  title: readonly string[];
  description: readonly string[];
  accent: string;
}

export const SUPPLIER_HERO: PublicHeroCopy = {
  eyebrow: '공급자',
  title: ['제품과 콘텐츠를', '매장과 연결합니다'],
  description: ['상품 등록부터 매장 연결과 운영까지', '공급자 업무를 한곳에서 관리합니다.'],
  accent: '#2563eb',
};

export const COMMUNITY_HERO: PublicHeroCopy = {
  eyebrow: 'O4O 커뮤니티',
  title: ['현장의 경험과 정보를', '함께 나눕니다'],
  description: ['O4O 서비스 참여자들이', '실무 정보와 경험을 공유하는 공간입니다.'],
  accent: '#0f766e',
};

export const FUNDING_HERO: PublicHeroCopy = {
  eyebrow: '유통참여형 펀딩',
  title: ['제품의 가능성을', '유통 참여로 연결합니다'],
  description: ['새로운 제품과 유통 기회를', '함께 검토하고 참여합니다.'],
  accent: '#7c3aed',
};
