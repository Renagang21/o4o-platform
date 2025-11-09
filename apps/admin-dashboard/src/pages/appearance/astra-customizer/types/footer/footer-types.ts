/**
 * Footer Type Definitions
 * 푸터 관련 타입을 정의합니다.
 */

import type { ColorState, ResponsiveValue } from '../common/base-types';

/**
 * 푸터 위젯 타입
 */
export type FooterWidgetType =
  | 'text'
  | 'menu'
  | 'social'
  | 'contact'
  | 'copyright'
  | 'html'
  | 'recent-posts'
  | 'newsletter';

/**
 * 푸터 위젯 설정
 */
export interface FooterDashboardWidgetConfig {
  id: string;
  type: FooterWidgetType;
  label?: string;
  settings: {
    // 공통 설정
    title?: string;
    customClass?: string;

    // 타입별 설정
    // text widget
    content?: string;

    // menu widget
    menuId?: string;

    // social widget
    socialLinks?: Array<{
      platform: string;
      url: string;
      icon?: string;
    }>;

    // contact widget
    address?: string;
    phone?: string;
    email?: string;
    hours?: string;

    // copyright
    copyrightText?: string;
    showYear?: boolean;

    // html widget
    htmlContent?: string;

    // recent posts
    postCount?: number;
    showDate?: boolean;
    showExcerpt?: boolean;

    // newsletter
    formAction?: string;
    placeholder?: string;
    buttonText?: string;
  };
}

/**
 * 푸터 빌더 레이아웃
 */
export interface FooterBuilderLayout {
  widgets: {
    enabled: boolean;
    columns: 1 | 2 | 3 | 4 | 5;
    layout: FooterDashboardWidgetConfig[][];
    settings: {
      background: string;
      textColor: string;
      linkColor: ColorState;
      padding: ResponsiveValue<{ top: number; bottom: number }>;
      gap?: number;
    };
  };
  bar: {
    enabled: boolean;
    left: FooterDashboardWidgetConfig[];
    right: FooterDashboardWidgetConfig[];
    settings: {
      background: string;
      textColor: string;
      linkColor: ColorState;
      padding: ResponsiveValue<{ top: number; bottom: number }>;
      alignment?: 'left' | 'center' | 'right' | 'space-between';
    };
  };
}

/**
 * 푸터 설정 (기존 + 새로운 빌더)
 */
export interface FooterSettings {
  layout: 'footer-layout-1' | 'footer-layout-2' | 'footer-layout-3';

  // 새로운 빌더 레이아웃
  builder?: FooterBuilderLayout;

  // 기존 위젯 영역 (하위 호환성)
  widgets: {
    enabled: boolean;
    columns: ResponsiveValue<number>;
    background: string;
    textColor: string;
    linkColor: ColorState;
    padding: ResponsiveValue<{
      top: number;
      bottom: number;
    }>;
  };

  // 기존 하단 바 (하위 호환성)
  bottomBar: {
    enabled: boolean;
    layout: 'layout-1' | 'layout-2';
    section1: string; // HTML or copyright text
    section2: string; // HTML or menu
    background: string;
    textColor: string;
    linkColor: ColorState;
    padding: ResponsiveValue<{
      top: number;
      bottom: number;
    }>;
  };
}
