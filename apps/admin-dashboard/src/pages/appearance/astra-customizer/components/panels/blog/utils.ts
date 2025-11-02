/**
 * Blog Panel Utility Functions
 * Shared helper functions for blog settings management
 */

import { BlogSettings, PostMetaItem } from '../../../types/customizer-types';

/**
 * Handle top-level archive settings change
 */
export const handleArchiveChange = <K extends keyof BlogSettings['archive']>(
  settings: BlogSettings,
  field: K,
  value: BlogSettings['archive'][K],
  onChange: (settings: BlogSettings) => void
) => {
  onChange({
    ...settings,
    archive: {
      ...settings.archive,
      [field]: value
    }
  });
};

/**
 * Handle nested archive settings change
 */
export const handleNestedArchiveChange = <T extends keyof BlogSettings['archive']>(
  settings: BlogSettings,
  section: T,
  field: keyof BlogSettings['archive'][T],
  value: any,
  onChange: (settings: BlogSettings) => void
) => {
  onChange({
    ...settings,
    archive: {
      ...settings.archive,
      [section]: {
        ...(settings.archive[section] as any),
        [field]: value
      }
    }
  });
};

/**
 * Handle responsive typography changes
 */
export const handleResponsiveTypographyChange = (
  settings: BlogSettings,
  field: 'titleSize' | 'excerptSize' | 'metaSize',
  device: 'desktop' | 'tablet' | 'mobile',
  value: number,
  onChange: (settings: BlogSettings) => void
) => {
  onChange({
    ...settings,
    archive: {
      ...settings.archive,
      styling: {
        ...settings.archive.styling,
        typography: {
          ...settings.archive.styling.typography,
          [field]: {
            ...settings.archive.styling.typography[field],
            [device]: value
          }
        }
      }
    }
  });
};

/**
 * Handle meta item changes
 */
export const handleMetaItemChange = (
  settings: BlogSettings,
  itemId: string,
  field: keyof PostMetaItem,
  value: any,
  onChange: (settings: BlogSettings) => void
) => {
  const updatedItems = settings.archive.meta.items.map(item =>
    item.id === itemId ? { ...item, [field]: value } : item
  );

  handleNestedArchiveChange(settings, 'meta', 'items', updatedItems, onChange);
};

/**
 * Handle meta color changes
 */
export const handleMetaColorChange = (
  settings: BlogSettings,
  field: 'text' | 'links' | 'icons',
  value: string,
  onChange: (settings: BlogSettings) => void
) => {
  handleNestedArchiveChange(settings, 'meta', 'colors', {
    ...settings.archive.meta.colors,
    [field]: value
  }, onChange);
};
