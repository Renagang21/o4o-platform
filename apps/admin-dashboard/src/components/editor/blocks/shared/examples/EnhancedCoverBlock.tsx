/**
 * Enhanced Cover Block Example
 * 새로운 MediaSelector를 사용하는 Cover Block 예시
 */

import { useState, useCallback } from 'react';
import {
  Image,
  Upload,
  Settings,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  Palette,
  Move
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import MediaSelector from '../MediaSelector';
import { MediaItem } from '../types';
import { cn } from '@/lib/utils';

interface CoverBlockProps {
  attributes?: {
    backgroundImage?: MediaItem;
    title?: string;
    subtitle?: string;
    overlayColor?: string;
    overlayOpacity?: number;
    minHeight?: number;
    contentAlign?: 'left' | 'center' | 'right';
    textColor?: string;
    titleSize?: number;
    subtitleSize?: number;
    enableParallax?: boolean;
    showOverlay?: boolean;
  };
  onChange?: (attributes: any) => void;
  isSelected?: boolean;
}

const EnhancedCoverBlock: React.FC<CoverBlockProps> = ({
  attributes = {},
  onChange,
  isSelected = false
}) => {
  const {
    backgroundImage,
    title = '',
    subtitle = '',
    overlayColor = 'rgba(0, 0, 0, 0.5)',
    overlayOpacity = 50,
    minHeight = 400,
    contentAlign = 'center',
    textColor = '#ffffff',
    titleSize = 48,
    subtitleSize = 18,
    enableParallax = false,
    showOverlay = true
  } = attributes;

  const [showMediaSelector, setShowMediaSelector] = useState(false);

  // Update attribute helper
  const updateAttribute = useCallback((key: string, value: any) => {
    onChange?.({ ...attributes, [key]: value });
  }, [onChange, attributes]);

  // Handle media selection
  const handleMediaSelect = useCallback((media: MediaItem | MediaItem[]) => {
    const selectedMedia = Array.isArray(media) ? media[0] : media;
    updateAttribute('backgroundImage', selectedMedia);
    setShowMediaSelector(false);
  }, [updateAttribute]);

  // Alignment options
  const alignmentOptions = [
    { value: 'left', icon: AlignLeft, label: '왼쪽 정렬' },
    { value: 'center', icon: AlignCenter, label: '가운데 정렬' },
    { value: 'right', icon: AlignRight, label: '오른쪽 정렬' }
  ];

  // Overlay preset colors
  const overlayPresets = [
    { color: 'rgba(0, 0, 0, 0.5)', label: '블랙 50%' },
    { color: 'rgba(0, 0, 0, 0.7)', label: '블랙 70%' },
    { color: 'rgba(255, 255, 255, 0.3)', label: '화이트 30%' },
    { color: 'rgba(255, 255, 255, 0.5)', label: '화이트 50%' },
    { color: 'rgba(59, 130, 246, 0.6)', label: '블루 60%' },
    { color: 'rgba(0, 0, 0, 0)', label: '투명' }
  ];

  // Cover content styles
  const coverStyles = {
    backgroundImage: backgroundImage ? `url(${backgroundImage.url})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: enableParallax ? 'fixed' : 'scroll',
    minHeight: `${minHeight}px`,
    position: 'relative' as const
  };

  const overlayStyles = showOverlay ? {
    backgroundColor: overlayColor,
    opacity: overlayOpacity / 100
  } : undefined;

  const contentStyles = {
    textAlign: contentAlign as 'left' | 'center' | 'right',
    color: textColor
  };

  const titleStyles = {
    fontSize: `${titleSize}px`,
    lineHeight: '1.2'
  };

  const subtitleStyles = {
    fontSize: `${subtitleSize}px`,
    lineHeight: '1.4'
  };

  return (
    <div className="w-full">
      {/* Cover Block */}
      <div
        className={cn(
          "relative overflow-hidden rounded-lg",
          !backgroundImage && "border-2 border-dashed border-gray-300 bg-gray-50"
        )}
        style={coverStyles}
      >
        {/* Background Overlay */}
        {showOverlay && backgroundImage && (
          <div
            className="absolute inset-0 z-10"
            style={overlayStyles}
          />
        )}

        {/* Content */}
        <div className="relative z-20 h-full flex items-center justify-center p-8">
          {!backgroundImage ? (
            // Placeholder when no image
            <div className="text-center">
              <Image className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                Cover 블록 추가
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                배경 이미지를 선택하고 텍스트를 추가하세요
              </p>
              <Button
                onClick={() => setShowMediaSelector(true)}
                variant="outline"
                size="sm"
              >
                <Upload className="w-4 h-4 mr-2" />
                이미지 선택
              </Button>
            </div>
          ) : (
            // Content when image is set
            <div className="text-center max-w-4xl" style={contentStyles}>
              {title && (
                <h1
                  className="font-bold mb-4"
                  style={titleStyles}
                  contentEditable={isSelected}
                  suppressContentEditableWarning
                  onBlur={(e) => updateAttribute('title', e.currentTarget.textContent)}
                >
                  {title}
                </h1>
              )}
              {subtitle && (
                <p
                  className="opacity-90"
                  style={subtitleStyles}
                  contentEditable={isSelected}
                  suppressContentEditableWarning
                  onBlur={(e) => updateAttribute('subtitle', e.currentTarget.textContent)}
                >
                  {subtitle}
                </p>
              )}
              {isSelected && !title && !subtitle && (
                <div className="text-white/70 text-sm">
                  제목과 부제목을 추가하려면 설정에서 입력하세요
                </div>
              )}
            </div>
          )}
        </div>

        {/* Edit Controls Overlay */}
        {isSelected && backgroundImage && (
          <div className="absolute top-4 right-4 z-30 flex gap-2">
            <Button
              onClick={() => setShowMediaSelector(true)}
              size="sm"
              variant="secondary"
              className="bg-white/90 text-gray-700 hover:bg-white"
            >
              <Image className="w-4 h-4 mr-1" />
              이미지 변경
            </Button>
          </div>
        )}
      </div>

      {/* Settings Panel (when selected) */}
      {isSelected && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Cover 설정
          </h3>

          {/* Background Image */}
          <div>
            <Label className="text-sm font-medium mb-2 block">배경 이미지</Label>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowMediaSelector(true)}
                variant="outline"
                size="sm"
              >
                <Upload className="w-4 h-4 mr-2" />
                {backgroundImage ? '이미지 변경' : '이미지 선택'}
              </Button>
              {backgroundImage && (
                <Button
                  onClick={() => updateAttribute('backgroundImage', null)}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                >
                  제거
                </Button>
              )}
            </div>
            {backgroundImage && (
              <div className="mt-2 text-xs text-gray-600">
                선택된 이미지: {backgroundImage.title}
              </div>
            )}
          </div>

          {/* Text Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cover-title" className="text-sm font-medium mb-1 block">
                <Type className="w-3 h-3 inline mr-1" />
                제목
              </Label>
              <Input
                id="cover-title"
                value={title}
                onChange={(e) => updateAttribute('title', e.target.value)}
                placeholder="Cover 제목을 입력하세요"
              />
            </div>
            <div>
              <Label htmlFor="cover-subtitle" className="text-sm font-medium mb-1 block">
                부제목
              </Label>
              <Textarea
                id="cover-subtitle"
                value={subtitle}
                onChange={(e) => updateAttribute('subtitle', e.target.value)}
                placeholder="부제목을 입력하세요"
                rows={2}
              />
            </div>
          </div>

          {/* Text Alignment */}
          <div>
            <Label className="text-sm font-medium mb-2 block">텍스트 정렬</Label>
            <div className="flex gap-1">
              {alignmentOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => updateAttribute('contentAlign', option.value)}
                    className={cn(
                      'p-2 rounded transition-colors',
                      contentAlign === option.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                    )}
                    title={option.label}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Typography */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium mb-1 block">
                제목 크기 ({titleSize}px)
              </Label>
              <Slider
                min={24}
                max={72}
                step={2}
                value={[titleSize]}
                onValueChange={([value]) => updateAttribute('titleSize', value)}
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1 block">
                부제목 크기 ({subtitleSize}px)
              </Label>
              <Slider
                min={12}
                max={32}
                step={1}
                value={[subtitleSize]}
                onValueChange={([value]) => updateAttribute('subtitleSize', value)}
              />
            </div>
            <div>
              <Label htmlFor="text-color" className="text-sm font-medium mb-1 block">
                텍스트 색상
              </Label>
              <div className="flex items-center gap-2">
                <input
                  id="text-color"
                  type="color"
                  value={textColor}
                  onChange={(e) => updateAttribute('textColor', e.target.value)}
                  className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
                />
                <Input
                  value={textColor}
                  onChange={(e) => updateAttribute('textColor', e.target.value)}
                  className="flex-1 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Layout */}
          <div>
            <Label className="text-sm font-medium mb-1 block">
              <Move className="w-3 h-3 inline mr-1" />
              최소 높이 ({minHeight}px)
            </Label>
            <Slider
              min={200}
              max={800}
              step={20}
              value={[minHeight]}
              onValueChange={([value]) => updateAttribute('minHeight', value)}
            />
          </div>

          {/* Overlay Settings */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium">
                <Palette className="w-3 h-3 inline mr-1" />
                오버레이
              </Label>
              <Switch
                checked={showOverlay}
                onCheckedChange={(checked) => updateAttribute('showOverlay', checked)}
              />
            </div>

            {showOverlay && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-gray-600 mb-2 block">
                    투명도 ({overlayOpacity}%)
                  </Label>
                  <Slider
                    min={0}
                    max={100}
                    step={5}
                    value={[overlayOpacity]}
                    onValueChange={([value]) => updateAttribute('overlayOpacity', value)}
                  />
                </div>

                <div>
                  <Label className="text-xs text-gray-600 mb-2 block">색상 프리셋</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {overlayPresets.map((preset) => (
                      <button
                        key={preset.color}
                        onClick={() => updateAttribute('overlayColor', preset.color)}
                        className={cn(
                          'p-2 rounded border text-xs transition-colors',
                          overlayColor === preset.color
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400'
                        )}
                      >
                        <div
                          className="w-full h-6 rounded mb-1 border"
                          style={{ backgroundColor: preset.color }}
                        />
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="overlay-color" className="text-xs text-gray-600 mb-1 block">
                    커스텀 색상
                  </Label>
                  <Input
                    id="overlay-color"
                    value={overlayColor}
                    onChange={(e) => updateAttribute('overlayColor', e.target.value)}
                    placeholder="rgba(0, 0, 0, 0.5)"
                    className="text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Advanced Options */}
          <div>
            <Label className="text-sm font-medium mb-2 block">고급 옵션</Label>
            <div className="flex items-center justify-between">
              <Label htmlFor="parallax" className="text-xs text-gray-600">
                패럴랙스 효과
              </Label>
              <Switch
                id="parallax"
                checked={enableParallax}
                onCheckedChange={(checked) => updateAttribute('enableParallax', checked)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Media Selector Modal */}
      <MediaSelector
        isOpen={showMediaSelector}
        onClose={() => setShowMediaSelector(false)}
        onSelect={handleMediaSelect}
        multiple={false}
        acceptedTypes={['image']}
        title="Cover 배경 이미지 선택"
      />
    </div>
  );
};

export default EnhancedCoverBlock;