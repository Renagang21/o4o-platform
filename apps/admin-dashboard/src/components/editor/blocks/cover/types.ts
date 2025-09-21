/**
 * Cover Block Type Definitions
 * WordPress Gutenberg Cover Block compatible types
 */

import { CoverPosition } from '../shared/LayoutGrid';

export interface FocalPoint {
  x: number;
  y: number;
}

export interface DuotoneFilter {
  slug: string;
  name: string;
  colors: [string, string];
}

export interface GradientValue {
  gradient: string;
  name?: string;
  slug?: string;
}

export interface CoverBackgroundMedia {
  id?: string;
  url: string;
  alt?: string;
  title?: string;
  width?: number;
  height?: number;
  mimeType?: string;
  focalPoint?: FocalPoint;
}

export interface CoverOverlaySettings {
  color?: string;
  gradient?: string | GradientValue;
  opacity: number;
  blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light' | 'difference' | 'exclusion';
  duotone?: DuotoneFilter;
}

export interface CoverLayoutSettings {
  minHeight: number;
  aspectRatio?: 'auto' | '16:9' | '4:3' | '3:2' | '1:1' | 'custom';
  customAspectRatio?: string;
  contentPosition: CoverPosition;
  hasParallax: boolean;
  allowResize: boolean;
  verticalAlignment?: 'top' | 'center' | 'bottom';
}

export interface CoverInnerBlock {
  id: string;
  type: string;
  content: string;
  attributes?: Record<string, any>;
}

export interface CoverBlockAttributes {
  // Background settings
  backgroundType: 'image' | 'video' | 'color' | 'gradient';
  backgroundImage?: CoverBackgroundMedia;
  backgroundVideo?: CoverBackgroundMedia;
  backgroundColor?: string;
  gradient?: string | GradientValue;

  // Overlay settings
  overlay: CoverOverlaySettings;

  // Layout settings
  layout: CoverLayoutSettings;

  // Content settings
  innerBlocks: CoverInnerBlock[];
  placeholder?: string;

  // WordPress compatibility
  dimRatio?: number; // Legacy opacity (0-100)
  customOverlayColor?: string; // Legacy color
  overlayColor?: string; // Legacy color
  hasParallax?: boolean; // Legacy parallax
  id?: string; // Block anchor ID
  className?: string; // Custom CSS classes

  // Advanced settings
  tagName?: 'div' | 'header' | 'section' | 'article' | 'main' | 'aside';
  isUserOverlayColor?: boolean;
  useFeaturedImage?: boolean;

  // ACF Integration
  dynamicBackground?: {
    field?: string;
    fallback?: string;
  };
}

export interface CoverBlockProps {
  id: string;
  content: string;
  onChange: (content: string, attributes?: any) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddBlock?: (position: 'before' | 'after', type?: string) => void;
  isSelected: boolean;
  onSelect: () => void;
  attributes?: CoverBlockAttributes;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  isDragging?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onChangeType?: (newType: string) => void;
}

// Utility types
export type BackgroundType = CoverBlockAttributes['backgroundType'];
export type BlendMode = CoverOverlaySettings['blendMode'];
export type AspectRatio = CoverLayoutSettings['aspectRatio'];
export type TagName = CoverBlockAttributes['tagName'];

// Default values
export const DEFAULT_COVER_ATTRIBUTES: CoverBlockAttributes = {
  backgroundType: 'color',
  backgroundColor: '#000000',
  overlay: {
    opacity: 50,
    blendMode: 'normal'
  },
  layout: {
    minHeight: 400,
    aspectRatio: 'auto',
    contentPosition: 'center-center',
    hasParallax: false,
    allowResize: true
  },
  innerBlocks: [],
  placeholder: 'Write title...',
  tagName: 'div',
  isUserOverlayColor: false,
  useFeaturedImage: false
};

