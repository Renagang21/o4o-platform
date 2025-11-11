/**
 * Header Builder Type Definitions
 * Extracted from Astra Customizer - Header Builder only
 */

// ============================================
// Basic Types
// ============================================

/**
 * Responsive value type - Desktop/Tablet/Mobile
 */
export interface ResponsiveValue<T> {
  desktop: T;
  tablet: T;
  mobile: T;
}

/**
 * Color state type - Normal/Hover
 */
export interface ColorState {
  normal: string;
  hover?: string;
}

// ============================================
// Header Module Types
// ============================================

/**
 * Header module types
 */
export type HeaderModuleType =
  | 'logo'
  | 'site-title'
  | 'primary-menu'
  | 'secondary-menu'
  | 'search'
  | 'account'
  | 'cart'
  | 'button'
  | 'html'
  | 'widget'
  | 'social'
  | 'role-switcher';

/**
 * Site Title Module Settings
 */
export interface SiteTitleModuleSettings {
  text?: string;
  showTagline?: boolean;
  typography?: { fontSize: 'small' | 'medium' | 'large' };
  isLink?: boolean;
  // Common settings
  alignment?: 'left' | 'center' | 'right';
  visibility?: { desktop: boolean; tablet: boolean; mobile: boolean };
  spacing?: {
    margin: { top: number; right: number; bottom: number; left: number };
    padding: { top: number; right: number; bottom: number; left: number };
  };
  className?: string;
  ariaLabel?: string;
}

/**
 * HTML Module Settings
 */
export interface HTMLModuleSettings {
  html?: string;
  height?: 'small' | 'medium' | 'large';
  enablePreview?: boolean;
  safeMode?: boolean;
  // Common settings
  alignment?: 'left' | 'center' | 'right';
  visibility?: { desktop: boolean; tablet: boolean; mobile: boolean };
  spacing?: {
    margin: { top: number; right: number; bottom: number; left: number };
    padding: { top: number; right: number; bottom: number; left: number };
  };
  className?: string;
  ariaLabel?: string;
}

/**
 * Logo Module Settings
 */
export interface LogoModuleSettings {
  logoUrl?: string;
  href?: string;
  width?: number;
  retinaUrl?: string;
  // Common settings
  alignment?: 'left' | 'center' | 'right';
  visibility?: { desktop: boolean; tablet: boolean; mobile: boolean };
  spacing?: {
    margin: { top: number; right: number; bottom: number; left: number };
    padding: { top: number; right: number; bottom: number; left: number };
  };
  className?: string;
  ariaLabel?: string;
}

/**
 * Menu Module Settings
 */
export interface MenuModuleSettings {
  menuRef?: 'primary' | 'secondary' | 'footer';
  style?: 'default' | 'minimal' | 'bordered';
  itemGap?: number;
  // Common settings
  alignment?: 'left' | 'center' | 'right';
  visibility?: { desktop: boolean; tablet: boolean; mobile: boolean };
  spacing?: {
    margin: { top: number; right: number; bottom: number; left: number };
    padding: { top: number; right: number; bottom: number; left: number };
  };
  className?: string;
  ariaLabel?: string;
}

/**
 * Button Module Settings
 */
export interface ButtonModuleSettings {
  label?: string;
  href?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  borderRadius?: number;
  // Common settings
  alignment?: 'left' | 'center' | 'right';
  visibility?: { desktop: boolean; tablet: boolean; mobile: boolean };
  spacing?: {
    margin: { top: number; right: number; bottom: number; left: number };
    padding: { top: number; right: number; bottom: number; left: number };
  };
  className?: string;
  ariaLabel?: string;
}

/**
 * Social Icons Module Settings
 */
