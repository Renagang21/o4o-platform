/**
 * Slider Block Types
 * Framer Motion 기반 슬라이더 블록 타입 정의
 */

// 전환 효과 타입
export type TransitionEffect =
  | 'fade'      // 페이드 인/아웃
  | 'slide'     // 좌우 슬라이드
  | 'zoom'      // 확대/축소
  | 'flip';     // 3D 플립

// 네비게이션 위치
export type NavigationPosition =
  | 'sides'     // 좌우 사이드
  | 'bottom'    // 하단
  | 'top';      // 상단

// 페이지네이션 타입
export type PaginationType =
  | 'dots'      // 점 표시
  | 'numbers'   // 숫자 표시
  | 'progress'  // 프로그레스 바
  | 'none';     // 없음

// 슬라이더 속성
export interface SliderAttributes {
  // 레이아웃
  aspectRatio: '16:9' | '4:3' | '1:1' | 'auto';
  height?: number; // px, auto일 때만 사용

  // 전환 효과
  effect: TransitionEffect;
  transitionDuration: number; // ms (기본 300)

  // 자동재생
  autoplay: boolean;
  autoplayDelay: number; // ms (기본 3000)
  pauseOnHover: boolean;

  // 네비게이션
  showNavigation: boolean;
  navigationPosition: NavigationPosition;

  // 페이지네이션
  pagination: PaginationType;

  // 루프
  loop: boolean;

  // 제스처
  enableSwipe: boolean; // 터치/드래그
  enableKeyboard: boolean; // 키보드 화살표

  // 접근성
  ariaLabel?: string;

  // 고급
  lazyLoad: boolean; // Intersection Observer 활용
  preloadImages: number; // 미리 로드할 이미지 수
}

// 슬라이드 속성
export interface SlideAttributes {
  // 스타일
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: 'cover' | 'contain' | 'auto';
  backgroundPosition?: string;

  // 레이아웃
  padding?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };

  // 정렬
  verticalAlign?: 'top' | 'center' | 'bottom';
  horizontalAlign?: 'left' | 'center' | 'right';

  // 접근성
  ariaLabel?: string;
}

// Framer Motion 전환 variants
export const transitionVariants = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slide: {
    initial: { x: '100%' },
    animate: { x: 0 },
    exit: { x: '-100%' },
  },
  zoom: {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 1.2, opacity: 0 },
  },
  flip: {
    initial: { rotateY: 90, opacity: 0 },
    animate: { rotateY: 0, opacity: 1 },
    exit: { rotateY: -90, opacity: 0 },
  },
} as const;
