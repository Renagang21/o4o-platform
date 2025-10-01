/**
 * ColorModeSelector Component
 * 소셜 아이콘 색상 모드 선택기
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Palette,
  Sparkles,
  Circle,
  Moon,
  Sun,
  Droplet,
  PaintBucket
} from 'lucide-react';
import { PLATFORM_INFO, PlatformType } from './PlatformIcons';

interface ColorModeSelectorProps {
  colorMode: 'brand' | 'monochrome' | 'custom';
  customColor: string;
  onColorModeChange: (mode: 'brand' | 'monochrome' | 'custom') => void;
  onCustomColorChange: (color: string) => void;
}

export const ColorModeSelector: React.FC<ColorModeSelectorProps> = ({
  colorMode,
  customColor,
  onColorModeChange,
  onCustomColorChange,
}) => {
  // Sample platforms for preview
  const samplePlatforms: PlatformType[] = ['facebook', 'youtube', 'instagram', 'tiktok', 'naver', 'kakao'];

  // Get color for preview
  const getPreviewColor = (platform: PlatformType, mode: 'brand' | 'monochrome' | 'custom') => {
    if (mode === 'brand') {
      return PLATFORM_INFO[platform].color;
    } else if (mode === 'monochrome') {
      return '#666666';
    } else {
      return customColor;
    }
  };

  // Preset custom colors
  const presetColors = [
    '#000000', // Black
    '#ffffff', // White
    '#ef4444', // Red
    '#f97316', // Orange
    '#eab308', // Yellow
    '#22c55e', // Green
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#6b7280', // Gray
    '#a16207', // Brown
  ];

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Palette className="h-4 w-4" />
        <Label className="text-sm font-medium">Color Settings</Label>
      </div>

      {/* Color Mode Selection */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-gray-700">Color Mode</Label>
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant={colorMode === 'brand' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onColorModeChange('brand')}
            className="h-12 flex flex-col items-center justify-center p-2"
          >
            <Sparkles className="h-4 w-4 mb-1" />
            <span className="text-xs">Brand Colors</span>
          </Button>
          <Button
            variant={colorMode === 'monochrome' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onColorModeChange('monochrome')}
            className="h-12 flex flex-col items-center justify-center p-2"
          >
            <Circle className="h-4 w-4 mb-1" />
            <span className="text-xs">Monochrome</span>
          </Button>
          <Button
            variant={colorMode === 'custom' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onColorModeChange('custom')}
            className="h-12 flex flex-col items-center justify-center p-2"
          >
            <PaintBucket className="h-4 w-4 mb-1" />
            <span className="text-xs">Custom</span>
          </Button>
        </div>
      </div>

      {/* Mode Descriptions */}
      <div className="p-3 bg-white rounded border">
        <div className="space-y-2">
          {colorMode === 'brand' && (
            <div className="text-xs">
              <strong className="text-gray-700">Brand Colors:</strong>
              <p className="text-gray-600 mt-1">
                Each platform displays in its official brand color for maximum recognition.
              </p>
            </div>
          )}
          {colorMode === 'monochrome' && (
            <div className="text-xs">
              <strong className="text-gray-700">Monochrome:</strong>
              <p className="text-gray-600 mt-1">
                All icons display in a uniform gray tone for a subtle, professional look.
              </p>
            </div>
          )}
          {colorMode === 'custom' && (
            <div className="text-xs">
              <strong className="text-gray-700">Custom Color:</strong>
              <p className="text-gray-600 mt-1">
                Choose your own color to match your brand or design theme.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Custom Color Picker */}
      {colorMode === 'custom' && (
        <div className="space-y-3">
          <Label className="text-xs font-medium text-gray-700">Select Custom Color</Label>

          {/* Color Input */}
          <div className="flex gap-2">
            <div className="flex items-center gap-2 flex-1">
              <input
                type="color"
                value={customColor}
                onChange={(e) => onCustomColorChange(e.target.value)}
                className="w-12 h-8 rounded border cursor-pointer"
              />
              <Input
                type="text"
                value={customColor}
                onChange={(e) => onCustomColorChange(e.target.value)}
                placeholder="#000000"
                className="flex-1 h-8 text-xs font-mono"
              />
            </div>
          </div>

          {/* Preset Colors */}
          <div className="space-y-2">
            <Label className="text-xs text-gray-600">Quick Select</Label>
            <div className="grid grid-cols-6 gap-2">
              {presetColors.map((color) => (
                <button
                  key={color}
                  className={`
                    h-8 w-full rounded border-2 transition-all
                    ${customColor === color ? 'ring-2 ring-blue-500' : 'hover:scale-110'}
                  `}
                  style={{ backgroundColor: color }}
                  onClick={() => onCustomColorChange(color)}
                  title={color}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Color Preview */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-gray-700">Preview</Label>
        <div className="p-4 bg-white rounded border">
          <div className="flex justify-center gap-3">
            {samplePlatforms.map((platform) => {
              const platformInfo = PLATFORM_INFO[platform];
              const IconComponent = platformInfo.icon;
              const color = getPreviewColor(platform, colorMode);

              return (
                <div key={platform} className="text-center">
                  <div
                    className="w-10 h-10 rounded flex items-center justify-center"
                    style={{ backgroundColor: color }}
                  >
                    <IconComponent
                      size={24}
                      color={platform === 'kakao' && colorMode === 'brand' ? (platformInfo as any).textColor || '#ffffff' : '#ffffff'}
                    />
                  </div>
                  <span className="text-xs text-gray-500 mt-1 block">
                    {platformInfo.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dark Mode Support */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-gray-700">Dark Mode Behavior</Label>
        <div className="p-3 bg-white rounded border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon className="h-3 w-3 text-gray-500" />
              <span className="text-xs">Automatic contrast adjustment</span>
            </div>
            <div className="flex gap-1">
              <div className="w-6 h-6 bg-gray-900 rounded flex items-center justify-center">
                <Sun className="h-3 w-3 text-white" />
              </div>
              <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
                <Moon className="h-3 w-3 text-gray-900" />
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Icons automatically adjust brightness for optimal visibility in dark mode.
          </p>
        </div>
      </div>

      {/* Brand Colors Reference */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-gray-700">Brand Color Reference</Label>
        <div className="grid grid-cols-2 gap-2 p-3 bg-white rounded border">
          {Object.entries(PLATFORM_INFO).slice(0, 6).map(([key, info]) => (
            <div key={key} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: info.color }}
              />
              <span className="text-xs">{info.name}:</span>
              <span className="text-xs font-mono text-gray-600">{info.color}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
        <p><strong>Brand:</strong> Best for recognition and engagement</p>
        <p><strong>Monochrome:</strong> Professional and subtle appearance</p>
        <p><strong>Custom:</strong> Perfect for matching your brand identity</p>
      </div>
    </div>
  );
};

export default ColorModeSelector;