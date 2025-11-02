/**
 * Breadcrumbs Panel Utilities
 * Shared helper functions for breadcrumb settings management
 */

import { BreadcrumbsSettings } from '../../../types/customizer-types';

export const handleBreadcrumbChange = <K extends keyof BreadcrumbsSettings>(
  settings: BreadcrumbsSettings,
  onChange: (settings: BreadcrumbsSettings) => void,
  field: K,
  value: BreadcrumbsSettings[K]
) => {
  onChange({
    ...settings,
    [field]: value
  });
};

export const handleResponsiveFontSizeChange = (
  settings: BreadcrumbsSettings,
  onChange: (settings: BreadcrumbsSettings) => void,
  device: 'desktop' | 'tablet' | 'mobile',
  value: number
) => {
  onChange({
    ...settings,
    fontSize: {
      ...settings.fontSize,
      [device]: value
    }
  });
};
