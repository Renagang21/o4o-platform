/**
 * SlideApp - Main Component (M2 Refactored)
 * Embla Carousel based slide/carousel system with modular hooks and components
 */

import React, { useCallback, useState } from 'react';
import { clsx } from 'clsx';
import { validateProps } from './utils/validateProps';
import { useEmbla } from './hooks/useEmbla';
import { useSlideKeyboard } from './hooks/useSlideKeyboard';
import { useA11y } from './hooks/useA11y';
import { Navigation } from './components/Navigation';
import { Pagination } from './components/Pagination';
import type { SlideAppProps, Slide } from './types/slide.types';

export const SlideApp: React.FC<SlideAppProps> = (props) => {
  // Validate and normalize props
  const validatedProps = validateProps(props);
  const { slides, autoplay, loop, navigation, pagination, aspectRatio, className, a11y, onSlideChange, onSlideClick } =
    validatedProps;

  // Filter visible slides
  const visibleSlides = slides.filter((slide) => slide.visible !== false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Initialize Embla with autoplay
  const { emblaRef, emblaApi, autoplayPlugin } = useEmbla({
    loop,
    autoplay,
  });

  // Keyboard navigation
  useSlideKeyboard({
    emblaApi,
    enabled: true, // Always enabled for accessibility
    autoplayPlugin,
  });

  // Accessibility features
  const { currentSlide, roledescription, getSlideAriaLabel, getSlideAriaCurrent } = useA11y({
    emblaApi,
    totalSlides: visibleSlides.length,
    roledescription: a11y.roledescription,
  });

  // Track slide changes
  React.useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      const index = emblaApi.selectedScrollSnap();
      setSelectedIndex(index);
      onSlideChange?.(index);
    };

    emblaApi.on('select', onSelect);
    onSelect(); // Initial selection

    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSlideChange]);

  // Navigation handlers
  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index);
    },
    [emblaApi]
  );

  // Empty state
  if (visibleSlides.length === 0) {
    return (
      <div className="slide-app-empty text-center py-12 text-gray-500" role="status">
        No slides to display
      </div>
    );
  }

  return (
    <div
      className={clsx('slide-app relative', className)}
      role="region"
      aria-label="Image carousel"
      aria-roledescription={roledescription}
    >
      {/* Viewport Container */}
      <div className="slide-app__viewport-wrapper relative">
        <div className="slide-app__viewport overflow-hidden" ref={emblaRef}>
          <div className="slide-app__container flex">
            {visibleSlides.map((slide, index) => (
              <div
                key={slide.id}
                className={clsx(
                  'slide-app__slide flex-[0_0_100%] min-w-0',
                  getAspectRatioClass(aspectRatio)
                )}
                onClick={() => onSlideClick?.(slide, index)}
                role="group"
                aria-roledescription="slide"
                aria-label={slide.ariaLabel || getSlideAriaLabel(index)}
                aria-current={getSlideAriaCurrent(index)}
              >
                <SlideContent slide={slide} />
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Buttons */}
        {navigation && visibleSlides.length > 1 && (
          <Navigation
            onPrev={scrollPrev}
            onNext={scrollNext}
            prevLabel={a11y.prevLabel}
            nextLabel={a11y.nextLabel}
          />
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination !== 'none' && visibleSlides.length > 1 && (
        <Pagination type={pagination} total={visibleSlides.length} active={currentSlide} onJump={scrollTo} />
      )}
    </div>
  );
};

/**
 * Slide Content Renderer
 */
const SlideContent: React.FC<{ slide: Slide }> = ({ slide }) => {
  const style: React.CSSProperties = {
    backgroundColor: slide.backgroundColor,
    backgroundImage: slide.backgroundImage ? `url(${slide.backgroundImage})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    color: slide.textColor,
  };

  return (
    <div className="slide-content w-full h-full flex flex-col justify-center items-center p-8" style={style}>
      {slide.type === 'image' && slide.src && (
        <img
          src={slide.src}
          alt={slide.alt || slide.title || 'Slide image'}
          className="max-w-full max-h-full object-contain"
        />
      )}

      {slide.type === 'video' && slide.src && (
        <video
          src={slide.src}
          controls
          className="max-w-full max-h-full"
          aria-label={slide.title || 'Slide video'}
        />
      )}

      {(slide.type === 'text' || slide.type === 'mixed') && (
        <div className="text-center">
          {slide.title && <h2 className="text-3xl font-bold mb-2">{slide.title}</h2>}
          {slide.subtitle && <p className="text-xl mb-4">{slide.subtitle}</p>}
          {slide.content && <p className="text-base">{slide.content}</p>}
        </div>
      )}

      {slide.type === 'mixed' && slide.src && (
        <img
          src={slide.src}
          alt={slide.alt || ''}
          className="mt-4 max-w-md max-h-64 object-contain"
        />
      )}
    </div>
  );
};

/**
 * Aspect Ratio Helper
 */
function getAspectRatioClass(aspectRatio: string): string {
  switch (aspectRatio) {
    case '16/9':
      return 'aspect-video';
    case '4/3':
      return 'aspect-[4/3]';
    case '1/1':
      return 'aspect-square';
    case 'auto':
    default:
      return '';
  }
}

export default SlideApp;
