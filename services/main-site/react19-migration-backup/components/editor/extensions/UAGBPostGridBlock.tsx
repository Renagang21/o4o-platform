// UAGB Post Grid Block - Spectra 스타일
// ProductBlock을 UAGB Post Grid로 변환
// brainstormforce/wp-spectra 구조를 기반으로 함

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { 
  UAGBCommonAttributes, 
  generateBlockId,
  UAGBPostGridControl
} from './tiptap-block';
import UAGBPostGridView from './UAGBPostGridView';

// UAGB Post Grid 속성 정의
export interface UAGBPostGridAttributes extends UAGBCommonAttributes {
  // Layout Settings
  columns: number;
  columnsTablet: number;
  columnsMobile: number;
  layout: 'grid' | 'list' | 'masonry';
  equalHeight: boolean;
  
  // Query Settings  
  postsPerPage: number;
  orderBy: 'date' | 'title' | 'menu_order' | 'rand';
  order: 'ASC' | 'DESC';
  categories: string[];
  tags: string[];
  excludeCurrentPost: boolean;
  
  // Display Settings
  imageSize: 'thumbnail' | 'medium' | 'large' | 'full';
  showExcerpt: boolean;
  excerptLength: number;
  showMeta: boolean;
  showAuthor: boolean;
  showDate: boolean;
  showCategories: boolean;
  showTags: boolean;
  showReadMore: boolean;
  readMoreText: string;
  
  // Features
  showFilters: boolean;
  showPagination: boolean;
  paginationType: 'numbered' | 'load-more' | 'infinite-scroll';
  
  // Spacing
  rowGap: number;
  rowGapTablet: number;
  rowGapMobile: number;
  columnGap: number;
  columnGapTablet: number;
  columnGapMobile: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    uagbPostGrid: {
      setUAGBPostGrid: (attrs: Partial<UAGBPostGridAttributes>) => ReturnType;
      updateUAGBPostGrid: (attrs: Partial<UAGBPostGridAttributes>) => ReturnType;
    };
  }
}

export const UAGBPostGridBlock = Node.create({
  name: 'uagb/post-grid',
  
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
      
      // Layout Settings
      columns: { default: 3 },
      columnsTablet: { default: 2 },
      columnsMobile: { default: 1 },
      layout: { default: 'grid' },
      equalHeight: { default: false },
      
      // Query Settings
      postsPerPage: { default: 6 },
      orderBy: { default: 'date' },
      order: { default: 'DESC' },
      categories: { default: [] },
      tags: { default: [] },
      excludeCurrentPost: { default: true },
      
      // Display Settings
      imageSize: { default: 'medium' },
      showExcerpt: { default: true },
      excerptLength: { default: 25 },
      showMeta: { default: true },
      showAuthor: { default: true },
      showDate: { default: true },
      showCategories: { default: true },
      showTags: { default: false },
      showReadMore: { default: true },
      readMoreText: { default: 'Read More' },
      
      // Features
      showFilters: { default: false },
      showPagination: { default: true },
      paginationType: { default: 'numbered' },
      
      // Spacing
      rowGap: { default: 20 },
      rowGapTablet: { default: 20 },
      rowGapMobile: { default: 20 },
      columnGap: { default: 20 },
      columnGapTablet: { default: 20 },
      columnGapMobile: { default: 20 },
      
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
        tag: 'div[data-type="uagb/post-grid"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        {
          'data-type': 'uagb/post-grid',
          'class': `uagb-block-${HTMLAttributes['data-block-id']} uagb-post-grid`,
        },
        HTMLAttributes
      ),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(UAGBPostGridView);
  },

  addCommands() {
    return {
      setUAGBPostGrid:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
      updateUAGBPostGrid:
        (attrs) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, attrs);
        },
    };
  },
});

export default UAGBPostGridBlock;
