/**
 * Breadcrumb Styling Settings Component
 * Colors and typography settings
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BreadcrumbsSettings } from '../../../types/customizer-types';
import { ColorInput } from '../../common/ColorInput';
import { DeviceSwitcher } from '../../common/DeviceSwitcher';
import { handleBreadcrumbChange, handleResponsiveFontSizeChange } from './utils';

interface BreadcrumbStylingSettingsProps {
  settings: BreadcrumbsSettings;
  onChange: (settings: BreadcrumbsSettings) => void;
  device: 'desktop' | 'tablet' | 'mobile';
  setDevice: (device: 'desktop' | 'tablet' | 'mobile') => void;
}

export const BreadcrumbStylingSettings: React.FC<BreadcrumbStylingSettingsProps> = ({
  settings,
  onChange,
  device,
  setDevice
}) => {
  const handleChange = <K extends keyof BreadcrumbsSettings>(
    field: K,
    value: BreadcrumbsSettings[K]
  ) => handleBreadcrumbChange(settings, onChange, field, value);

  return (
    <div className="space-y-6">
      {/* Colors Section */}
      <div>
        <h4 className="font-medium mb-4">Colors</h4>
        <div className="grid grid-cols-2 gap-4">
          <ColorInput
            label="Link Color"
            value={settings.linkColor}
            onChange={(value) => handleChange('linkColor', value)}
            placeholder="#0073e6"
          />
          <ColorInput
            label="Current Page Color"
            value={settings.currentPageColor}
            onChange={(value) => handleChange('currentPageColor', value)}
            placeholder="#333333"
          />
          <ColorInput
            label="Separator Color"
            value={settings.separatorColor}
            onChange={(value) => handleChange('separatorColor', value)}
            placeholder="#999999"
          />
          <ColorInput
            label="Hover Color"
            value={settings.hoverColor}
            onChange={(value) => handleChange('hoverColor', value)}
            placeholder="#005bb5"
          />
        </div>
      </div>

      {/* Typography Section */}
      <div>
        <h4 className="font-medium mb-4">Typography</h4>

        {/* Device Switcher */}
        <DeviceSwitcher value={device} onChange={setDevice} />

        <div className="space-y-4 mt-4">
          <div>
            <Label>Font Size ({device})</Label>
            <Input
              type="number"
              min="10"
              max="24"
              value={settings.fontSize[device]}
              onChange={(e) =>
                handleResponsiveFontSizeChange(
                  settings,
                  onChange,
                  device,
                  parseInt(e.target.value) || 14
                )
              }
            />
          </div>

          <div>
            <Label>Font Weight</Label>
            <Select
              value={settings.fontWeight.toString()}
              onValueChange={(value) => handleChange('fontWeight', parseInt(value) as any)}
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

          <div>
            <Label>Text Transform</Label>
            <Select
              value={settings.textTransform}
              onValueChange={(value) => handleChange('textTransform', value as any)}
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
      </div>
    </div>
  );
};
