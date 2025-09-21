/**
 * Gallery Masonry Layout Component
 * Pinterest 스타일의 메이슨리 레이아웃 (CSS Columns 사용)
 */

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import GalleryItem from './GalleryItem';
import { GalleryImage, GalleryAttributes } from './types';

interface GalleryMasonryProps {
  images: GalleryImage[];
  attributes: Partial<GalleryAttributes>;
  isEditing?: boolean;
  selectedImageId?: string;
  onImageSelect?: (imageId: string) => void;
  onImageEdit?: (imageId: string) => void;
  onImageRemove?: (imageId: string) => void;
  onImageMove?: (imageId: string, direction: 'up' | 'down' | 'left' | 'right') => void;
  onLightboxOpen?: (index: number) => void;
  className?: string;
}

const GalleryMasonry: React.FC<GalleryMasonryProps> = ({
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
    showCaptions = true,
    captionPosition = 'below',
    enableLightbox = true,
    hoverEffect = 'none',
    borderRadius = 0,
    responsiveColumns = { mobile: 1, tablet: 2, desktop: 3 }
  } = attributes;

  const containerRef = useRef<HTMLDivElement>(null);
  const [currentColumns, setCurrentColumns] = useState(columns);
  const [isLayoutReady, setIsLayoutReady] = useState(false);

  // Update columns based on container width (responsive behavior)
  useEffect(() => {
    const updateColumns = () => {
      if (!containerRef.current) return;

      const width = containerRef.current.offsetWidth;
      let newColumns = columns;

      // Responsive breakpoints
      if (width < 640) {
        newColumns = responsiveColumns.mobile;
      } else if (width < 1024) {
        newColumns = responsiveColumns.tablet;
      } else {
        newColumns = Math.min(columns, responsiveColumns.desktop);
      }

      setCurrentColumns(newColumns);
    };

    updateColumns();

    const resizeObserver = new ResizeObserver(updateColumns);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [columns, responsiveColumns]);

  // Set layout ready after images load
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLayoutReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [images]);

  // Distribute images across columns for better balance
  const distributeImages = () => {
    const columnArrays: GalleryImage[][] = Array.from({ length: currentColumns }, () => []);
    const columnHeights = new Array(currentColumns).fill(0);

    images.forEach(image => {
      // Find the column with the least height
      const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));

      // Add image to that column
      columnArrays[shortestColumnIndex].push(image);

      // Estimate height based on aspect ratio
      const estimatedHeight = image.height && image.width
        ? (200 * image.height) / image.width
        : 200; // Default height estimate

      columnHeights[shortestColumnIndex] += estimatedHeight + gap;
    });

    return columnArrays;
  };

  // Handle image move in masonry context
  const handleImageMove = (imageId: string, direction: 'up' | 'down' | 'left' | 'right') => {
    const currentIndex = images.findIndex(img => img.id === imageId);
    if (currentIndex === -1) return;

    let newIndex = currentIndex;

    switch (direction) {
      case 'up':
        newIndex = Math.max(0, currentIndex - 1);
        break;
      case 'down':
        newIndex = Math.min(images.length - 1, currentIndex + 1);
        break;
      case 'left':
        // Move to previous column position
        newIndex = Math.max(0, currentIndex - Math.floor(images.length / currentColumns));
        break;
      case 'right':
        // Move to next column position
        newIndex = Math.min(images.length - 1, currentIndex + Math.floor(images.length / currentColumns));
        break;
    }

    if (newIndex !== currentIndex) {
      onImageMove?.(imageId, direction);
    }
  };

  // Handle empty state
  if (images.length === 0) {
    return (
      <div className={cn(
        'masonry-empty-state border-2 border-dashed border-gray-300 rounded-lg p-12 text-center bg-gray-50',
        className
      )}>
        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto bg-gray-200 rounded-lg flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Create your masonry gallery</h3>
            <p className="text-sm text-gray-600">Add images to see them arranged in a Pinterest-style layout</p>
          </div>
        </div>
      </div>
    );
  }

  const columnArrays = distributeImages();

  return (
    <div
      ref={containerRef}
      className={cn(
        'gallery-masonry w-full',
        'transition-opacity duration-300',
        isLayoutReady ? 'opacity-100' : 'opacity-0',
        className
      )}
      style={{
        columnCount: currentColumns,
        columnGap: `${gap}px`,
        columnFill: 'auto'
      }}
      role="grid"
      aria-label={`Image gallery with ${images.length} images in masonry layout`}
    >
      {/* CSS Columns approach - simpler but less control */}
      {images.map((image, index) => (
        <div
          key={image.id}
          className={cn(
            'gallery-masonry-item',
            'break-inside-avoid mb-4 w-full',
            'focus-within:z-10'
          )}
          style={{
            marginBottom: `${gap}px`
          }}
          role="gridcell"
        >
          <GalleryItem
            image={image}
            index={index}
            layout="masonry"
            aspectRatio="auto" // Masonry always uses original aspect ratio
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
            className="gallery-masonry-image"
          />
        </div>
      ))}

      {/* Alternative: Manual column distribution for better control */}
      {/*
      <div
        className="flex gap-4 w-full"
        style={{ gap: `${gap}px` }}
      >
        {columnArrays.map((columnImages, columnIndex) => (
          <div
            key={columnIndex}
            className="flex-1 space-y-4"
            style={{ gap: `${gap}px` }}
          >
            {columnImages.map((image, imageIndex) => {
              const globalIndex = images.findIndex(img => img.id === image.id);
              return (
                <GalleryItem
                  key={image.id}
                  image={image}
                  index={globalIndex}
                  layout="masonry"
                  aspectRatio="auto"
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
                  className="w-full"
                />
              );
            })}
          </div>
        ))}
      </div>
      */}

      {/* Loading overlay for layout shifts */}
      {!isLayoutReady && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
          <div className="text-sm text-gray-500">Arranging layout...</div>
        </div>
      )}
    </div>
  );
};

export default GalleryMasonry;