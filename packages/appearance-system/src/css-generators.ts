/**
 * CSS Generators - Centralized CSS Generation
 *
 * This file consolidates CSS generation logic from:
 * - apps/admin-dashboard/src/pages/appearance/astra-customizer/utils/css-generator.ts
 * - apps/main-site/src/utils/css-generator.ts
 * - apps/api-server/src/utils/customizer/css-generator.ts
 *
 * Phase 2: Core generators (Button, Breadcrumb, ScrollToTop)
 * Phase 2.5: Complex generators (Header, Footer, Container, Blog)
 *
 * @see /docs/APPEARANCE_CLEANUP_PLAN.md Phase 2 for migration details
 * @see /docs/APPEARANCE_GENERATORS_MAP.md for complete inventory
 */

import type { DesignTokens } from './tokens.js';

/**
 * Button style options
 */
export interface ButtonOptions {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  backgroundColor?: string;
  textColor?: string;
  hoverBackgroundColor?: string;
  borderRadius?: number;
  paddingVertical?: number;
  paddingHorizontal?: number;
  borderWidth?: number;
  borderColor?: string;
}

/**
 * Breadcrumb style options
 */
export interface BreadcrumbOptions {
  textColor?: string;
  linkColor?: string;
  separatorColor?: string;
  fontSize?: number;
  separator?: string;
}

/**
 * Scroll-to-top style options
 */
export interface ScrollToTopOptions {
  enabled?: boolean;
  backgroundColor?: string;
  iconColor?: string;
  size?: number;
  borderRadius?: number;
  position?: {
    bottom?: number;
    right?: number;
  };
  hoverEffect?: 'fade' | 'lift' | 'none';
}

/**
 * Generate button CSS from design tokens
 * Consolidated from admin-dashboard, main-site implementations
 *
 * @param tokens - Design tokens
 * @param options - Button customization options
 * @returns CSS string
 */
export function generateButtonCSS(
  tokens: DesignTokens,
  options: ButtonOptions = {}
): string {
  const {
    variant = 'primary',
    backgroundColor = tokens.colors.buttonBg,
    textColor = tokens.colors.buttonText,
    hoverBackgroundColor,
    borderRadius = 4,
    paddingVertical = 12,
    paddingHorizontal = 24,
    borderWidth = 1,
    borderColor = tokens.colors.buttonBorder,
  } = options;

  const css: string[] = [];

  // CSS Variables for button styling (Phase 4: --o4o-* only)
  css.push(':root {');
  css.push(`  --o4o-button-bg: ${backgroundColor};`);
  css.push(`  --o4o-button-text: ${textColor};`);
  css.push(`  --o4o-button-radius: ${borderRadius}px;`);
  css.push(`  --o4o-button-padding-y: ${paddingVertical}px;`);
  css.push(`  --o4o-button-padding-x: ${paddingHorizontal}px;`);

  if (hoverBackgroundColor) {
    css.push(`  --o4o-button-bg-hover: ${hoverBackgroundColor};`);
  }

  css.push('}');

  // Apply button styles using CSS variables (Phase 4: --o4o-* only)
  css.push('.wp-element-button, .ast-button, button[type="submit"], .btn-primary {');
  css.push('  background-color: var(--o4o-button-bg);');
  css.push('  color: var(--o4o-button-text);');
  css.push('  border-radius: var(--o4o-button-radius);');
  css.push('  padding: var(--o4o-button-padding-y) var(--o4o-button-padding-x);');
  css.push('  border: none;');
  css.push('  cursor: pointer;');
  css.push('  transition: all 0.3s ease;');
  css.push('  font-family: inherit;');
  css.push('  font-size: 1rem;');
  css.push('  text-decoration: none;');
  css.push('  display: inline-block;');
  css.push('}');

  // Hover state
  css.push('.wp-element-button:hover, .ast-button:hover, button[type="submit"]:hover, .btn-primary:hover {');
  if (hoverBackgroundColor) {
    css.push(`  background-color: var(--o4o-button-bg-hover);`);
  } else {
    css.push('  opacity: 0.9;');
  }
  css.push('  transform: translateY(-1px);');
  css.push('}');

  // Outline variant
  if (variant === 'outline') {
    css.push('.btn-outline {');
    css.push('  background-color: transparent;');
    css.push(`  color: ${borderColor};`);
    css.push(`  border: ${borderWidth}px solid ${borderColor};`);
    css.push('}');
    css.push('.btn-outline:hover {');
    css.push(`  background-color: ${backgroundColor};`);
    css.push(`  color: ${textColor};`);
    css.push('}');
  }

  return css.join('\n');
}

