/**
 * ColumnsBlockSettings Component
 * Sidebar settings for Columns block
 */

import React from 'react';
import { PanelBody } from '@/components/inspector/controls/PanelBody';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ColumnsVariationPicker } from './blocks/columns/ColumnsVariationPicker';
import { ColumnVariation } from '@/blocks/variations/columns-variations';

interface ColumnsBlockSettingsProps {
  settings: {
    columnCount?: number;
    verticalAlignment?: 'top' | 'center' | 'bottom';
    isStackedOnMobile?: boolean;
    [key: string]: any;
  };
  onChange: (settings: any) => void;
  onApplyVariation?: (variation: ColumnVariation) => void;
}

const ColumnsBlockSettings: React.FC<ColumnsBlockSettingsProps> = ({
  settings,
  onChange,
  onApplyVariation,
}) => {
  const {
    columnCount = 2,
    verticalAlignment = 'top',
    isStackedOnMobile = true,
  } = settings;

  const [showVariationPicker, setShowVariationPicker] = React.useState(false);

  return (
    <>
      {/* Layout Presets */}
      <PanelBody title="Layout Presets">
        <div className="space-y-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowVariationPicker(!showVariationPicker)}
          >
            {showVariationPicker ? 'Hide Presets' : 'Choose Preset Layout'}
          </Button>

          {showVariationPicker && onApplyVariation && (
            <div className="mt-4">
              <ColumnsVariationPicker
                onSelect={(variation) => {
                  onApplyVariation(variation);
                  setShowVariationPicker(false);
                }}
                onSkip={() => setShowVariationPicker(false)}
              />
            </div>
          )}
        </div>
      </PanelBody>

      {/* Column Settings */}
      <PanelBody title="Columns">
        <div className="space-y-4">
          {/* Column Count */}
          <div>
            <Label className="text-xs">Number of Columns</Label>
            <Select
              value={String(columnCount)}
              onValueChange={(value) =>
                onChange({ ...settings, columnCount: parseInt(value) })
              }
            >
              <SelectTrigger className="w-full mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Column</SelectItem>
                <SelectItem value="2">2 Columns</SelectItem>
                <SelectItem value="3">3 Columns</SelectItem>
                <SelectItem value="4">4 Columns</SelectItem>
                <SelectItem value="5">5 Columns</SelectItem>
                <SelectItem value="6">6 Columns</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              Current: {columnCount} column{columnCount !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Vertical Alignment */}
          <div>
            <Label className="text-xs mb-2 block">Vertical Alignment</Label>
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

          {/* Mobile Stacking */}
          <div>
            <Label className="text-xs flex items-center gap-2">
              <input
                type="checkbox"
                checked={isStackedOnMobile}
                onChange={(e) =>
                  onChange({ ...settings, isStackedOnMobile: e.target.checked })
                }
                className="rounded"
              />
              Stack on mobile devices
            </Label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              Columns will stack vertically on small screens
            </p>
          </div>
        </div>
      </PanelBody>

      {/* Column Width (Info only - actual width controlled by inner Column blocks) */}
      <PanelBody title="Column Widths">
        <div className="space-y-2">
          <p className="text-xs text-gray-600">
            Column widths are automatically calculated based on the number of columns.
            You can adjust individual column widths by selecting each column block.
          </p>
          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
            <strong>Current layout:</strong> {columnCount} column{columnCount !== 1 ? 's' : ''} × {(100 / columnCount).toFixed(1)}% each
          </div>
        </div>
      </PanelBody>
    </>
  );
};

export default ColumnsBlockSettings;
