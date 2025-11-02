/**
 * Global Settings Type Definitions
 * 전역 설정 관련 타입을 정의합니다.
 */

import type {
  ColorState,
  ResponsiveValue,
  TypographySettings
} from '../common/base-types';

/**
 * 사이트 아이덴티티 설정
 */
export interface SiteIdentitySettings {
  logo: {
    desktop: string | null;
    mobile: string | null;
    width: ResponsiveValue<number>;
  };
  siteTitle: {
    show: boolean;
    text: string;
    color: ColorState;
    typography: TypographySettings;
  };
  tagline: {
    show: boolean;
    text: string;
    color: ColorState;
    typography: TypographySettings;
  };
  favicon: string | null;
}

/**
 * 전역 색상 설정
 */
export interface GlobalColorsSettings {
  // 기본 색상
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  linkColor: ColorState;
  borderColor: string;

  // 배경 색상
  bodyBackground: string;
  contentBackground: string;

  // 테마 색상 팔레트
  palette: {
    [key: string]: string;
  };
}

/**
 * 전역 타이포그래피 설정
 */
export interface GlobalTypographySettings {
  // 기본 폰트
  bodyFont: TypographySettings;

  // 제목 폰트 (H1-H6)
  headings: {
    h1: TypographySettings;
    h2: TypographySettings;
    h3: TypographySettings;
    h4: TypographySettings;
    h5: TypographySettings;
    h6: TypographySettings;
  };

  // 버튼 폰트
  button: TypographySettings;
}
