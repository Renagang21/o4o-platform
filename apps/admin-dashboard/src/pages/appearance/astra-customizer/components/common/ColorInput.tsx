/**
 * ColorInput Component
 * Reusable color picker with both color input and hex text input
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export interface ColorInputProps {
  /**
   * Label text to display above the color input
   */
  label: string;

  /**
   * Current color value (hex format)
   */
  value: string;

  /**
   * Callback when color value changes
   */
  onChange: (value: string) => void;

  /**
   * Optional placeholder text for the hex input
   * @default "#000000"
   */
  placeholder?: string;

  /**
   * Optional className for custom styling
   */
  className?: string;
}

/**
 * ColorInput Component
 *
 * Provides a dual-input color picker combining:
 * - Visual color picker input
 * - Text input for manual hex code entry
 *
 * @example
 * ```tsx
 * <ColorInput
 *   label="Background Color"
 *   value="#ffffff"
 *   onChange={(color) => handleChange('backgroundColor', color)}
 * />
 * ```
 */
export const ColorInput: React.FC<ColorInputProps> = ({
  label,
  value,
  onChange,
  placeholder = '#000000',
  className = ''
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-16 h-10 p-1 cursor-pointer"
          aria-label={`${label} color picker`}
        />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1"
          aria-label={`${label} hex value`}
        />
      </div>
    </div>
  );
};
