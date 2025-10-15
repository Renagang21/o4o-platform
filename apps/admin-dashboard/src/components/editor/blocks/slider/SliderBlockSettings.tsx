/**
 * Slider Block Settings Panel
 * Inspector Controls for slider container
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import {
  Play,
  Navigation,
  Grid3X3,
  Repeat,
  MousePointer,
  Keyboard,
  Sparkles,
  Clock,
} from 'lucide-react';
import { SliderAttributes, TransitionEffect, PaginationType } from './types';

interface SliderBlockSettingsProps {
  attributes: SliderAttributes;
  setAttributes: (attrs: Partial<SliderAttributes>) => void;
}

export const SliderBlockSettings: React.FC<SliderBlockSettingsProps> = ({
  attributes,
  setAttributes,
}) => {
  return (
    <div className="space-y-6 p-4">
      {/* Aspect Ratio */}
      <div>
        <Label className="text-sm font-medium mb-2 flex items-center gap-2">
          <Grid3X3 className="w-4 h-4" />
          종횡비
        </Label>
        <div className="grid grid-cols-4 gap-2">
          {(['16:9', '4:3', '1:1', 'auto'] as const).map((ratio) => (
            <button
              key={ratio}
              onClick={() => setAttributes({ aspectRatio: ratio })}
              className={cn(
                'p-2 rounded text-xs font-medium transition-colors',
                attributes.aspectRatio === ratio
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              {ratio}
            </button>
          ))}
        </div>
      </div>

      {/* Height (if auto) */}
      {attributes.aspectRatio === 'auto' && (
        <div>
          <Label className="text-sm font-medium mb-2">높이 (px)</Label>
          <input
            type="number"
            value={attributes.height || 400}
            onChange={(e) => setAttributes({ height: parseInt(e.target.value) || 400 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            min={200}
            max={1000}
            step={50}
          />
        </div>
      )}

      {/* Transition Effect */}
      <div>
        <Label className="text-sm font-medium mb-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          전환 효과
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {(['fade', 'slide', 'zoom', 'flip'] as TransitionEffect[]).map((effect) => (
            <button
              key={effect}
              onClick={() => setAttributes({ effect })}
              className={cn(
                'p-2 rounded text-xs font-medium transition-colors capitalize',
                attributes.effect === effect
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              {effect}
            </button>
          ))}
        </div>
      </div>

      {/* Transition Duration */}
      <div>
        <Label className="text-sm font-medium mb-2 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          전환 시간: {attributes.transitionDuration}ms
        </Label>
        <Slider
          value={[attributes.transitionDuration]}
          onValueChange={(value) => setAttributes({ transitionDuration: value[0] })}
          min={100}
          max={1000}
          step={50}
          className="w-full"
        />
      </div>

      {/* Autoplay */}
      <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Play className="w-4 h-4" />
            자동재생
          </Label>
          <Switch
            checked={attributes.autoplay}
            onCheckedChange={(autoplay) => setAttributes({ autoplay })}
          />
        </div>

        {attributes.autoplay && (
          <>
            <div>
              <Label className="text-sm mb-2">재생 간격: {attributes.autoplayDelay}ms</Label>
              <Slider
                value={[attributes.autoplayDelay]}
                onValueChange={(value) => setAttributes({ autoplayDelay: value[0] })}
                min={1000}
                max={10000}
                step={500}
                className="w-full"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-sm">Hover 시 일시정지</Label>
              <Switch
                checked={attributes.pauseOnHover}
                onCheckedChange={(pauseOnHover) => setAttributes({ pauseOnHover })}
              />
            </div>
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Navigation className="w-4 h-4" />
            네비게이션
          </Label>
          <Switch
            checked={attributes.showNavigation}
            onCheckedChange={(showNavigation) => setAttributes({ showNavigation })}
          />
        </div>

        {attributes.showNavigation && (
          <div>
            <Label className="text-sm mb-2">위치</Label>
            <div className="grid grid-cols-3 gap-2">
              {(['sides', 'bottom', 'top'] as const).map((pos) => (
                <button
                  key={pos}
                  onClick={() => setAttributes({ navigationPosition: pos })}
                  className={cn(
                    'p-2 rounded text-xs font-medium transition-colors capitalize',
                    attributes.navigationPosition === pos
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border'
                  )}
                >
                  {pos === 'sides' ? '양옆' : pos === 'bottom' ? '하단' : '상단'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div>
        <Label className="text-sm font-medium mb-2">페이지네이션</Label>
        <div className="grid grid-cols-2 gap-2">
          {(['dots', 'numbers', 'progress', 'none'] as PaginationType[]).map((type) => (
            <button
              key={type}
              onClick={() => setAttributes({ pagination: type })}
              className={cn(
                'p-2 rounded text-xs font-medium transition-colors capitalize',
                attributes.pagination === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              {type === 'dots' ? '점' : type === 'numbers' ? '숫자' : type === 'progress' ? '바' : '없음'}
            </button>
          ))}
        </div>
      </div>

      {/* Loop */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Repeat className="w-4 h-4" />
          무한 반복
        </Label>
        <Switch
          checked={attributes.loop}
          onCheckedChange={(loop) => setAttributes({ loop })}
        />
      </div>

      {/* Gestures */}
      <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
        <Label className="text-sm font-medium mb-2">제스처</Label>

        <div className="flex items-center justify-between">
          <Label className="text-sm flex items-center gap-2">
            <MousePointer className="w-4 h-4" />
            스와이프/드래그
          </Label>
          <Switch
            checked={attributes.enableSwipe}
            onCheckedChange={(enableSwipe) => setAttributes({ enableSwipe })}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-sm flex items-center gap-2">
            <Keyboard className="w-4 h-4" />
            키보드 화살표
          </Label>
          <Switch
            checked={attributes.enableKeyboard}
            onCheckedChange={(enableKeyboard) => setAttributes({ enableKeyboard })}
          />
        </div>
      </div>

      {/* Aria Label */}
      <div>
        <Label className="text-sm font-medium mb-2">접근성 레이블</Label>
        <input
          type="text"
          value={attributes.ariaLabel || ''}
          onChange={(e) => setAttributes({ ariaLabel: e.target.value })}
          placeholder="Slider"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>
    </div>
  );
};

export default SliderBlockSettings;
