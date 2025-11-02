/**
 * Sticky Section Settings Component
 * Which header sections should be sticky and trigger height
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { StickyHeaderSettings } from '../../../types/customizer-types';
import { handleStickyHeaderChange, handleStickyOnChange } from './utils';

interface StickySectionSettingsProps {
  settings: StickyHeaderSettings;
  onChange: (settings: StickyHeaderSettings) => void;
}

export const StickySectionSettings: React.FC<StickySectionSettingsProps> = ({
  settings,
  onChange
}) => {
  const handleChange = <K extends keyof StickyHeaderSettings>(
    field: K,
    value: StickyHeaderSettings[K]
  ) => handleStickyHeaderChange(settings, onChange, field, value);

  return (
    <>
      {/* Sticky Sections */}
      <div className="space-y-4">
        <Label>Apply Sticky To</Label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="sticky-above"
              checked={settings.stickyOn.includes('above')}
              onCheckedChange={(checked) =>
                handleStickyOnChange(settings, onChange, 'above', checked as boolean)
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
                handleStickyOnChange(settings, onChange, 'primary', checked as boolean)
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
                handleStickyOnChange(settings, onChange, 'below', checked as boolean)
              }
            />
            <Label htmlFor="sticky-below" className="font-normal">
              Below Header Row
            </Label>
          </div>
        </div>
      </div>

      {/* Trigger Height */}
      <div className="space-y-2">
        <Label htmlFor="trigger-height">
          Trigger After Scrolling (px)
          <span className="ml-2 text-sm text-gray-500">
            Current: {settings.triggerHeight}px
          </span>
        </Label>
        <Slider
          min={0}
          max={500}
          step={10}
          value={[settings.triggerHeight]}
          onValueChange={(value) => handleChange('triggerHeight', value[0])}
          className="w-full"
        />
      </div>
    </>
  );
};
