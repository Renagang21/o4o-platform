/**
 * Sticky Appearance Settings Component
 * Background, shadow, and advanced options
 */

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { StickyHeaderSettings } from '../../../types/customizer-types';
import { ColorInput } from '../../common/ColorInput';
import { handleStickyHeaderChange } from './utils';

interface StickyAppearanceSettingsProps {
  settings: StickyHeaderSettings;
  onChange: (settings: StickyHeaderSettings) => void;
}

export const StickyAppearanceSettings: React.FC<StickyAppearanceSettingsProps> = ({
  settings,
  onChange
}) => {
  const handleChange = <K extends keyof StickyHeaderSettings>(
    field: K,
    value: StickyHeaderSettings[K]
  ) => handleStickyHeaderChange(settings, onChange, field, value);

  return (
    <>
      {/* Background Settings */}
      <div className="space-y-4">
        <h4 className="font-medium">Background</h4>
        <div className="space-y-3">
          <ColorInput
            label="Background Color"
            value={settings.backgroundColor}
            onChange={(value) => handleChange('backgroundColor', value)}
            placeholder="#ffffff"
          />
          <div>
            <Label htmlFor="bg-opacity">
              Background Opacity
              <span className="ml-2 text-sm text-gray-500">
                {Math.round(settings.backgroundOpacity * 100)}%
              </span>
            </Label>
            <Slider
              min={0}
              max={1}
              step={0.1}
              value={[settings.backgroundOpacity]}
              onValueChange={(value) => handleChange('backgroundOpacity', value[0])}
            />
          </div>
        </div>
      </div>

      {/* Shadow Settings */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="box-shadow"
            checked={settings.boxShadow}
            onCheckedChange={(checked) => handleChange('boxShadow', checked)}
          />
          <Label htmlFor="box-shadow">Enable Shadow</Label>
        </div>

        {settings.boxShadow && (
          <div className="pl-6">
            <Label htmlFor="shadow-intensity">Shadow Intensity</Label>
            <Select
              value={settings.shadowIntensity}
              onValueChange={(value) => handleChange('shadowIntensity', value as 'light' | 'medium' | 'strong')}
            >
              <SelectTrigger id="shadow-intensity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="strong">Strong</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Advanced Settings */}
      <div className="space-y-4">
        <h4 className="font-medium">Advanced</h4>

        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Switch
              id="hide-on-scroll"
              checked={settings.hideOnScrollDown || false}
              onCheckedChange={(checked) => handleChange('hideOnScrollDown', checked)}
            />
            <Label htmlFor="hide-on-scroll">Hide When Scrolling Down</Label>
          </div>

          <div>
            <Label htmlFor="animation-duration">
              Animation Duration (ms)
              <span className="ml-2 text-sm text-gray-500">
                {settings.animationDuration}ms
              </span>
            </Label>
            <Slider
              min={100}
              max={1000}
              step={50}
              value={[settings.animationDuration]}
              onValueChange={(value) => handleChange('animationDuration', value[0])}
            />
          </div>

          <div>
            <Label htmlFor="z-index">Z-Index</Label>
            <Input
              id="z-index"
              type="number"
              value={settings.zIndex}
              onChange={(e) => handleChange('zIndex', parseInt(e.target.value) || 999)}
            />
          </div>
        </div>
      </div>
    </>
  );
};
