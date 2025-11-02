/**
 * Mobile Header Panel Component
 * Customizer의 Mobile Header 설정 패널
 * Refactored to use sub-components for better organization
 */

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { MobileHeaderSettings } from '../../types/customizer-types';
import { MobileLogoSettings } from './mobile-header/MobileLogoSettings';
import { MobileMenuSettings } from './mobile-header/MobileMenuSettings';
import { MobileOverlaySettings } from './mobile-header/MobileOverlaySettings';

interface MobileHeaderPanelProps {
  settings?: MobileHeaderSettings;
  onChange: (settings: MobileHeaderSettings) => void;
}

const defaultSettings: MobileHeaderSettings = {
  enabled: true,
  breakpoint: 768,
  mobileLogoUrl: '',
  mobileLogoWidth: 120,
  hamburgerStyle: 'default',
  menuPosition: 'left',
  menuAnimation: 'slide',
  overlayEnabled: true,
  overlayColor: '#000000',
  overlayOpacity: 0.5,
  backgroundColor: '#ffffff',
  textColor: '#000000',
  showAccountIcon: true,
  showCartIcon: true,
  showSearchIcon: false,
  submenuStyle: 'accordion',
  closeOnItemClick: false,
  swipeToClose: true
};

export const MobileHeaderPanel: React.FC<MobileHeaderPanelProps> = ({
  settings: propSettings,
  onChange
}) => {
  const settings = { ...defaultSettings, ...propSettings };

  const handleChange = <K extends keyof MobileHeaderSettings>(
    field: K,
    value: MobileHeaderSettings[K]
  ) => {
    onChange({
      ...settings,
      [field]: value
    });
  };

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Mobile Header Settings</h3>

        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <Label htmlFor="mobile-enabled" className="text-base font-medium">
              Enable Mobile Header
            </Label>
            <p className="text-sm text-gray-600 mt-1">
              Show mobile-optimized header on small screens
            </p>
          </div>
          <Switch
            id="mobile-enabled"
            checked={settings.enabled}
            onCheckedChange={(checked) => handleChange('enabled', checked)}
          />
        </div>

        {settings.enabled && (
          <div className="space-y-6">
            {/* Breakpoint */}
            <div className="space-y-2">
              <Label htmlFor="breakpoint">
                Mobile Breakpoint (px)
                <span className="ml-2 text-sm text-gray-500">
                  Default: 768px
                </span>
              </Label>
              <Input
                id="breakpoint"
                type="number"
                min="320"
                max="1024"
                value={settings.breakpoint}
                onChange={(e) => handleChange('breakpoint', parseInt(e.target.value) || 768)}
              />
              <p className="text-xs text-gray-500">
                Switch to mobile header below this screen width
              </p>
            </div>

            <MobileLogoSettings settings={settings} onChange={onChange} />
            <MobileMenuSettings settings={settings} onChange={onChange} />
            <MobileOverlaySettings settings={settings} onChange={onChange} />
          </div>
        )}
      </div>

      {/* Info Note */}
      <div className="bg-blue-50 p-3 rounded text-sm text-blue-900">
        <strong>Tip:</strong> The mobile header will automatically activate on screens smaller than the breakpoint.
        Test responsiveness by resizing the preview window.
      </div>
    </div>
  );
};

export default MobileHeaderPanel;
