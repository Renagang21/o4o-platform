/**
 * useEmbla Hook
 * M2: Embla initialization with options and autoplay plugin
 */

import { useEffect, useMemo } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import type { AutoplayConfig } from '../types/slide.types';

export interface UseEmblaOptions {
  loop: boolean;
  autoplay: AutoplayConfig;
}

/**
 * Initializes Embla Carousel with plugins and options
 */
export function useEmbla(options: UseEmblaOptions) {
  const { loop, autoplay } = options;

  // Create autoplay plugin instance
  const autoplayPlugin = useMemo(() => {
    if (!autoplay.enabled) return undefined;

    return Autoplay({
      delay: autoplay.delay,
      stopOnInteraction: autoplay.pauseOnInteraction ?? true,
      stopOnMouseEnter: autoplay.pauseOnInteraction ?? true,
    });
  }, [autoplay.enabled, autoplay.delay, autoplay.pauseOnInteraction]);

  // Initialize Embla with plugins
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop,
      align: 'start',
      skipSnaps: false,
      containScroll: 'trimSnaps',
    },
    autoplayPlugin ? [autoplayPlugin] : []
  );

  // Log initialization for debugging
  useEffect(() => {
    if (emblaApi) {
      console.debug('[SlideApp] Embla initialized', {
        loop,
        autoplay: autoplay.enabled,
        delay: autoplay.delay,
        slideCount: emblaApi.slideNodes().length,
      });
    }
  }, [emblaApi, loop, autoplay.enabled, autoplay.delay]);

  return {
    emblaRef,
    emblaApi,
    autoplayPlugin,
  };
}
