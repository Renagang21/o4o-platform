/**
 * Slide Types - Phase 2 Extended Types
 */

export interface Slide {
  id: string;
  type: 'text' | 'image' | 'mixed';
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
  transitionType?: 'fade' | 'slide' | 'zoom' | 'flip' | 'cube' | 'none';
  textStyles?: {
    fontSize?: 'small' | 'medium' | 'large' | 'x-large';
    fontWeight?: string;
    textAlign?: 'left' | 'center' | 'right';
    textShadow?: 'none' | 'subtle' | 'medium' | 'strong' | 'glow';
    lineHeight?: string;
  };
}

export interface SlideBlockAttributes {
  slides: Slide[];
  aspectRatio: '16:9' | '4:3' | '1:1';
  transition: 'fade' | 'slide' | 'zoom' | 'flip' | 'cube' | 'none';
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
}