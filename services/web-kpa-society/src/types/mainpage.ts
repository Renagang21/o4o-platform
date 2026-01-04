/**
 * 메인화면 타입 정의
 * WO-KPA-INTRANET-MAIN-V1-FINAL
 *
 * 권한 정책:
 * - Hero 영역: 지부/분회 자율 관리
 * - 협력업체 링크: 지부 전용 관리, 분회는 노출만
 * - 약사공론 기사: API 연동 (관리자 화면 없음)
 * - 광고/강좌: 운영자 요청 반영 (관리자 화면 없음)
 */

/**
 * Hero 슬라이드 아이템
 */
export interface HeroSlide {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  backgroundColor?: string;
  linkUrl?: string;
  linkText?: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * 협력업체 링크 (지부 전용)
 */
export interface PartnerLink {
  id: string;
  name: string;
  logoUrl: string;
  linkUrl: string;
  order: number;
  isActive: boolean;
  branchId: string; // 지부 ID (분회는 관리 불가)
}

/**
 * 약사공론 기사 (API 연동)
 */
export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  thumbnailUrl?: string;
  articleUrl: string;
  publishedAt: string;
  category?: string;
}

/**
 * 광고/강좌 안내 (운영자 요청 반영)
 */
export interface PromoCard {
  id: string;
  type: 'ad' | 'course' | 'survey' | 'announcement';
  title: string;
  description?: string;
  imageUrl?: string;
  linkUrl?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
}

/**
 * 메인화면 섹션 가시성 설정
 */
export interface MainPageSectionVisibility {
  showHero: boolean;
  showPartnerLinks: boolean;
  showNews: boolean;
  showPromoCards: boolean;
  showQuickStats: boolean;
}

/**
 * 조직 타입에 따른 권한 체크
 */
export function canManageHero(orgType: string): boolean {
  // 지부, 분회 모두 자신의 Hero 관리 가능
  return orgType === 'branch' || orgType === 'division';
}

export function canManagePartnerLinks(orgType: string): boolean {
  // 지부만 협력업체 링크 관리 가능
  return orgType === 'branch';
}

/**
 * 프로모 카드 타입 라벨
 */
export const PROMO_TYPE_LABELS: Record<PromoCard['type'], string> = {
  ad: '광고',
  course: '강좌 안내',
  survey: '설문',
  announcement: '공지',
};
