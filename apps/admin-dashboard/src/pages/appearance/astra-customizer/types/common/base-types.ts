/**
 * Base Common Types
 * 모든 커스터마이저에서 공통으로 사용하는 기본 타입
 */

/**
 * 반응형 값 타입 - 데스크탑/태블릿/모바일 값을 각각 설정
 */
export interface ResponsiveValue<T> {
  desktop: T;
  tablet: T;
  mobile: T;
}

/**
 * 색상 상태 타입 - 일반/호버 상태 색상
 */
export interface ColorState {
  normal: string;
  hover?: string;
}

/**
 * 폰트 가중치 타입
 */
export type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

/**
 * 텍스트 변형 타입
 */
export type TextTransform = 'none' | 'capitalize' | 'uppercase' | 'lowercase';

/**
 * 텍스트 정렬 타입
 */
export type TextAlign = 'left' | 'center' | 'right' | 'justify';

/**
 * 타이포그래피 설정
 */
export interface TypographySettings {
  fontFamily: string;
  fontSize: ResponsiveValue<number>;
  fontWeight: FontWeight;
  lineHeight: ResponsiveValue<number>;
  letterSpacing: ResponsiveValue<number>;
  textTransform: TextTransform;
  textDecoration?: string;
}

/**
 * Preview Device Types
 */
export type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

/**
 * Save Status Types
 */
export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

/**
 * Deep Partial Utility Type
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
