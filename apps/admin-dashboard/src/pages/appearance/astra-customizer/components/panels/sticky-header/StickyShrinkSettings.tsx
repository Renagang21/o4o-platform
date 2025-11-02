/**
 * Sticky Shrink Settings Component
 * Shrink effect and responsive heights
 */

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { StickyHeaderSettings } from '../../../types/customizer-types';
import { handleStickyHeaderChange } from './utils';

interface StickyShrinkSettingsProps {
  settings: StickyHeaderSettings;
  onChange: (settings: StickyHeaderSettings) => void;
}

export const StickyShrinkSettings: React.FC<StickyShrinkSettingsProps> = ({
  settings,
  onChange
}) => {
  const handleChange = <K extends keyof StickyHeaderSettings>(
    field: K,
    value: StickyHeaderSettings[K]
  ) => handleStickyHeaderChange(settings, onChange, field, value);

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Switch
          id="shrink-effect"
          checked={settings.shrinkEffect}
          onCheckedChange={(checked) => handleChange('shrinkEffect', checked)}
        />
        <Label htmlFor="shrink-effect">Enable Shrink Effect</Label>
      </div>

      {settings.shrinkEffect && (
        <div className="pl-6 space-y-3">
          <div>
            <Label htmlFor="shrink-desktop">Desktop Height (px)</Label>
            <Input
              id="shrink-desktop"
              type="number"
              value={settings.shrinkHeight.desktop}
              onChange={(e) =>
                handleChange('shrinkHeight', {
                  ...settings.shrinkHeight,
                  desktop: parseInt(e.target.value) || 60
                })
              }
            />
          </div>
          <div>
            <Label htmlFor="shrink-tablet">Tablet Height (px)</Label>
            <Input
              id="shrink-tablet"
              type="number"
              value={settings.shrinkHeight.tablet}
              onChange={(e) =>
                handleChange('shrinkHeight', {
                  ...settings.shrinkHeight,
                  tablet: parseInt(e.target.value) || 55
                })
              }
            />
          </div>
          <div>
            <Label htmlFor="shrink-mobile">Mobile Height (px)</Label>
            <Input
              id="shrink-mobile"
              type="number"
              value={settings.shrinkHeight.mobile}
              onChange={(e) =>
                handleChange('shrinkHeight', {
                  ...settings.shrinkHeight,
                  mobile: parseInt(e.target.value) || 50
                })
              }
            />
          </div>
        </div>
      )}
    </div>
  );
};
