/**
 * Sticky Header Panel Component
 * Customizer의 Sticky Header 설정 패널
 * Refactored to use sub-components for better organization
 */

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { StickyHeaderSettings } from '../../types/customizer-types';
import { StickySectionSettings } from './sticky-header/StickySectionSettings';
import { StickyShrinkSettings } from './sticky-header/StickyShrinkSettings';
import { StickyAppearanceSettings } from './sticky-header/StickyAppearanceSettings';

interface StickyHeaderPanelProps {
  settings?: StickyHeaderSettings;
  onChange: (settings: StickyHeaderSettings) => void;
}

const defaultSettings: StickyHeaderSettings = {
  enabled: false,
  triggerHeight: 100,
  stickyOn: ['primary'],
  shrinkEffect: false,
  shrinkHeight: {
    desktop: 60,
    tablet: 55,
    mobile: 50
  },
  backgroundColor: '#ffffff',
  backgroundOpacity: 1,
  boxShadow: true,
  shadowIntensity: 'medium',
  animationDuration: 300,
  hideOnScrollDown: false,
  zIndex: 999
};

export const StickyHeaderPanel: React.FC<StickyHeaderPanelProps> = ({
  settings: propSettings,
  onChange
}) => {
  const settings = { ...defaultSettings, ...propSettings };

  const handleChange = <K extends keyof StickyHeaderSettings>(
    field: K,
    value: StickyHeaderSettings[K]
  ) => {
    onChange({
      ...settings,
      [field]: value
    });
  };

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Sticky Header Settings</h3>

        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <Label htmlFor="sticky-enabled" className="text-base font-medium">
              Enable Sticky Header
            </Label>
            <p className="text-sm text-gray-600 mt-1">
              Header sticks to top when scrolling
            </p>
          </div>
          <Switch
            id="sticky-enabled"
            checked={settings.enabled}
            onCheckedChange={(checked) => handleChange('enabled', checked)}
          />
        </div>

        {settings.enabled && (
          <div className="space-y-6">
            <StickySectionSettings settings={settings} onChange={onChange} />
            <StickyShrinkSettings settings={settings} onChange={onChange} />
            <StickyAppearanceSettings settings={settings} onChange={onChange} />
          </div>
        )}
      </div>

      {/* Info Note */}
      <div className="bg-blue-50 p-3 rounded text-sm text-blue-900">
        <strong>Tip:</strong> Test the sticky header by scrolling in the preview window.
        Adjust trigger height and effects for the best user experience.
      </div>
    </div>
  );
};

export default StickyHeaderPanel;
