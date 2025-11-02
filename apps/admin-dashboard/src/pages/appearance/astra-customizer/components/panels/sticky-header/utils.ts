/**
 * Sticky Header Panel Utilities
 * Shared helper functions for sticky header settings management
 */

import { StickyHeaderSettings } from '../../../types/customizer-types';

export const handleStickyHeaderChange = <K extends keyof StickyHeaderSettings>(
  settings: StickyHeaderSettings,
  onChange: (settings: StickyHeaderSettings) => void,
  field: K,
  value: StickyHeaderSettings[K]
) => {
  onChange({
    ...settings,
    [field]: value
  });
};

export const handleStickyOnChange = (
  settings: StickyHeaderSettings,
  onChange: (settings: StickyHeaderSettings) => void,
  section: 'above' | 'primary' | 'below',
  checked: boolean
) => {
  const newStickyOn = checked
    ? [...settings.stickyOn, section]
    : settings.stickyOn.filter(s => s !== section);

  onChange({
    ...settings,
    stickyOn: newStickyOn
  });
};
