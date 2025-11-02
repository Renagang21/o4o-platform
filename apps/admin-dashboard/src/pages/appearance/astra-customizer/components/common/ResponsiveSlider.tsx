/**
 * ResponsiveSlider Component
 * Slider control with device-specific values for responsive settings
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { DeviceType } from './DeviceSwitcher';

export interface ResponsiveValue {
  desktop: number;
  tablet: number;
  mobile: number;
}

export interface ResponsiveSliderProps {
  /**
   * Label text to display above the slider
   */
  label: string;

  /**
   * Current responsive values for each device
   */
  values: ResponsiveValue;

  /**
   * Currently selected device
   */
  device: DeviceType;

  /**
   * Callback when value changes for current device
   */
  onChange: (device: DeviceType, value: number) => void;

  /**
   * Minimum slider value
   * @default 0
   */
  min?: number;

  /**
   * Maximum slider value
   * @default 100
   */
  max?: number;

  /**
   * Step increment
   * @default 1
   */
  step?: number;

  /**
   * Unit to display after the value (e.g., 'px', '%', 'rem')
   */
  unit?: string;

  /**
   * Optional className for custom styling
   */
  className?: string;
}

/**
 * ResponsiveSlider Component
 *
 * Provides a slider control that maintains separate values for desktop, tablet, and mobile.
 * The active value is determined by the current device selection.
 *
 * @example
 * ```tsx
 * <ResponsiveSlider
 *   label="Font Size"
 *   values={{ desktop: 16, tablet: 14, mobile: 12 }}
 *   device={device}
 *   onChange={(device, value) => handleChange('fontSize', { ...fontSize, [device]: value })}
 *   min={10}
 *   max={32}
 *   unit="px"
 * />
 * ```
 */
export const ResponsiveSlider: React.FC<ResponsiveSliderProps> = ({
  label,
  values,
  device,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  className = ''
}) => {
  const currentValue = values[device];

  return (
    <div className={`space-y-2 ${className}`}>
      <Label>
        {label}
        <span className="ml-2 text-sm text-gray-500">
          {currentValue}{unit} ({device})
        </span>
      </Label>
      <Slider
        value={[currentValue]}
        onValueChange={([value]) => onChange(device, value)}
        min={min}
        max={max}
        step={step}
        className="mt-2"
        aria-label={`${label} for ${device}`}
      />
    </div>
  );
};
