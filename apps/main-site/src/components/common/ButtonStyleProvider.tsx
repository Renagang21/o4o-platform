/**
 * Button Style Provider Component
 * Injects button CSS variables into the document head
 */

import React, { useEffect } from 'react';
import { ButtonVariants, ButtonStyleSettings } from '@/types/customizer-types';

interface ButtonStyleProviderProps {
  settings?: ButtonVariants;
}

// Convert box shadow presets to CSS values
const shadowPresets = {
  none: 'none',
  small: '0 1px 3px rgba(0, 0, 0, 0.12)',
  medium: '0 4px 6px rgba(0, 0, 0, 0.15)',
  large: '0 10px 20px rgba(0, 0, 0, 0.2)'
};

// Convert hover transform presets to CSS values
const transformPresets = {
  none: 'none',
  scale: 'scale(1.05)',
  translateY: 'translateY(-2px)'
};

const ButtonStyleProvider: React.FC<ButtonStyleProviderProps> = ({ settings }) => {
  useEffect(() => {
    if (!settings) return;

    // Generate CSS variables for each button variant
    const generateVariantCss = (variant: string, styles: Partial<ButtonStyleSettings>) => {
      const prefix = `--btn-${variant}`;
      const variables: string[] = [];

      // Basic styles
      if (styles.backgroundColor) variables.push(`${prefix}-bg: ${styles.backgroundColor};`);
      if (styles.textColor) variables.push(`${prefix}-color: ${styles.textColor};`);
      if (styles.borderWidth !== undefined) variables.push(`${prefix}-border-width: ${styles.borderWidth}px;`);
      if (styles.borderColor) variables.push(`${prefix}-border-color: ${styles.borderColor};`);
      if (styles.borderStyle) variables.push(`${prefix}-border-style: ${styles.borderStyle};`);
      if (styles.borderRadius !== undefined) variables.push(`${prefix}-border-radius: ${styles.borderRadius}px;`);
      if (styles.paddingVertical !== undefined) variables.push(`${prefix}-padding-y: ${styles.paddingVertical}px;`);
      if (styles.paddingHorizontal !== undefined) variables.push(`${prefix}-padding-x: ${styles.paddingHorizontal}px;`);

      // Hover styles
      if (styles.hoverBackgroundColor) variables.push(`${prefix}-hover-bg: ${styles.hoverBackgroundColor};`);
      if (styles.hoverTextColor) variables.push(`${prefix}-hover-color: ${styles.hoverTextColor};`);
      if (styles.hoverBorderColor) variables.push(`${prefix}-hover-border-color: ${styles.hoverBorderColor};`);
      if (styles.transitionDuration !== undefined) variables.push(`${prefix}-transition: all ${styles.transitionDuration}ms ease;`);

      // Typography
      if (styles.fontWeight) variables.push(`${prefix}-font-weight: ${styles.fontWeight};`);
      if (styles.textTransform) variables.push(`${prefix}-text-transform: ${styles.textTransform};`);
      if (styles.letterSpacing !== undefined) variables.push(`${prefix}-letter-spacing: ${styles.letterSpacing}px;`);
      
      // Responsive font sizes
      if (styles.fontSize) {
        variables.push(`${prefix}-font-size-desktop: ${styles.fontSize.desktop}px;`);
        variables.push(`${prefix}-font-size-tablet: ${styles.fontSize.tablet}px;`);
        variables.push(`${prefix}-font-size-mobile: ${styles.fontSize.mobile}px;`);
      }

      // Effects
      if (styles.boxShadow) variables.push(`${prefix}-shadow: ${shadowPresets[styles.boxShadow]};`);
      if (styles.hoverBoxShadow) variables.push(`${prefix}-hover-shadow: ${shadowPresets[styles.hoverBoxShadow]};`);
      if (styles.hoverTransform) variables.push(`${prefix}-hover-transform: ${transformPresets[styles.hoverTransform]};`);

      return variables.join('\n    ');
    };

    // Generate global button CSS
    const globalCss = settings.global ? `
    --btn-min-height: ${settings.global.minHeight || 40}px;
    --btn-min-width: ${settings.global.minWidth || 'auto'};
    --btn-display: ${settings.global.displayType || 'inline-block'};
    --btn-icon-spacing: ${settings.global.iconSpacing || 8}px;
    ` : '';

    // Generate CSS for all variants
    const primaryCss = generateVariantCss('primary', settings.primary);
    const secondaryCss = settings.secondary ? generateVariantCss('secondary', { ...settings.primary, ...settings.secondary }) : '';
    const outlineCss = settings.outline ? generateVariantCss('outline', { ...settings.primary, ...settings.outline }) : '';
    const textCss = settings.text ? generateVariantCss('text', { ...settings.primary, ...settings.text }) : '';

    // Create the complete CSS
    const css = `
  :root {
    /* Global Button Settings */
    ${globalCss}
    
    /* Primary Button */
    ${primaryCss}
    
    /* Secondary Button */
    ${secondaryCss}
    
    /* Outline Button */
    ${outlineCss}
    
    /* Text Button */
    ${textCss}
  }

  /* Button Base Styles */
  .btn,
  button.btn,
  a.btn,
  input[type="submit"],
  input[type="button"],
  .wp-block-button__link {
    /* Use primary by default */
    background-color: var(--btn-primary-bg);
    color: var(--btn-primary-color);
    border-width: var(--btn-primary-border-width);
    border-color: var(--btn-primary-border-color);
    border-style: var(--btn-primary-border-style);
    border-radius: var(--btn-primary-border-radius);
    padding: var(--btn-primary-padding-y) var(--btn-primary-padding-x);
    font-size: var(--btn-primary-font-size-desktop);
    font-weight: var(--btn-primary-font-weight);
    text-transform: var(--btn-primary-text-transform);
    letter-spacing: var(--btn-primary-letter-spacing);
    box-shadow: var(--btn-primary-shadow);
    transition: var(--btn-primary-transition);
    min-height: var(--btn-min-height);
    min-width: var(--btn-min-width);
    display: var(--btn-display);
    cursor: pointer;
    text-decoration: none;
    line-height: 1.5;
    text-align: center;
    vertical-align: middle;
    user-select: none;
  }

  .btn:hover,
  button.btn:hover,
  a.btn:hover,
  input[type="submit"]:hover,
  input[type="button"]:hover,
  .wp-block-button__link:hover {
    background-color: var(--btn-primary-hover-bg);
    color: var(--btn-primary-hover-color);
    border-color: var(--btn-primary-hover-border-color);
    box-shadow: var(--btn-primary-hover-shadow);
    transform: var(--btn-primary-hover-transform);
  }

  /* Secondary Button */
  .btn-secondary {
    background-color: var(--btn-secondary-bg);
    color: var(--btn-secondary-color);
    border-width: var(--btn-secondary-border-width);
    border-color: var(--btn-secondary-border-color);
    border-style: var(--btn-secondary-border-style);
    border-radius: var(--btn-secondary-border-radius);
    padding: var(--btn-secondary-padding-y) var(--btn-secondary-padding-x);
    font-size: var(--btn-secondary-font-size-desktop);
    font-weight: var(--btn-secondary-font-weight);
    text-transform: var(--btn-secondary-text-transform);
    letter-spacing: var(--btn-secondary-letter-spacing);
    box-shadow: var(--btn-secondary-shadow);
    transition: var(--btn-secondary-transition);
  }

  .btn-secondary:hover {
    background-color: var(--btn-secondary-hover-bg);
    color: var(--btn-secondary-hover-color);
    border-color: var(--btn-secondary-hover-border-color);
    box-shadow: var(--btn-secondary-hover-shadow);
    transform: var(--btn-secondary-hover-transform);
  }

  /* Outline Button */
  .btn-outline {
    background-color: var(--btn-outline-bg);
    color: var(--btn-outline-color);
    border-width: var(--btn-outline-border-width);
    border-color: var(--btn-outline-border-color);
    border-style: var(--btn-outline-border-style);
    border-radius: var(--btn-outline-border-radius);
    padding: var(--btn-outline-padding-y) var(--btn-outline-padding-x);
    font-size: var(--btn-outline-font-size-desktop);
    font-weight: var(--btn-outline-font-weight);
    text-transform: var(--btn-outline-text-transform);
    letter-spacing: var(--btn-outline-letter-spacing);
    box-shadow: var(--btn-outline-shadow);
    transition: var(--btn-outline-transition);
  }

  .btn-outline:hover {
    background-color: var(--btn-outline-hover-bg);
    color: var(--btn-outline-hover-color);
    border-color: var(--btn-outline-hover-border-color);
    box-shadow: var(--btn-outline-hover-shadow);
    transform: var(--btn-outline-hover-transform);
  }

  /* Text Button */
  .btn-text {
    background-color: var(--btn-text-bg);
    color: var(--btn-text-color);
    border-width: var(--btn-text-border-width);
    border-color: var(--btn-text-border-color);
    border-style: var(--btn-text-border-style);
    border-radius: var(--btn-text-border-radius);
    padding: var(--btn-text-padding-y) var(--btn-text-padding-x);
    font-size: var(--btn-text-font-size-desktop);
    font-weight: var(--btn-text-font-weight);
    text-transform: var(--btn-text-text-transform);
    letter-spacing: var(--btn-text-letter-spacing);
    box-shadow: var(--btn-text-shadow);
    transition: var(--btn-text-transition);
  }

  .btn-text:hover {
    background-color: var(--btn-text-hover-bg);
    color: var(--btn-text-hover-color);
    border-color: var(--btn-text-hover-border-color);
    box-shadow: var(--btn-text-hover-shadow);
    transform: var(--btn-text-hover-transform);
  }

  /* Responsive Font Sizes */
  @media (max-width: 1024px) {
    .btn, button.btn, a.btn, input[type="submit"], input[type="button"], .wp-block-button__link {
      font-size: var(--btn-primary-font-size-tablet);
    }
    .btn-secondary { font-size: var(--btn-secondary-font-size-tablet); }
    .btn-outline { font-size: var(--btn-outline-font-size-tablet); }
    .btn-text { font-size: var(--btn-text-font-size-tablet); }
  }

  @media (max-width: 768px) {
    .btn, button.btn, a.btn, input[type="submit"], input[type="button"], .wp-block-button__link {
      font-size: var(--btn-primary-font-size-mobile);
    }
    .btn-secondary { font-size: var(--btn-secondary-font-size-mobile); }
    .btn-outline { font-size: var(--btn-outline-font-size-mobile); }
    .btn-text { font-size: var(--btn-text-font-size-mobile); }
  }

  /* Icon spacing in buttons */
  .btn svg,
  .btn i,
  .btn-secondary svg,
  .btn-secondary i,
  .btn-outline svg,
  .btn-outline i,
  .btn-text svg,
  .btn-text i {
    margin-right: var(--btn-icon-spacing);
    vertical-align: middle;
  }

  /* Disabled state */
  .btn:disabled,
  button.btn:disabled,
  .btn-secondary:disabled,
  .btn-outline:disabled,
  .btn-text:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  /* Focus styles for accessibility */
  .btn:focus-visible,
  button.btn:focus-visible,
  .btn-secondary:focus-visible,
  .btn-outline:focus-visible,
  .btn-text:focus-visible {
    outline: 2px solid var(--btn-primary-bg);
    outline-offset: 2px;
  }
`;

    // Create or update style element
    let styleEl = document.getElementById('button-styles');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'button-styles';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = css;

    // Cleanup on unmount
    return () => {
      // Don't remove styles on unmount to prevent flash
    };
  }, [settings]);

  return null;
};

export default ButtonStyleProvider;