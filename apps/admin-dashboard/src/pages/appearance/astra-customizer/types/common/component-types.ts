/**
 * UI Component Type Definitions
 * UI 컴포넌트 관련 타입을 정의합니다.
 */

import type {
  ResponsiveValue,
  FontWeight,
  TextTransform
} from './base-types';

/**
 * Button Style Settings
 */
export interface ButtonStyleSettings {
  // Basic styles
  backgroundColor: string;
  textColor: string;
  borderWidth: number;
  borderColor: string;
  borderStyle: 'solid' | 'dashed' | 'dotted' | 'double' | 'none';
  borderRadius: number;
  paddingVertical: number;
  paddingHorizontal: number;

  // Hover effects
  hoverBackgroundColor: string;
  hoverTextColor: string;
  hoverBorderColor: string;
  hoverTransform?: 'none' | 'scale' | 'translateY';
  transitionDuration: number;

  // Typography
  fontFamily?: string;
  fontSize: ResponsiveValue<number>;
  fontWeight: FontWeight;
  textTransform: TextTransform;
  letterSpacing: number;

  // Shadow
  boxShadow?: 'none' | 'small' | 'medium' | 'large';
  hoverBoxShadow?: 'none' | 'small' | 'medium' | 'large';
}

/**
 * Button Variants
 */
export interface ButtonVariants {
  primary: ButtonStyleSettings;
  secondary?: Partial<ButtonStyleSettings>;
  outline?: Partial<ButtonStyleSettings>;
  text?: Partial<ButtonStyleSettings>;
  // Global button settings that apply to all variants
  global?: {
    minHeight?: number;
    minWidth?: number;
    displayType?: 'inline-block' | 'block' | 'inline-flex';
    iconSpacing?: number;
  };
}

/**
 * Breadcrumbs Settings
 */
export interface BreadcrumbsSettings {
  enabled: boolean;
  position: 'above-content' | 'below-header';
  homeText: string;
  separator: '>' | '/' | '→' | '•' | '|';
  showCurrentPage: boolean;
  showOnHomepage: boolean;

  // Colors
  linkColor: string;
  currentPageColor: string;
  separatorColor: string;
  hoverColor: string;

  // Typography
  fontSize: ResponsiveValue<number>;
  fontWeight: FontWeight;
  textTransform: TextTransform;

  // Spacing
  itemSpacing: number;
  marginTop: number;
  marginBottom: number;

  // Advanced
  maxLength?: number; // Max characters per item before truncation
  showIcons?: boolean;
  mobileHidden?: boolean;
}

/**
 * Breadcrumb Item
 */
export interface BreadcrumbItem {
  label: string;
  url?: string;
  isActive: boolean;
  icon?: string;
}

/**
 * Scroll to Top Settings
 */
export interface ScrollToTopSettings {
  enabled: boolean;
  displayType: 'desktop' | 'mobile' | 'both';
  threshold?: number;
  backgroundColor?: string;
  iconColor?: string;
  position?: 'left' | 'right';
}
