/**
 * StyleSelector Component
 * 소셜 아이콘 스타일 선택기
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Settings,
  Square,
  Circle,
  BorderOuter,
  Maximize,
  Minimize,
  Zap,
  MousePointer,
  ExternalLink,
  Info,
  RotateCw,
  ArrowUpCircle,
  Sparkles
} from 'lucide-react';

interface StyleSelectorProps {
  style: 'filled' | 'outlined' | 'rounded';
  size: number;
  animationEnabled: boolean;
  animationType: 'scale' | 'rotate' | 'bounce';
  showTooltips: boolean;
  openInNewTab: boolean;
  onStyleChange: (style: 'filled' | 'outlined' | 'rounded') => void;
  onSizeChange: (size: number) => void;
  onAnimationEnabledChange: (enabled: boolean) => void;
  onAnimationTypeChange: (type: 'scale' | 'rotate' | 'bounce') => void;
  onShowTooltipsChange: (show: boolean) => void;
  onOpenInNewTabChange: (open: boolean) => void;
}

export const StyleSelector: React.FC<StyleSelectorProps> = ({
  style,
  size,
  animationEnabled,
  animationType,
  showTooltips,
  openInNewTab,
  onStyleChange,
  onSizeChange,
  onAnimationEnabledChange,
  onAnimationTypeChange,
  onShowTooltipsChange,
  onOpenInNewTabChange,
}) => {
  // Animation preview state
  const [previewAnimation, setPreviewAnimation] = React.useState(false);

  // Trigger animation preview
  const triggerPreview = () => {
    setPreviewAnimation(true);
    setTimeout(() => setPreviewAnimation(false), 600);
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Settings className="h-4 w-4" />
        <Label className="text-sm font-medium">Style Settings</Label>
      </div>

      {/* Icon Style */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-gray-700">Icon Style</Label>
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant={style === 'filled' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onStyleChange('filled')}
            className="h-12 flex flex-col items-center justify-center p-2"
          >
            <Square className="h-4 w-4 mb-1 fill-current" />
            <span className="text-xs">Filled</span>
          </Button>
          <Button
            variant={style === 'outlined' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onStyleChange('outlined')}
            className="h-12 flex flex-col items-center justify-center p-2"
          >
            <BorderOuter className="h-4 w-4 mb-1" />
            <span className="text-xs">Outlined</span>
          </Button>
          <Button
            variant={style === 'rounded' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onStyleChange('rounded')}
            className="h-12 flex flex-col items-center justify-center p-2"
          >
            <Circle className="h-4 w-4 mb-1 fill-current" />
            <span className="text-xs">Rounded</span>
          </Button>
        </div>
      </div>

      {/* Icon Size */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-gray-700">
          Icon Size: {size}px
        </Label>
        <div className="space-y-2">
          <input
            type="range"
            min="24"
            max="64"
            value={size}
            onChange={(e) => onSizeChange(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Small (24px)</span>
            <span>Medium (40px)</span>
            <span>Large (64px)</span>
          </div>
        </div>

        {/* Quick Size Buttons */}
        <div className="flex gap-2">
          <Button
            variant={size === 24 ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSizeChange(24)}
            className="flex-1 h-7 text-xs"
          >
            <Minimize className="h-3 w-3 mr-1" />
            Small
          </Button>
          <Button
            variant={size === 32 ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSizeChange(32)}
            className="flex-1 h-7 text-xs"
          >
            Medium
          </Button>
          <Button
            variant={size === 48 ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSizeChange(48)}
            className="flex-1 h-7 text-xs"
          >
            <Maximize className="h-3 w-3 mr-1" />
            Large
          </Button>
        </div>
      </div>

      {/* Hover Animation */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium text-gray-700">Hover Animation</Label>
          <Button
            variant={animationEnabled ? 'default' : 'outline'}
            size="sm"
            onClick={() => onAnimationEnabledChange(!animationEnabled)}
            className="h-7 px-3 text-xs"
          >
            {animationEnabled ? 'Enabled' : 'Disabled'}
          </Button>
        </div>

        {animationEnabled && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={animationType === 'scale' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onAnimationTypeChange('scale')}
                className="h-10 flex flex-col items-center justify-center p-2 text-xs"
              >
                <Maximize className="h-3 w-3 mb-1" />
                Scale
              </Button>
              <Button
                variant={animationType === 'rotate' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onAnimationTypeChange('rotate')}
                className="h-10 flex flex-col items-center justify-center p-2 text-xs"
              >
                <RotateCw className="h-3 w-3 mb-1" />
                Rotate
              </Button>
              <Button
                variant={animationType === 'bounce' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onAnimationTypeChange('bounce')}
                className="h-10 flex flex-col items-center justify-center p-2 text-xs"
              >
                <ArrowUpCircle className="h-3 w-3 mb-1" />
                Bounce
              </Button>
            </div>

            {/* Animation Preview */}
            <div className="p-3 bg-white rounded border">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-gray-600">Animation Preview</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={triggerPreview}
                  className="h-6 px-2 text-xs"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Preview
                </Button>
              </div>
              <div className="flex justify-center mt-3">
                <div
                  className={`
                    w-10 h-10 bg-blue-500 rounded transition-all duration-300
                    ${previewAnimation ? (
                      animationType === 'scale' ? 'scale-110' :
                      animationType === 'rotate' ? 'rotate-12' :
                      animationType === 'bounce' ? '-translate-y-1' : ''
                    ) : ''}
                  `}
                  style={{
                    borderRadius: style === 'rounded' ? '50%' : '4px',
                    backgroundColor: style === 'outlined' ? 'transparent' : '#3B82F6',
                    border: style === 'outlined' ? '2px solid #3B82F6' : 'none'
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Interactive Options */}
      <div className="space-y-3">
        <Label className="text-xs font-medium text-gray-700">Interactive Options</Label>

        {/* Tooltips */}
        <div className="flex items-center justify-between p-2 bg-white rounded border">
          <div className="flex items-center gap-2">
            <Info className="h-3 w-3 text-gray-500" />
            <span className="text-xs">Show Tooltips</span>
          </div>
          <Button
            variant={showTooltips ? 'default' : 'outline'}
            size="sm"
            onClick={() => onShowTooltipsChange(!showTooltips)}
            className="h-6 px-2 text-xs"
          >
            {showTooltips ? 'On' : 'Off'}
          </Button>
        </div>

        {/* Open in New Tab */}
        <div className="flex items-center justify-between p-2 bg-white rounded border">
          <div className="flex items-center gap-2">
            <ExternalLink className="h-3 w-3 text-gray-500" />
            <span className="text-xs">Open in New Tab</span>
          </div>
          <Button
            variant={openInNewTab ? 'default' : 'outline'}
            size="sm"
            onClick={() => onOpenInNewTabChange(!openInNewTab)}
            className="h-6 px-2 text-xs"
          >
            {openInNewTab ? 'Yes' : 'No'}
          </Button>
        </div>
      </div>

      {/* Visual Preview */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-gray-700">Style Preview</Label>
        <div className="p-4 bg-white rounded border">
          <div className="flex justify-center gap-4">
            {/* Filled Preview */}
            <div className="text-center">
              <div
                className="w-10 h-10 bg-blue-500 rounded flex items-center justify-center"
                style={{ borderRadius: style === 'rounded' ? '50%' : '4px' }}
              >
                <MousePointer className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs text-gray-500 mt-1">Current</span>
            </div>

            {/* Size Comparison */}
            <div className="flex items-end gap-2">
              <div
                className="bg-gray-300 rounded"
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: style === 'rounded' ? '50%' : '4px'
                }}
              />
              <div
                className="bg-gray-400 rounded"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: style === 'rounded' ? '50%' : '4px'
                }}
              />
              <div
                className="bg-gray-500 rounded"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: style === 'rounded' ? '50%' : '4px'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
        <p><strong>Filled:</strong> Modern and bold appearance</p>
        <p><strong>Outlined:</strong> Clean and minimal look</p>
        <p><strong>Rounded:</strong> Friendly and approachable style</p>
      </div>
    </div>
  );
};

export default StyleSelector;