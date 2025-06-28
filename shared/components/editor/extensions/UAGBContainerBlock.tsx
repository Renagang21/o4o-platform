// UAGB Container Block - Spectra 스타일
// Hero 섹션에 최적화된 컨테이너 블록

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { UAGBContainerAttributes, generateBlockId } from './tiptap-block';
import UAGBContainerView from './UAGBContainerView';

// Hero 섹션 컨텐츠 타입
export interface UAGBHeroContent {
  title: string;
  titleTag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  subtitle: string;
  description: string;
  
  // 버튼들
  buttons: Array<{
    id: string;
    text: string;
    link: string;
    target: boolean;
    noFollow: boolean;
    style: 'primary' | 'secondary' | 'outline';
    backgroundColor: string;
    textColor: string;
    borderColor: string;
    hoverBackgroundColor: string;
    hoverTextColor: string;
    icon?: string;
  }>;
  
  // 통계/신뢰 지표
  showStats: boolean;
  stats: Array<{
    id: string;
    number: string;
    label: string;
    color: string;
  }>;
}

// Container 블록 속성 (Hero 전용 확장)
export interface UAGBHeroContainerAttributes extends UAGBContainerAttributes {
  // Hero 콘텐츠
  heroContent: UAGBHeroContent;
  
  // Hero 레이아웃
  heroLayout: 'center' | 'left' | 'right';
  heroVerticalAlign: 'top' | 'center' | 'bottom';
  
  // 타이포그래피
  titleColor: string;
  titleFontFamily: string;
  titleFontWeight: string;
  titleFontSize: number;
  titleFontSizeType: 'px' | 'em' | 'rem';
  titleFontSizeTablet: number;
  titleFontSizeMobile: number;
  titleLineHeight: number;
  titleLetterSpacing: number;
  
  subtitleColor: string;
  subtitleFontFamily: string;
  subtitleFontWeight: string;
  subtitleFontSize: number;
  subtitleFontSizeType: 'px' | 'em' | 'rem';
  subtitleFontSizeTablet: number;
  subtitleFontSizeMobile: number;
  
  descColor: string;
  descFontFamily: string;
  descFontWeight: string;
  descFontSize: number;
  descFontSizeType: 'px' | 'em' | 'rem';
  descFontSizeTablet: number;
  descFontSizeMobile: number;
  descLineHeight: number;
  
  // 간격
  titleBottomSpacing: number;
  subtitleBottomSpacing: number;
  descBottomSpacing: number;
  buttonsBottomSpacing: number;
  
  // 버튼 스타일
  buttonGap: number;
  buttonGapTablet: number;
  buttonGapMobile: number;
  buttonAlign: 'left' | 'center' | 'right';
  buttonStack: 'none' | 'tablet' | 'mobile';
  
  // 통계 스타일
  statsColor: string;
  statsFontSize: number;
  statsLabelColor: string;
  statsLabelFontSize: number;
  statsGap: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    uagbContainer: {
      setUAGBContainer: (attrs: Partial<UAGBHeroContainerAttributes>) => ReturnType;
      updateUAGBContainer: (attrs: Partial<UAGBHeroContainerAttributes>) => ReturnType;
    };
  }
}

export const UAGBContainerBlock = Node.create({
  name: 'uagb/container',
  
  group: 'block',
  content: 'block*',
  
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
      
      // Hero 콘텐츠
      heroContent: {
        default: {
          title: '선택만 하면\n끝나는 비즈니스 플랫폼',
          titleTag: 'h1',
          subtitle: '',
          description: '내 브랜드에 어울리는 다양한 무료 서비스를\n선택하여 부담 없이 시작하세요.',
          buttons: [
            {
              id: 'btn-1',
              text: '🛍️ 무료로 시작하기',
              link: '#',
              target: false,
              noFollow: false,
              style: 'primary',
              backgroundColor: '#ffffff',
              textColor: '#1f2937',
              borderColor: '#ffffff',
              hoverBackgroundColor: '#f3f4f6',
              hoverTextColor: '#111827',
              icon: '🛍️',
            },
            {
              id: 'btn-2',
              text: '🎯 성공사례 보기',
              link: '#',
              target: false,
              noFollow: false,
              style: 'outline',
              backgroundColor: 'transparent',
              textColor: '#ffffff',
              borderColor: '#ffffff',
              hoverBackgroundColor: '#ffffff',
              hoverTextColor: '#1f2937',
              icon: '🎯',
            },
          ],
          showStats: true,
          stats: [
            { id: 'stat-1', number: '200만+', label: '브랜드 선택', color: '#ffffff' },
            { id: 'stat-2', number: '23년', label: '연속 1위', color: '#ffffff' },
            { id: 'stat-3', number: '10개 중 6개', label: '시장 점유율', color: '#ffffff' },
            { id: 'stat-4', number: '99.9%', label: '서비스 가동률', color: '#ffffff' },
          ],
        },
        parseHTML: element => {
          const contentData = element.getAttribute('data-hero-content');
          return contentData ? JSON.parse(contentData) : {};
        },
        renderHTML: attributes => {
          if (!attributes.heroContent) return {};
          return { 'data-hero-content': JSON.stringify(attributes.heroContent) };
        },
      },
      
      // Hero 레이아웃
      heroLayout: {
        default: 'center',
        parseHTML: element => element.getAttribute('data-hero-layout'),
        renderHTML: attributes => ({ 'data-hero-layout': attributes.heroLayout }),
      },
      
      heroVerticalAlign: {
        default: 'center',
        parseHTML: element => element.getAttribute('data-hero-vertical-align'),
        renderHTML: attributes => ({ 'data-hero-vertical-align': attributes.heroVerticalAlign }),
      },
      
      // 컨테이너 레이아웃
      contentWidth: {
        default: 'custom',
        parseHTML: element => element.getAttribute('data-content-width'),
        renderHTML: attributes => ({ 'data-content-width': attributes.contentWidth }),
      },
      
      widthSetDesktop: {
        default: 1200,
        parseHTML: element => parseInt(element.getAttribute('data-width-set-desktop') || '1200'),
        renderHTML: attributes => ({ 'data-width-set-desktop': attributes.widthSetDesktop.toString() }),
      },
      
      widthSetTablet: {
        default: 1024,
        parseHTML: element => parseInt(element.getAttribute('data-width-set-tablet') || '1024'),
        renderHTML: attributes => ({ 'data-width-set-tablet': attributes.widthSetTablet.toString() }),
      },
      
      widthSetMobile: {
        default: 768,
        parseHTML: element => parseInt(element.getAttribute('data-width-set-mobile') || '768'),
        renderHTML: attributes => ({ 'data-width-set-mobile': attributes.widthSetMobile.toString() }),
      },
      
      // 최소 높이
      minHeightSetDesktop: {
        default: 100,
        parseHTML: element => parseInt(element.getAttribute('data-min-height-set-desktop') || '100'),
        renderHTML: attributes => ({ 'data-min-height-set-desktop': attributes.minHeightSetDesktop.toString() }),
      },
      
      minHeightSetTablet: {
        default: 80,
        parseHTML: element => parseInt(element.getAttribute('data-min-height-set-tablet') || '80'),
        renderHTML: attributes => ({ 'data-min-height-set-tablet': attributes.minHeightSetTablet.toString() }),
      },
      
      minHeightSetMobile: {
        default: 60,
        parseHTML: element => parseInt(element.getAttribute('data-min-height-set-mobile') || '60'),
        renderHTML: attributes => ({ 'data-min-height-set-mobile': attributes.minHeightSetMobile.toString() }),
      },
      
      minHeightType: {
        default: 'vh',
        parseHTML: element => element.getAttribute('data-min-height-type'),
        renderHTML: attributes => ({ 'data-min-height-type': attributes.minHeightType }),
      },
      
      // 플렉스박스
      directionDesktop: {
        default: 'column',
        parseHTML: element => element.getAttribute('data-direction-desktop'),
        renderHTML: attributes => ({ 'data-direction-desktop': attributes.directionDesktop }),
      },
      
      directionTablet: {
        default: 'column',
        parseHTML: element => element.getAttribute('data-direction-tablet'),
        renderHTML: attributes => ({ 'data-direction-tablet': attributes.directionTablet }),
      },
      
      directionMobile: {
        default: 'column',
        parseHTML: element => element.getAttribute('data-direction-mobile'),
        renderHTML: attributes => ({ 'data-direction-mobile': attributes.directionMobile }),
      },
      
      justifyContent: {
        default: 'center',
        parseHTML: element => element.getAttribute('data-justify-content'),
        renderHTML: attributes => ({ 'data-justify-content': attributes.justifyContent }),
      },
      
      alignItems: {
        default: 'center',
        parseHTML: element => element.getAttribute('data-align-items'),
        renderHTML: attributes => ({ 'data-align-items': attributes.alignItems }),
      },
      
      // 간격
      rowGapDesktop: {
        default: 30,
        parseHTML: element => parseInt(element.getAttribute('data-row-gap-desktop') || '30'),
        renderHTML: attributes => ({ 'data-row-gap-desktop': attributes.rowGapDesktop.toString() }),
      },
      
      rowGapTablet: {
        default: 25,
        parseHTML: element => parseInt(element.getAttribute('data-row-gap-tablet') || '25'),
        renderHTML: attributes => ({ 'data-row-gap-tablet': attributes.rowGapTablet.toString() }),
      },
      
      rowGapMobile: {
        default: 20,
        parseHTML: element => parseInt(element.getAttribute('data-row-gap-mobile') || '20'),
        renderHTML: attributes => ({ 'data-row-gap-mobile': attributes.rowGapMobile.toString() }),
      },
      
      // 타이포그래피 - 제목
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
        default: '800',
        parseHTML: element => element.getAttribute('data-title-font-weight'),
        renderHTML: attributes => ({ 'data-title-font-weight': attributes.titleFontWeight }),
      },
      
      titleFontSize: {
        default: 56,
        parseHTML: element => parseInt(element.getAttribute('data-title-font-size') || '56'),
        renderHTML: attributes => ({ 'data-title-font-size': attributes.titleFontSize.toString() }),
      },
      
      titleFontSizeType: {
        default: 'px',
        parseHTML: element => element.getAttribute('data-title-font-size-type'),
        renderHTML: attributes => ({ 'data-title-font-size-type': attributes.titleFontSizeType }),
      },
      
      titleFontSizeTablet: {
        default: 42,
        parseHTML: element => parseInt(element.getAttribute('data-title-font-size-tablet') || '42'),
        renderHTML: attributes => ({ 'data-title-font-size-tablet': attributes.titleFontSizeTablet.toString() }),
      },
      
      titleFontSizeMobile: {
        default: 32,
        parseHTML: element => parseInt(element.getAttribute('data-title-font-size-mobile') || '32'),
        renderHTML: attributes => ({ 'data-title-font-size-mobile': attributes.titleFontSizeMobile.toString() }),
      },
      
      titleLineHeight: {
        default: 1.1,
        parseHTML: element => parseFloat(element.getAttribute('data-title-line-height') || '1.1'),
        renderHTML: attributes => ({ 'data-title-line-height': attributes.titleLineHeight.toString() }),
      },
      
      titleLetterSpacing: {
        default: -1,
        parseHTML: element => parseFloat(element.getAttribute('data-title-letter-spacing') || '-1'),
        renderHTML: attributes => ({ 'data-title-letter-spacing': attributes.titleLetterSpacing.toString() }),
      },
      
      // 타이포그래피 - 부제목
      subtitleColor: {
        default: '#e5e7eb',
        parseHTML: element => element.getAttribute('data-subtitle-color'),
        renderHTML: attributes => ({ 'data-subtitle-color': attributes.subtitleColor }),
      },
      
      subtitleFontFamily: {
        default: 'inherit',
        parseHTML: element => element.getAttribute('data-subtitle-font-family'),
        renderHTML: attributes => ({ 'data-subtitle-font-family': attributes.subtitleFontFamily }),
      },
      
      subtitleFontWeight: {
        default: '600',
        parseHTML: element => element.getAttribute('data-subtitle-font-weight'),
        renderHTML: attributes => ({ 'data-subtitle-font-weight': attributes.subtitleFontWeight }),
      },
      
      subtitleFontSize: {
        default: 20,
        parseHTML: element => parseInt(element.getAttribute('data-subtitle-font-size') || '20'),
        renderHTML: attributes => ({ 'data-subtitle-font-size': attributes.subtitleFontSize.toString() }),
      },
      
      subtitleFontSizeType: {
        default: 'px',
        parseHTML: element => element.getAttribute('data-subtitle-font-size-type'),
        renderHTML: attributes => ({ 'data-subtitle-font-size-type': attributes.subtitleFontSizeType }),
      },
      
      subtitleFontSizeTablet: {
        default: 18,
        parseHTML: element => parseInt(element.getAttribute('data-subtitle-font-size-tablet') || '18'),
        renderHTML: attributes => ({ 'data-subtitle-font-size-tablet': attributes.subtitleFontSizeTablet.toString() }),
      },
      
      subtitleFontSizeMobile: {
        default: 16,
        parseHTML: element => parseInt(element.getAttribute('data-subtitle-font-size-mobile') || '16'),
        renderHTML: attributes => ({ 'data-subtitle-font-size-mobile': attributes.subtitleFontSizeMobile.toString() }),
      },
      
      // 타이포그래피 - 설명
      descColor: {
        default: '#d1d5db',
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
        default: 20,
        parseHTML: element => parseInt(element.getAttribute('data-desc-font-size') || '20'),
        renderHTML: attributes => ({ 'data-desc-font-size': attributes.descFontSize.toString() }),
      },
      
      descFontSizeType: {
        default: 'px',
        parseHTML: element => element.getAttribute('data-desc-font-size-type'),
        renderHTML: attributes => ({ 'data-desc-font-size-type': attributes.descFontSizeType }),
      },
      
      descFontSizeTablet: {
        default: 18,
        parseHTML: element => parseInt(element.getAttribute('data-desc-font-size-tablet') || '18'),
        renderHTML: attributes => ({ 'data-desc-font-size-tablet': attributes.descFontSizeTablet.toString() }),
      },
      
      descFontSizeMobile: {
        default: 16,
        parseHTML: element => parseInt(element.getAttribute('data-desc-font-size-mobile') || '16'),
        renderHTML: attributes => ({ 'data-desc-font-size-mobile': attributes.descFontSizeMobile.toString() }),
      },
      
      descLineHeight: {
        default: 1.6,
        parseHTML: element => parseFloat(element.getAttribute('data-desc-line-height') || '1.6'),
        renderHTML: attributes => ({ 'data-desc-line-height': attributes.descLineHeight.toString() }),
      },
      
      // 간격
      titleBottomSpacing: {
        default: 16,
        parseHTML: element => parseInt(element.getAttribute('data-title-bottom-spacing') || '16'),
        renderHTML: attributes => ({ 'data-title-bottom-spacing': attributes.titleBottomSpacing.toString() }),
      },
      
      subtitleBottomSpacing: {
        default: 12,
        parseHTML: element => parseInt(element.getAttribute('data-subtitle-bottom-spacing') || '12'),
        renderHTML: attributes => ({ 'data-subtitle-bottom-spacing': attributes.subtitleBottomSpacing.toString() }),
      },
      
      descBottomSpacing: {
        default: 40,
        parseHTML: element => parseInt(element.getAttribute('data-desc-bottom-spacing') || '40'),
        renderHTML: attributes => ({ 'data-desc-bottom-spacing': attributes.descBottomSpacing.toString() }),
      },
      
      buttonsBottomSpacing: {
        default: 60,
        parseHTML: element => parseInt(element.getAttribute('data-buttons-bottom-spacing') || '60'),
        renderHTML: attributes => ({ 'data-buttons-bottom-spacing': attributes.buttonsBottomSpacing.toString() }),
      },
      
      // 버튼 스타일
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
      
      buttonStack: {
        default: 'mobile',
        parseHTML: element => element.getAttribute('data-button-stack'),
        renderHTML: attributes => ({ 'data-button-stack': attributes.buttonStack }),
      },
      
      // 통계 스타일
      statsColor: {
        default: '#ffffff',
        parseHTML: element => element.getAttribute('data-stats-color'),
        renderHTML: attributes => ({ 'data-stats-color': attributes.statsColor }),
      },
      
      statsFontSize: {
        default: 24,
        parseHTML: element => parseInt(element.getAttribute('data-stats-font-size') || '24'),
        renderHTML: attributes => ({ 'data-stats-font-size': attributes.statsFontSize.toString() }),
      },
      
      statsLabelColor: {
        default: '#d1d5db',
        parseHTML: element => element.getAttribute('data-stats-label-color'),
        renderHTML: attributes => ({ 'data-stats-label-color': attributes.statsLabelColor }),
      },
      
      statsLabelFontSize: {
        default: 14,
        parseHTML: element => parseInt(element.getAttribute('data-stats-label-font-size') || '14'),
        renderHTML: attributes => ({ 'data-stats-label-font-size': attributes.statsLabelFontSize.toString() }),
      },
      
      statsGap: {
        default: 40,
        parseHTML: element => parseInt(element.getAttribute('data-stats-gap') || '40'),
        renderHTML: attributes => ({ 'data-stats-gap': attributes.statsGap.toString() }),
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
        default: 135,
        parseHTML: element => parseInt(element.getAttribute('data-gradient-angle') || '135'),
        renderHTML: attributes => ({ 'data-gradient-angle': attributes.gradientAngle.toString() }),
      },
      
      // 간격 - 패딩
      blockTopPadding: {
        default: 120,
        parseHTML: element => parseInt(element.getAttribute('data-block-top-padding') || '120'),
        renderHTML: attributes => ({ 'data-block-top-padding': attributes.blockTopPadding.toString() }),
      },
      
      blockBottomPadding: {
        default: 120,
        parseHTML: element => parseInt(element.getAttribute('data-block-bottom-padding') || '120'),
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
        default: 80,
        parseHTML: element => parseInt(element.getAttribute('data-block-top-padding-tablet') || '80'),
        renderHTML: attributes => ({ 'data-block-top-padding-tablet': attributes.blockTopPaddingTablet.toString() }),
      },
      
      blockBottomPaddingTablet: {
        default: 80,
        parseHTML: element => parseInt(element.getAttribute('data-block-bottom-padding-tablet') || '80'),
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
        default: 60,
        parseHTML: element => parseInt(element.getAttribute('data-block-top-padding-mobile') || '60'),
        renderHTML: attributes => ({ 'data-block-top-padding-mobile': attributes.blockTopPaddingMobile.toString() }),
      },
      
      blockBottomPaddingMobile: {
        default: 60,
        parseHTML: element => parseInt(element.getAttribute('data-block-bottom-padding-mobile') || '60'),
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
        tag: 'div[data-type="uagb/container"]',
      },
    ];
  },
  
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'uagb/container',
        class: `uagb-block-${HTMLAttributes['data-block-id']} uagb-container`,
      }),
      0,
    ];
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(UAGBContainerView);
  },
  
  addCommands() {
    return {
      setUAGBContainer:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
        
      updateUAGBContainer:
        (attrs) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, attrs);
        },
    };
  },
});