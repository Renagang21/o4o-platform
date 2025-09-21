/**
 * TypographyPanel Component
 * 고급 타이포그래피 설정 패널
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Type, RotateCcw } from 'lucide-react';

interface TypographyPanelProps {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  wordSpacing: number;
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
  onFontSizeChange: (size: number) => void;
  onLineHeightChange: (height: number) => void;
  onLetterSpacingChange: (spacing: number) => void;
  onWordSpacingChange: (spacing: number) => void;
  onTextTransformChange: (transform: 'none' | 'uppercase' | 'lowercase' | 'capitalize') => void;
  onFontWeightChange: (weight: number) => void;
  onFontStyleChange: (style: 'normal' | 'italic') => void;
  onReset: () => void;
}

const TEXT_TRANSFORMS = [
  { value: 'none', label: 'None', example: 'Normal Text' },
  { value: 'uppercase', label: 'Uppercase', example: 'UPPERCASE TEXT' },
  { value: 'lowercase', label: 'Lowercase', example: 'lowercase text' },
  { value: 'capitalize', label: 'Capitalize', example: 'Capitalize Text' },
] as const;

const FONT_WEIGHTS = [
  { value: 100, label: 'Thin' },
  { value: 200, label: 'Extra Light' },
  { value: 300, label: 'Light' },
  { value: 400, label: 'Normal' },
  { value: 500, label: 'Medium' },
  { value: 600, label: 'Semibold' },
  { value: 700, label: 'Bold' },
  { value: 800, label: 'Extra Bold' },
  { value: 900, label: 'Black' },
];

export const TypographyPanel: React.FC<TypographyPanelProps> = ({
  fontSize,
  lineHeight,
  letterSpacing,
  wordSpacing,
  textTransform,
  fontWeight,
  fontStyle,
  onFontSizeChange,
  onLineHeightChange,
  onLetterSpacingChange,
  onWordSpacingChange,
  onTextTransformChange,
  onFontWeightChange,
  onFontStyleChange,
  onReset,
}) => {
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Type className="h-4 w-4" />
          <Label className="text-sm font-medium">Typography</Label>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-8 px-2"
          title="Reset to defaults"
        >
          <RotateCcw className="h-3 w-3" />
        </Button>
      </div>

      {/* Font Size */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-gray-700">
          Font Size ({fontSize}px)
        </Label>
        <Slider
          value={[fontSize]}
          onValueChange={(value) => onFontSizeChange(value[0])}
          min={12}
          max={48}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>12px</span>
          <span>48px</span>
        </div>
      </div>

      {/* Line Height */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-gray-700">
          Line Height ({lineHeight.toFixed(1)})
        </Label>
        <Slider
          value={[lineHeight]}
          onValueChange={(value) => onLineHeightChange(value[0])}
          min={1.0}
          max={3.0}
          step={0.1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>1.0</span>
          <span>3.0</span>
        </div>
      </div>

      {/* Letter Spacing */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-gray-700">
          Letter Spacing ({letterSpacing.toFixed(2)}em)
        </Label>
        <Slider
          value={[letterSpacing]}
          onValueChange={(value) => onLetterSpacingChange(value[0])}
          min={-0.1}
          max={0.5}
          step={0.01}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>-0.1em</span>
          <span>0.5em</span>
        </div>
      </div>

      {/* Word Spacing */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-gray-700">
          Word Spacing ({wordSpacing.toFixed(2)}em)
        </Label>
        <Slider
          value={[wordSpacing]}
          onValueChange={(value) => onWordSpacingChange(value[0])}
          min={-0.2}
          max={1.0}
          step={0.01}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>-0.2em</span>
          <span>1.0em</span>
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

      {/* Font Style */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-gray-700">Font Style</Label>
        <div className="flex gap-2">
          <Button
            variant={fontStyle === 'normal' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFontStyleChange('normal')}
            className="flex-1 h-8 text-xs"
          >
            Normal
          </Button>
          <Button
            variant={fontStyle === 'italic' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFontStyleChange('italic')}
            className="flex-1 h-8 text-xs italic"
          >
            Italic
          </Button>
        </div>
      </div>

      {/* Text Transform */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-gray-700">Text Transform</Label>
        <Select value={textTransform} onValueChange={onTextTransformChange}>
          <SelectTrigger className="w-full h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TEXT_TRANSFORMS.map((transform) => (
              <SelectItem key={transform.value} value={transform.value}>
                <div className="flex flex-col">
                  <span className="font-medium">{transform.label}</span>
                  <span
                    className="text-xs text-gray-500"
                    style={{ textTransform: transform.value as any }}
                  >
                    {transform.example}
                  </span>
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
          <p
            className="text-sm"
            style={{
              fontSize: `${fontSize}px`,
              lineHeight,
              letterSpacing: `${letterSpacing}em`,
              wordSpacing: `${wordSpacing}em`,
              textTransform,
              fontWeight,
              fontStyle,
            }}
          >
            This is a preview of your typography settings. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TypographyPanel;