// Common gradients (WordPress defaults)
export const COMMON_GRADIENTS: GradientValue[] = [
  {
    name: 'Vivid cyan blue to vivid purple',
    gradient: 'linear-gradient(135deg,rgba(6,147,227,1) 0%,rgb(155,81,224) 100%)',
    slug: 'vivid-cyan-blue-to-vivid-purple'
  },
  {
    name: 'Light green cyan to vivid green cyan',
    gradient: 'linear-gradient(135deg,rgb(122,220,180) 0%,rgb(0,208,130) 100%)',
    slug: 'light-green-cyan-to-vivid-green-cyan'
  },
  {
    name: 'Luminous vivid amber to luminous vivid orange',
    gradient: 'linear-gradient(135deg,rgba(252,185,0,1) 0%,rgba(255,105,0,1) 100%)',
    slug: 'luminous-vivid-amber-to-luminous-vivid-orange'
  },
  {
    name: 'Luminous vivid orange to vivid red',
    gradient: 'linear-gradient(135deg,rgba(255,105,0,1) 0%,rgb(207,46,46) 100%)',
    slug: 'luminous-vivid-orange-to-vivid-red'
  },
  {
    name: 'Very light gray to cyan bluish gray',
    gradient: 'linear-gradient(135deg,rgb(238,238,238) 0%,rgb(169,184,195) 100%)',
    slug: 'very-light-gray-to-cyan-bluish-gray'
  },
  {
    name: 'Cool to warm spectrum',
    gradient: 'linear-gradient(135deg,rgb(74,234,220) 0%,rgb(151,120,209) 20%,rgb(207,42,186) 40%,rgb(238,44,130) 60%,rgb(251,105,98) 80%,rgb(254,248,76) 100%)',
    slug: 'cool-to-warm-spectrum'
  }
];

// Common duotone filters
export const COMMON_DUOTONES: DuotoneFilter[] = [
  {
    slug: 'dark-grayscale',
    name: 'Dark grayscale',
    colors: ['#000000', '#7f7f7f']
  },
  {
    slug: 'grayscale',
    name: 'Grayscale',
    colors: ['#000000', '#ffffff']
  },
  {
    slug: 'purple-yellow',
    name: 'Purple and yellow',
    colors: ['#8c2f6d', '#f2d675']
  },
  {
    slug: 'blue-red',
    name: 'Blue and red',
    colors: ['#000097', '#ff4747']
  },
  {
    slug: 'midnight',
    name: 'Midnight',
    colors: ['#000000', '#00a0d2']
  },
  {
    slug: 'magenta-yellow',
    name: 'Magenta and yellow',
    colors: ['#a03a5a', '#f2d675']
  },
  {
    slug: 'purple-green',
    name: 'Purple and green',
    colors: ['#1e1e3c', '#68b962']
  },
  {
    slug: 'blue-orange',
    name: 'Blue and orange',
    colors: ['#0f3460', '#f26c22']
  }
];

// Aspect ratio options
export const ASPECT_RATIO_OPTIONS = [
  { value: 'auto', label: 'Original', ratio: null },
  { value: '16:9', label: '16:9', ratio: 16/9 },
  { value: '4:3', label: '4:3', ratio: 4/3 },
  { value: '3:2', label: '3:2', ratio: 3/2 },
  { value: '1:1', label: 'Square', ratio: 1 },
  { value: 'custom', label: 'Custom', ratio: null }
];

// Blend mode options
export const BLEND_MODE_OPTIONS: { value: BlendMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'darken', label: 'Darken' },
  { value: 'lighten', label: 'Lighten' },
  { value: 'color-dodge', label: 'Color Dodge' },
  { value: 'color-burn', label: 'Color Burn' },
  { value: 'hard-light', label: 'Hard Light' },
  { value: 'soft-light', label: 'Soft Light' },
  { value: 'difference', label: 'Difference' },
  { value: 'exclusion', label: 'Exclusion' }
];

// Tag name options
export const TAG_NAME_OPTIONS: { value: TagName; label: string }[] = [
  { value: 'div', label: 'div' },
  { value: 'header', label: 'header' },
  { value: 'section', label: 'section' },
  { value: 'article', label: 'article' },
  { value: 'main', label: 'main' },
  { value: 'aside', label: 'aside' }
];