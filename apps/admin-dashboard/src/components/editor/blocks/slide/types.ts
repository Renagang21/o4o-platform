/**
 * Slide Types - Complete definitions for Phase 1-4
 */

// Basic slide types
export type SlideType = 'text' | 'image' | 'mixed' | 'video';

// Transition types
export type TransitionType = 
  | 'fade' 
  | 'slide' 
  | 'zoom'
  | 'flip'
  | 'cube'
  | 'none';

// Link configuration (Phase 4)
export interface LinkConfig {
  url: string;
  target: '_self' | '_blank' | '_parent' | '_top';
  rel?: string;
  title?: string;
  trackingId?: string;
  clickArea: 'full' | 'button' | 'custom';
  customArea?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// CTA Button configuration (Phase 4)
export interface CTAButton {
  text: string;
  link: LinkConfig;
  style: 'primary' | 'secondary' | 'outline' | 'ghost';
  size: 'small' | 'medium' | 'large';
  position: 'top-left' | 'top-center' | 'top-right' | 'center' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  icon?: 'arrow' | 'external' | 'download' | 'play';
  animation?: 'none' | 'pulse' | 'bounce' | 'slide';
}

// Timing configuration (Phase 4)
export interface SlideTimingConfig {
  duration: number | 'auto';
  minDuration?: number;
  maxDuration?: number;
  transition: 'immediate' | 'after-transition';
  pauseOnHover?: boolean;
  pauseOnInteraction?: boolean;
  videoDuration?: 'full' | 'custom' | number;
}

// Conditional display (Phase 4)
export type ConditionType = 
  | 'always' 
  | 'date-range' 
  | 'time-range' 
  | 'device-type' 
  | 'screen-size' 
  | 'user-role'
  | 'language'
  | 'custom';

export interface SlideCondition {
  id: string;
  type: ConditionType;
  operator: 'is' | 'is-not' | 'greater-than' | 'less-than' | 'between' | 'contains';
  value: any;
  logic?: 'and' | 'or';
}

export interface ConditionalConfig {
  enabled: boolean;
  conditions: SlideCondition[];
  fallbackSlideId?: string;
  hideWhenFalse?: boolean;
}

// Video configuration (Phase 4)
export interface VideoConfig {
  videoUrl: string;
  posterUrl?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  volume?: number;
  startTime?: number;
  endTime?: number;
}

export interface Slide {
  id: string;
  type: SlideType;
  title?: string;
  subtitle?: string;
  content?: string;
  imageUrl?: string;
  imageAlt?: string;
  backgroundColor?: string;
  textColor?: string;
  order: number;
  visible?: boolean;
  
  // Phase 2 additions
  backgroundGradient?: {
    type: 'linear' | 'radial';
    angle?: number;
    colors: string[];
  };
  backgroundImage?: string;
  transitionType?: TransitionType;
  textStyles?: {
    fontSize?: 'small' | 'medium' | 'large' | 'x-large';
    fontWeight?: string;
    textAlign?: 'left' | 'center' | 'right';
    textShadow?: 'none' | 'subtle' | 'medium' | 'strong' | 'glow';
    lineHeight?: string;
  };
  
  // Phase 4 additions
  videoConfig?: VideoConfig;
  link?: LinkConfig;
  cta?: CTAButton;
  timing?: SlideTimingConfig;
  conditional?: ConditionalConfig;
  groupId?: string;
}

// Slide group (Phase 4)
export interface SlideGroup {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  slides: string[];
  collapsed?: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// Slide template (Phase 4)
export interface SlideTemplate {
  id: string;
  name: string;
  description?: string;
  category: 'hero' | 'content' | 'cta' | 'testimonial' | 'gallery' | 'video' | 'custom';
  slides: Slide[];
  thumbnail?: string;
  tags?: string[];
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SlideBlockAttributes {
  slides: Slide[];
  aspectRatio: '16:9' | '4:3' | '1:1';
  transition: TransitionType;
  autoPlay: boolean;
  autoPlayInterval: number;
  showNavigation: boolean;
  showPagination: boolean;
  backgroundColor?: string;
  
  // Phase 2 additions
  presentationMode?: boolean;
  showThumbnails?: boolean;
  enableKeyboardNavigation?: boolean;
  fullscreenEnabled?: boolean;
  loop?: boolean;
  
  // Phase 4 additions
  groups?: SlideGroup[];
  templates?: SlideTemplate[];
  globalTiming?: SlideTimingConfig;
  enableConditional?: boolean;
}