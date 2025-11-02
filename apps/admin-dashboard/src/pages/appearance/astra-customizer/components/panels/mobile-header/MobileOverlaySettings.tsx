/**
 * Mobile Overlay Settings Component
 * Overlay appearance and behavior for mobile menu
 */

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { MobileHeaderSettings } from '../../../types/customizer-types';
import { handleMobileHeaderChange } from './utils';

interface MobileOverlaySettingsProps {
  settings: MobileHeaderSettings;
  onChange: (settings: MobileHeaderSettings) => void;
}

export const MobileOverlaySettings: React.FC<MobileOverlaySettingsProps> = ({
  settings,
  onChange
}) => {
  const handleChange = <K extends keyof MobileHeaderSettings>(
    field: K,
    value: MobileHeaderSettings[K]
  ) => handleMobileHeaderChange(settings, onChange, field, value);

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h4 className="font-medium">Overlay</h4>

      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Switch
            id="overlay-enabled"
            checked={settings.overlayEnabled}
            onCheckedChange={(checked) => handleChange('overlayEnabled', checked)}
          />
          <Label htmlFor="overlay-enabled">Enable Overlay</Label>
        </div>

        {settings.overlayEnabled && (
          <>
            <div>
              <Label htmlFor="overlay-color">Overlay Color</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="color"
                  value={settings.overlayColor}
                  onChange={(e) => handleChange('overlayColor', e.target.value)}
                  className="w-16 h-10 p-1"
                />
                <Input
                  type="text"
                  value={settings.overlayColor}
                  onChange={(e) => handleChange('overlayColor', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="overlay-opacity">
                Overlay Opacity
                <span className="ml-2 text-sm text-gray-500">
                  {Math.round((settings.overlayOpacity || 0.5) * 100)}%
                </span>
              </Label>
              <Input
                id="overlay-opacity"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.overlayOpacity}
                onChange={(e) => handleChange('overlayOpacity', parseFloat(e.target.value))}
                className="mt-2"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
