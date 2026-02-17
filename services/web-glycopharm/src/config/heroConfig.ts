/**
 * Hero Slides Configuration
 *
 * Work Order: WO-GP-HOME-RESTRUCTURE-V1 (Phase 2)
 *
 * JSON config 분리 - CMS 연동 준비 상태
 * 향후 API로 대체 시 이 파일만 수정하면 됩니다.
 *
 * 슬라이드 원칙:
 * 1. 정체성 선언 - "혈당관리 전문 약국 운영 플랫폼"
 * 2. 데이터 가치 - "데이터 기반 운영 프레임"
 * 3. 참여 기회 - "Trial/콘텐츠 연결"
 * 4. 신뢰 요소 - "협력 네트워크"
 */

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  bgGradient: string;
  cta?: {
    label: string;
    link: string;
    variant: 'primary' | 'secondary';
    external?: boolean; // 외부 링크 여부
  };
}

/**
 * Hero Slides - 정체성 선언형 메시지
 *
 * 순서:
 * 1. 플랫폼 정체성 (메인)
 * 2. 데이터/GlucoseView 확장 경로
 * 3. Market Trial 참여 기회
 * 4. 협력 네트워크/신뢰
 */
export const heroSlides: HeroSlide[] = [
  {
    id: 'identity',
    title: '혈당관리 전문 약국\n운영 플랫폼',
    // WO-GLOBAL-ALPHA-STATUS-HERO-V080: 운영형 알파 상태 표시
    subtitle: '약국 운영의 차별화를 만드는 도구와 콘텐츠를 제공합니다 · 운영형 알파 v0.8.0',
    bgGradient: 'from-primary-600 via-primary-700 to-primary-800',
    cta: {
      label: '운영 프레임 알아보기',
      link: '#operation-frame',
      variant: 'primary',
    },
  },
  {
    id: 'data-frame',
    title: '데이터 기반\n약국 운영 프레임',
    subtitle: 'CGM 데이터로 환자 맞춤 상담, 신뢰와 재방문을 만듭니다',
    bgGradient: 'from-blue-600 via-blue-700 to-indigo-800',
    cta: {
      label: 'GlucoseView 연동 알아보기',
      link: 'https://glucoseview.co.kr',
      variant: 'primary',
      external: true,
    },
  },
  {
    id: 'trial',
    title: '신제품·Trial·콘텐츠를\n매출로 연결',
    subtitle: '공급사의 신제품을 먼저 체험하고 수익 기회를 만드세요',
    bgGradient: 'from-green-600 via-green-700 to-emerald-800',
    cta: {
      label: 'Market Trial 보기',
      link: '/store/market-trial',
      variant: 'primary',
    },
  },
  {
    id: 'trust',
    title: '(사)한국당뇨협회와\n함께합니다',
    subtitle: '프랜차이즈 아닌 자율 참여, 신뢰할 수 있는 네트워크',
    bgGradient: 'from-slate-700 via-slate-800 to-slate-900',
    cta: {
      label: '협력 네트워크',
      link: '#partners',
      variant: 'secondary',
    },
  },
];

/**
 * Hero Settings
 */
export const heroSettings = {
  /** 슬라이드 자동 전환 간격 (ms) */
  autoPlayInterval: 6000,

  /** 슬라이드 전환 애니메이션 시간 (ms) */
  transitionDuration: 700,

  /** 슬라이드 높이 */
  height: {
    mobile: '420px',
    desktop: '480px',
  },
};

export default heroSlides;
