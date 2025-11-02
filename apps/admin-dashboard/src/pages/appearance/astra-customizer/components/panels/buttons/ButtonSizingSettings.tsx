/**
 * Button Sizing Settings Component
 * Manages typography and responsive sizing for button variants
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Type } from 'lucide-react';
import { DeviceSwitcher, SectionCard } from '../../common';
import { ResponsiveSettingsProps, DeviceType } from './types';

/**
 * ButtonSizingSettings Component
 *
 * Handles responsive font sizes, font weights, text transformations,
 * and letter spacing for button text.
 */
export const ButtonSizingSettings: React.FC<ResponsiveSettingsProps> = ({
  settings,
  device,
  onChange,
  onDeviceChange
}) => {
  /**
   * Handle responsive font size change
   */
  const handleResponsiveChange = (value: number) => {
    onChange('fontSize', {
      ...settings.fontSize,
      [device]: value
    });
  };

  return (
    <SectionCard title="Typography" icon={Type}>
      <div className="space-y-4">
        {/* Device Switcher */}
        <DeviceSwitcher value={device} onChange={onDeviceChange} />

        {/* Font Size (Responsive) */}
        <div>
          <Label>Font Size ({device})</Label>
          <Input
            type="number"
            min="10"
            max="30"
            value={settings.fontSize[device]}
            onChange={(e) => handleResponsiveChange(parseInt(e.target.value) || 14)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Font Weight */}
          <div>
            <Label>Font Weight</Label>
            <Select
              value={settings.fontWeight.toString()}
              onValueChange={(value) => onChange('fontWeight', parseInt(value) as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="300">Light (300)</SelectItem>
                <SelectItem value="400">Normal (400)</SelectItem>
                <SelectItem value="500">Medium (500)</SelectItem>
                <SelectItem value="600">Semi Bold (600)</SelectItem>
                <SelectItem value="700">Bold (700)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Text Transform */}
          <div>
            <Label>Text Transform</Label>
            <Select
              value={settings.textTransform}
              onValueChange={(value) => onChange('textTransform', value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="uppercase">UPPERCASE</SelectItem>
                <SelectItem value="lowercase">lowercase</SelectItem>
                <SelectItem value="capitalize">Capitalize</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Letter Spacing */}
        <div>
          <Label>
            Letter Spacing
            <span className="ml-2 text-sm text-gray-500">
              {settings.letterSpacing}px
            </span>
          </Label>
          <Slider
            value={[settings.letterSpacing]}
            onValueChange={([value]) => onChange('letterSpacing', value)}
            min={-2}
            max={5}
            step={0.5}
            className="mt-2"
          />
        </div>
      </div>
    </SectionCard>
  );
};
