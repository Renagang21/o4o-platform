/**
 * Gallery Slider Layout Component
 * 가로 스크롤 캐러셀 레이아웃
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import GalleryItem from './GalleryItem';
import { GalleryImage, GalleryAttributes } from './types';

interface GallerySliderProps {
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

const GallerySlider: React.FC<GallerySliderProps> = ({
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

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [currentColumns, setCurrentColumns] = useState(columns);

  const sliderRef = useRef<HTMLDivElement>(null);
  const autoPlayRef = useRef<NodeJS.Timeout>(undefined);

  // Update responsive columns
  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      let newColumns = columns;

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
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, [columns, responsiveColumns]);

  // Update scroll indicators
  const updateScrollIndicators = useCallback(() => {
    if (!sliderRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  }, []);

  // Handle scroll events
  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;

    slider.addEventListener('scroll', updateScrollIndicators);
    updateScrollIndicators();

    return () => {
      slider.removeEventListener('scroll', updateScrollIndicators);
    };
  }, [updateScrollIndicators]);

  // Auto-play functionality
  useEffect(() => {
    if (isAutoPlaying && !isEditing) {
      autoPlayRef.current = setInterval(() => {
        if (canScrollRight) {
          scrollToNext();
        } else {
          setCurrentIndex(0);
          scrollToIndex(0);
        }
      }, 3000);
    } else {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    }

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [isAutoPlaying, canScrollRight, isEditing]);

  // Calculate item width
  const getItemWidth = () => {
    if (!sliderRef.current) return 300;
    const containerWidth = sliderRef.current.clientWidth;
    return (containerWidth - gap * (currentColumns - 1)) / currentColumns;
  };

  // Scroll to specific index
  const scrollToIndex = (index: number) => {
    if (!sliderRef.current) return;

    const itemWidth = getItemWidth();
    const scrollPosition = index * (itemWidth + gap);

    sliderRef.current.scrollTo({
      left: scrollPosition,
      behavior: 'smooth'
    });

    setCurrentIndex(index);
  };

  // Scroll to next set of images
  const scrollToNext = () => {
    const nextIndex = Math.min(currentIndex + currentColumns, images.length - currentColumns);
    scrollToIndex(nextIndex);
  };

  // Scroll to previous set of images
  const scrollToPrev = () => {
    const prevIndex = Math.max(currentIndex - currentColumns, 0);
    scrollToIndex(prevIndex);
  };

  // Handle image move in slider context
  const handleImageMove = (imageId: string, direction: 'up' | 'down' | 'left' | 'right') => {
    const currentImageIndex = images.findIndex(img => img.id === imageId);
    if (currentImageIndex === -1) return;

    let newIndex = currentImageIndex;

    switch (direction) {
      case 'left':
        newIndex = Math.max(0, currentImageIndex - 1);
        break;
      case 'right':
        newIndex = Math.min(images.length - 1, currentImageIndex + 1);
        break;
      case 'up':
      case 'down':
        // In slider, up/down moves by visible items count
        const moveAmount = direction === 'up' ? -currentColumns : currentColumns;
        newIndex = Math.max(0, Math.min(images.length - 1, currentImageIndex + moveAmount));
        break;
    }

    if (newIndex !== currentImageIndex) {
      onImageMove?.(imageId, direction);

      // Scroll to keep the moved item visible
      const itemsPerView = currentColumns;
      const newViewIndex = Math.floor(newIndex / itemsPerView) * itemsPerView;
      if (newViewIndex !== Math.floor(currentIndex / itemsPerView) * itemsPerView) {
        scrollToIndex(newViewIndex);
      }
    }
  };

  // Handle empty state
  if (images.length === 0) {
    return (
      <div className={cn(
        'slider-empty-state border-2 border-dashed border-gray-300 rounded-lg p-12 text-center bg-gray-50',
        className
      )}>
        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto bg-gray-200 rounded-lg flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Create your slider gallery</h3>
            <p className="text-sm text-gray-600">Add images to create a horizontal scrolling carousel</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'gallery-slider relative w-full',
        className
      )}
      role="region"
      aria-label={`Image slider with ${images.length} images`}
    >
      {/* Main slider container */}
      <div
        ref={sliderRef}
        className={cn(
          'flex overflow-x-auto scrollbar-hide scroll-smooth',
          // Scroll snap for better UX
          'scroll-snap-type-x scroll-snap-mandatory',
          // Hide scrollbar
          'scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none]',
          '[&::-webkit-scrollbar]:hidden'
        )}
        style={{
          gap: `${gap}px`,
          paddingRight: gap // Ensure last item has proper spacing
        }}
        onScroll={updateScrollIndicators}
        role="tablist"
        aria-live="polite"
      >
        {images.map((image, index) => (
          <div
            key={image.id}
            className={cn(
              'gallery-slider-item flex-shrink-0 scroll-snap-start',
              'focus-within:z-10'
            )}
            style={{
              width: `calc((100% - ${gap * (currentColumns - 1)}px) / ${currentColumns})`,
              minWidth: '200px' // Minimum width for mobile
            }}
            role="tabpanel"
            aria-label={`Image ${index + 1} of ${images.length}`}
          >
            <GalleryItem
              image={image}
              index={index}
              layout="slider"
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
              className="w-full h-full"
            />
          </div>
        ))}
      </div>

      {/* Navigation controls */}
      {!isEditing && images.length > currentColumns && (
        <>
          {/* Previous button */}
          <Button
            variant="secondary"
            size="sm"
            className={cn(
              'absolute left-2 top-1/2 -translate-y-1/2 z-10',
              'h-10 w-10 p-0 rounded-full shadow-lg',
              'bg-white/90 hover:bg-white backdrop-blur-sm',
              'transition-all duration-200',
              !canScrollLeft && 'opacity-50 cursor-not-allowed'
            )}
            onClick={scrollToPrev}
            disabled={!canScrollLeft}
            aria-label="Previous images"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          {/* Next button */}
          <Button
            variant="secondary"
            size="sm"
            className={cn(
              'absolute right-2 top-1/2 -translate-y-1/2 z-10',
              'h-10 w-10 p-0 rounded-full shadow-lg',
              'bg-white/90 hover:bg-white backdrop-blur-sm',
              'transition-all duration-200',
              !canScrollRight && 'opacity-50 cursor-not-allowed'
            )}
            onClick={scrollToNext}
            disabled={!canScrollRight}
            aria-label="Next images"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>

          {/* Auto-play toggle */}
          <Button
            variant="secondary"
            size="sm"
            className={cn(
              'absolute top-2 right-2 z-10',
              'h-8 w-8 p-0 rounded-full shadow-lg',
              'bg-white/90 hover:bg-white backdrop-blur-sm',
              'transition-all duration-200'
            )}
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            aria-label={isAutoPlaying ? 'Pause slideshow' : 'Play slideshow'}
            title={isAutoPlaying ? 'Pause slideshow' : 'Play slideshow'}
          >
            {isAutoPlaying ? (
              <Pause className="h-3 w-3" />
            ) : (
              <Play className="h-3 w-3" />
            )}
          </Button>
        </>
      )}

      {/* Pagination dots */}
      {!isEditing && images.length > currentColumns && (
        <div className="flex justify-center mt-4 space-x-2">
          {Array.from({
            length: Math.ceil(images.length / currentColumns)
          }).map((_, index) => (
            <button
              key={index}
              className={cn(
                'w-2 h-2 rounded-full transition-all duration-200',
                Math.floor(currentIndex / currentColumns) === index
                  ? 'bg-blue-500 w-6'
                  : 'bg-gray-300 hover:bg-gray-400'
              )}
              onClick={() => scrollToIndex(index * currentColumns)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Progress bar */}
      {!isEditing && isAutoPlaying && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
          <div
            className="h-full bg-blue-500 transition-all duration-3000 ease-linear"
            style={{
              width: `${((currentIndex + currentColumns) / images.length) * 100}%`
            }}
          />
        </div>
      )}
    </div>
  );
};

export default GallerySlider;