export interface SocialIconsModuleSettings {
  links?: Array<{ type: string; url: string }>;
  shape?: 'circle' | 'square' | 'rounded';
  size?: number;
  colorMode?: 'brand' | 'monochrome';
  // Common settings
  alignment?: 'left' | 'center' | 'right';
  visibility?: { desktop: boolean; tablet: boolean; mobile: boolean };
  spacing?: {
    margin: { top: number; right: number; bottom: number; left: number };
    padding: { top: number; right: number; bottom: number; left: number };
  };
  className?: string;
  ariaLabel?: string;
}

/**
 * Secondary Menu Module Settings
 */
export interface SecondaryMenuModuleSettings extends MenuModuleSettings {
  // Inherits from MenuModuleSettings
  // menuRef defaults to 'secondary'
}

/**
 * Search Module Settings
 */
export interface SearchModuleSettings {
  variant?: 'icon' | 'input';
  placeholder?: string;
  autocomplete?: boolean;
  // Common settings
  alignment?: 'left' | 'center' | 'right';
  visibility?: { desktop: boolean; tablet: boolean; mobile: boolean };
  spacing?: {
    margin: { top: number; right: number; bottom: number; left: number };
    padding: { top: number; right: number; bottom: number; left: number };
  };
  className?: string;
  ariaLabel?: string;
}

/**
 * Cart Module Settings
 */
export interface CartModuleSettings {
  showCount?: boolean;
  showTotal?: boolean;
  action?: 'mini-cart' | 'page';
  // Common settings
  alignment?: 'left' | 'center' | 'right';
  visibility?: { desktop: boolean; tablet: boolean; mobile: boolean };
  spacing?: {
    margin: { top: number; right: number; bottom: number; left: number };
    padding: { top: number; right: number; bottom: number; left: number };
  };
  className?: string;
  ariaLabel?: string;
}

/**
 * Role Switcher Module Settings
 */
export interface RoleSwitcherModuleSettings {
  displayCondition?: 'always' | 'multi-role';
  showLabel?: boolean;
  variant?: 'icon-only' | 'with-label';
  // Common settings
  alignment?: 'left' | 'center' | 'right';
  visibility?: { desktop: boolean; tablet: boolean; mobile: boolean };
  spacing?: {
    margin: { top: number; right: number; bottom: number; left: number };
    padding: { top: number; right: number; bottom: number; left: number };
  };
  className?: string;
  ariaLabel?: string;
}

/**
 * Widget Module Settings
 */
export interface WidgetModuleSettings {
  widgetAreaId?: string;
  // Common settings
  alignment?: 'left' | 'center' | 'right';
  visibility?: { desktop: boolean; tablet: boolean; mobile: boolean };
  spacing?: {
    margin: { top: number; right: number; bottom: number; left: number };
    padding: { top: number; right: number; bottom: number; left: number };
  };
  className?: string;
  ariaLabel?: string;
}

/**
 * Module configuration interface
 */
export interface ModuleConfig {
  id: string;
  type: HeaderModuleType;
  label?: string;
  settings: {
    // Common settings
    visibility?: ResponsiveValue<boolean> | { desktop: boolean; tablet: boolean; mobile: boolean };
    customClass?: string;

    // Module-specific settings
    [key: string]: any;
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
  triggerHeight: number; // Scroll height (px)
  stickyOn: ('above' | 'primary' | 'below')[];
  shrinkEffect: boolean;
  shrinkHeight: ResponsiveValue<number>; // Shrunk height
  backgroundColor?: string;
  backgroundOpacity: number; // 0-1
  boxShadow: boolean;
  shadowIntensity: 'light' | 'medium' | 'strong';
  animationDuration: number; // ms
  hideOnScrollDown?: boolean;
  zIndex: number;
}

/**
 * Mobile Header Settings
 */
export interface MobileHeaderSettings {
  enabled: boolean;
  breakpoint: number; // px
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
 * Complete Header Builder Settings
 */
export interface HeaderBuilderSettings {
  builder: HeaderBuilderLayout;
  sticky?: StickyHeaderSettings;
  mobile?: MobileHeaderSettings;
}
