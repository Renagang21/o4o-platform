/**
 * ParagraphBlock Settings Panel
 * Inspector Controls for Paragraph block (사이드바 설정)
 */

import React, { FC } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Type, Palette, Droplet, LetterText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ParagraphBlockSettingsProps {
  attributes: {
    fontSize?: number;
    textColor?: string;
    backgroundColor?: string;
    dropCap?: boolean;
  };
  onChange: (attributes: Partial<{
    fontSize?: number;
    textColor?: string;
    backgroundColor?: string;
    dropCap?: boolean;
  }>) => void;
  className?: string;
}

export const ParagraphBlockSettings: FC<ParagraphBlockSettingsProps> = ({
  attributes,
  onChange,
  className,
}) => {
  const {
    fontSize = 16,
    textColor = '#1e293b',
    backgroundColor = '',
    dropCap = false,
  } = attributes;

  return (
    <div className={cn('paragraph-settings space-y-6 p-4', className)}>
      {/* Typography Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <Type className="w-4 h-4" />
          <h3 className="text-sm font-semibold">Typography</h3>
        </div>

        {/* Font Size */}
        <div>
          <Label className="text-xs text-gray-600 mb-2 flex items-center justify-between">
            <span>Font Size</span>
            <span className="font-mono text-gray-900">{fontSize}px</span>
          </Label>
          <Slider
            value={[fontSize]}
            onValueChange={(value) => onChange({ fontSize: value[0] })}
            min={12}
            max={48}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>12px</span>
            <span>48px</span>
          </div>
        </div>

        {/* Drop Cap */}
        <div className="flex items-center justify-between pt-2">
          <Label className="text-sm flex items-center gap-2">
            <LetterText className="w-4 h-4" />
            Drop Cap
          </Label>
          <Switch
            checked={dropCap}
            onCheckedChange={(dropCap) => onChange({ dropCap })}
          />
        </div>
        {dropCap && (
          <p className="text-xs text-gray-500">
            First letter will be displayed large
          </p>
        )}
      </div>

      {/* Color Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <Palette className="w-4 h-4" />
          <h3 className="text-sm font-semibold">Colors</h3>
        </div>

        {/* Text Color */}
        <div>
          <Label className="text-xs text-gray-600 mb-2 block">
            Text Color
          </Label>
          <div className="flex gap-2">
            <input
              type="color"
              value={textColor}
              onChange={(e) => onChange({ textColor: e.target.value })}
              className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={textColor}
              onChange={(e) => onChange({ textColor: e.target.value })}
              placeholder="#000000"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
            />
          </div>

          {/* Preset Colors */}
          <div className="grid grid-cols-8 gap-1 mt-2">
            {[
              '#000000',
              '#1e293b',
              '#475569',
              '#64748b',
              '#ef4444',
              '#f97316',
              '#eab308',
              '#22c55e',
              '#3b82f6',
              '#8b5cf6',
              '#ec4899',
              '#f43f5e',
              '#14b8a6',
              '#06b6d4',
              '#6366f1',
              '#a855f7',
            ].map((color) => (
              <button
                key={color}
                onClick={() => onChange({ textColor: color })}
                className={cn(
                  'w-6 h-6 rounded border-2 transition-all',
                  textColor === color ? 'border-blue-500 scale-110' : 'border-gray-200 hover:scale-105'
                )}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* Background Color */}
        <div>
          <Label className="text-xs text-gray-600 mb-2 flex items-center gap-1">
            <Droplet className="w-3 h-3" />
            Background Color
          </Label>
          <div className="flex gap-2">
            <input
              type="color"
              value={backgroundColor || '#ffffff'}
              onChange={(e) => onChange({ backgroundColor: e.target.value })}
              className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={backgroundColor}
              onChange={(e) => onChange({ backgroundColor: e.target.value })}
              placeholder="transparent"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
            />
            {backgroundColor && (
              <button
                onClick={() => onChange({ backgroundColor: '' })}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100"
              >
                Clear
              </button>
            )}
          </div>

          {/* Preset Background Colors */}
          <div className="grid grid-cols-8 gap-1 mt-2">
            {[
              '#ffffff',
              '#f8fafc',
              '#f1f5f9',
              '#e2e8f0',
              '#fef2f2',
              '#fef9c3',
              '#f0fdf4',
              '#eff6ff',
              '#faf5ff',
              '#fce7f3',
              '#ecfeff',
              '#f0fdfa',
              '#fef3c7',
              '#fee2e2',
              '#dbeafe',
              '#f3e8ff',
            ].map((color) => (
              <button
                key={color}
                onClick={() => onChange({ backgroundColor: color })}
                className={cn(
                  'w-6 h-6 rounded border-2 transition-all',
                  backgroundColor === color ? 'border-blue-500 scale-110' : 'border-gray-200 hover:scale-105'
                )}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParagraphBlockSettings;
