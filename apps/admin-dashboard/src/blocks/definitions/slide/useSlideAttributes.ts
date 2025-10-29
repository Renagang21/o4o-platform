/**
 * useSlideAttributes Hook
 * M3: Converts Gutenberg block attributes to SlideApp props
 */

import { useMemo } from 'react';
import type { SlideAppProps, Slide, AutoplayConfig, A11yConfig } from '@o4o/slide-app';

/**
 * Gutenberg block attributes interface
 */
export interface SlideBlockAttributes {
  slides?: Slide[];
  autoplay?: AutoplayConfig;
  loop?: boolean;
  navigation?: boolean;
  pagination?: 'none' | 'dots' | 'numbers' | 'progress';
  aspectRatio?: '16/9' | '4/3' | '1/1' | 'auto';
  a11y?: A11yConfig;

  // Legacy attributes (for backward compatibility)
  autoPlay?: boolean;
  autoPlayInterval?: number;
  showNavigation?: boolean;
  showPagination?: boolean;
}

/**
 * Converts Gutenberg block attributes to SlideApp props
 * Handles legacy attribute names and provides safe defaults
 */
export function useSlideAttributes(attributes: SlideBlockAttributes): SlideAppProps {
  return useMemo(() => {
    // Handle legacy attributes
    const hasLegacyAutoplay = attributes.autoPlay !== undefined;
    const hasLegacyInterval = attributes.autoPlayInterval !== undefined;

    // Convert autoplay (handle both new and legacy formats)
    const autoplay: AutoplayConfig = attributes.autoplay || {
      enabled: hasLegacyAutoplay ? attributes.autoPlay! : false,
      delay: hasLegacyInterval ? attributes.autoPlayInterval! : 3000,
      pauseOnInteraction: true,
    };

    // Convert navigation (handle both new and legacy)
    const navigation = attributes.navigation !== undefined
      ? attributes.navigation
      : attributes.showNavigation !== undefined
        ? attributes.showNavigation
        : true;

    // Convert pagination (handle legacy showPagination boolean)
    let pagination: 'none' | 'dots' | 'numbers' | 'progress' = attributes.pagination || 'dots';
    if (attributes.showPagination === false && !attributes.pagination) {
      pagination = 'none';
    }

    // Convert aspect ratio (handle legacy '16:9' format)
    let aspectRatio: '16/9' | '4/3' | '1/1' | 'auto' = attributes.aspectRatio || '16/9';
    if (aspectRatio.includes(':')) {
      // Legacy format '16:9' → '16/9'
      aspectRatio = aspectRatio.replace(':', '/') as '16/9' | '4/3' | '1/1';
    }

    // Ensure slides array is valid
    const slides: Slide[] = Array.isArray(attributes.slides) ? attributes.slides : [];

    // A11y config with defaults
    const a11y: A11yConfig = attributes.a11y || {
      prevLabel: 'Previous slide',
      nextLabel: 'Next slide',
      roledescription: 'carousel',
    };

    return {
      slides,
      autoplay,
      loop: attributes.loop !== undefined ? attributes.loop : true,
      navigation,
      pagination,
      aspectRatio,
      a11y,
    };
  }, [attributes]);
}
