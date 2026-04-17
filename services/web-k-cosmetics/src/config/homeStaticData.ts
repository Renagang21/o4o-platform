/**
 * K-Cosmetics Home Static Data
 *
 * WO-KCOS-HOME-DYNAMIC-IMPL-V1: notices → CMS API 연동 완료, 제거됨
 * WO-KCOS-HOME-DYNAMIC-IMPL-V2: nowRunningItems, partners → API 연동 완료, 제거됨
 *
 * TODO(WO-KCOS-HOME-DYNAMIC-IMPL-V3): heroSlides → cmsApi.getSlots('hero') 연동
 * TODO(WO-KCOS-HOME-DYNAMIC-IMPL-V3): quickActionCards.status.value → storeHub KPI 연동
 *   (requireAuth 필요, 로그인/비로그인 분기 처리 포함)
 */

// ── Hero Slides ───────────────────────────────────────────────────────────

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  bgGradient: string;
  cta?: { label: string; link: string; variant: 'primary' | 'secondary' };
}

export const heroSlides: HeroSlide[] = [
  {
    id: 'main',
    title: 'K-Beauty Store를 위한\n운영 플랫폼',
    subtitle: '브랜드·매장·관광객이 연결됩니다',
    bgGradient: '#1e293b',
    cta: { label: '시작하기', link: '/platform/stores', variant: 'primary' },
  },
  {
    // WO-MARKET-TRIAL-CROSS-SERVICE-ENTRY-ONLY-MIGRATION-V1: Market Trial은 Neture 통합 허브로 진입
    id: 'trial',
    title: '신상품 시범판매\nNeture 허브에서 참여하세요',
    subtitle: '브랜드의 신상품을 먼저 체험하고 피드백을 공유하세요',
    bgGradient: '#334155',
    cta: { label: 'Neture에서 시범판매 보기', link: 'https://neture.co.kr/market-trial', variant: 'primary' },
  },
  {
    id: 'tourist',
    title: '지금 12개 매장\n관광객 연결 중',
    subtitle: 'Tourist Hub를 통해 실시간 연결됩니다',
    bgGradient: '#475569',
    cta: { label: 'Tourist Hub 보기', link: '/services/tourists', variant: 'primary' },
  },
  {
    id: 'trust',
    title: '다수 매장·다수 브랜드가 함께하는\nK-Beauty 플랫폼',
    subtitle: '검증된 정품 매장만 연결합니다',
    bgGradient: '#0f172a',
  },
];

// ── Quick Action Cards ────────────────────────────────────────────────────

export interface QuickActionCard {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  link: string;
  color: string;
  status: { label: string; value: string | number };
}

/**
 * TODO(WO-KCOS-HOME-DYNAMIC-IMPL-V3):
 *   status.value를 storeHub.fetchStoreKpiSummary() 기반 실시간 데이터로 교체
 *   requireAuth 적용 필요 → 비로그인 시 '-' placeholder 유지, 로그인 시 실제 수치 표시
 */
export const quickActionCards: QuickActionCard[] = [
  {
    id: 'products',
    title: 'Products',
    subtitle: '상품 관리',
    description: '매장에 노출할 상품을 관리하세요',
    icon: '📦',
    link: '/platform/stores/products',
    color: '#e2e8f0',
    status: { label: '노출 중', value: '-' },
  },
  {
    id: 'supply',
    title: 'Supply',
    subtitle: 'B2B 공급',
    description: '검증된 공급자의 상품을 조달합니다',
    icon: '📋',
    link: '/b2b/supply',
    color: '#e2e8f0',
    status: { label: '공급', value: '사용 중' },
  },
  {
    id: 'trial',
    title: 'Market Trial',
    subtitle: '신상품 체험',
    description: '브랜드의 신상품 Trial에 참여하세요',
    icon: '🎯',
    link: '/platform/stores',
    color: '#e2e8f0',
    status: { label: '진행 중', value: '-' },
  },
  {
    id: 'tourist-hub',
    title: 'Tourist Hub',
    subtitle: '관광객 허브',
    description: '관광객·콘텐츠·매장을 연결합니다',
    icon: '🌏',
    link: '/services/tourists',
    color: '#e2e8f0',
    status: { label: '연결 중', value: '매장' },
  },
];
