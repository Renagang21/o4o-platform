/**
 * Slider Slide Block
 * 개별 슬라이드 블록 - InnerBlocks로 자유로운 콘텐츠 구성
 */

import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SlideAttributes } from './types';
import { Button } from '@/components/ui/button';
import SliderSlideBlockSettings from './SliderSlideBlockSettings';

interface SliderSlideBlockProps {
  attributes: SlideAttributes;
  setAttributes: (attrs: Partial<SlideAttributes>) => void;
  isSelected: boolean;
  children: React.ReactNode; // InnerBlocks will be passed as children
  className?: string;
}

export const SliderSlideBlock: React.FC<SliderSlideBlockProps> = ({
  attributes,
  setAttributes,
  isSelected,
  children,
  className,
}) => {
  const [showSettings, setShowSettings] = useState(false);

  const {
    backgroundColor = 'transparent',
    backgroundImage,
    backgroundSize = 'cover',
    backgroundPosition = 'center',
    padding = { top: 40, right: 40, bottom: 40, left: 40 },
    verticalAlign = 'center',
    horizontalAlign = 'center',
  } = attributes;

  // 배경 스타일
  const backgroundStyle: React.CSSProperties = {
    backgroundColor,
    ...(backgroundImage && {
      backgroundImage: `url(${backgroundImage})`,
      backgroundSize,
      backgroundPosition,
      backgroundRepeat: 'no-repeat',
    }),
  };

  // 패딩 스타일
  const paddingStyle: React.CSSProperties = {
    paddingTop: `${padding.top}px`,
    paddingRight: `${padding.right}px`,
    paddingBottom: `${padding.bottom}px`,
    paddingLeft: `${padding.left}px`,
  };

  // Flexbox 정렬
  const alignmentStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent:
      verticalAlign === 'top'
        ? 'flex-start'
        : verticalAlign === 'bottom'
        ? 'flex-end'
        : 'center',
    alignItems:
      horizontalAlign === 'left'
        ? 'flex-start'
        : horizontalAlign === 'right'
        ? 'flex-end'
        : 'center',
    minHeight: '100%',
  };

  return (
    <div
      className={cn(
        'slider-slide',
        isSelected && 'slider-slide--selected',
        className
      )}
      style={{
        ...backgroundStyle,
        position: 'relative',
        width: '100%',
        height: '100%',
      }}
      role="group"
      aria-roledescription="slide"
      aria-label={attributes.ariaLabel}
    >
      {/* 에디터 선택 시 툴바 */}
      {isSelected && (
        <div className="slider-slide__toolbar absolute top-2 right-2 z-20">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowSettings(!showSettings)}
            className="shadow-md"
          >
            <Settings className="w-4 h-4" />
            Slide Settings
          </Button>
        </div>
      )}

      {/* Settings Panel */}
      {isSelected && showSettings && (
        <div className="slider-slide__settings absolute top-14 right-2 z-20 w-80 max-h-96 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg">
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="text-sm font-semibold">Slide Settings</h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowSettings(false)}
            >
              Close
            </Button>
          </div>
          <SliderSlideBlockSettings
            attributes={attributes}
            setAttributes={setAttributes}
          />
        </div>
      )}

      <div style={{ ...paddingStyle, ...alignmentStyle }}>
        {/* InnerBlocks 렌더링 영역 */}
        <div className="slider-slide__content" style={{ width: '100%', maxWidth: '100%' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default SliderSlideBlock;
