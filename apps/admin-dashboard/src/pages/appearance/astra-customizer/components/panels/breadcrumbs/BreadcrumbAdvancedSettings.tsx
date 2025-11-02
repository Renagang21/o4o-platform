/**
 * Breadcrumb Advanced Settings Component
 * Spacing, margins, and truncation settings
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { BreadcrumbsSettings } from '../../../types/customizer-types';
import { handleBreadcrumbChange } from './utils';

interface BreadcrumbAdvancedSettingsProps {
  settings: BreadcrumbsSettings;
  onChange: (settings: BreadcrumbsSettings) => void;
}

export const BreadcrumbAdvancedSettings: React.FC<BreadcrumbAdvancedSettingsProps> = ({
  settings,
  onChange
}) => {
  const handleChange = <K extends keyof BreadcrumbsSettings>(
    field: K,
    value: BreadcrumbsSettings[K]
  ) => handleBreadcrumbChange(settings, onChange, field, value);

  return (
    <div className="space-y-6">
      <div>
        <Label>
          Item Spacing
          <span className="ml-2 text-sm text-gray-500">
            {settings.itemSpacing}px
          </span>
        </Label>
        <Slider
          value={[settings.itemSpacing]}
          onValueChange={([value]) => handleChange('itemSpacing', value)}
          min={4}
          max={20}
          step={1}
          className="mt-2"
        />
      </div>

      <div>
        <Label>
          Margin Top
          <span className="ml-2 text-sm text-gray-500">
            {settings.marginTop}px
          </span>
        </Label>
        <Slider
          value={[settings.marginTop]}
          onValueChange={([value]) => handleChange('marginTop', value)}
          min={0}
          max={40}
          step={1}
          className="mt-2"
        />
      </div>

      <div>
        <Label>
          Margin Bottom
          <span className="ml-2 text-sm text-gray-500">
            {settings.marginBottom}px
          </span>
        </Label>
        <Slider
          value={[settings.marginBottom]}
          onValueChange={([value]) => handleChange('marginBottom', value)}
          min={0}
          max={40}
          step={1}
          className="mt-2"
        />
      </div>

      <div>
        <Label>Max Characters per Item</Label>
        <Input
          type="number"
          min="10"
          max="100"
          value={settings.maxLength}
          onChange={(e) => handleChange('maxLength', parseInt(e.target.value) || 30)}
        />
        <p className="text-xs text-gray-500 mt-1">
          Long breadcrumb items will be truncated
        </p>
      </div>
    </div>
  );
};
