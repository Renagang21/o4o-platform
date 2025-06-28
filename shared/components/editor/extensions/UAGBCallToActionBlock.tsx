// UAGB Call to Action Block - Spectra 스타일
// brainstormforce/wp-spectra 구조를 기반으로 함

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { UAGBCallToActionAttributes, generateBlockId } from './tiptap-block';
import UAGBCallToActionView from './UAGBCallToActionView';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    uagbCallToAction: {
      setUAGBCallToAction: (attrs: Partial<UAGBCallToActionAttributes>) => ReturnType;
      updateUAGBCallToAction: (attrs: Partial<UAGBCallToActionAttributes>) => ReturnType;
    };
  }
}

export const UAGBCallToActionBlock = Node.create({
  name: 'uagb/call-to-action',
  
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
        parseHTML: element => element.getAttribute('data-class-migrate') === 'true',
        renderHTML: attributes => ({ 'data-class-migrate': attributes.classMigrate.toString() }),
      },
      
      className: {
        default: '',
        parseHTML: element => element.getAttribute('class') || '',
        renderHTML: attributes => {
          if (!attributes.className) return {};
          return { class: attributes.className };
        },
      },
      
      // 정렬
      align: {
        default: 'center',
        parseHTML: element => element.getAttribute('data-align'),
        renderHTML: attributes => ({ 'data-align': attributes.align }),
      },
      
      alignTablet: {
        default: '',
        parseHTML: element => element.getAttribute('data-align-tablet'),
        renderHTML: attributes => {
          if (!attributes.alignTablet) return {};
          return { 'data-align-tablet': attributes.alignTablet };
        },
      },
      
      alignMobile: {
        default: '',
        parseHTML: element => element.getAttribute('data-align-mobile'),
        renderHTML: attributes => {
          if (!attributes.alignMobile) return {};
          return { 'data-align-mobile': attributes.alignMobile };
        },
      },
      
      // 제목
      ctaTitle: {
        default: '지금 시작하고\n성공을 만들어보세요!',
        parseHTML: element => element.getAttribute('data-cta-title'),
        renderHTML: attributes => ({ 'data-cta-title': attributes.ctaTitle }),
      },
      
      titleTag: {
        default: 'h2',
        parseHTML: element => element.getAttribute('data-title-tag'),
        renderHTML: attributes => ({ 'data-title-tag': attributes.titleTag }),
      },
      
      titleColor: {
        default: '#ffffff',
        parseHTML: element => element.getAttribute('data-title-color'),
        renderHTML: attributes => ({ 'data-title-color': attributes.titleColor }),
      },
      
      titleFontFamily: {
        default: 'inherit',
        parseHTML: element => element.getAttribute('data-title-font-family'),
        renderHTML: attributes => ({ 'data-title-font-family': attributes.titleFontFamily }),
      },
      
      titleFontWeight: {
        default: '700',
        parseHTML: element => element.getAttribute('data-title-font-weight'),
        renderHTML: attributes => ({ 'data-title-font-weight': attributes.titleFontWeight }),
      },
      
      titleFontSize: {
        default: 48,
        parseHTML: element => parseInt(element.getAttribute('data-title-font-size') || '48'),
        renderHTML: attributes => ({ 'data-title-font-size': attributes.titleFontSize.toString() }),
      },
      
      titleFontSizeType: {
        default: 'px',
        parseHTML: element => element.getAttribute('data-title-font-size-type'),
        renderHTML: attributes => ({ 'data-title-font-size-type': attributes.titleFontSizeType }),
      },
      
      titleFontSizeTablet: {
        default: 36,
        parseHTML: element => parseInt(element.getAttribute('data-title-font-size-tablet') || '36'),
        renderHTML: attributes => ({ 'data-title-font-size-tablet': attributes.titleFontSizeTablet.toString() }),
      },
      
      titleFontSizeMobile: {
        default: 28,
        parseHTML: element => parseInt(element.getAttribute('data-title-font-size-mobile') || '28'),
        renderHTML: attributes => ({ 'data-title-font-size-mobile': attributes.titleFontSizeMobile.toString() }),
      },
      
      titleLineHeight: {
        default: 1.2,
        parseHTML: element => parseFloat(element.getAttribute('data-title-line-height') || '1.2'),
        renderHTML: attributes => ({ 'data-title-line-height': attributes.titleLineHeight.toString() }),
      },
      
      titleLineHeightType: {
        default: 'em',
        parseHTML: element => element.getAttribute('data-title-line-height-type'),
        renderHTML: attributes => ({ 'data-title-line-height-type': attributes.titleLineHeightType }),
      },
      
      titleLetterSpacing: {
        default: 0,
        parseHTML: element => parseFloat(element.getAttribute('data-title-letter-spacing') || '0'),
        renderHTML: attributes => ({ 'data-title-letter-spacing': attributes.titleLetterSpacing.toString() }),
      },
      
      titleBottomSpacing: {
        default: 20,
        parseHTML: element => parseInt(element.getAttribute('data-title-bottom-spacing') || '20'),
        renderHTML: attributes => ({ 'data-title-bottom-spacing': attributes.titleBottomSpacing.toString() }),
      },
      
      titleBottomSpacingTablet: {
        default: 15,
        parseHTML: element => parseInt(element.getAttribute('data-title-bottom-spacing-tablet') || '15'),
        renderHTML: attributes => ({ 'data-title-bottom-spacing-tablet': attributes.titleBottomSpacingTablet.toString() }),
      },
      
      titleBottomSpacingMobile: {
        default: 10,
        parseHTML: element => parseInt(element.getAttribute('data-title-bottom-spacing-mobile') || '10'),
        renderHTML: attributes => ({ 'data-title-bottom-spacing-mobile': attributes.titleBottomSpacingMobile.toString() }),
      },
      
      // 설명
      ctaDescription: {
        default: '200만 브랜드가 선택한 솔루션과 함께\n여러분의 비즈니스를 성장시켜보세요.',
        parseHTML: element => element.getAttribute('data-cta-description'),
        renderHTML: attributes => ({ 'data-cta-description': attributes.ctaDescription }),
      },
      
      descColor: {
        default: '#e5e7eb',
        parseHTML: element => element.getAttribute('data-desc-color'),
        renderHTML: attributes => ({ 'data-desc-color': attributes.descColor }),
      },
      
      descFontFamily: {
        default: 'inherit',
        parseHTML: element => element.getAttribute('data-desc-font-family'),
        renderHTML: attributes => ({ 'data-desc-font-family': attributes.descFontFamily }),
      },
      
      descFontWeight: {
        default: '400',
        parseHTML: element => element.getAttribute('data-desc-font-weight'),
        renderHTML: attributes => ({ 'data-desc-font-weight': attributes.descFontWeight }),
      },
      
      descFontSize: {
        default: 18,
        parseHTML: element => parseInt(element.getAttribute('data-desc-font-size') || '18'),
        renderHTML: attributes => ({ 'data-desc-font-size': attributes.descFontSize.toString() }),
      },
      
      descFontSizeType: {
        default: 'px',
        parseHTML: element => element.getAttribute('data-desc-font-size-type'),
        renderHTML: attributes => ({ 'data-desc-font-size-type': attributes.descFontSizeType }),
      },
      
      descFontSizeTablet: {
        default: 16,
        parseHTML: element => parseInt(element.getAttribute('data-desc-font-size-tablet') || '16'),
        renderHTML: attributes => ({ 'data-desc-font-size-tablet': attributes.descFontSizeTablet.toString() }),
      },
      
      descFontSizeMobile: {
        default: 14,
        parseHTML: element => parseInt(element.getAttribute('data-desc-font-size-mobile') || '14'),
        renderHTML: attributes => ({ 'data-desc-font-size-mobile': attributes.descFontSizeMobile.toString() }),
      },
      
      descLineHeight: {
        default: 1.6,
        parseHTML: element => parseFloat(element.getAttribute('data-desc-line-height') || '1.6'),
        renderHTML: attributes => ({ 'data-desc-line-height': attributes.descLineHeight.toString() }),
      },
      
      descLineHeightType: {
        default: 'em',
        parseHTML: element => element.getAttribute('data-desc-line-height-type'),
        renderHTML: attributes => ({ 'data-desc-line-height-type': attributes.descLineHeightType }),
      },
      
      descLetterSpacing: {
        default: 0,
        parseHTML: element => parseFloat(element.getAttribute('data-desc-letter-spacing') || '0'),
        renderHTML: attributes => ({ 'data-desc-letter-spacing': attributes.descLetterSpacing.toString() }),
      },
      
      descBottomSpacing: {
        default: 30,
        parseHTML: element => parseInt(element.getAttribute('data-desc-bottom-spacing') || '30'),
        renderHTML: attributes => ({ 'data-desc-bottom-spacing': attributes.descBottomSpacing.toString() }),
      },
      
      descBottomSpacingTablet: {
        default: 25,
        parseHTML: element => parseInt(element.getAttribute('data-desc-bottom-spacing-tablet') || '25'),
        renderHTML: attributes => ({ 'data-desc-bottom-spacing-tablet': attributes.descBottomSpacingTablet.toString() }),
      },
      
      descBottomSpacingMobile: {
        default: 20,
        parseHTML: element => parseInt(element.getAttribute('data-desc-bottom-spacing-mobile') || '20'),
        renderHTML: attributes => ({ 'data-desc-bottom-spacing-mobile': attributes.descBottomSpacingMobile.toString() }),
      },
      
      // 버튼
      ctaButtons: {
        default: [
          {
            text: '🚀 무료로 시작하기',
            link: '/register',
            target: false,
            noFollow: false,
            backgroundColor: '#ffffff',
            backgroundHoverColor: '#f3f4f6',
            color: '#1f2937',
            hoverColor: '#111827',
            borderStyle: 'none',
            borderWidth: 0,
            borderColor: 'transparent',
            borderHoverColor: 'transparent',
            borderRadius: 8,
            paddingTop: 14,
            paddingBottom: 14,
            paddingLeft: 28,
            paddingRight: 28,
            paddingUnit: 'px',
            fontFamily: 'inherit',
            fontWeight: '600',
            fontSize: 16,
            fontSizeType: 'px',
            fontSizeTablet: 15,
            fontSizeMobile: 14,
            lineHeight: 1.5,
            letterSpacing: 0,
            icon: '🚀',
            iconPosition: 'before',
            iconSpacing: 8,
          },
          {
            text: '📱 데모 체험하기',
            link: '/demo',
            target: false,
            noFollow: false,
            backgroundColor: 'transparent',
            backgroundHoverColor: 'rgba(255,255,255,0.1)',
            color: '#ffffff',
            hoverColor: '#f3f4f6',
            borderStyle: 'solid',
            borderWidth: 2,
            borderColor: '#ffffff',
            borderHoverColor: '#f3f4f6',
            borderRadius: 8,
            paddingTop: 12,
            paddingBottom: 12,
            paddingLeft: 26,
            paddingRight: 26,
            paddingUnit: 'px',
            fontFamily: 'inherit',
            fontWeight: '600',
            fontSize: 16,
            fontSizeType: 'px',
            fontSizeTablet: 15,
            fontSizeMobile: 14,
            lineHeight: 1.5,
            letterSpacing: 0,
            icon: '📱',
            iconPosition: 'before',
            iconSpacing: 8,
          }
        ],
        parseHTML: element => {
          const buttonsData = element.getAttribute('data-cta-buttons');
          return buttonsData ? JSON.parse(buttonsData) : [];
        },
        renderHTML: attributes => {
          if (!attributes.ctaButtons?.length) return {};
          return { 'data-cta-buttons': JSON.stringify(attributes.ctaButtons) };
        },
      },
      
      buttonGap: {
        default: 16,
        parseHTML: element => parseInt(element.getAttribute('data-button-gap') || '16'),
        renderHTML: attributes => ({ 'data-button-gap': attributes.buttonGap.toString() }),
      },
      
      buttonGapTablet: {
        default: 12,
        parseHTML: element => parseInt(element.getAttribute('data-button-gap-tablet') || '12'),
        renderHTML: attributes => ({ 'data-button-gap-tablet': attributes.buttonGapTablet.toString() }),
      },
      
      buttonGapMobile: {
        default: 10,
        parseHTML: element => parseInt(element.getAttribute('data-button-gap-mobile') || '10'),
        renderHTML: attributes => ({ 'data-button-gap-mobile': attributes.buttonGapMobile.toString() }),
      },
      
      buttonAlign: {
        default: 'center',
        parseHTML: element => element.getAttribute('data-button-align'),
        renderHTML: attributes => ({ 'data-button-align': attributes.buttonAlign }),
      },
      
      buttonAlignTablet: {
        default: '',
        parseHTML: element => element.getAttribute('data-button-align-tablet'),
        renderHTML: attributes => {
          if (!attributes.buttonAlignTablet) return {};
          return { 'data-button-align-tablet': attributes.buttonAlignTablet };
        },
      },
      
      buttonAlignMobile: {
        default: '',
        parseHTML: element => element.getAttribute('data-button-align-mobile'),
        renderHTML: attributes => {
          if (!attributes.buttonAlignMobile) return {};
          return { 'data-button-align-mobile': attributes.buttonAlignMobile };
        },
      },
      
      buttonStack: {
        default: 'mobile',
        parseHTML: element => element.getAttribute('data-button-stack'),
        renderHTML: attributes => ({ 'data-button-stack': attributes.buttonStack }),
      },
      
      // 긴급성 메시지
      showUrgency: {
        default: true,
        parseHTML: element => element.getAttribute('data-show-urgency') === 'true',
        renderHTML: attributes => ({ 'data-show-urgency': attributes.showUrgency.toString() }),
      },
      
      urgencyText: {
        default: '⏰ 한정 시간! 지금 가입하면 프리미엄 기능 1개월 무료',
        parseHTML: element => element.getAttribute('data-urgency-text'),
        renderHTML: attributes => ({ 'data-urgency-text': attributes.urgencyText }),
      },
      
      urgencyColor: {
        default: '#92400E',
        parseHTML: element => element.getAttribute('data-urgency-color'),
        renderHTML: attributes => ({ 'data-urgency-color': attributes.urgencyColor }),
      },
      
      urgencyBgColor: {
        default: '#FEF3C7',
        parseHTML: element => element.getAttribute('data-urgency-bg-color'),
        renderHTML: attributes => ({ 'data-urgency-bg-color': attributes.urgencyBgColor }),
      },
      
      urgencyBorderRadius: {
        default: 8,
        parseHTML: element => parseInt(element.getAttribute('data-urgency-border-radius') || '8'),
        renderHTML: attributes => ({ 'data-urgency-border-radius': attributes.urgencyBorderRadius.toString() }),
      },
      
      urgencyPadding: {
        default: 12,
        parseHTML: element => parseInt(element.getAttribute('data-urgency-padding') || '12'),
        renderHTML: attributes => ({ 'data-urgency-padding': attributes.urgencyPadding.toString() }),
      },
      
      urgencyMargin: {
        default: 20,
        parseHTML: element => parseInt(element.getAttribute('data-urgency-margin') || '20'),
        renderHTML: attributes => ({ 'data-urgency-margin': attributes.urgencyMargin.toString() }),
      },
      
      // 신뢰 요소
      showTrust: {
        default: true,
        parseHTML: element => element.getAttribute('data-show-trust') === 'true',
        renderHTML: attributes => ({ 'data-show-trust': attributes.showTrust.toString() }),
      },
      
      trustItems: {
        default: [
          '✅ 신용카드 불필요',
          '✅ 언제든 해지 가능',
          '✅ 24시간 고객지원',
          '✅ 99.9% 가동률 보장'
        ],
        parseHTML: element => {
          const trustData = element.getAttribute('data-trust-items');
          return trustData ? JSON.parse(trustData) : [];
        },
        renderHTML: attributes => {
          if (!attributes.trustItems?.length) return {};
          return { 'data-trust-items': JSON.stringify(attributes.trustItems) };
        },
      },
      
      trustColor: {
        default: '#d1d5db',
        parseHTML: element => element.getAttribute('data-trust-color'),
        renderHTML: attributes => ({ 'data-trust-color': attributes.trustColor }),
      },
      
      trustFontSize: {
        default: 14,
        parseHTML: element => parseInt(element.getAttribute('data-trust-font-size') || '14'),
        renderHTML: attributes => ({ 'data-trust-font-size': attributes.trustFontSize.toString() }),
      },
      
      trustFontWeight: {
        default: '500',
        parseHTML: element => element.getAttribute('data-trust-font-weight'),
        renderHTML: attributes => ({ 'data-trust-font-weight': attributes.trustFontWeight }),
      },
      
      trustSpacing: {
        default: 16,
        parseHTML: element => parseInt(element.getAttribute('data-trust-spacing') || '16'),
        renderHTML: attributes => ({ 'data-trust-spacing': attributes.trustSpacing.toString() }),
      },
      
      // 배경
      backgroundType: {
        default: 'gradient',
        parseHTML: element => element.getAttribute('data-background-type'),
        renderHTML: attributes => ({ 'data-background-type': attributes.backgroundType }),
      },
      
      backgroundColor: {
        default: '#3B82F6',
        parseHTML: element => element.getAttribute('data-background-color'),
        renderHTML: attributes => ({ 'data-background-color': attributes.backgroundColor }),
      },
      
      gradientOverlay: {
        default: true,
        parseHTML: element => element.getAttribute('data-gradient-overlay') === 'true',
        renderHTML: attributes => ({ 'data-gradient-overlay': attributes.gradientOverlay.toString() }),
      },
      
      gradientColor1: {
        default: '#3B82F6',
        parseHTML: element => element.getAttribute('data-gradient-color1'),
        renderHTML: attributes => ({ 'data-gradient-color1': attributes.gradientColor1 }),
      },
      
      gradientColor2: {
        default: '#8B5CF6',
        parseHTML: element => element.getAttribute('data-gradient-color2'),
        renderHTML: attributes => ({ 'data-gradient-color2': attributes.gradientColor2 }),
      },
      
      gradientLocation1: {
        default: 0,
        parseHTML: element => parseInt(element.getAttribute('data-gradient-location1') || '0'),
        renderHTML: attributes => ({ 'data-gradient-location1': attributes.gradientLocation1.toString() }),
      },
      
      gradientLocation2: {
        default: 100,
        parseHTML: element => parseInt(element.getAttribute('data-gradient-location2') || '100'),
        renderHTML: attributes => ({ 'data-gradient-location2': attributes.gradientLocation2.toString() }),
      },
      
      gradientType: {
        default: 'linear',
        parseHTML: element => element.getAttribute('data-gradient-type'),
        renderHTML: attributes => ({ 'data-gradient-type': attributes.gradientType }),
      },
      
      gradientAngle: {
        default: 45,
        parseHTML: element => parseInt(element.getAttribute('data-gradient-angle') || '45'),
        renderHTML: attributes => ({ 'data-gradient-angle': attributes.gradientAngle.toString() }),
      },
      
      // 간격 - 패딩
      blockTopPadding: {
        default: 80,
        parseHTML: element => parseInt(element.getAttribute('data-block-top-padding') || '80'),
        renderHTML: attributes => ({ 'data-block-top-padding': attributes.blockTopPadding.toString() }),
      },
      
      blockBottomPadding: {
        default: 80,
        parseHTML: element => parseInt(element.getAttribute('data-block-bottom-padding') || '80'),
        renderHTML: attributes => ({ 'data-block-bottom-padding': attributes.blockBottomPadding.toString() }),
      },
      
      blockLeftPadding: {
        default: 20,
        parseHTML: element => parseInt(element.getAttribute('data-block-left-padding') || '20'),
        renderHTML: attributes => ({ 'data-block-left-padding': attributes.blockLeftPadding.toString() }),
      },
      
      blockRightPadding: {
        default: 20,
        parseHTML: element => parseInt(element.getAttribute('data-block-right-padding') || '20'),
        renderHTML: attributes => ({ 'data-block-right-padding': attributes.blockRightPadding.toString() }),
      },
      
      blockTopPaddingTablet: {
        default: 60,
        parseHTML: element => parseInt(element.getAttribute('data-block-top-padding-tablet') || '60'),
        renderHTML: attributes => ({ 'data-block-top-padding-tablet': attributes.blockTopPaddingTablet.toString() }),
      },
      
      blockBottomPaddingTablet: {
        default: 60,
        parseHTML: element => parseInt(element.getAttribute('data-block-bottom-padding-tablet') || '60'),
        renderHTML: attributes => ({ 'data-block-bottom-padding-tablet': attributes.blockBottomPaddingTablet.toString() }),
      },
      
      blockLeftPaddingTablet: {
        default: 15,
        parseHTML: element => parseInt(element.getAttribute('data-block-left-padding-tablet') || '15'),
        renderHTML: attributes => ({ 'data-block-left-padding-tablet': attributes.blockLeftPaddingTablet.toString() }),
      },
      
      blockRightPaddingTablet: {
        default: 15,
        parseHTML: element => parseInt(element.getAttribute('data-block-right-padding-tablet') || '15'),
        renderHTML: attributes => ({ 'data-block-right-padding-tablet': attributes.blockRightPaddingTablet.toString() }),
      },
      
      blockTopPaddingMobile: {
        default: 40,
        parseHTML: element => parseInt(element.getAttribute('data-block-top-padding-mobile') || '40'),
        renderHTML: attributes => ({ 'data-block-top-padding-mobile': attributes.blockTopPaddingMobile.toString() }),
      },
      
      blockBottomPaddingMobile: {
        default: 40,
        parseHTML: element => parseInt(element.getAttribute('data-block-bottom-padding-mobile') || '40'),
        renderHTML: attributes => ({ 'data-block-bottom-padding-mobile': attributes.blockBottomPaddingMobile.toString() }),
      },
      
      blockLeftPaddingMobile: {
        default: 10,
        parseHTML: element => parseInt(element.getAttribute('data-block-left-padding-mobile') || '10'),
        renderHTML: attributes => ({ 'data-block-left-padding-mobile': attributes.blockLeftPaddingMobile.toString() }),
      },
      
      blockRightPaddingMobile: {
        default: 10,
        parseHTML: element => parseInt(element.getAttribute('data-block-right-padding-mobile') || '10'),
        renderHTML: attributes => ({ 'data-block-right-padding-mobile': attributes.blockRightPaddingMobile.toString() }),
      },
      
      blockPaddingUnit: {
        default: 'px',
        parseHTML: element => element.getAttribute('data-block-padding-unit'),
        renderHTML: attributes => ({ 'data-block-padding-unit': attributes.blockPaddingUnit }),
      },
      
      // 간격 - 마진
      blockTopMargin: {
        default: 0,
        parseHTML: element => parseInt(element.getAttribute('data-block-top-margin') || '0'),
        renderHTML: attributes => ({ 'data-block-top-margin': attributes.blockTopMargin.toString() }),
      },
      
      blockBottomMargin: {
        default: 0,
        parseHTML: element => parseInt(element.getAttribute('data-block-bottom-margin') || '0'),
        renderHTML: attributes => ({ 'data-block-bottom-margin': attributes.blockBottomMargin.toString() }),
      },
      
      blockLeftMargin: {
        default: 0,
        parseHTML: element => parseInt(element.getAttribute('data-block-left-margin') || '0'),
        renderHTML: attributes => ({ 'data-block-left-margin': attributes.blockLeftMargin.toString() }),
      },
      
      blockRightMargin: {
        default: 0,
        parseHTML: element => parseInt(element.getAttribute('data-block-right-margin') || '0'),
        renderHTML: attributes => ({ 'data-block-right-margin': attributes.blockRightMargin.toString() }),
      },
      
      blockMarginUnit: {
        default: 'px',
        parseHTML: element => element.getAttribute('data-block-margin-unit'),
        renderHTML: attributes => ({ 'data-block-margin-unit': attributes.blockMarginUnit }),
      },
    };
  },
  
  parseHTML() {
    return [
      {
        tag: 'div[data-type="uagb/call-to-action"]',
      },
    ];
  },
  
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'uagb/call-to-action',
        class: `uagb-block-${HTMLAttributes['data-block-id']} uagb-call-to-action`,
      }),
    ];
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(UAGBCallToActionView);
  },
  
  addCommands() {
    return {
      setUAGBCallToAction:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
        
      updateUAGBCallToAction:
        (attrs) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, attrs);
        },
    };
  },
});