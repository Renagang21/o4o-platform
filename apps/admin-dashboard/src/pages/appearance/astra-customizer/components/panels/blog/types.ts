/**
 * Blog Panel Local Type Definitions
 * Additional types specific to blog panel components
 */

import { BlogSettings } from '../../../types/customizer-types';

/**
 * Common props for all blog sub-components
 */
export interface BlogSubComponentProps {
  settings: BlogSettings;
  onChange: (settings: BlogSettings) => void;
}

/**
 * Props for components that need device state
 */
export interface ResponsiveBlogComponentProps extends BlogSubComponentProps {
  device: 'desktop' | 'tablet' | 'mobile';
  setDevice?: (device: 'desktop' | 'tablet' | 'mobile') => void;
}

/**
 * Color input section type
 */
export type ColorInputSection = 'styling' | 'meta';
