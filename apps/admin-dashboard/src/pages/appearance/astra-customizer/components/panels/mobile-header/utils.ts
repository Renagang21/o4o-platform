/**
 * Mobile Header Panel Utilities
 * Shared helper functions for mobile header settings management
 */

import { MobileHeaderSettings } from '../../../types/customizer-types';

export const handleMobileHeaderChange = <K extends keyof MobileHeaderSettings>(
  settings: MobileHeaderSettings,
  onChange: (settings: MobileHeaderSettings) => void,
  field: K,
  value: MobileHeaderSettings[K]
) => {
  onChange({
    ...settings,
    [field]: value
  });
};
