// UAGB Buttons Block - Spectra 스타일
// 다중 버튼 그룹 블록

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { 
  UAGBCommonAttributes, 
  generateBlockId
} from './tiptap-block';
import UAGBButtonsView from './UAGBButtonsView';

// 개별 버튼 인터페이스
export interface UAGBButton {
  id: string;
  text: string;
  link: string;
  target: '_self' | '_blank';
  rel: string;
  icon: string;
  iconPosition: 'before' | 'after';
  showIcon: boolean;
  
  // 개별 버튼 스타일
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  backgroundColorHover: string;
  textColorHover: string;
  borderColorHover: string;
  
  // 크기
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  
  // 보더
  borderWidth: number;
  borderRadius: number;
  borderStyle: 'solid' | 'dashed' | 'dotted' | 'none';
}

// UAGB Buttons 속성 정의
export interface UAGBButtonsAttributes extends UAGBCommonAttributes {
  // Buttons Array
  buttons: UAGBButton[];
  
  // Layout
  alignment: 'left' | 'center' | 'right' | 'justify';
  alignmentTablet: 'left' | 'center' | 'right' | 'justify';
  alignmentMobile: 'left' | 'center' | 'right' | 'justify';
  stack: 'none' | 'tablet' | 'mobile';
  
  // Spacing
  gap: number;
  gapTablet: number;
  gapMobile: number;
  
  // Global Button Styles
  fontFamily: string;
  fontSize: number;
  fontSizeTablet: number;
  fontSizeMobile: number;
  fontWeight: string;
  lineHeight: number;
  letterSpacing: number;
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  
  // Global Colors (기본값)
  globalBackgroundColor: string;
  globalTextColor: string;
  globalBorderColor: string;
  globalBackgroundColorHover: string;
  globalTextColorHover: string;
  globalBorderColorHover: string;
  
  // Global Size
  globalPaddingTop: number;
  globalPaddingRight: number;
  globalPaddingBottom: number;
  globalPaddingLeft: number;
  globalPaddingTopTablet: number;
  globalPaddingRightTablet: number;
  globalPaddingBottomTablet: number;
  globalPaddingLeftTablet: number;
  globalPaddingTopMobile: number;
  globalPaddingRightMobile: number;
  globalPaddingBottomMobile: number;
  globalPaddingLeftMobile: number;
  
  // Global Border
  globalBorderWidth: number;
  globalBorderRadius: number;
  globalBorderStyle: 'solid' | 'dashed' | 'dotted' | 'none';
  
  // Icon Settings
  iconSize: number;
  iconSizeTablet: number;
  iconSizeMobile: number;
  iconSpacing: number;
  
  // Effects
  enableHoverAnimation: boolean;
  hoverAnimationType: 'none' | 'scale' | 'translate' | 'rotate' | 'glow';
  transitionDuration: number;
  
  // Full Width
  fullWidth: boolean;
  fullWidthTablet: boolean;
  fullWidthMobile: boolean;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    uagbButtons: {
      setUAGBButtons: (attrs: Partial<UAGBButtonsAttributes>) => ReturnType;
      updateUAGBButtons: (attrs: Partial<UAGBButtonsAttributes>) => ReturnType;
    };
  }
}

export const UAGBButtonsBlock = Node.create({
  name: 'uagb/buttons',
  
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
      
      // Buttons Array
      buttons: {
        default: [
          {
            id: generateBlockId(),
            text: 'Button 1',
            link: '#',
            target: '_self',
            rel: '',
            icon: '🚀',
            iconPosition: 'before',
            showIcon: false,
            backgroundColor: '#3b82f6',
            textColor: '#ffffff',
            borderColor: '#3b82f6',
            backgroundColorHover: '#2563eb',
            textColorHover: '#ffffff',
            borderColorHover: '#2563eb',
            paddingTop: 12,
            paddingRight: 24,
            paddingBottom: 12,
            paddingLeft: 24,
            borderWidth: 1,
            borderRadius: 6,
            borderStyle: 'solid'
          },
          {
            id: generateBlockId(),
            text: 'Button 2',
            link: '#',
            target: '_self',
            rel: '',
            icon: '⭐',
            iconPosition: 'before',
            showIcon: false,
            backgroundColor: 'transparent',
            textColor: '#3b82f6',
            borderColor: '#3b82f6',
            backgroundColorHover: '#3b82f6',
            textColorHover: '#ffffff',
            borderColorHover: '#3b82f6',
            paddingTop: 12,
            paddingRight: 24,
            paddingBottom: 12,
            paddingLeft: 24,
            borderWidth: 2,
            borderRadius: 6,
            borderStyle: 'solid'
          }
        ]
      },
      
      // Layout
      alignment: { default: 'center' },
      alignmentTablet: { default: 'center' },
      alignmentMobile: { default: 'center' },
      stack: { default: 'mobile' },
      
      // Spacing
      gap: { default: 16 },
      gapTablet: { default: 16 },
      gapMobile: { default: 12 },
      
      // Global Typography
      fontFamily: { default: 'inherit' },
      fontSize: { default: 16 },
      fontSizeTablet: { default: 16 },
      fontSizeMobile: { default: 14 },
      fontWeight: { default: '500' },
      lineHeight: { default: 1.4 },
      letterSpacing: { default: 0 },
      textTransform: { default: 'none' },
      
      // Global Colors
      globalBackgroundColor: { default: '#3b82f6' },
      globalTextColor: { default: '#ffffff' },
      globalBorderColor: { default: '#3b82f6' },
      globalBackgroundColorHover: { default: '#2563eb' },
      globalTextColorHover: { default: '#ffffff' },
      globalBorderColorHover: { default: '#2563eb' },
      
      // Global Size
      globalPaddingTop: { default: 12 },
      globalPaddingRight: { default: 24 },
      globalPaddingBottom: { default: 12 },
      globalPaddingLeft: { default: 24 },
      globalPaddingTopTablet: { default: 12 },
      globalPaddingRightTablet: { default: 20 },
      globalPaddingBottomTablet: { default: 12 },
      globalPaddingLeftTablet: { default: 20 },
      globalPaddingTopMobile: { default: 10 },
      globalPaddingRightMobile: { default: 16 },
      globalPaddingBottomMobile: { default: 10 },
      globalPaddingLeftMobile: { default: 16 },
      
      // Global Border
      globalBorderWidth: { default: 1 },
      globalBorderRadius: { default: 6 },
      globalBorderStyle: { default: 'solid' },
      
      // Icon Settings
      iconSize: { default: 16 },
      iconSizeTablet: { default: 16 },
      iconSizeMobile: { default: 14 },
      iconSpacing: { default: 8 },
      
      // Effects
      enableHoverAnimation: { default: true },
      hoverAnimationType: { default: 'scale' },
      transitionDuration: { default: 300 },
      
      // Full Width
      fullWidth: { default: false },
      fullWidthTablet: { default: false },
      fullWidthMobile: { default: false },
      
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
        tag: 'div[data-type="uagb/buttons"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        {
          'data-type': 'uagb/buttons',
          'class': `uagb-block-${HTMLAttributes['data-block-id']} uagb-buttons`,
        },
        HTMLAttributes
      ),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(UAGBButtonsView);
  },

  addCommands() {
    return {
      setUAGBButtons:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
      updateUAGBButtons:
        (attrs) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, attrs);
        },
    };
  },
});

export default UAGBButtonsBlock;
