/**
 * SlideApp Types - Embla Carousel based
 * M2: Fixed schema with validation support
 */

export type SlideType = 'text' | 'image' | 'video' | 'mixed';

export type AspectRatio = '16/9' | '4/3' | '1/1' | 'auto';

export type PaginationType = 'none' | 'dots' | 'numbers' | 'progress';

/**
 * Individual Slide Data
 */
export interface Slide {
  id: string;
  type: SlideType;

  // Content (type-specific)
  content?: string; // For text type
  src?: string; // For image/video type (imageUrl or videoUrl)
  alt?: string; // For image type

  // Optional metadata
  title?: string;
  subtitle?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  textColor?: string;
  ariaLabel?: string;
  order?: number;
  visible?: boolean;
}

/**
 * Autoplay Configuration
 */
export interface AutoplayConfig {
  enabled: boolean;
  delay: number; // milliseconds
  pauseOnInteraction?: boolean; // default: true
}

/**
 * Accessibility Configuration
 */
export interface A11yConfig {
  prevLabel?: string;
  nextLabel?: string;
  roledescription?: string;
}

/**
 * SlideApp Component Props (M2 Final Schema)
 */
export interface SlideAppProps {
  // Data (required)
  slides: Slide[];

  // Autoplay
  autoplay?: AutoplayConfig;

  // Behavior
  loop?: boolean;

  // UI Controls
  navigation?: boolean;
  pagination?: PaginationType;

  // Layout
  aspectRatio?: AspectRatio;
  className?: string;

  // Accessibility
  a11y?: A11yConfig;

  // Callbacks
  onSlideChange?: (index: number) => void;
  onSlideClick?: (slide: Slide, index: number) => void;
}

/**
 * Embla Options (internal use)
 */
export interface EmblaOptions {
  loop?: boolean;
  align?: 'start' | 'center' | 'end';
  slidesToScroll?: number;
  skipSnaps?: boolean;
  containScroll?: 'trimSnaps' | 'keepSnaps' | false;
}

/**
 * Validated Props (internal use after validation)
 */
export interface ValidatedSlideAppProps extends Required<Omit<SlideAppProps, 'className' | 'onSlideChange' | 'onSlideClick'>> {
  className?: string;
  onSlideChange?: (index: number) => void;
  onSlideClick?: (slide: Slide, index: number) => void;
}
