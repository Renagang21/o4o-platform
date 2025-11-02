/**
 * Button Effects Settings Component
 * Manages hover effects, transitions, and shadows for button variants
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { MousePointer } from 'lucide-react';
import { SectionCard } from '../../common';
import { VariantSettingsProps } from './types';

/**
 * ButtonEffectsSettings Component
 *
 * Handles hover animations, transition durations, and shadow effects.
 * Provides controls for visual feedback on user interaction.
 */
export const ButtonEffectsSettings: React.FC<VariantSettingsProps> = ({
  settings,
  onChange
}) => {
  return (
    <SectionCard title="Hover Effects" icon={MousePointer}>
      <div className="space-y-4">
        {/* Hover Transform */}
        <div>
          <Label>Hover Transform</Label>
          <Select
            value={settings.hoverTransform || 'none'}
            onValueChange={(value) => onChange('hoverTransform', value as any)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="scale">Scale Up</SelectItem>
              <SelectItem value="translateY">Move Up</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Transition Duration */}
        <div>
          <Label>
            Transition Duration
            <span className="ml-2 text-sm text-gray-500">
              {settings.transitionDuration}ms
            </span>
          </Label>
          <Slider
            value={[settings.transitionDuration]}
            onValueChange={([value]) => onChange('transitionDuration', value)}
            min={0}
            max={1000}
            step={50}
            className="mt-2"
          />
        </div>

        {/* Shadow Effects */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Box Shadow</Label>
            <Select
              value={settings.boxShadow || 'none'}
              onValueChange={(value) => onChange('boxShadow', value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Hover Shadow</Label>
            <Select
              value={settings.hoverBoxShadow || 'none'}
              onValueChange={(value) => onChange('hoverBoxShadow', value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </SectionCard>
  );
};
