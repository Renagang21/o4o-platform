// UAGB Image Block - Spectra 스타일
// 고급 이미지 블록 (캡션, 오버레이, 호버 효과, 링크)

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { 
  UAGBCommonAttributes, 
  generateBlockId
} from './tiptap-block';
import UAGBImageView from './UAGBImageView';

// UAGB Image 속성 정의
export interface UAGBImageAttributes extends UAGBCommonAttributes {
  // Image Source
  imageUrl: string;
  imageId: number;
  imageAlt: string;
  imageTitle: string;
  
  // Image Size & Alignment
  align: 'left' | 'center' | 'right' | 'wide' | 'full';
  alignTablet: 'left' | 'center' | 'right' | 'wide' | 'full';
  alignMobile: 'left' | 'center' | 'right' | 'wide' | 'full';
  
  // Size Control
  sizeSlug: 'thumbnail' | 'medium' | 'large' | 'full' | 'custom';
  customWidth: number;
  customHeight: number;
  customWidthTablet: number;
  customHeightTablet: number;
  customWidthMobile: number;
  customHeightMobile: number;
  widthUnit: 'px' | '%' | 'vw';
  heightUnit: 'px' | '%' | 'vh' | 'auto';
  
  // Link Settings
  linkTo: 'none' | 'media' | 'custom';
  linkUrl: string;
  linkTarget: '_self' | '_blank';
  linkRel: string;
  
  // Caption
  showCaption: boolean;
  caption: string;
  captionAlign: 'left' | 'center' | 'right';
  captionFontFamily: string;
  captionFontSize: number;
  captionFontSizeTablet: number;
  captionFontSizeMobile: number;
  captionFontWeight: string;
  captionColor: string;
  captionBackgroundColor: string;
  captionPadding: number;
  captionMarginTop: number;
  
  // Overlay
  showOverlay: boolean;
  overlayColor: string;
  overlayOpacity: number;
  overlayBlendMode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten';
  
  // Border & Effects
  borderStyle: 'none' | 'solid' | 'dashed' | 'dotted' | 'double';
  borderWidth: number;
  borderColor: string;
  borderRadius: number;
  borderRadiusTablet: number;
  borderRadiusMobile: number;
  
  // Shadow
  boxShadow: boolean;
  boxShadowColor: string;
  boxShadowHOffset: number;
  boxShadowVOffset: number;
  boxShadowBlur: number;
  boxShadowSpread: number;
  
  // Hover Effects
  enableHoverEffect: boolean;
  hoverEffect: 'none' | 'zoom' | 'slide' | 'fade' | 'rotate' | 'scale' | 'lift';
  hoverTransition: number;
  
  // Image Filters
  enableFilters: boolean;
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  hue: number;
  
  // Hover Filters
  enableHoverFilters: boolean;
  hoverBrightness: number;
  hoverContrast: number;
  hoverSaturation: number;
  hoverBlur: number;
  hoverHue: number;
  
  // Lazy Loading
  lazyLoad: boolean;
  
  // Object Fit
  objectFit: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  objectPosition: string;
  
  // Masking
  enableMask: boolean;
  maskShape: 'circle' | 'square' | 'triangle' | 'hexagon' | 'star' | 'heart';
  maskSize: number;
  maskPosition: 'center' | 'top' | 'bottom' | 'left' | 'right';
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    uagbImage: {
      setUAGBImage: (attrs: Partial<UAGBImageAttributes>) => ReturnType;
      updateUAGBImage: (attrs: Partial<UAGBImageAttributes>) => ReturnType;
    };
  }
}

