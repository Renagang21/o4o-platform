// UAGB Advanced Heading Block - Spectra 스타일
// 고급 제목 블록 (제목 + 부제목 + 구분선 + 하이라이트)

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { 
  UAGBCommonAttributes, 
  generateBlockId
} from './tiptap-block';
import UAGBAdvancedHeadingView from './UAGBAdvancedHeadingView';

// UAGB Advanced Heading 속성 정의
export interface UAGBAdvancedHeadingAttributes extends UAGBCommonAttributes {
  // Content
  headingText: string;
  subHeadingText: string;
  headingTag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  
  // Layout
  headingAlign: 'left' | 'center' | 'right';
  headingAlignTablet: 'left' | 'center' | 'right';
  headingAlignMobile: 'left' | 'center' | 'right';
  
  // Main Heading Typography
  headingFontFamily: string;
  headingFontSize: number;
  headingFontSizeTablet: number;
  headingFontSizeMobile: number;
  headingFontWeight: string;
  headingLineHeight: number;
  headingLineHeightTablet: number;
  headingLineHeightMobile: number;
  headingLetterSpacing: number;
  headingColor: string;
  headingTextTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  
  // Sub Heading Typography
  subHeadingFontFamily: string;
  subHeadingFontSize: number;
  subHeadingFontSizeTablet: number;
  subHeadingFontSizeMobile: number;
  subHeadingFontWeight: string;
  subHeadingLineHeight: number;
  subHeadingColor: string;
  subHeadingLetterSpacing: number;
  
  // Separator
  showSeparator: boolean;
  separatorStyle: 'solid' | 'double' | 'dashed' | 'dotted' | 'none';
  separatorWidth: number;
  separatorWidthTablet: number;
  separatorWidthMobile: number;
  separatorThickness: number;
  separatorColor: string;
  separatorPosition: 'above' | 'below' | 'between';
  
  // Highlight
  showHighlight: boolean;
  highlightText: string;
  highlightColor: string;
  highlightBackgroundColor: string;
  highlightPadding: number;
  highlightBorderRadius: number;
  
  // Spacing
  headingBottomSpacing: number;
  headingBottomSpacingTablet: number;
  headingBottomSpacingMobile: number;
  subHeadingBottomSpacing: number;
  subHeadingBottomSpacingTablet: number;
  subHeadingBottomSpacingMobile: number;
  separatorBottomSpacing: number;
  separatorBottomSpacingTablet: number;
  separatorBottomSpacingMobile: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    uagbAdvancedHeading: {
      setUAGBAdvancedHeading: (attrs: Partial<UAGBAdvancedHeadingAttributes>) => ReturnType;
      updateUAGBAdvancedHeading: (attrs: Partial<UAGBAdvancedHeadingAttributes>) => ReturnType;
    };
  }
}

export const UAGBAdvancedHeadingBlock = Node.create({
  name: 'uagb/advanced-heading',
  
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
      
      // Content
      headingText: { default: 'Advanced Heading' },
      subHeadingText: { default: 'This is a sub-heading' },
      headingTag: { default: 'h2' },
      
      // Layout
      headingAlign: { default: 'center' },
      headingAlignTablet: { default: 'center' },
      headingAlignMobile: { default: 'center' },
      
      // Main Heading Typography
      headingFontFamily: { default: 'inherit' },
      headingFontSize: { default: 36 },
      headingFontSizeTablet: { default: 32 },
      headingFontSizeMobile: { default: 28 },
      headingFontWeight: { default: '700' },
      headingLineHeight: { default: 1.3 },
      headingLineHeightTablet: { default: 1.3 },
      headingLineHeightMobile: { default: 1.3 },
      headingLetterSpacing: { default: 0 },
      headingColor: { default: '#333333' },
      headingTextTransform: { default: 'none' },
      
      // Sub Heading Typography
      subHeadingFontFamily: { default: 'inherit' },
      subHeadingFontSize: { default: 16 },
      subHeadingFontSizeTablet: { default: 16 },
      subHeadingFontSizeMobile: { default: 14 },
      subHeadingFontWeight: { default: '400' },
      subHeadingLineHeight: { default: 1.5 },
      subHeadingColor: { default: '#666666' },
      subHeadingLetterSpacing: { default: 0 },
      
      // Separator
      showSeparator: { default: false },
      separatorStyle: { default: 'solid' },
      separatorWidth: { default: 50 },
      separatorWidthTablet: { default: 50 },
      separatorWidthMobile: { default: 50 },
      separatorThickness: { default: 2 },
      separatorColor: { default: '#3b82f6' },
      separatorPosition: { default: 'below' },
      
      // Highlight
      showHighlight: { default: false },
      highlightText: { default: 'Highlight' },
      highlightColor: { default: '#ffffff' },
      highlightBackgroundColor: { default: '#3b82f6' },
      highlightPadding: { default: 8 },
      highlightBorderRadius: { default: 4 },
      
      // Spacing
      headingBottomSpacing: { default: 10 },
      headingBottomSpacingTablet: { default: 10 },
      headingBottomSpacingMobile: { default: 10 },
      subHeadingBottomSpacing: { default: 20 },
      subHeadingBottomSpacingTablet: { default: 20 },
      subHeadingBottomSpacingMobile: { default: 20 },
      separatorBottomSpacing: { default: 20 },
      separatorBottomSpacingTablet: { default: 20 },
      separatorBottomSpacingMobile: { default: 20 },
      
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
        tag: 'div[data-type="uagb/advanced-heading"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        {
          'data-type': 'uagb/advanced-heading',
          'class': `uagb-block-${HTMLAttributes['data-block-id']} uagb-advanced-heading`,
        },
        HTMLAttributes
      ),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(UAGBAdvancedHeadingView);
  },

  addCommands() {
    return {
      setUAGBAdvancedHeading:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
      updateUAGBAdvancedHeading:
        (attrs) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, attrs);
        },
    };
  },
});

export default UAGBAdvancedHeadingBlock;
