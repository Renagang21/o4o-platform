// UAGB Counter Block - Spectra 스타일
// StatsBlock을 UAGB Counter로 변환
// brainstormforce/wp-spectra 구조를 기반으로 함

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { 
  UAGBCommonAttributes, 
  generateBlockId,
  UAGBCounterControl
} from './tiptap-block';
import UAGBCounterView from './UAGBCounterView';

// UAGB Counter 속성 정의
export interface UAGBCounterAttributes extends UAGBCommonAttributes {
  // Counter Settings
  startNumber: number;
  endNumber: number;
  animationDuration: number;
  animationDelay: number;
  prefix: string;
  suffix: string;
  separator: string;
  showSeparator: boolean;
  animationEasing: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
  
  // Layout & Design
  counterSize: 'small' | 'medium' | 'large' | 'extra-large';
  layout: 'vertical' | 'horizontal';
  iconPosition: 'top' | 'left' | 'right' | 'bottom';
  showIcon: boolean;
  icon: string;
  
  // Content
  title: string;
  description: string;
  showTitle: boolean;
  showDescription: boolean;
  
  // Typography
  counterFontSize: number;
  counterFontSizeTablet: number;
  counterFontSizeMobile: number;
  counterFontWeight: string;
  counterColor: string;
  
  titleFontSize: number;
  titleFontSizeTablet: number;
  titleFontSizeMobile: number;
  titleFontWeight: string;
  titleColor: string;
  
  descriptionFontSize: number;
  descriptionFontSizeTablet: number;
  descriptionFontSizeMobile: number;
  descriptionColor: string;
  
  // Alignment
  textAlign: 'left' | 'center' | 'right';
  textAlignTablet: 'left' | 'center' | 'right';
  textAlignMobile: 'left' | 'center' | 'right';
  
  // Spacing
  counterBottomSpacing: number;
  counterBottomSpacingTablet: number;
  counterBottomSpacingMobile: number;
  titleBottomSpacing: number;
  titleBottomSpacingTablet: number;
  titleBottomSpacingMobile: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    uagbCounter: {
      setUAGBCounter: (attrs: Partial<UAGBCounterAttributes>) => ReturnType;
      updateUAGBCounter: (attrs: Partial<UAGBCounterAttributes>) => ReturnType;
    };
  }
}

export const UAGBCounterBlock = Node.create({
  name: 'uagb/counter',
  
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
      
      // Counter Settings
      startNumber: { default: 0 },
      endNumber: { default: 100 },
      animationDuration: { default: 2000 },
      animationDelay: { default: 0 },
      prefix: { default: '' },
      suffix: { default: '+' },
      separator: { default: ',' },
      showSeparator: { default: true },
      animationEasing: { default: 'ease-out' },
      
      // Layout & Design
      counterSize: { default: 'large' },
      layout: { default: 'vertical' },
      iconPosition: { default: 'top' },
      showIcon: { default: false },
      icon: { default: '⭐' },
      
      // Content
      title: { default: 'Happy Customers' },
      description: { default: 'Customers who love our service' },
      showTitle: { default: true },
      showDescription: { default: true },
      
      // Typography
      counterFontSize: { default: 48 },
      counterFontSizeTablet: { default: 40 },
      counterFontSizeMobile: { default: 32 },
      counterFontWeight: { default: '700' },
      counterColor: { default: '#333333' },
      
      titleFontSize: { default: 18 },
      titleFontSizeTablet: { default: 16 },
      titleFontSizeMobile: { default: 14 },
      titleFontWeight: { default: '600' },
      titleColor: { default: '#333333' },
      
      descriptionFontSize: { default: 14 },
      descriptionFontSizeTablet: { default: 14 },
      descriptionFontSizeMobile: { default: 12 },
      descriptionColor: { default: '#666666' },
      
      // Alignment
      textAlign: { default: 'center' },
      textAlignTablet: { default: 'center' },
      textAlignMobile: { default: 'center' },
      
      // Spacing
      counterBottomSpacing: { default: 8 },
      counterBottomSpacingTablet: { default: 8 },
      counterBottomSpacingMobile: { default: 8 },
      titleBottomSpacing: { default: 8 },
      titleBottomSpacingTablet: { default: 8 },
      titleBottomSpacingMobile: { default: 8 },
      
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
      
      blockTopPadding: { default: 20 },
      blockRightPadding: { default: 20 },
      blockBottomPadding: { default: 20 },
      blockLeftPadding: { default: 20 },
      blockTopPaddingTablet: { default: 20 },
      blockRightPaddingTablet: { default: 20 },
      blockBottomPaddingTablet: { default: 20 },
      blockLeftPaddingTablet: { default: 20 },
      blockTopPaddingMobile: { default: 20 },
      blockRightPaddingMobile: { default: 20 },
      blockBottomPaddingMobile: { default: 20 },
      blockLeftPaddingMobile: { default: 20 },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="uagb/counter"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        {
          'data-type': 'uagb/counter',
          'class': `uagb-block-${HTMLAttributes['data-block-id']} uagb-counter`,
        },
        HTMLAttributes
      ),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(UAGBCounterView);
  },

  addCommands() {
    return {
      setUAGBCounter:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
      updateUAGBCounter:
        (attrs) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, attrs);
        },
    };
  },
});

export default UAGBCounterBlock;
