/**
 * LayoutSelector Component
 * 소셜 아이콘 레이아웃 선택기
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Layout,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Grid3x3,
  List,
  LayoutList,
  Tag,
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter
} from 'lucide-react';

interface LayoutSelectorProps {
  layout: 'horizontal' | 'vertical' | 'grid';
  alignment: 'left' | 'center' | 'right';
  spacing: number;
  showLabels: boolean;
  labelPosition: 'below' | 'beside';
  onLayoutChange: (layout: 'horizontal' | 'vertical' | 'grid') => void;
  onAlignmentChange: (alignment: 'left' | 'center' | 'right') => void;
  onSpacingChange: (spacing: number) => void;
  onShowLabelsChange: (show: boolean) => void;
  onLabelPositionChange: (position: 'below' | 'beside') => void;
}

export const LayoutSelector: React.FC<LayoutSelectorProps> = ({
  layout,
  alignment,
  spacing,
  showLabels,
  labelPosition,
  onLayoutChange,
  onAlignmentChange,
  onSpacingChange,
  onShowLabelsChange,
  onLabelPositionChange,
}) => {
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Layout className="h-4 w-4" />
        <Label className="text-sm font-medium">Layout Settings</Label>
      </div>

      {/* Layout Type */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-gray-700">Layout Type</Label>
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant={layout === 'horizontal' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onLayoutChange('horizontal')}
            className="h-12 flex flex-col items-center justify-center p-2"
          >
            <AlignHorizontalJustifyCenter className="h-4 w-4 mb-1" />
            <span className="text-xs">Horizontal</span>
          </Button>
          <Button
            variant={layout === 'vertical' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onLayoutChange('vertical')}
            className="h-12 flex flex-col items-center justify-center p-2"
          >
            <AlignVerticalJustifyCenter className="h-4 w-4 mb-1" />
            <span className="text-xs">Vertical</span>
          </Button>
          <Button
            variant={layout === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onLayoutChange('grid')}
            className="h-12 flex flex-col items-center justify-center p-2"
          >
            <Grid3x3 className="h-4 w-4 mb-1" />
            <span className="text-xs">Grid</span>
          </Button>
        </div>
      </div>

      {/* Alignment */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-gray-700">Alignment</Label>
        <div className="flex gap-2">
          <Button
            variant={alignment === 'left' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onAlignmentChange('left')}
            className="flex-1 h-8"
          >
            <AlignLeft className="h-3 w-3 mr-1" />
            Left
          </Button>
          <Button
            variant={alignment === 'center' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onAlignmentChange('center')}
            className="flex-1 h-8"
          >
            <AlignCenter className="h-3 w-3 mr-1" />
            Center
          </Button>
          <Button
            variant={alignment === 'right' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onAlignmentChange('right')}
            className="flex-1 h-8"
          >
            <AlignRight className="h-3 w-3 mr-1" />
            Right
          </Button>
        </div>
      </div>

      {/* Spacing */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-gray-700">
          Spacing: {spacing}px
        </Label>
        <input
          type="range"
          min="4"
          max="32"
          value={spacing}
          onChange={(e) => onSpacingChange(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>Tight</span>
          <span>Normal</span>
          <span>Wide</span>
        </div>
      </div>

      {/* Labels */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium text-gray-700">Show Labels</Label>
          <Button
            variant={showLabels ? 'default' : 'outline'}
            size="sm"
            onClick={() => onShowLabelsChange(!showLabels)}
            className="h-7 px-3 text-xs"
          >
            {showLabels ? 'Visible' : 'Hidden'}
          </Button>
        </div>

        {showLabels && (
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-700">Label Position</Label>
            <div className="flex gap-2">
              <Button
                variant={labelPosition === 'below' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onLabelPositionChange('below')}
                className="flex-1 h-8 text-xs"
              >
                <LayoutList className="h-3 w-3 mr-1" />
                Below Icon
              </Button>
              <Button
                variant={labelPosition === 'beside' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onLabelPositionChange('beside')}
                className="flex-1 h-8 text-xs"
              >
                <List className="h-3 w-3 mr-1" />
                Beside Icon
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-gray-700">Preview</Label>
        <div className="p-4 bg-white rounded border">
          <div
            className={`
              flex items-center
              ${layout === 'horizontal' ? 'flex-row' : ''}
              ${layout === 'vertical' ? 'flex-col' : ''}
              ${layout === 'grid' ? 'grid grid-cols-3' : ''}
              ${alignment === 'left' ? 'justify-start' : ''}
              ${alignment === 'center' ? 'justify-center' : ''}
              ${alignment === 'right' ? 'justify-end' : ''}
            `}
            style={{ gap: `${spacing / 2}px` }}
          >
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className={`
                  ${showLabels && labelPosition === 'below' ? 'flex flex-col items-center' : ''}
                  ${showLabels && labelPosition === 'beside' ? 'flex items-center' : ''}
                `}
              >
                <div className="w-6 h-6 bg-gray-300 rounded" />
                {showLabels && (
                  <div
                    className={`
                      text-xs text-gray-500
                      ${labelPosition === 'below' ? 'mt-1' : 'ml-1'}
                    `}
                  >
                    Icon
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
        <p><strong>Horizontal:</strong> Best for headers and footers</p>
        <p><strong>Vertical:</strong> Great for sidebars</p>
        <p><strong>Grid:</strong> Ideal for showcasing multiple platforms</p>
      </div>
    </div>
  );
};

export default LayoutSelector;