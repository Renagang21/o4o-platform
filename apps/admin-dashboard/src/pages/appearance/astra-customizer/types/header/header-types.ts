/**
 * Header Related Types
 * 헤더 관련 타입 정의
 */

import { ResponsiveValue, TextAlign } from '../common/base-types';

/**
 * Header Module Types
 */
export type HeaderModuleType =
  | 'logo'
  | 'site-title'
  | 'primary-menu'
  | 'secondary-menu'
  | 'search'
  | 'account'
  | 'role-switcher'
  | 'cart'
  | 'button'
  | 'html'
  | 'widget'
  | 'social';

/**
 * Module Configuration
 */
export interface ModuleConfig {
  id: string;
  type: HeaderModuleType;
  label?: string;
  settings: {
    visibility?: {
      desktop: boolean;
      tablet: boolean;
      mobile: boolean;
    };
    [key: string]: unknown;
  };
}

/**
 * Header Builder Layout
 */
export interface HeaderBuilderLayout {
  above: {
    left: ModuleConfig[];
    center: ModuleConfig[];
    right: ModuleConfig[];
    settings: {
      enabled: boolean;
      height: ResponsiveValue<number>;
      background: string;
      padding?: ResponsiveValue<{ top: number; bottom: number }>;
    };
  };
  primary: {
    left: ModuleConfig[];
    center: ModuleConfig[];
    right: ModuleConfig[];
    settings: {
      height: ResponsiveValue<number>;
      background: string;
      padding?: ResponsiveValue<{ top: number; bottom: number }>;
    };
  };
  below: {
    left: ModuleConfig[];
    center: ModuleConfig[];
    right: ModuleConfig[];
    settings: {
      enabled: boolean;
      height: ResponsiveValue<number>;
      background: string;
      padding?: ResponsiveValue<{ top: number; bottom: number }>;
    };
  };
}

/**
 * Sticky Header Settings
 */
export interface StickyHeaderSettings {
  enabled: boolean;
  triggerHeight: number;
  stickyOn: ('above' | 'primary' | 'below')[];
  shrinkEffect: boolean;
  shrinkHeight: ResponsiveValue<number>;
  backgroundColor?: string;
  backgroundOpacity: number;
  boxShadow: boolean;
  shadowIntensity: 'light' | 'medium' | 'strong';
  animationDuration: number;
  hideOnScrollDown?: boolean;
  zIndex: number;
}

/**
 * Mobile Header Settings
 */
export interface MobileHeaderSettings {
  enabled: boolean;
  breakpoint: number;
  mobileLogoUrl?: string;
  mobileLogoWidth?: number;
  hamburgerStyle: 'default' | 'animated' | 'minimal';
  menuPosition: 'left' | 'right' | 'fullscreen';
  menuAnimation: 'slide' | 'fade' | 'push';
  overlayEnabled: boolean;
  overlayColor?: string;
  overlayOpacity?: number;
  backgroundColor?: string;
  textColor?: string;
  showAccountIcon?: boolean;
  showCartIcon?: boolean;
  showSearchIcon?: boolean;
  submenuStyle: 'accordion' | 'dropdown';
  closeOnItemClick?: boolean;
  swipeToClose?: boolean;
}

/**
 * Header Settings
 */
export interface HeaderSettings {
  layout: 'header-main-layout-1' | 'header-main-layout-2' | 'header-main-layout-3';
  sticky: boolean;
  transparentHeader: boolean;

  builder?: HeaderBuilderLayout;
  stickySettings?: StickyHeaderSettings;
  mobileSettings?: MobileHeaderSettings;

  above: {
    enabled: boolean;
    height: ResponsiveValue<number>;
    background: string;
    content: Array<'menu' | 'search' | 'account' | 'cart' | 'custom-html'>;
  };

  primary: {
    height: ResponsiveValue<number>;
    background: string;
    menuAlignment: TextAlign;
  };

  below: {
    enabled: boolean;
    height: ResponsiveValue<number>;
    background: string;
    content: Array<'menu' | 'search' | 'breadcrumb' | 'custom-html'>;
  };
}
