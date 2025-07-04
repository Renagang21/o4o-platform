// UAGB Video Block - Spectra 스타일
// YouTubeEmbed를 UAGB Video로 변환
// brainstormforce/wp-spectra 구조를 기반으로 함

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { 
  UAGBCommonAttributes, 
  generateBlockId,
  UAGBVideoControl
} from './tiptap-block';
import UAGBVideoView from './UAGBVideoView';

// UAGB Video 속성 정의
export interface UAGBVideoAttributes extends UAGBCommonAttributes {
  // Video Settings
  videoUrl: string;
  videoType: 'youtube' | 'vimeo' | 'mp4' | 'webm';
  videoId: string;
  autoplay: boolean;
  muted: boolean;
  loop: boolean;
  showControls: boolean;
  playsinline: boolean;
  
  // YouTube/Vimeo Specific
  showRelated: boolean;
  showTitle: boolean;
  showByline: boolean;
  color: string;
  startTime: number;
  endTime: number;
  
  // Aspect Ratio & Size
  aspectRatio: '16:9' | '4:3' | '1:1' | '21:9' | 'custom';
  customWidth: number;
  customHeight: number;
  
  // Thumbnail & Overlay
  showThumbnail: boolean;
  customThumbnail: string;
  overlay: boolean;
  overlayColor: string;
  overlayOpacity: number;
  
  // Play Button
  playButtonStyle: 'default' | 'rounded' | 'square' | 'circle';
  playButtonSize: 'small' | 'medium' | 'large';
  playButtonColor: string;
  
  // Alignment
  align: 'left' | 'center' | 'right';
  alignTablet: 'left' | 'center' | 'right';
  alignMobile: 'left' | 'center' | 'right';
  
  // Max Width
  maxWidth: number;
  maxWidthTablet: number;
  maxWidthMobile: number;
  maxWidthUnit: 'px' | '%' | 'vw';
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    uagbVideo: {
      setUAGBVideo: (attrs: Partial<UAGBVideoAttributes>) => ReturnType;
      updateUAGBVideo: (attrs: Partial<UAGBVideoAttributes>) => ReturnType;
    };
  }
}

export const UAGBVideoBlock = Node.create({
  name: 'uagb/video',
  
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
      
      // Video Settings
      videoUrl: { default: '' },
      videoType: { default: 'youtube' },
      videoId: { default: '' },
      autoplay: { default: false },
      muted: { default: false },
      loop: { default: false },
      showControls: { default: true },
      playsinline: { default: true },
      
      // YouTube/Vimeo Specific
      showRelated: { default: false },
      showTitle: { default: false },
      showByline: { default: false },
      color: { default: '#00adef' },
      startTime: { default: 0 },
      endTime: { default: 0 },
      
      // Aspect Ratio & Size
      aspectRatio: { default: '16:9' },
      customWidth: { default: 800 },
      customHeight: { default: 450 },
      
      // Thumbnail & Overlay
      showThumbnail: { default: true },
      customThumbnail: { default: '' },
      overlay: { default: false },
      overlayColor: { default: '#000000' },
      overlayOpacity: { default: 0.5 },
      
      // Play Button
      playButtonStyle: { default: 'default' },
      playButtonSize: { default: 'medium' },
      playButtonColor: { default: '#ffffff' },
      
      // Alignment
      align: { default: 'center' },
      alignTablet: { default: 'center' },
      alignMobile: { default: 'center' },
      
      // Max Width
      maxWidth: { default: 100 },
      maxWidthTablet: { default: 100 },
      maxWidthMobile: { default: 100 },
      maxWidthUnit: { default: '%' },
      
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
        tag: 'div[data-type="uagb/video"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        {
          'data-type': 'uagb/video',
          'class': `uagb-block-${HTMLAttributes['data-block-id']} uagb-video`,
        },
        HTMLAttributes
      ),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(UAGBVideoView);
  },

  addCommands() {
    return {
      setUAGBVideo:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
      updateUAGBVideo:
        (attrs) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, attrs);
        },
    };
  },
});

export default UAGBVideoBlock;
