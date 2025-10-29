/**
 * useSlideKeyboard Hook
 * M2: Keyboard navigation (ArrowLeft/Right, Home/End, Space)
 */

import { useEffect, useCallback } from 'react';
import type { UseEmblaCarouselType } from 'embla-carousel-react';

export interface UseSlideKeyboardOptions {
  emblaApi: UseEmblaCarouselType[1] | undefined;
  enabled: boolean;
  autoplayPlugin?: any;
}

/**
 * Handles keyboard navigation for slides
 */
export function useSlideKeyboard(options: UseSlideKeyboardOptions) {
  const { emblaApi, enabled, autoplayPlugin } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!emblaApi || !enabled) return;

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          emblaApi.scrollPrev();
          console.debug('[SlideApp] Keyboard: Previous');
          break;

        case 'ArrowRight':
          event.preventDefault();
          emblaApi.scrollNext();
          console.debug('[SlideApp] Keyboard: Next');
          break;

        case 'Home':
          event.preventDefault();
          emblaApi.scrollTo(0);
          console.debug('[SlideApp] Keyboard: First slide');
          break;

        case 'End':
          event.preventDefault();
          emblaApi.scrollTo(emblaApi.slideNodes().length - 1);
          console.debug('[SlideApp] Keyboard: Last slide');
          break;

        case ' ':
        case 'Spacebar':
          // Optional: Pause/Resume autoplay with Space
          if (autoplayPlugin) {
            event.preventDefault();
            const isPlaying = autoplayPlugin.isPlaying?.();
            if (isPlaying) {
              autoplayPlugin.stop();
              console.debug('[SlideApp] Keyboard: Autoplay paused');
            } else {
              autoplayPlugin.play();
              console.debug('[SlideApp] Keyboard: Autoplay resumed');
            }
          }
          break;

        default:
          break;
      }
    },
    [emblaApi, enabled, autoplayPlugin]
  );

  useEffect(() => {
    if (!enabled || !emblaApi) return;

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [emblaApi, enabled, handleKeyDown]);
}
