/**
 * Button Panel Local Types
 * Local type definitions for button customization components
 */

import { ButtonVariants, ButtonStyleSettings } from '../../../types/customizer-types';

/**
 * Button variant type
 */
export type ButtonVariantType = 'primary' | 'secondary' | 'outline' | 'text';

/**
 * Device type for responsive settings
 */
export type DeviceType = 'desktop' | 'tablet' | 'mobile';

/**
 * Props for variant-specific settings components
 */
export interface VariantSettingsProps {
  settings: ButtonStyleSettings;
  onChange: <K extends keyof ButtonStyleSettings>(
    field: K,
    value: ButtonStyleSettings[K]
  ) => void;
}

/**
 * Props for responsive settings components
 */
export interface ResponsiveSettingsProps extends VariantSettingsProps {
  device: DeviceType;
  onDeviceChange: (device: DeviceType) => void;
}

/**
 * Props for global button settings
 */
export interface GlobalSettingsProps {
  settings: ButtonVariants['global'];
  onChange: (field: string, value: any) => void;
}
