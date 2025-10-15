/**
 * ImageDisplay Component
 * 이미지 표시 컴포넌트
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface ImageDisplayProps {
  url: string;
  alt: string;
  caption: string;
  linkTo: 'none' | 'media' | 'custom';
  linkUrl: string;
  width?: number;
  height?: number;
  size: 'thumbnail' | 'medium' | 'large' | 'full';
  align: 'left' | 'center' | 'right' | 'justify';
  isSelected: boolean;
  onImageLoad: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  onCaptionChange: (caption: string) => void;
  onAddBlock?: (position: 'before' | 'after', type?: string) => void;
}

const ImageDisplay: React.FC<ImageDisplayProps> = ({
  url,
  alt,
  caption,
  linkTo,
  linkUrl,
  width,
  height,
  size,
  align,
  isSelected,
  onImageLoad,
  onCaptionChange,
  onAddBlock
}) => {
  const getImageSizeClass = () => {
    switch (size) {
      case 'thumbnail': return 'max-w-32';
      case 'medium': return 'max-w-md';
      case 'large': return 'max-w-2xl';
      case 'full': return 'w-full';
      default: return 'max-w-lg';
    }
  };

  const getAlignmentClass = () => {
    switch (align) {
      case 'center': return 'mx-auto text-center';
      case 'right': return 'ml-auto text-right';
      case 'justify': return 'w-full';
      default: return 'text-left';
    }
  };

  const imageElement = (
    <img
      src={url}
      alt={alt}
      className={cn(
        'block h-auto rounded',
        getImageSizeClass()
      )}
      style={{
        width: width ? `${width}px` : undefined,
        height: height ? `${height}px` : undefined,
      }}
      onLoad={onImageLoad}
    />
  );

  const renderImage = () => {
    if (linkTo === 'media') {
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-block">
          {imageElement}
        </a>
      );
    } else if (linkTo === 'custom' && linkUrl) {
      return (
        <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="inline-block">
          {imageElement}
        </a>
      );
    }
    return imageElement;
  };

  return (
    <div className={cn('image-block', getAlignmentClass())}>
      <figure className="space-y-2">
        {renderImage()}

        {/* Caption */}
        {(caption || isSelected) && (
          <figcaption
            contentEditable={isSelected}
            suppressContentEditableWarning
            className={cn(
              'text-sm text-gray-600 italic outline-none px-2 py-1',
              'focus:bg-gray-50 focus:ring-2 focus:ring-blue-200 focus:ring-inset rounded',
              !caption && isSelected && 'text-gray-400'
            )}
            onInput={(e) => {
              const target = e.target as HTMLElement;
              onCaptionChange(target.textContent || '');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onAddBlock?.('after', 'o4o/paragraph');
              }
            }}
            data-placeholder="Write a caption..."
            style={{
              direction: 'ltr',
              unicodeBidi: 'normal'
            }}
          >
            {caption}
          </figcaption>
        )}
      </figure>
    </div>
  );
};

export default ImageDisplay;
