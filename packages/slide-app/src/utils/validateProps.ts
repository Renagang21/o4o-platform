/**
 * Props Validation Utilities
 * M2: Runtime guards with console warnings and safe defaults
 */

import type { SlideAppProps, ValidatedSlideAppProps, AutoplayConfig } from '../types/slide.types';

const CONSOLE_PREFIX = '[SlideApp]';

/**
 * Validates and normalizes SlideApp props with safe defaults
 */
export function validateProps(props: SlideAppProps): ValidatedSlideAppProps {
  const warnings: string[] = [];

  // Validate slides (required)
  if (!props.slides || !Array.isArray(props.slides)) {
    warnings.push('slides must be a non-empty array');
    return createDefaultProps();
  }

  if (props.slides.length === 0) {
    warnings.push('slides array is empty');
    return createDefaultProps();
  }

  // Validate slide types
  const validTypes = ['text', 'image', 'video', 'mixed'];
  props.slides.forEach((slide, index) => {
    if (!slide.id) {
      warnings.push(`Slide at index ${index} missing required 'id' field`);
    }
    if (!validTypes.includes(slide.type)) {
      warnings.push(`Slide ${slide.id || index} has invalid type: ${slide.type}`);
    }
  });

  // Validate autoplay config
  const autoplay = normalizeAutoplay(props.autoplay, warnings);

  // Validate aspect ratio
  const validAspectRatios = ['16/9', '4/3', '1/1', 'auto'];
  const aspectRatio = props.aspectRatio || '16/9';
  if (!validAspectRatios.includes(aspectRatio)) {
    warnings.push(`Invalid aspectRatio: ${aspectRatio}. Using default '16/9'`);
  }

  // Validate pagination
  const validPaginations = ['none', 'dots', 'numbers', 'progress'];
  const pagination = props.pagination || 'dots';
  if (!validPaginations.includes(pagination)) {
    warnings.push(`Invalid pagination: ${pagination}. Using default 'dots'`);
  }

  // Log warnings (deduplicated)
  const uniqueWarnings = Array.from(new Set(warnings));
  uniqueWarnings.forEach(warning => {
    console.warn(`${CONSOLE_PREFIX} ${warning}`);
  });

  return {
    slides: props.slides,
    autoplay,
    loop: props.loop ?? true,
    navigation: props.navigation ?? true,
    pagination: pagination as 'none' | 'dots' | 'numbers' | 'progress',
    aspectRatio: aspectRatio as '16/9' | '4/3' | '1/1' | 'auto',
    className: props.className,
    a11y: props.a11y || {},
    onSlideChange: props.onSlideChange,
    onSlideClick: props.onSlideClick,
  };
}

/**
 * Normalizes autoplay configuration
 */
function normalizeAutoplay(
  autoplay: AutoplayConfig | undefined,
  warnings: string[]
): AutoplayConfig {
  // Default: disabled for accessibility
  if (!autoplay) {
    return { enabled: false, delay: 3000, pauseOnInteraction: true };
  }

  const delay = autoplay.delay || 3000;
  if (delay < 1000) {
    warnings.push(`Autoplay delay ${delay}ms is too short (< 1000ms). Using 1000ms`);
  }
  if (delay > 10000) {
    warnings.push(`Autoplay delay ${delay}ms is very long (> 10s). Consider shorter interval`);
  }

  return {
    enabled: autoplay.enabled ?? false,
    delay: Math.max(1000, Math.min(delay, 10000)),
    pauseOnInteraction: autoplay.pauseOnInteraction ?? true,
  };
}

/**
 * Creates safe default props when validation fails critically
 */
function createDefaultProps(): ValidatedSlideAppProps {
  console.error(`${CONSOLE_PREFIX} Critical validation error. Using empty state with safe defaults.`);

  return {
    slides: [],
    autoplay: { enabled: false, delay: 3000, pauseOnInteraction: true },
    loop: false,
    navigation: false,
    pagination: 'none',
    aspectRatio: '16/9',
    a11y: {},
  };
}