/**
 * Generate breadcrumb CSS from design tokens
 * Consolidated from admin-dashboard, main-site implementations
 *
 * @param tokens - Design tokens
 * @param options - Breadcrumb customization options
 * @returns CSS string
 */
export function generateBreadcrumbCSS(
  tokens: DesignTokens,
  options: BreadcrumbOptions = {}
): string {
  const {
    textColor = tokens.colors.breadcrumbText,
    linkColor = tokens.colors.breadcrumbLink,
    separatorColor = tokens.colors.breadcrumbSeparator,
    fontSize = 14,
    separator = '/',
  } = options;

  const css: string[] = [];

  // CSS Variables (Phase 4: --o4o-* only)
  css.push(':root {');
  css.push(`  --o4o-breadcrumb-text: ${textColor};`);
  css.push(`  --o4o-breadcrumb-link: ${linkColor};`);
  css.push(`  --o4o-breadcrumb-separator: ${separatorColor};`);
  css.push(`  --o4o-breadcrumb-font-size: ${fontSize}px;`);
  css.push('}');

  // Apply breadcrumb styles (Phase 4: --o4o-* only)
  css.push('.ast-breadcrumbs, .breadcrumb, nav[aria-label="breadcrumb"] {');
  css.push('  color: var(--o4o-breadcrumb-text);');
  css.push('  font-size: var(--o4o-breadcrumb-font-size);');
  css.push('  margin: 1rem 0;');
  css.push('  padding: 0;');
  css.push('  list-style: none;');
  css.push('  display: flex;');
  css.push('  flex-wrap: wrap;');
  css.push('  align-items: center;');
  css.push('}');

  // Breadcrumb links
  css.push('.ast-breadcrumbs a, .breadcrumb a, nav[aria-label="breadcrumb"] a {');
  css.push('  color: var(--o4o-breadcrumb-link);');
  css.push('  text-decoration: none;');
  css.push('  transition: color 0.2s ease, opacity 0.2s ease;');
  css.push('}');

  css.push('.ast-breadcrumbs a:hover, .breadcrumb a:hover, nav[aria-label="breadcrumb"] a:hover {');
  css.push('  opacity: 0.8;');
  css.push('  text-decoration: underline;');
  css.push('}');

  // Breadcrumb separator
  css.push('.ast-breadcrumbs .separator, .breadcrumb-separator, .breadcrumb-item + .breadcrumb-item::before {');
  css.push('  color: var(--o4o-breadcrumb-separator);');
  css.push('  margin: 0 0.5rem;');
  css.push(`  content: "${separator}";`);
  css.push('  user-select: none;');
  css.push('}');

  // Current/active item
  css.push('.ast-breadcrumbs .active, .breadcrumb-item.active {');
  css.push('  color: var(--o4o-breadcrumb-text);');
  css.push('  font-weight: 500;');
  css.push('}');

  return css.join('\n');
}

/**
 * Generate scroll-to-top button CSS from design tokens
 * Consolidated from admin-dashboard, main-site implementations
 *
 * @param tokens - Design tokens
 * @param options - Scroll-to-top customization options
 * @returns CSS string
 */
