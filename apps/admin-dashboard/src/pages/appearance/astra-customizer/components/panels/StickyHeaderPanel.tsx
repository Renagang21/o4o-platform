/**
 * Sticky Header Panel Component
 * Customizer의 Sticky Header 설정 패널
 */

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { StickyHeaderSettings, ResponsiveValue } from '../../types/customizer-types';

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

  const handleStickyOnChange = (section: 'above' | 'primary' | 'below', checked: boolean) => {
    const newStickyOn = checked
      ? [...settings.stickyOn, section]
      : settings.stickyOn.filter(s => s !== section);
    handleChange('stickyOn', newStickyOn);
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
          <>
            {/* Sticky Sections */}
            <div className="space-y-4 mb-6">
              <Label>Apply Sticky To</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sticky-above"
                    checked={settings.stickyOn.includes('above')}
                    onCheckedChange={(checked) => 
                      handleStickyOnChange('above', checked as boolean)
                    }
                  />
                  <Label htmlFor="sticky-above" className="font-normal">
                    Above Header Row
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sticky-primary"
                    checked={settings.stickyOn.includes('primary')}
                    onCheckedChange={(checked) => 
                      handleStickyOnChange('primary', checked as boolean)
                    }
                  />
                  <Label htmlFor="sticky-primary" className="font-normal">
                    Primary Header Row
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sticky-below"
                    checked={settings.stickyOn.includes('below')}
                    onCheckedChange={(checked) => 
                      handleStickyOnChange('below', checked as boolean)
                    }
                  />
                  <Label htmlFor="sticky-below" className="font-normal">
                    Below Header Row
                  </Label>
                </div>
              </div>
            </div>

            {/* Trigger Height */}
            <div className="space-y-2 mb-6">
              <Label htmlFor="trigger-height">
                Trigger After Scrolling (px)
                <span className="ml-2 text-sm text-gray-500">
                  Current: {settings.triggerHeight}px
                </span>
              </Label>
              <Slider
                id="trigger-height"
                min={0}
                max={500}
                step={10}
                value={[settings.triggerHeight]}
                onValueChange={(value) => handleChange('triggerHeight', value[0])}
                className="w-full"
              />
            </div>

            {/* Shrink Effect */}
            <div className="space-y-4 mb-6">
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
                      onChange={(e) => handleChange('shrinkHeight', {
                        ...settings.shrinkHeight,
                        desktop: parseInt(e.target.value) || 60
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="shrink-tablet">Tablet Height (px)</Label>
                    <Input
                      id="shrink-tablet"
                      type="number"
                      value={settings.shrinkHeight.tablet}
                      onChange={(e) => handleChange('shrinkHeight', {
                        ...settings.shrinkHeight,
                        tablet: parseInt(e.target.value) || 55
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="shrink-mobile">Mobile Height (px)</Label>
                    <Input
                      id="shrink-mobile"
                      type="number"
                      value={settings.shrinkHeight.mobile}
                      onChange={(e) => handleChange('shrinkHeight', {
                        ...settings.shrinkHeight,
                        mobile: parseInt(e.target.value) || 50
                      })}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Background Settings */}
            <div className="space-y-4 mb-6">
              <h4 className="font-medium">Background</h4>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="bg-color">Background Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="bg-color-picker"
                      type="color"
                      value={settings.backgroundColor}
                      onChange={(e) => handleChange('backgroundColor', e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      id="bg-color"
                      type="text"
                      value={settings.backgroundColor}
                      onChange={(e) => handleChange('backgroundColor', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="bg-opacity">
                    Background Opacity
                    <span className="ml-2 text-sm text-gray-500">
                      {Math.round(settings.backgroundOpacity * 100)}%
                    </span>
                  </Label>
                  <Slider
                    id="bg-opacity"
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
            <div className="space-y-4 mb-6">
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
            <div className="space-y-4 mb-6">
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
                    id="animation-duration"
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