/**
 * useA11y Hook
 * M2: ARIA attributes and screen reader announcements
 */

import { useEffect, useRef, useState } from 'react';
import type { UseEmblaCarouselType } from 'embla-carousel-react';

export interface UseA11yOptions {
  emblaApi: UseEmblaCarouselType[1] | undefined;
  totalSlides: number;
  roledescription?: string;
}

const ANNOUNCE_DEBOUNCE_MS = 300;

/**
 * Manages accessibility features: ARIA attributes and announcements
 */
export function useA11y(options: UseA11yOptions) {
  const { emblaApi, totalSlides, roledescription = 'carousel' } = options;
  const [currentSlide, setCurrentSlide] = useState(0);
  const announceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAnnouncedRef = useRef<number>(-1);

  // Track slide changes
  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      const index = emblaApi.selectedScrollSnap();
      setCurrentSlide(index);

      // Debounced announcement to avoid duplication
      if (announceTimeoutRef.current) {
        clearTimeout(announceTimeoutRef.current);
      }

      announceTimeoutRef.current = setTimeout(() => {
        if (lastAnnouncedRef.current !== index) {
          announceSlideChange(index, totalSlides);
          lastAnnouncedRef.current = index;
        }
      }, ANNOUNCE_DEBOUNCE_MS);
    };

    emblaApi.on('select', onSelect);
    onSelect(); // Initial announcement

    return () => {
      emblaApi.off('select', onSelect);
      if (announceTimeoutRef.current) {
        clearTimeout(announceTimeoutRef.current);
      }
    };
  }, [emblaApi, totalSlides]);

  return {
    currentSlide,
    roledescription,
    getSlideAriaLabel: (index: number) => `Slide ${index + 1} of ${totalSlides}`,
    getSlideAriaCurrent: (index: number) => (index === currentSlide ? 'true' : 'false'),
  };
}

/**
 * Announces slide change to screen readers via aria-live region
 */
function announceSlideChange(index: number, total: number) {
  const message = `Slide ${index + 1} of ${total}`;

  // Find or create aria-live region
  let liveRegion = document.getElementById('slide-app-live-region');

  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'slide-app-live-region';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.style.position = 'absolute';
    liveRegion.style.left = '-10000px';
    liveRegion.style.width = '1px';
    liveRegion.style.height = '1px';
    liveRegion.style.overflow = 'hidden';
    document.body.appendChild(liveRegion);
  }

  // Update announcement
  liveRegion.textContent = message;
  console.debug(`[SlideApp] A11y announce: ${message}`);
}
