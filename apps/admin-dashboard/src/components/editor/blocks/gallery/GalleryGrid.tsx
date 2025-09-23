/**
 * Gallery Grid Layout Component
 * CSS Grid 기반의 균등한 그리드 레이아웃
 */

import React from 'react';
import { cn } from '@/lib/utils';
import GalleryItem from './GalleryItem';
import { GalleryImage, GalleryAttributes } from './types';

interface GalleryGridProps {
  images: GalleryImage[];
  attributes: Partial<GalleryAttributes>;
  isEditing?: boolean;
  selectedImageId?: string | null;
  onImageSelect?: (imageId: string) => void;
  onImageEdit?: (imageId: string) => void;
  onImageRemove?: (imageId: string) => void;
  onImageMove?: (imageId: string, direction: 'up' | 'down' | 'left' | 'right') => void;
  onLightboxOpen?: (index: number) => void;
  className?: string;
}

const GalleryGrid: React.FC<GalleryGridProps> = ({
  images,
  attributes,
  isEditing = false,
  selectedImageId,
  onImageSelect,
  onImageEdit,
  onImageRemove,
  onImageMove,
  onLightboxOpen,
  className
}) => {
  const {
    columns = 3,
    gap = 16,
    aspectRatio = 'auto',
    showCaptions = true,
    captionPosition = 'below',
    enableLightbox = true,
    hoverEffect = 'none',
    borderRadius = 0,
    responsiveColumns = { mobile: 1, tablet: 2, desktop: 3 }
  } = attributes;

  // Calculate responsive columns
  const getResponsiveGridColumns = () => {
    return {
      // Mobile first approach
      gridTemplateColumns: `repeat(${responsiveColumns.mobile}, minmax(0, 1fr))`,
      '@media (min-width: 640px)': {
        gridTemplateColumns: `repeat(${responsiveColumns.tablet}, minmax(0, 1fr))`
      },
      '@media (min-width: 1024px)': {
        gridTemplateColumns: `repeat(${Math.min(columns, responsiveColumns.desktop)}, minmax(0, 1fr))`
      }
    };
  };

  // Handle image move in grid context
  const handleImageMove = (imageId: string, direction: 'up' | 'down' | 'left' | 'right') => {
    const currentIndex = images.findIndex(img => img.id === imageId);
    if (currentIndex === -1) return;

    let newIndex = currentIndex;

    switch (direction) {
      case 'left':
        newIndex = Math.max(0, currentIndex - 1);
        break;
      case 'right':
        newIndex = Math.min(images.length - 1, currentIndex + 1);
        break;
      case 'up':
        newIndex = Math.max(0, currentIndex - columns);
        break;
      case 'down':
        newIndex = Math.min(images.length - 1, currentIndex + columns);
        break;
    }

    if (newIndex !== currentIndex) {
      onImageMove?.(imageId, direction);
    }
  };

  // Get grid container styles
  const gridStyles: React.CSSProperties = {
    display: 'grid',
    gap: `${gap}px`,
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    width: '100%'
  };

  // Handle empty state
  if (images.length === 0) {
    return (
      <div className={cn(
        'grid-empty-state border-2 border-dashed border-gray-300 rounded-lg p-12 text-center bg-gray-50',
        className
      )}>
        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto bg-gray-200 rounded-lg flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Create your gallery</h3>
            <p className="text-sm text-gray-600">Add images to get started with your grid layout</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'gallery-grid w-full',
        // Responsive grid classes for Tailwind
        'grid',
        `grid-cols-${responsiveColumns.mobile}`,
        `sm:grid-cols-${responsiveColumns.tablet}`,
        `lg:grid-cols-${Math.min(columns, responsiveColumns.desktop)}`,
        className
      )}
      style={{
        gap: `${gap}px`,
        // Fallback for browsers that don't support CSS Grid
        ...(!CSS.supports('display: grid') && {
          display: 'flex',
          flexWrap: 'wrap',
          margin: `-${gap / 2}px`
        })
      }}
      role="grid"
      aria-label={`Image gallery with ${images.length} images in grid layout`}
    >
      {images.map((image, index) => (
        <div
          key={image.id}
          className={cn(
            'gallery-grid-item',
            // Fallback for flexbox
            !CSS.supports('display: grid') && 'flex-shrink-0',
            // Accessibility
            'focus-within:z-10'
          )}
          style={{
            // Fallback for flexbox layout
            ...(!CSS.supports('display: grid') && {
              width: `calc(${100 / columns}% - ${gap}px)`,
              margin: `${gap / 2}px`
            })
          }}
          role="gridcell"
          aria-rowindex={Math.floor(index / columns) + 1}
          aria-colindex={(index % columns) + 1}
        >
          <GalleryItem
            image={image}
            index={index}
            layout="grid"
            aspectRatio={aspectRatio}
            showCaption={showCaptions}
            captionPosition={captionPosition}
            enableLightbox={enableLightbox}
            hoverEffect={hoverEffect}
            borderRadius={borderRadius}
            isSelected={selectedImageId === image.id}
            isEditing={isEditing}
            onSelect={() => onImageSelect?.(image.id)}
            onEdit={() => onImageEdit?.(image.id)}
            onRemove={() => onImageRemove?.(image.id)}
            onMove={(direction) => handleImageMove(image.id, direction)}
            onLightboxOpen={onLightboxOpen}
            className={cn(
              // Grid specific styling
              'gallery-grid-image',
              // Ensure proper aspect ratio for grid items
              aspectRatio !== 'auto' && 'overflow-hidden',
              // Smooth transitions
              'transition-all duration-200 ease-in-out'
            )}
          />
        </div>
      ))}

      {/* Placeholder items for consistent grid when adding images */}
      {isEditing && images.length > 0 && images.length % columns !== 0 && (
        <>
          {Array.from({ length: columns - (images.length % columns) }).map((_, index) => (
            <div
              key={`placeholder-${index}`}
              className={cn(
                'gallery-grid-placeholder',
                'border-2 border-dashed border-gray-200 rounded-lg',
                'flex items-center justify-center text-gray-400 text-sm',
                'min-h-[100px] transition-colors hover:border-gray-300 hover:bg-gray-50'
              )}
              style={{
                borderRadius: `${borderRadius}px`,
                aspectRatio: aspectRatio !== 'auto' ? {
                  'square': '1 / 1',
                  '4:3': '4 / 3',
                  '16:9': '16 / 9',
                  '3:2': '3 / 2'
                }[aspectRatio] : undefined
              }}
              role="gridcell"
              aria-label="Add image placeholder"
            >
              <span className="text-xs">Add Image</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default GalleryGrid;