/**
 * HighlightSelector Component
 * 텍스트 하이라이트 색상 및 스타일 선택기
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Highlighter, X } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface HighlightSelectorProps {
  selectedColor: string;
  opacity: number;
  onColorChange: (color: string) => void;
  onOpacityChange: (opacity: number) => void;
  onClear: () => void;
  onApply: () => void;
}

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: '#fef08a', rgb: '254, 240, 138' },
  { name: 'Green', value: '#bbf7d0', rgb: '187, 247, 208' },
  { name: 'Blue', value: '#bfdbfe', rgb: '191, 219, 254' },
  { name: 'Purple', value: '#ddd6fe', rgb: '221, 214, 254' },
  { name: 'Pink', value: '#fce7f3', rgb: '252, 231, 243' },
  { name: 'Orange', value: '#fed7aa', rgb: '254, 215, 170' },
  { name: 'Red', value: '#fecaca', rgb: '254, 202, 202' },
  { name: 'Gray', value: '#e5e7eb', rgb: '229, 231, 235' },
];

export const HighlightSelector: React.FC<HighlightSelectorProps> = ({
  selectedColor,
  opacity,
  onColorChange,
  onOpacityChange,
  onClear,
  onApply,
}) => {
  const getRgbaColor = (hexColor: string, alpha: number) => {
    const colorData = HIGHLIGHT_COLORS.find(c => c.value === hexColor);
    if (colorData) {
      return `rgba(${colorData.rgb}, ${alpha})`;
    }
    // Fallback: convert hex to rgba
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 px-2 gap-2"
          title="Text Highlight"
        >
          <Highlighter className="h-4 w-4" />
          Highlight
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Text Highlight</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-8 px-2 text-gray-500 hover:text-gray-700"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>

          {/* Color Grid */}
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-2 block">
              Colors
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={color.value}
                  className={`
                    w-full h-12 rounded border-2 transition-all
                    ${selectedColor === color.value
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-gray-300 hover:border-gray-400'
                    }
                  `}
                  style={{
                    backgroundColor: getRgbaColor(color.value, opacity),
                  }}
                  onClick={() => onColorChange(color.value)}
                  title={color.name}
                >
                  <div className="text-xs font-medium text-gray-700 p-1">
                    Aa
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Opacity */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-700">
              Opacity ({Math.round(opacity * 100)}%)
            </Label>
            <Slider
              value={[opacity]}
              onValueChange={(value) => onOpacityChange(value[0])}
              min={0.1}
              max={1.0}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>10%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-700">Preview</Label>
            <div className="p-3 bg-white rounded border">
              <p className="text-sm">
                This is{' '}
                <span
                  style={{
                    background: selectedColor ? getRgbaColor(selectedColor, opacity) : 'transparent',
                  }}
                >
                  highlighted text
                </span>{' '}
                with your selected color and opacity.
              </p>
            </div>
          </div>

          {/* Apply Button */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              size="sm"
              onClick={onApply}
              disabled={!selectedColor}
              className="flex-1"
            >
              Apply Highlight
            </Button>
          </div>

          {/* Quick Tips */}
          <div className="text-xs text-gray-500 space-y-1">
            <p><strong>Tip:</strong> Select text first, then apply highlight</p>
            <p><strong>Shortcut:</strong> Ctrl/Cmd + Shift + H</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default HighlightSelector;