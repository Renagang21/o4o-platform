/**
 * Blog Styling Settings Component
 * Handles colors, typography, border radius, and padding settings
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ColorInput, DeviceSwitcher } from '../../common';
import { ResponsiveBlogComponentProps } from './types';
import { handleNestedArchiveChange, handleResponsiveTypographyChange } from './utils';

/**
 * BlogStylingSettings Component
 * Renders color controls, typography settings, border radius, and padding controls
 */
export const BlogStylingSettings: React.FC<ResponsiveBlogComponentProps> = ({
  settings,
  onChange,
  device,
  setDevice
}) => {
  const handleNested = <T extends keyof typeof settings.archive>(
    section: T,
    field: keyof typeof settings.archive[T],
    value: any
  ) => {
    handleNestedArchiveChange(settings, section, field, value, onChange);
  };

  const handleResponsiveChange = (
    field: 'titleSize' | 'excerptSize' | 'metaSize',
    value: number
  ) => {
    handleResponsiveTypographyChange(settings, field, device, value, onChange);
  };

  const renderColorInput = (
    label: string,
    value: string,
    field: keyof typeof settings.archive.styling
  ) => (
    <ColorInput
      label={label}
      value={value}
      onChange={(value) => handleNested('styling', field as any, value)}
    />
  );

  return (
    <div className="space-y-6">
      {/* Device Switcher */}
      {setDevice && (
        <DeviceSwitcher value={device} onChange={setDevice} />
      )}

      {/* Colors */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium">Colors</h4>
        <div className="grid grid-cols-2 gap-4">
          {renderColorInput('Background Color', settings.archive.styling.backgroundColor, 'backgroundColor')}
          {renderColorInput('Border Color', settings.archive.styling.borderColor, 'borderColor')}
          {renderColorInput('Title Color', settings.archive.styling.titleColor, 'titleColor')}
          {renderColorInput('Title Hover Color', settings.archive.styling.titleHoverColor, 'titleHoverColor')}
          {renderColorInput('Excerpt Color', settings.archive.styling.excerptColor, 'excerptColor')}
        </div>
      </div>

      {/* Typography */}
      <div className="space-y-4 pt-4 border-t">
        <h4 className="text-sm font-medium">Typography ({device})</h4>

        <div className="space-y-2">
          <Label>Title Font Size</Label>
          <Input
            type="number"
            min="12"
            max="32"
            value={settings.archive.styling.typography.titleSize[device]}
            onChange={(e) => handleResponsiveChange('titleSize', parseInt(e.target.value) || 20)}
          />
        </div>

        <div className="space-y-2">
          <Label>Excerpt Font Size</Label>
          <Input
            type="number"
            min="10"
            max="20"
            value={settings.archive.styling.typography.excerptSize[device]}
            onChange={(e) => handleResponsiveChange('excerptSize', parseInt(e.target.value) || 14)}
          />
        </div>

        <div className="space-y-2">
          <Label>Meta Font Size</Label>
          <Input
            type="number"
            min="8"
            max="16"
            value={settings.archive.styling.typography.metaSize[device]}
            onChange={(e) => handleResponsiveChange('metaSize', parseInt(e.target.value) || 12)}
          />
        </div>

        <div className="space-y-2">
          <Label>Title Font Weight</Label>
          <Select
            value={settings.archive.styling.typography.titleWeight.toString()}
            onValueChange={(value) => handleNested('styling', 'typography', {
              ...settings.archive.styling.typography,
              titleWeight: parseInt(value)
            })}
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
      </div>

      {/* Spacing & Border */}
      <div className="space-y-4 pt-4 border-t">
        <h4 className="text-sm font-medium">Spacing & Border</h4>

        {/* Border Radius */}
        <div>
          <Label>
            Border Radius
            <span className="ml-2 text-sm text-gray-500">
              {settings.archive.styling.borderRadius}px
            </span>
          </Label>
          <Slider
            value={[settings.archive.styling.borderRadius]}
            onValueChange={([value]) => handleNested('styling', 'borderRadius', value)}
            min={0}
            max={20}
            step={1}
            className="mt-2"
          />
        </div>

        {/* Card Padding */}
        <div>
          <Label>
            Card Padding
            <span className="ml-2 text-sm text-gray-500">
              {settings.archive.styling.cardPadding}px
            </span>
          </Label>
          <Slider
            value={[settings.archive.styling.cardPadding]}
            onValueChange={([value]) => handleNested('styling', 'cardPadding', value)}
            min={10}
            max={40}
            step={2}
            className="mt-2"
          />
        </div>
      </div>
    </div>
  );
};