export function generateScrollToTopCSS(
  tokens: DesignTokens,
  options: ScrollToTopOptions = {}
): string {
  const {
    enabled = true,
    backgroundColor = tokens.colors.primary,
    iconColor = '#ffffff',
    size = 40,
    borderRadius = 4,
    position = { bottom: 30, right: 30 },
    hoverEffect = 'lift',
  } = options;

  if (!enabled) {
    return '/* Scroll to top disabled */';
  }

  const css: string[] = [];

  // CSS Variables (Phase 4: --o4o-* only)
  css.push(':root {');
  css.push(`  --o4o-scroll-top-bg: ${backgroundColor};`);
  css.push(`  --o4o-scroll-top-icon: ${iconColor};`);
  css.push(`  --o4o-scroll-top-size: ${size}px;`);
  css.push(`  --o4o-scroll-top-border-radius: ${borderRadius}px;`);
  css.push(`  --o4o-scroll-top-position-bottom: ${position.bottom}px;`);
  css.push(`  --o4o-scroll-top-position-right: ${position.right}px;`);
  css.push('}');

  // Apply scroll to top styles (Phase 4: --o4o-* only)
  css.push('.ast-scroll-to-top, .scroll-to-top, #scroll-to-top {');
  css.push('  background-color: var(--o4o-scroll-top-bg);');
  css.push('  color: var(--o4o-scroll-top-icon);');
  css.push('  width: var(--o4o-scroll-top-size);');
  css.push('  height: var(--o4o-scroll-top-size);');
  css.push('  border-radius: var(--o4o-scroll-top-border-radius);');
  css.push('  position: fixed;');
  css.push('  bottom: var(--o4o-scroll-top-position-bottom);');
  css.push('  right: var(--o4o-scroll-top-position-right);');
  css.push('  z-index: 999;');
  css.push('  display: flex;');
  css.push('  align-items: center;');
  css.push('  justify-content: center;');
  css.push('  cursor: pointer;');
  css.push('  border: none;');
  css.push('  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);');
  css.push('  transition: all 0.3s ease;');
  css.push('  opacity: 0;');
  css.push('  visibility: hidden;');
  css.push('  pointer-events: none;');
  css.push('}');

  // Visible state
  css.push('.ast-scroll-to-top.visible, .scroll-to-top.visible, #scroll-to-top.visible {');
  css.push('  opacity: 1;');
  css.push('  visibility: visible;');
  css.push('  pointer-events: auto;');
  css.push('}');

  // Hover effects
  css.push('.ast-scroll-to-top:hover, .scroll-to-top:hover, #scroll-to-top:hover {');
  if (hoverEffect === 'lift') {
    css.push('  transform: translateY(-3px);');
    css.push('  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);');
  } else if (hoverEffect === 'fade') {
    css.push('  opacity: 0.8;');
  }
  css.push('}');

  // Icon (assuming SVG or icon font)
  css.push('.ast-scroll-to-top svg, .scroll-to-top svg, #scroll-to-top svg {');
  css.push('  width: 20px;');
  css.push('  height: 20px;');
  css.push('  fill: currentColor;');
  css.push('}');

  return css.join('\n');
}

/**
 * Generate header CSS from design tokens
 * @deprecated Phase 2.5 - To be implemented
 */
export function generateHeaderCSS(tokens: DesignTokens): string {
  return '/* Header CSS - Phase 2.5 */';
}

/**
 * Generate mini cart CSS from design tokens
 * @deprecated Phase 2.5 - To be implemented
 */
export function generateMiniCartCSS(tokens: DesignTokens): string {
  return '/* Mini Cart CSS - Phase 2.5 */';
}

/**
 * Generate all appearance CSS
 * This is the main function that combines all CSS generators
 *
 * @param tokens - Design tokens
 * @returns Complete CSS string
 */
export function generateAllCSS(tokens: DesignTokens): string {
  return `
/* O4O Appearance System - Generated CSS */

${generateButtonCSS(tokens)}

${generateBreadcrumbCSS(tokens)}

${generateScrollToTopCSS(tokens)}
  `.trim();
}
