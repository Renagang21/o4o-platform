/**
 * ColumnBlockSettings Component
 * Sidebar settings for individual Column block (inside Columns)
 */

import React from 'react';
import { PanelBody } from '@/components/inspector/controls/PanelBody';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

interface ColumnBlockSettingsProps {
  settings: {
    width?: number; // Percentage
    verticalAlignment?: 'top' | 'center' | 'bottom';
    [key: string]: any;
  };
  onChange: (settings: any) => void;
}

const ColumnBlockSettings: React.FC<ColumnBlockSettingsProps> = ({
  settings,
  onChange,
}) => {
  const {
    width = 50,
    verticalAlignment = 'top',
  } = settings;

  return (
    <>
      {/* Width Settings */}
      <PanelBody title="Width">
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Column Width (%)</Label>
            <div className="flex gap-2 mt-1">
              <Input
                type="number"
                min="5"
                max="100"
                step="0.1"
                value={width}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    width: Math.max(5, Math.min(100, parseFloat(e.target.value) || 50))
                  })
                }
                className="flex-1"
              />
              <span className="text-sm text-gray-500 self-center">%</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Current width: {width.toFixed(1)}%
            </p>
          </div>

          {/* Quick Width Presets */}
          <div>
            <Label className="text-xs mb-2 block">Quick Presets</Label>
            <div className="grid grid-cols-4 gap-2">
              {[25, 33.33, 50, 66.67, 75, 100].map((preset) => (
                <Button
                  key={preset}
                  variant={Math.abs(width - preset) < 0.5 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onChange({ ...settings, width: preset })}
                  className="text-xs"
                >
                  {preset === 33.33 ? '33%' : preset === 66.67 ? '67%' : `${preset}%`}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </PanelBody>

      {/* Vertical Alignment */}
      <PanelBody title="Vertical Alignment">
        <div className="space-y-4">
          <div>
            <Label className="text-xs mb-2 block">Content Alignment</Label>
            <div className="flex gap-2">
              <Button
                variant={verticalAlignment === 'top' ? 'default' : 'outline'}
                size="sm"
                onClick={() =>
                  onChange({ ...settings, verticalAlignment: 'top' })
                }
                className="flex-1"
                title="Align Top"
              >
                <AlignLeft className="h-4 w-4 rotate-90" />
              </Button>
              <Button
                variant={verticalAlignment === 'center' ? 'default' : 'outline'}
                size="sm"
                onClick={() =>
                  onChange({ ...settings, verticalAlignment: 'center' })
                }
                className="flex-1"
                title="Align Center"
              >
                <AlignCenter className="h-4 w-4 rotate-90" />
              </Button>
              <Button
                variant={verticalAlignment === 'bottom' ? 'default' : 'outline'}
                size="sm"
                onClick={() =>
                  onChange({ ...settings, verticalAlignment: 'bottom' })
                }
                className="flex-1"
                title="Align Bottom"
              >
                <AlignRight className="h-4 w-4 rotate-90" />
              </Button>
            </div>
          </div>
        </div>
      </PanelBody>
    </>
  );
};

export default ColumnBlockSettings;
