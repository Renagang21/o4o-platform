/**
 * Button Panel Utilities
 * Shared helper functions for button customization
 */

import { ButtonStyleSettings, ButtonVariants } from '../../../types/customizer-types';

/**
 * Default button style settings
 */
export const defaultButtonStyle: ButtonStyleSettings = {
  backgroundColor: '#0073e6',
  textColor: '#ffffff',
  borderWidth: 0,
  borderColor: '#0073e6',
  borderStyle: 'solid',
  borderRadius: 4,
  paddingVertical: 12,
  paddingHorizontal: 24,
  hoverBackgroundColor: '#005bb5',
  hoverTextColor: '#ffffff',
  hoverBorderColor: '#005bb5',
  hoverTransform: 'none',
  transitionDuration: 300,
  fontSize: { desktop: 16, tablet: 15, mobile: 14 },
  fontWeight: 500,
  textTransform: 'none',
  letterSpacing: 0,
  boxShadow: 'none',
  hoverBoxShadow: 'small'
};

/**
 * Default settings for all button variants
 */
export const defaultSettings: ButtonVariants = {
  primary: defaultButtonStyle,
  secondary: {
    backgroundColor: '#6c757d',
    hoverBackgroundColor: '#5a6268'
  },
  outline: {
    backgroundColor: 'transparent',
    textColor: '#0073e6',
    borderWidth: 2,
    hoverBackgroundColor: '#0073e6',
    hoverTextColor: '#ffffff'
  },
  text: {
    backgroundColor: 'transparent',
    textColor: '#0073e6',
    borderWidth: 0,
    hoverBackgroundColor: 'rgba(0, 115, 230, 0.1)',
    boxShadow: 'none'
  },
  global: {
    minHeight: 40,
    displayType: 'inline-block',
    iconSpacing: 8
  }
};

/**
 * Merge user settings with default settings
 */
export const mergeButtonSettings = (
  propSettings?: ButtonVariants
): ButtonVariants => {
  return {
    ...defaultSettings,
    ...propSettings,
    primary: { ...defaultSettings.primary, ...propSettings?.primary },
    secondary: { ...defaultButtonStyle, ...defaultSettings.secondary, ...propSettings?.secondary },
    outline: { ...defaultButtonStyle, ...defaultSettings.outline, ...propSettings?.outline },
    text: { ...defaultButtonStyle, ...defaultSettings.text, ...propSettings?.text }
  };
};

/**
 * Get style object for button preview
 */
export const getButtonPreviewStyle = (
  settings: ButtonStyleSettings,
  device: 'desktop' | 'tablet' | 'mobile'
) => {
  return {
    backgroundColor: settings.backgroundColor,
    color: settings.textColor,
    borderWidth: `${settings.borderWidth}px`,
    borderColor: settings.borderColor,
    borderStyle: settings.borderStyle,
    borderRadius: `${settings.borderRadius}px`,
    padding: `${settings.paddingVertical}px ${settings.paddingHorizontal}px`,
    fontSize: `${settings.fontSize[device]}px`,
    fontWeight: settings.fontWeight,
    textTransform: settings.textTransform,
    letterSpacing: `${settings.letterSpacing}px`,
    transition: `all ${settings.transitionDuration}ms ease`
  };
};
