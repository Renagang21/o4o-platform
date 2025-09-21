/**
 * DropCapController Component
 * Drop Cap (첫 글자 대문자) 기능 제어 컴포넌트
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Type, RotateCcw } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DropCapControllerProps {
  isEnabled: boolean;
  lines: number;
  color: string;
  fontSize: number;
  fontWeight: number;
  onToggle: (enabled: boolean) => void;
  onLinesChange: (lines: number) => void;
  onColorChange: (color: string) => void;
  onFontSizeChange: (size: number) => void;
  onFontWeightChange: (weight: number) => void;
  onReset: () => void;
}

const DROP_CAP_COLORS = [
  { value: '#000000', label: 'Black', color: '#000000' },
  { value: '#3b82f6', label: 'Blue', color: '#3b82f6' },
  { value: '#ef4444', label: 'Red', color: '#ef4444' },
  { value: '#10b981', label: 'Green', color: '#10b981' },
  { value: '#8b5cf6', label: 'Purple', color: '#8b5cf6' },
  { value: '#f59e0b', label: 'Orange', color: '#f59e0b' },
  { value: '#6b7280', label: 'Gray', color: '#6b7280' },
  { value: '#dc2626', label: 'Dark Red', color: '#dc2626' },
];

const FONT_WEIGHTS = [
  { value: 400, label: 'Normal' },
  { value: 500, label: 'Medium' },
  { value: 600, label: 'Semibold' },
  { value: 700, label: 'Bold' },
  { value: 800, label: 'Extra Bold' },
  { value: 900, label: 'Black' },
];

export const DropCapController: React.FC<DropCapControllerProps> = ({
  isEnabled,
  lines,
  color,
  fontSize,
  fontWeight,
  onToggle,
  onLinesChange,
  onColorChange,
  onFontSizeChange,
  onFontWeightChange,
  onReset,
}) => {
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      {/* Drop Cap Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Type className="h-4 w-4" />
          <Label className="text-sm font-medium">Drop Cap</Label>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isEnabled ? "default" : "outline"}
            size="sm"
            onClick={() => onToggle(!isEnabled)}
            className="h-8"
          >
            {isEnabled ? 'On' : 'Off'}
          </Button>
          {isEnabled && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-8 px-2"
              title="Reset to defaults"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Drop Cap Settings */}
      {isEnabled && (
        <div className="space-y-4">
          {/* Lines Height */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-700">
              Height ({lines} lines)
            </Label>
            <Slider
              value={[lines]}
              onValueChange={(value) => onLinesChange(value[0])}
              min={2}
              max={6}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>2 lines</span>
              <span>6 lines</span>
            </div>
          </div>

          {/* Font Size */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-700">
              Font Size ({fontSize}px)
            </Label>
            <Slider
              value={[fontSize]}
              onValueChange={(value) => onFontSizeChange(value[0])}
              min={32}
              max={120}
              step={4}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>32px</span>
              <span>120px</span>
            </div>
          </div>

          {/* Font Weight */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-700">Font Weight</Label>
            <Select value={fontWeight.toString()} onValueChange={(value) => onFontWeightChange(parseInt(value))}>
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_WEIGHTS.map((weight) => (
                  <SelectItem key={weight.value} value={weight.value.toString()}>
                    <span style={{ fontWeight: weight.value }}>{weight.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-700">Color</Label>
            <Select value={color} onValueChange={onColorChange}>
              <SelectTrigger className="w-full h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DROP_CAP_COLORS.map((colorOption) => (
                  <SelectItem key={colorOption.value} value={colorOption.value}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded border border-gray-300"
                        style={{ backgroundColor: colorOption.color }}
                      />
                      <span className="text-xs">{colorOption.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-700">Preview</Label>
            <div className="p-3 bg-white rounded border">
              <p className="text-sm leading-relaxed">
                <span
                  className="float-left mr-2 mt-1 leading-none"
                  style={{
                    fontSize: `${fontSize}px`,
                    fontWeight,
                    color,
                    lineHeight: `${lines * 0.8}rem`,
                  }}
                >
                  T
                </span>
                his is how your drop cap will appear in the paragraph. The first letter will be styled according to your settings.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DropCapController;