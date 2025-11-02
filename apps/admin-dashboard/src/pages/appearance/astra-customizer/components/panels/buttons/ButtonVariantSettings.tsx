/**
 * Button Variant Settings Component
 * Manages color and border settings for individual button variants
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Palette, Layers } from 'lucide-react';
import { ColorInput, SectionCard } from '../../common';
import { VariantSettingsProps } from './types';

/**
 * ButtonVariantSettings Component
 *
 * Handles colors, borders, and spacing for a single button variant.
 * Includes background colors, text colors, hover states, borders, and padding.
 */
export const ButtonVariantSettings: React.FC<VariantSettingsProps> = ({
  settings,
  onChange
}) => {
  return (
    <div className="space-y-6">
      {/* Colors Section */}
      <SectionCard title="Colors" icon={Palette}>
        <div className="grid grid-cols-2 gap-4">
          <ColorInput
            label="Background Color"
            value={settings.backgroundColor}
            onChange={(value) => onChange('backgroundColor', value)}
          />
          <ColorInput
            label="Text Color"
            value={settings.textColor}
            onChange={(value) => onChange('textColor', value)}
          />
          <ColorInput
            label="Hover Background"
            value={settings.hoverBackgroundColor}
            onChange={(value) => onChange('hoverBackgroundColor', value)}
          />
          <ColorInput
            label="Hover Text"
            value={settings.hoverTextColor}
            onChange={(value) => onChange('hoverTextColor', value)}
          />
        </div>
      </SectionCard>

      {/* Border & Spacing Section */}
      <SectionCard title="Border & Spacing" icon={Layers}>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Border Width (px)</Label>
              <Input
                type="number"
                min="0"
                max="10"
                value={settings.borderWidth}
                onChange={(e) => onChange('borderWidth', parseInt(e.target.value) || 0)}
              />
            </div>

            <div>
              <Label>Border Style</Label>
              <Select
                value={settings.borderStyle}
                onValueChange={(value) => onChange('borderStyle', value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">Solid</SelectItem>
                  <SelectItem value="dashed">Dashed</SelectItem>
                  <SelectItem value="dotted">Dotted</SelectItem>
                  <SelectItem value="double">Double</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {settings.borderWidth > 0 && (
            <ColorInput
              label="Border Color"
              value={settings.borderColor}
              onChange={(value) => onChange('borderColor', value)}
            />
          )}

          <div>
            <Label>
              Border Radius
              <span className="ml-2 text-sm text-gray-500">
                {settings.borderRadius}px
              </span>
            </Label>
            <Slider
              value={[settings.borderRadius]}
              onValueChange={([value]) => onChange('borderRadius', value)}
              min={0}
              max={50}
              step={1}
              className="mt-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>
                Padding Vertical
                <span className="ml-2 text-sm text-gray-500">
                  {settings.paddingVertical}px
                </span>
              </Label>
              <Slider
                value={[settings.paddingVertical]}
                onValueChange={([value]) => onChange('paddingVertical', value)}
                min={4}
                max={30}
                step={1}
                className="mt-2"
              />
            </div>

            <div>
              <Label>
                Padding Horizontal
                <span className="ml-2 text-sm text-gray-500">
                  {settings.paddingHorizontal}px
                </span>
              </Label>
              <Slider
                value={[settings.paddingHorizontal]}
                onValueChange={([value]) => onChange('paddingHorizontal', value)}
                min={8}
                max={50}
                step={1}
                className="mt-2"
              />
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
};
