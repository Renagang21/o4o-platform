/**
 * Slider Slide Block Settings Panel
 * Inspector Controls for individual slides
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  Palette,
  Image as ImageIcon,
  AlignVerticalSpaceAround,
  AlignHorizontalSpaceAround,
  Layers,
} from 'lucide-react';
import { SlideAttributes } from './types';

interface SliderSlideBlockSettingsProps {
  attributes: SlideAttributes;
  setAttributes: (attrs: Partial<SlideAttributes>) => void;
}

export const SliderSlideBlockSettings: React.FC<SliderSlideBlockSettingsProps> = ({
  attributes,
  setAttributes,
}) => {
  const padding = attributes.padding || { top: 40, right: 40, bottom: 40, left: 40 };

  return (
    <div className="space-y-6 p-4">
      {/* Background Color */}
      <div>
        <Label className="text-sm font-medium mb-2 flex items-center gap-2">
          <Palette className="w-4 h-4" />
          배경색
        </Label>
        <div className="flex gap-2">
          <input
            type="color"
            value={attributes.backgroundColor || '#transparent'}
            onChange={(e) => setAttributes({ backgroundColor: e.target.value })}
            className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
          />
          <input
            type="text"
            value={attributes.backgroundColor || 'transparent'}
            onChange={(e) => setAttributes({ backgroundColor: e.target.value })}
            placeholder="transparent"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>

      {/* Background Image */}
      <div>
        <Label className="text-sm font-medium mb-2 flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          배경 이미지
        </Label>
        <input
          type="text"
          value={attributes.backgroundImage || ''}
          onChange={(e) => setAttributes({ backgroundImage: e.target.value })}
          placeholder="이미지 URL 입력"
          className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
        />

        {attributes.backgroundImage && (
          <>
            <div className="mt-3">
              <Label className="text-sm mb-2">배경 크기</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['cover', 'contain', 'auto'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => setAttributes({ backgroundSize: size })}
                    className={cn(
                      'p-2 rounded text-xs font-medium transition-colors capitalize',
                      attributes.backgroundSize === size
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    {size === 'cover' ? '꽉참' : size === 'contain' ? '맞춤' : '원본'}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3">
              <Label className="text-sm mb-2">배경 위치</Label>
              <input
                type="text"
                value={attributes.backgroundPosition || 'center'}
                onChange={(e) => setAttributes({ backgroundPosition: e.target.value })}
                placeholder="center"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <p className="text-xs text-gray-500 mt-1">
                예: center, top, bottom, left, right, 50% 50%
              </p>
            </div>
          </>
        )}
      </div>

      {/* Padding */}
      <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Layers className="w-4 h-4" />
          패딩
        </Label>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-gray-600 mb-1">상단</Label>
            <input
              type="number"
              value={padding.top}
              onChange={(e) =>
                setAttributes({ padding: { ...padding, top: parseInt(e.target.value) || 0 } })
              }
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              min={0}
              max={200}
            />
          </div>

          <div>
            <Label className="text-xs text-gray-600 mb-1">하단</Label>
            <input
              type="number"
              value={padding.bottom}
              onChange={(e) =>
                setAttributes({ padding: { ...padding, bottom: parseInt(e.target.value) || 0 } })
              }
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              min={0}
              max={200}
            />
          </div>

          <div>
            <Label className="text-xs text-gray-600 mb-1">왼쪽</Label>
            <input
              type="number"
              value={padding.left}
              onChange={(e) =>
                setAttributes({ padding: { ...padding, left: parseInt(e.target.value) || 0 } })
              }
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              min={0}
              max={200}
            />
          </div>

          <div>
            <Label className="text-xs text-gray-600 mb-1">오른쪽</Label>
            <input
              type="number"
              value={padding.right}
              onChange={(e) =>
                setAttributes({ padding: { ...padding, right: parseInt(e.target.value) || 0 } })
              }
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              min={0}
              max={200}
            />
          </div>
        </div>
      </div>

      {/* Vertical Align */}
      <div>
        <Label className="text-sm font-medium mb-2 flex items-center gap-2">
          <AlignVerticalSpaceAround className="w-4 h-4" />
          수직 정렬
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {(['top', 'center', 'bottom'] as const).map((align) => (
            <button
              key={align}
              onClick={() => setAttributes({ verticalAlign: align })}
              className={cn(
                'p-2 rounded text-xs font-medium transition-colors capitalize',
                attributes.verticalAlign === align
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              {align === 'top' ? '위' : align === 'center' ? '중앙' : '아래'}
            </button>
          ))}
        </div>
      </div>

      {/* Horizontal Align */}
      <div>
        <Label className="text-sm font-medium mb-2 flex items-center gap-2">
          <AlignHorizontalSpaceAround className="w-4 h-4" />
          수평 정렬
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {(['left', 'center', 'right'] as const).map((align) => (
            <button
              key={align}
              onClick={() => setAttributes({ horizontalAlign: align })}
              className={cn(
                'p-2 rounded text-xs font-medium transition-colors capitalize',
                attributes.horizontalAlign === align
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              {align === 'left' ? '왼쪽' : align === 'center' ? '중앙' : '오른쪽'}
            </button>
          ))}
        </div>
      </div>

      {/* Aria Label */}
      <div>
        <Label className="text-sm font-medium mb-2">접근성 레이블</Label>
        <input
          type="text"
          value={attributes.ariaLabel || ''}
          onChange={(e) => setAttributes({ ariaLabel: e.target.value })}
          placeholder="슬라이드 설명"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>
    </div>
  );
};

export default SliderSlideBlockSettings;