export const UAGBImageBlock = Node.create({
  name: 'uagb/image',
  
  group: 'block',
  atom: true,
  
  addAttributes() {
    return {
      // 블록 식별
      block_id: {
        default: () => generateBlockId(),
        parseHTML: element => element.getAttribute('data-block-id'),
        renderHTML: attributes => ({ 'data-block-id': attributes.block_id }),
      },
      classMigrate: {
        default: false,
      },
      
      // Image Source
      imageUrl: { default: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop' },
      imageId: { default: 0 },
      imageAlt: { default: 'Beautiful landscape' },
      imageTitle: { default: '' },
      
      // Size & Alignment
      align: { default: 'center' },
      alignTablet: { default: 'center' },
      alignMobile: { default: 'center' },
      
      // Size Control
      sizeSlug: { default: 'large' },
      customWidth: { default: 600 },
      customHeight: { default: 400 },
      customWidthTablet: { default: 500 },
      customHeightTablet: { default: 350 },
      customWidthMobile: { default: 300 },
      customHeightMobile: { default: 200 },
      widthUnit: { default: 'px' },
      heightUnit: { default: 'auto' },
      
      // Link Settings
      linkTo: { default: 'none' },
      linkUrl: { default: '' },
      linkTarget: { default: '_self' },
      linkRel: { default: '' },
      
      // Caption
      showCaption: { default: false },
      caption: { default: 'This is an image caption' },
      captionAlign: { default: 'center' },
      captionFontFamily: { default: 'inherit' },
      captionFontSize: { default: 14 },
      captionFontSizeTablet: { default: 14 },
      captionFontSizeMobile: { default: 12 },
      captionFontWeight: { default: '400' },
      captionColor: { default: '#666666' },
      captionBackgroundColor: { default: 'transparent' },
      captionPadding: { default: 10 },
      captionMarginTop: { default: 10 },
      
      // Overlay
      showOverlay: { default: false },
      overlayColor: { default: '#000000' },
      overlayOpacity: { default: 0.5 },
      overlayBlendMode: { default: 'normal' },
      
      // Border & Effects
      borderStyle: { default: 'none' },
      borderWidth: { default: 1 },
      borderColor: { default: '#e2e8f0' },
      borderRadius: { default: 0 },
      borderRadiusTablet: { default: 0 },
      borderRadiusMobile: { default: 0 },
      
      // Shadow
      boxShadow: { default: false },
      boxShadowColor: { default: '#00000040' },
      boxShadowHOffset: { default: 0 },
      boxShadowVOffset: { default: 4 },
      boxShadowBlur: { default: 6 },
      boxShadowSpread: { default: 0 },
      
      // Hover Effects
      enableHoverEffect: { default: false },
      hoverEffect: { default: 'zoom' },
      hoverTransition: { default: 300 },
      
      // Image Filters
      enableFilters: { default: false },
      brightness: { default: 100 },
      contrast: { default: 100 },
      saturation: { default: 100 },
      blur: { default: 0 },
      hue: { default: 0 },
      
      // Hover Filters
      enableHoverFilters: { default: false },
      hoverBrightness: { default: 110 },
      hoverContrast: { default: 110 },
      hoverSaturation: { default: 120 },
      hoverBlur: { default: 0 },
      hoverHue: { default: 0 },
      
      // Other
      lazyLoad: { default: true },
      objectFit: { default: 'cover' },
      objectPosition: { default: 'center' },
      
      // Masking
      enableMask: { default: false },
      maskShape: { default: 'circle' },
      maskSize: { default: 100 },
      maskPosition: { default: 'center' },
      
      // Common UAGB attributes
      blockTopMargin: { default: 0 },
      blockRightMargin: { default: 0 },
      blockBottomMargin: { default: 0 },
      blockLeftMargin: { default: 0 },
      blockTopMarginTablet: { default: 0 },
      blockRightMarginTablet: { default: 0 },
      blockBottomMarginTablet: { default: 0 },
      blockLeftMarginTablet: { default: 0 },
      blockTopMarginMobile: { default: 0 },
      blockRightMarginMobile: { default: 0 },
      blockBottomMarginMobile: { default: 0 },
      blockLeftMarginMobile: { default: 0 },
      
      blockTopPadding: { default: 0 },
      blockRightPadding: { default: 0 },
      blockBottomPadding: { default: 0 },
      blockLeftPadding: { default: 0 },
      blockTopPaddingTablet: { default: 0 },
      blockRightPaddingTablet: { default: 0 },
      blockBottomPaddingTablet: { default: 0 },
      blockLeftPaddingTablet: { default: 0 },
      blockTopPaddingMobile: { default: 0 },
      blockRightPaddingMobile: { default: 0 },
      blockBottomPaddingMobile: { default: 0 },
      blockLeftPaddingMobile: { default: 0 },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="uagb/image"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        {
          'data-type': 'uagb/image',
          'class': `uagb-block-${HTMLAttributes['data-block-id']} uagb-image`,
        },
        HTMLAttributes
      ),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(UAGBImageView);
  },

  addCommands() {
    return {
      setUAGBImage:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
      updateUAGBImage:
        (attrs) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, attrs);
        },
    };
  },
});

export default UAGBImageBlock;
