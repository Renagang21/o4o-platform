/**
 * QuoteIconSelector Component
 * 인용문 아이콘 커스터마이징 컴포넌트
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Quote, RotateCcw, Eye, EyeOff } from 'lucide-react';

interface QuoteIconSelectorProps {
  iconStyle: 'quotes1' | 'quotes2' | 'quotes3' | 'quotes4' | 'quotes5';
  iconSize: number;
  iconColor: string;
  iconPosition: 'left' | 'right' | 'none';
  showIcon: boolean;
  onIconStyleChange: (style: 'quotes1' | 'quotes2' | 'quotes3' | 'quotes4' | 'quotes5') => void;
  onIconSizeChange: (size: number) => void;
  onIconColorChange: (color: string) => void;
  onIconPositionChange: (position: 'left' | 'right' | 'none') => void;
  onToggleIcon: (show: boolean) => void;
  onReset: () => void;
}

const QUOTE_ICONS = [
  { value: 'quotes1', label: 'Classic', icon: '"', description: 'Traditional double quotes' },
  { value: 'quotes2', label: 'Curved', icon: '"', description: 'Curved quote marks' },
  { value: 'quotes3', label: 'French', icon: '«', description: 'French guillemets' },
  { value: 'quotes4', label: 'Single', icon: '\'', description: 'Single quote marks' },
  { value: 'quotes5', label: 'Modern', icon: '❝', description: 'Modern heavy quotes' },
] as const;

const ICON_COLORS = [
  { value: '#6b7280', label: 'Gray', color: '#6b7280' },
  { value: '#3b82f6', label: 'Blue', color: '#3b82f6' },
  { value: '#ef4444', label: 'Red', color: '#ef4444' },
  { value: '#10b981', label: 'Green', color: '#10b981' },
  { value: '#8b5cf6', label: 'Purple', color: '#8b5cf6' },
  { value: '#f59e0b', label: 'Orange', color: '#f59e0b' },
  { value: '#000000', label: 'Black', color: '#000000' },
  { value: '#ffffff', label: 'White', color: '#ffffff' },
];

const ICON_POSITIONS = [
  { value: 'left', label: 'Left', description: 'Icon on the left side' },
  { value: 'right', label: 'Right', description: 'Icon on the right side' },
  { value: 'none', label: 'None', description: 'No icon displayed' },
] as const;

export const QuoteIconSelector: React.FC<QuoteIconSelectorProps> = ({
  iconStyle,
  iconSize,
  iconColor,
  iconPosition,
  showIcon,
  onIconStyleChange,
  onIconSizeChange,
  onIconColorChange,
  onIconPositionChange,
  onToggleIcon,
  onReset,
}) => {
  const getIconCharacter = (style: string) => {
    return QUOTE_ICONS.find(icon => icon.value === style)?.icon || '"';
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Quote className="h-4 w-4" />
          <Label className="text-sm font-medium">Quote Icon</Label>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showIcon ? "default" : "outline"}
            size="sm"
            onClick={() => onToggleIcon(!showIcon)}
            className="h-8 gap-1"
          >
            {showIcon ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            {showIcon ? 'Show' : 'Hide'}
          </Button>
          {showIcon && (
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

      {/* Icon Settings */}
      {showIcon && (
        <div className="space-y-4">
          {/* Icon Style */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-700">Icon Style</Label>
            <div className="grid grid-cols-5 gap-2">
              {QUOTE_ICONS.map((icon) => (
                <button
                  key={icon.value}
                  className={`
                    flex flex-col items-center justify-center h-16 rounded border-2 transition-all
                    ${iconStyle === icon.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                    }
                  `}
                  onClick={() => onIconStyleChange(icon.value)}
                  title={icon.description}
                >
                  <span
                    className="text-lg font-bold"
                    style={{ color: iconColor }}
                  >
                    {icon.icon}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">{icon.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Icon Size */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-700">
              Icon Size ({iconSize}px)
            </Label>
            <Slider
              value={[iconSize]}
              onValueChange={(value) => onIconSizeChange(value[0])}
              min={24}
              max={120}
              step={4}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>24px</span>
              <span>120px</span>
            </div>
          </div>

          {/* Icon Color */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-700">Icon Color</Label>
            <div className="grid grid-cols-4 gap-2">
              {ICON_COLORS.map((color) => (
                <button
                  key={color.value}
                  className={`
                    flex items-center justify-center h-10 rounded border-2 transition-all
                    ${iconColor === color.value
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                  style={{
                    backgroundColor: color.value === '#ffffff' ? '#f9fafb' : color.value,
                    color: color.value === '#ffffff' ? '#000000' : '#ffffff',
                  }}
                  onClick={() => onIconColorChange(color.value)}
                  title={color.label}
                >
                  <span className="text-lg font-bold">
                    {getIconCharacter(iconStyle)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Icon Position */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-700">Icon Position</Label>
            <Select value={iconPosition} onValueChange={(value: any) => onIconPositionChange(value)}>
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ICON_POSITIONS.map((position) => (
                  <SelectItem key={position.value} value={position.value}>
                    <div>
                      <div className="font-medium">{position.label}</div>
                      <div className="text-gray-500 text-xs">{position.description}</div>
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
              <div className="relative">
                {iconPosition === 'left' && (
                  <span
                    className="absolute -left-2 -top-1 opacity-30"
                    style={{
                      fontSize: `${iconSize}px`,
                      color: iconColor,
                      lineHeight: 1,
                    }}
                  >
                    {getIconCharacter(iconStyle)}
                  </span>
                )}

                <p className="text-sm italic text-gray-700 relative z-10">
                  This is how your quote will appear with the selected icon style.
                </p>

                {iconPosition === 'right' && (
                  <span
                    className="absolute -right-2 -bottom-1 opacity-30"
                    style={{
                      fontSize: `${iconSize}px`,
                      color: iconColor,
                      lineHeight: 1,
                    }}
                  >
                    {getIconCharacter(iconStyle)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuoteIconSelector;