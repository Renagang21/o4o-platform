// UAGB Info Box Block - Spectra 스타일
// 여러 개의 정보 박스를 포함하는 섹션

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { UAGBInfoBoxAttributes, generateBlockId } from './tiptap-block';
import UAGBInfoBoxView from './UAGBInfoBoxView';

// Info Box 아이템 타입 확장
export interface UAGBInfoBoxItem {
  id: string;
  icon: string;
  iconType: 'icon' | 'image';
  imageURL?: string;
  imageID?: number;
  title: string;
  description: string;
  showButton: boolean;
  buttonText: string;
  buttonLink: string;
  buttonTarget: boolean;
  buttonNoFollow: boolean;
  
  // 개별 스타일링
  iconColor: string;
  iconBackgroundColor: string;
  iconSize: number;
  titleColor: string;
  descColor: string;
  buttonBgColor: string;
  buttonTextColor: string;
  buttonBorderColor: string;
  
  // 위치
  iconPosition: 'top' | 'left' | 'right';
}

// Info Box 섹션 속성 (Spectra 방식으로 확장)
export interface UAGBInfoBoxSectionAttributes extends UAGBInfoBoxAttributes {
  // 섹션 제목
  sectionTitle: string;
  sectionTitleTag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  sectionTitleColor: string;
  sectionDescription: string;
  sectionDescColor: string;
  sectionAlign: 'left' | 'center' | 'right';
  sectionAlignTablet: 'left' | 'center' | 'right';
  sectionAlignMobile: 'left' | 'center' | 'right';
  
  // 레이아웃
  columns: number;
  columnsTablet: number;
  columnsMobile: number;
  gap: number;
  gapTablet: number;
  gapMobile: number;
  
  // Info Box 아이템들
  infoBoxItems: UAGBInfoBoxItem[];
  
  // 섹션 스타일
  sectionBackgroundType: 'none' | 'color' | 'gradient';
  sectionBackgroundColor: string;
  
  // 섹션 간격
  sectionTopPadding: number;
  sectionBottomPadding: number;
  sectionLeftPadding: number;
  sectionRightPadding: number;
  sectionTopPaddingTablet: number;
  sectionBottomPaddingTablet: number;
  sectionLeftPaddingTablet: number;
  sectionRightPaddingTablet: number;
  sectionTopPaddingMobile: number;
  sectionBottomPaddingMobile: number;
  sectionLeftPaddingMobile: number;
  sectionRightPaddingMobile: number;
  
  // 제목 타이포그래피
  sectionTitleFontFamily: string;
  sectionTitleFontWeight: string;
  sectionTitleFontSize: number;
  sectionTitleFontSizeType: 'px' | 'em' | 'rem';
  sectionTitleFontSizeTablet: number;
  sectionTitleFontSizeMobile: number;
  sectionTitleLineHeight: number;
  sectionTitleLineHeightType: 'em' | 'px';
  sectionTitleLetterSpacing: number;
  sectionTitleBottomSpacing: number;
  
  // 설명 타이포그래피
  sectionDescFontFamily: string;
  sectionDescFontWeight: string;
  sectionDescFontSize: number;
  sectionDescFontSizeType: 'px' | 'em' | 'rem';
  sectionDescFontSizeTablet: number;
  sectionDescFontSizeMobile: number;
  sectionDescLineHeight: number;
  sectionDescLineHeightType: 'em' | 'px';
  sectionDescLetterSpacing: number;
  sectionDescBottomSpacing: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    uagbInfoBox: {
      setUAGBInfoBox: (attrs: Partial<UAGBInfoBoxSectionAttributes>) => ReturnType;
      updateUAGBInfoBox: (attrs: Partial<UAGBInfoBoxSectionAttributes>) => ReturnType;
    };
  }
}

export const UAGBInfoBoxBlock = Node.create({
  name: 'uagb/info-box',
  
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
      
      // 섹션 제목
      sectionTitle: {
        default: '늘 새롭지만 강력하게,\n비즈니스 운영은 쉽게',
        parseHTML: element => element.getAttribute('data-section-title'),
        renderHTML: attributes => ({ 'data-section-title': attributes.sectionTitle }),
      },
      
      sectionTitleTag: {
        default: 'h2',
        parseHTML: element => element.getAttribute('data-section-title-tag'),
        renderHTML: attributes => ({ 'data-section-title-tag': attributes.sectionTitleTag }),
      },
      
      sectionTitleColor: {
        default: '#1f2937',
        parseHTML: element => element.getAttribute('data-section-title-color'),
        renderHTML: attributes => ({ 'data-section-title-color': attributes.sectionTitleColor }),
      },
      
      sectionDescription: {
        default: '모든 서비스가 하나의 플랫폼에서 통합 관리됩니다',
        parseHTML: element => element.getAttribute('data-section-description'),
        renderHTML: attributes => ({ 'data-section-description': attributes.sectionDescription }),
      },
      
      sectionDescColor: {
        default: '#6b7280',
        parseHTML: element => element.getAttribute('data-section-desc-color'),
        renderHTML: attributes => ({ 'data-section-desc-color': attributes.sectionDescColor }),
      },
      
      sectionAlign: {
        default: 'center',
        parseHTML: element => element.getAttribute('data-section-align'),
        renderHTML: attributes => ({ 'data-section-align': attributes.sectionAlign }),
      },
      
      sectionAlignTablet: {
        default: '',
        parseHTML: element => element.getAttribute('data-section-align-tablet'),
        renderHTML: attributes => {
          if (!attributes.sectionAlignTablet) return {};
          return { 'data-section-align-tablet': attributes.sectionAlignTablet };
        },
      },
      
      sectionAlignMobile: {
        default: '',
        parseHTML: element => element.getAttribute('data-section-align-mobile'),
        renderHTML: attributes => {
          if (!attributes.sectionAlignMobile) return {};
          return { 'data-section-align-mobile': attributes.sectionAlignMobile };
        },
      },
      
      // 레이아웃
      columns: {
        default: 2,
        parseHTML: element => parseInt(element.getAttribute('data-columns') || '2'),
        renderHTML: attributes => ({ 'data-columns': attributes.columns.toString() }),
      },
      
      columnsTablet: {
        default: 2,
        parseHTML: element => parseInt(element.getAttribute('data-columns-tablet') || '2'),
        renderHTML: attributes => ({ 'data-columns-tablet': attributes.columnsTablet.toString() }),
      },
      
      columnsMobile: {
        default: 1,
        parseHTML: element => parseInt(element.getAttribute('data-columns-mobile') || '1'),
        renderHTML: attributes => ({ 'data-columns-mobile': attributes.columnsMobile.toString() }),
      },
      
      gap: {
        default: 30,
        parseHTML: element => parseInt(element.getAttribute('data-gap') || '30'),
        renderHTML: attributes => ({ 'data-gap': attributes.gap.toString() }),
      },
      
      gapTablet: {
        default: 25,
        parseHTML: element => parseInt(element.getAttribute('data-gap-tablet') || '25'),
        renderHTML: attributes => ({ 'data-gap-tablet': attributes.gapTablet.toString() }),
      },
      
      gapMobile: {
        default: 20,
        parseHTML: element => parseInt(element.getAttribute('data-gap-mobile') || '20'),
        renderHTML: attributes => ({ 'data-gap-mobile': attributes.gapMobile.toString() }),
      },
      
      // Info Box 아이템들
      infoBoxItems: {
        default: [
          {
            id: 'item-1',
            icon: '🛍️',
            iconType: 'icon',
            title: '쉬운 판매 채널 확장·통합 관리',
            description: '스마트스토어, 오픈마켓, 종합몰, 글로벌 마켓까지 확장 및 통합관리로 더 많은 고객을 쉽게 만나고 매출을 올려보세요!',
            showButton: true,
            buttonText: '자세히 보기',
            buttonLink: '/dropshipping',
            buttonTarget: false,
            buttonNoFollow: false,
            iconColor: '#3b82f6',
            iconBackgroundColor: '#eff6ff',
            iconSize: 48,
            titleColor: '#1f2937',
            descColor: '#6b7280',
            buttonBgColor: '#3b82f6',
            buttonTextColor: '#ffffff',
            buttonBorderColor: '#3b82f6',
            iconPosition: 'top',
          },
          {
            id: 'item-2',
            icon: '🚀',
            iconType: 'icon',
            title: '간편한 펀딩 프로젝트 관리',
            description: '아이디어부터 제품 출시까지, 크라우드펀딩을 통해 검증된 제품으로 안전하게 비즈니스를 시작하세요.',
            showButton: true,
            buttonText: '자세히 보기',
            buttonLink: '/crowdfunding',
            buttonTarget: false,
            buttonNoFollow: false,
            iconColor: '#10b981',
            iconBackgroundColor: '#ecfdf5',
            iconSize: 48,
            titleColor: '#1f2937',
            descColor: '#6b7280',
            buttonBgColor: '#10b981',
            buttonTextColor: '#ffffff',
            buttonBorderColor: '#10b981',
            iconPosition: 'top',
          },
          {
            id: 'item-3',
            icon: '💬',
            iconType: 'icon',
            title: '마케팅 최적화 지원',
            description: '커뮤니티 기반 마케팅으로 진정한 고객과 소통하며, 브랜드 인지도와 신뢰도를 동시에 높여보세요.',
            showButton: true,
            buttonText: '커뮤니티 바로가기',
            buttonLink: '/forum',
            buttonTarget: false,
            buttonNoFollow: false,
            iconColor: '#8b5cf6',
            iconBackgroundColor: '#f3e8ff',
            iconSize: 48,
            titleColor: '#1f2937',
            descColor: '#6b7280',
            buttonBgColor: '#8b5cf6',
            buttonTextColor: '#ffffff',
            buttonBorderColor: '#8b5cf6',
            iconPosition: 'top',
          },
          {
            id: 'item-4',
            icon: '📺',
            iconType: 'icon',
            title: '손쉬운 브랜드 확장',
            description: '디지털 사이니지를 통해 오프라인 공간까지 브랜드를 확장하고, 통합된 마케팅 전략을 구축하세요.',
            showButton: true,
            buttonText: '사이니지 바로가기',
            buttonLink: '/signage',
            buttonTarget: false,
            buttonNoFollow: false,
            iconColor: '#f59e0b',
            iconBackgroundColor: '#fffbeb',
            iconSize: 48,
            titleColor: '#1f2937',
            descColor: '#6b7280',
            buttonBgColor: '#f59e0b',
            buttonTextColor: '#ffffff',
            buttonBorderColor: '#f59e0b',
            iconPosition: 'top',
          }
        ],
        parseHTML: element => {
          const itemsData = element.getAttribute('data-info-box-items');
          return itemsData ? JSON.parse(itemsData) : [];
        },
        renderHTML: attributes => {
          if (!attributes.infoBoxItems?.length) return {};
          return { 'data-info-box-items': JSON.stringify(attributes.infoBoxItems) };
        },
      },
      
      // 섹션 배경
      sectionBackgroundType: {
        default: 'color',
        parseHTML: element => element.getAttribute('data-section-background-type'),
        renderHTML: attributes => ({ 'data-section-background-type': attributes.sectionBackgroundType }),
      },
      
      sectionBackgroundColor: {
        default: '#f9fafb',
        parseHTML: element => element.getAttribute('data-section-background-color'),
        renderHTML: attributes => ({ 'data-section-background-color': attributes.sectionBackgroundColor }),
      },
      
      // 섹션 간격 - 패딩
      sectionTopPadding: {
        default: 80,
        parseHTML: element => parseInt(element.getAttribute('data-section-top-padding') || '80'),
        renderHTML: attributes => ({ 'data-section-top-padding': attributes.sectionTopPadding.toString() }),
      },
      
      sectionBottomPadding: {
        default: 80,
        parseHTML: element => parseInt(element.getAttribute('data-section-bottom-padding') || '80'),
        renderHTML: attributes => ({ 'data-section-bottom-padding': attributes.sectionBottomPadding.toString() }),
      },
      
      sectionLeftPadding: {
        default: 20,
        parseHTML: element => parseInt(element.getAttribute('data-section-left-padding') || '20'),
        renderHTML: attributes => ({ 'data-section-left-padding': attributes.sectionLeftPadding.toString() }),
      },
      
      sectionRightPadding: {
        default: 20,
        parseHTML: element => parseInt(element.getAttribute('data-section-right-padding') || '20'),
        renderHTML: attributes => ({ 'data-section-right-padding': attributes.sectionRightPadding.toString() }),
      },
      
      sectionTopPaddingTablet: {
        default: 60,
        parseHTML: element => parseInt(element.getAttribute('data-section-top-padding-tablet') || '60'),
        renderHTML: attributes => ({ 'data-section-top-padding-tablet': attributes.sectionTopPaddingTablet.toString() }),
      },
      
      sectionBottomPaddingTablet: {
        default: 60,
        parseHTML: element => parseInt(element.getAttribute('data-section-bottom-padding-tablet') || '60'),
        renderHTML: attributes => ({ 'data-section-bottom-padding-tablet': attributes.sectionBottomPaddingTablet.toString() }),
      },
      
      sectionLeftPaddingTablet: {
        default: 15,
        parseHTML: element => parseInt(element.getAttribute('data-section-left-padding-tablet') || '15'),
        renderHTML: attributes => ({ 'data-section-left-padding-tablet': attributes.sectionLeftPaddingTablet.toString() }),
      },
      
      sectionRightPaddingTablet: {
        default: 15,
        parseHTML: element => parseInt(element.getAttribute('data-section-right-padding-tablet') || '15'),
        renderHTML: attributes => ({ 'data-section-right-padding-tablet': attributes.sectionRightPaddingTablet.toString() }),
      },
      
      sectionTopPaddingMobile: {
        default: 40,
        parseHTML: element => parseInt(element.getAttribute('data-section-top-padding-mobile') || '40'),
        renderHTML: attributes => ({ 'data-section-top-padding-mobile': attributes.sectionTopPaddingMobile.toString() }),
      },
      
      sectionBottomPaddingMobile: {
        default: 40,
        parseHTML: element => parseInt(element.getAttribute('data-section-bottom-padding-mobile') || '40'),
        renderHTML: attributes => ({ 'data-section-bottom-padding-mobile': attributes.sectionBottomPaddingMobile.toString() }),
      },
      
      sectionLeftPaddingMobile: {
        default: 10,
        parseHTML: element => parseInt(element.getAttribute('data-section-left-padding-mobile') || '10'),
        renderHTML: attributes => ({ 'data-section-left-padding-mobile': attributes.sectionLeftPaddingMobile.toString() }),
      },
      
      sectionRightPaddingMobile: {
        default: 10,
        parseHTML: element => parseInt(element.getAttribute('data-section-right-padding-mobile') || '10'),
        renderHTML: attributes => ({ 'data-section-right-padding-mobile': attributes.sectionRightPaddingMobile.toString() }),
      },
      
      // 제목 타이포그래피
      sectionTitleFontFamily: {
        default: 'inherit',
        parseHTML: element => element.getAttribute('data-section-title-font-family'),
        renderHTML: attributes => ({ 'data-section-title-font-family': attributes.sectionTitleFontFamily }),
      },
      
      sectionTitleFontWeight: {
        default: '700',
        parseHTML: element => element.getAttribute('data-section-title-font-weight'),
        renderHTML: attributes => ({ 'data-section-title-font-weight': attributes.sectionTitleFontWeight }),
      },
      
      sectionTitleFontSize: {
        default: 36,
        parseHTML: element => parseInt(element.getAttribute('data-section-title-font-size') || '36'),
        renderHTML: attributes => ({ 'data-section-title-font-size': attributes.sectionTitleFontSize.toString() }),
      },
      
      sectionTitleFontSizeType: {
        default: 'px',
        parseHTML: element => element.getAttribute('data-section-title-font-size-type'),
        renderHTML: attributes => ({ 'data-section-title-font-size-type': attributes.sectionTitleFontSizeType }),
      },
      
      sectionTitleFontSizeTablet: {
        default: 30,
        parseHTML: element => parseInt(element.getAttribute('data-section-title-font-size-tablet') || '30'),
        renderHTML: attributes => ({ 'data-section-title-font-size-tablet': attributes.sectionTitleFontSizeTablet.toString() }),
      },
      
      sectionTitleFontSizeMobile: {
        default: 24,
        parseHTML: element => parseInt(element.getAttribute('data-section-title-font-size-mobile') || '24'),
        renderHTML: attributes => ({ 'data-section-title-font-size-mobile': attributes.sectionTitleFontSizeMobile.toString() }),
      },
      
      sectionTitleLineHeight: {
        default: 1.2,
        parseHTML: element => parseFloat(element.getAttribute('data-section-title-line-height') || '1.2'),
        renderHTML: attributes => ({ 'data-section-title-line-height': attributes.sectionTitleLineHeight.toString() }),
      },
      
      sectionTitleLineHeightType: {
        default: 'em',
        parseHTML: element => element.getAttribute('data-section-title-line-height-type'),
        renderHTML: attributes => ({ 'data-section-title-line-height-type': attributes.sectionTitleLineHeightType }),
      },
      
      sectionTitleLetterSpacing: {
        default: 0,
        parseHTML: element => parseFloat(element.getAttribute('data-section-title-letter-spacing') || '0'),
        renderHTML: attributes => ({ 'data-section-title-letter-spacing': attributes.sectionTitleLetterSpacing.toString() }),
      },
      
      sectionTitleBottomSpacing: {
        default: 16,
        parseHTML: element => parseInt(element.getAttribute('data-section-title-bottom-spacing') || '16'),
        renderHTML: attributes => ({ 'data-section-title-bottom-spacing': attributes.sectionTitleBottomSpacing.toString() }),
      },
      
      // 설명 타이포그래피
      sectionDescFontFamily: {
        default: 'inherit',
        parseHTML: element => element.getAttribute('data-section-desc-font-family'),
        renderHTML: attributes => ({ 'data-section-desc-font-family': attributes.sectionDescFontFamily }),
      },
      
      sectionDescFontWeight: {
        default: '400',
        parseHTML: element => element.getAttribute('data-section-desc-font-weight'),
        renderHTML: attributes => ({ 'data-section-desc-font-weight': attributes.sectionDescFontWeight }),
      },
      
      sectionDescFontSize: {
        default: 18,
        parseHTML: element => parseInt(element.getAttribute('data-section-desc-font-size') || '18'),
        renderHTML: attributes => ({ 'data-section-desc-font-size': attributes.sectionDescFontSize.toString() }),
      },
      
      sectionDescFontSizeType: {
        default: 'px',
        parseHTML: element => element.getAttribute('data-section-desc-font-size-type'),
        renderHTML: attributes => ({ 'data-section-desc-font-size-type': attributes.sectionDescFontSizeType }),
      },
      
      sectionDescFontSizeTablet: {
        default: 16,
        parseHTML: element => parseInt(element.getAttribute('data-section-desc-font-size-tablet') || '16'),
        renderHTML: attributes => ({ 'data-section-desc-font-size-tablet': attributes.sectionDescFontSizeTablet.toString() }),
      },
      
      sectionDescFontSizeMobile: {
        default: 14,
        parseHTML: element => parseInt(element.getAttribute('data-section-desc-font-size-mobile') || '14'),
        renderHTML: attributes => ({ 'data-section-desc-font-size-mobile': attributes.sectionDescFontSizeMobile.toString() }),
      },
      
      sectionDescLineHeight: {
        default: 1.6,
        parseHTML: element => parseFloat(element.getAttribute('data-section-desc-line-height') || '1.6'),
        renderHTML: attributes => ({ 'data-section-desc-line-height': attributes.sectionDescLineHeight.toString() }),
      },
      
      sectionDescLineHeightType: {
        default: 'em',
        parseHTML: element => element.getAttribute('data-section-desc-line-height-type'),
        renderHTML: attributes => ({ 'data-section-desc-line-height-type': attributes.sectionDescLineHeightType }),
      },
      
      sectionDescLetterSpacing: {
        default: 0,
        parseHTML: element => parseFloat(element.getAttribute('data-section-desc-letter-spacing') || '0'),
        renderHTML: attributes => ({ 'data-section-desc-letter-spacing': attributes.sectionDescLetterSpacing.toString() }),
      },
      
      sectionDescBottomSpacing: {
        default: 40,
        parseHTML: element => parseInt(element.getAttribute('data-section-desc-bottom-spacing') || '40'),
        renderHTML: attributes => ({ 'data-section-desc-bottom-spacing': attributes.sectionDescBottomSpacing.toString() }),
      },
      
      // 공통 속성들 (마진, 패딩 등)
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
        tag: 'div[data-type="uagb/info-box"]',
      },
    ];
  },
  
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'uagb/info-box',
        class: `uagb-block-${HTMLAttributes['data-block-id']} uagb-info-box-section`,
      }),
    ];
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(UAGBInfoBoxView);
  },
  
  addCommands() {
    return {
      setUAGBInfoBox:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
        
      updateUAGBInfoBox:
        (attrs) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, attrs);
        },
    };
  },
});