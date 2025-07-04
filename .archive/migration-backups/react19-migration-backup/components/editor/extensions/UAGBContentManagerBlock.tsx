// UAGB Content Manager Block - Spectra 스타일
// Post Creation된 데이터를 관리하는 인터페이스

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { 
  UAGBCommonAttributes, 
  generateBlockId
} from './tiptap-block';
import UAGBContentManagerView from './UAGBContentManagerView';

// Content Manager Actions
export type ContentManagerAction = 
  | 'view' 
  | 'edit' 
  | 'delete' 
  | 'publish' 
  | 'unpublish' 
  | 'duplicate'
  | 'bulk_delete'
  | 'bulk_publish';

// Content Manager View Types
export type ContentManagerViewType = 
  | 'table' 
  | 'grid' 
  | 'list' 
  | 'kanban';

// Content Manager Filter
export interface ContentManagerFilter {
  status: 'all' | 'published' | 'draft' | 'private' | 'trash';
  postType: string;
  author: string;
  dateRange: {
    start: string;
    end: string;
  };
  search: string;
}

// Content Manager Sort
export interface ContentManagerSort {
  field: 'title' | 'date' | 'modified' | 'author' | 'status' | 'views';
  direction: 'asc' | 'desc';
}

// UAGB Content Manager 속성 정의
export interface UAGBContentManagerAttributes extends UAGBCommonAttributes {
  // Manager Settings
  managerTitle: string;
  showTitle: boolean;
  
  // Data Source
  postTypes: string[];           // 관리할 Post Type들
  defaultPostType: string;       // 기본 Post Type
  
  // View Options
  viewType: ContentManagerViewType;
  itemsPerPage: number;
  showPagination: boolean;
  enableSearch: boolean;
  enableFilters: boolean;
  enableBulkActions: boolean;
  
  // Display Columns (Table View)
  columns: {
    title: boolean;
    status: boolean;
    author: boolean;
    date: boolean;
    modified: boolean;
    views: boolean;
    actions: boolean;
  };
  
  // Permissions
  permissions: {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canPublish: boolean;
    canCreate: boolean;
  };
  
  // UI Settings
  enableQuickEdit: boolean;      // 인라인 편집
  enablePreview: boolean;        // 미리보기
  showStatusBadges: boolean;     // 상태 배지
  showThumbnails: boolean;       // 썸네일 표시
  
  // Advanced Features
  enableAutoSave: boolean;       // 자동 저장
  autoSaveInterval: number;      // 자동 저장 간격 (초)
  enableVersionControl: boolean; // 버전 관리
  enableComments: boolean;       // 댓글 시스템
  
  // Styling
  tableHeaderColor: string;
  tableRowHoverColor: string;
  statusColors: {
    published: string;
    draft: string;
    private: string;
    trash: string;
  };
  
  // Layout
  containerHeight: number;       // 고정 높이 (0 = 자동)
  enableFullscreen: boolean;     // 전체화면 모드
  
  // Integration
  enableNotifications: boolean;  // 실시간 알림
  webhookUrl: string;           // 외부 연동 웹훅
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    uagbContentManager: {
      setUAGBContentManager: (attrs: Partial<UAGBContentManagerAttributes>) => ReturnType;
      updateUAGBContentManager: (attrs: Partial<UAGBContentManagerAttributes>) => ReturnType;
    };
  }
}

export const UAGBContentManagerBlock = Node.create({
  name: 'uagb/content-manager',
  
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
      
      // Manager Settings
      managerTitle: { default: 'Content Manager' },
      showTitle: { default: true },
      
      // Data Source
      postTypes: { default: ['blog'] },
      defaultPostType: { default: 'blog' },
      
      // View Options
      viewType: { default: 'table' },
      itemsPerPage: { default: 20 },
      showPagination: { default: true },
      enableSearch: { default: true },
      enableFilters: { default: true },
      enableBulkActions: { default: true },
      
      // Display Columns
      columns: {
        default: {
          title: true,
          status: true,
          author: true,
          date: true,
          modified: false,
          views: true,
          actions: true
        }
      },
      
      // Permissions
      permissions: {
        default: {
          canView: true,
          canEdit: true,
          canDelete: true,
          canPublish: true,
          canCreate: true
        }
      },
      
      // UI Settings
      enableQuickEdit: { default: true },
      enablePreview: { default: true },
      showStatusBadges: { default: true },
      showThumbnails: { default: true },
      
      // Advanced Features
      enableAutoSave: { default: true },
      autoSaveInterval: { default: 30 },
      enableVersionControl: { default: false },
      enableComments: { default: false },
      
      // Styling
      tableHeaderColor: { default: '#f8fafc' },
      tableRowHoverColor: { default: '#f1f5f9' },
      statusColors: {
        default: {
          published: '#10b981',
          draft: '#f59e0b',
          private: '#6b7280',
          trash: '#ef4444'
        }
      },
      
      // Layout
      containerHeight: { default: 0 },
      enableFullscreen: { default: true },
      
      // Integration
      enableNotifications: { default: true },
      webhookUrl: { default: '' },
      
      // Common UAGB attributes
      blockTopMargin: { default: 0 },
      blockRightMargin: { default: 0 },
      blockBottomMargin: { default: 20 },
      blockLeftMargin: { default: 0 },
      blockTopMarginTablet: { default: 0 },
      blockRightMarginTablet: { default: 0 },
      blockBottomMarginTablet: { default: 20 },
      blockLeftMarginTablet: { default: 0 },
      blockTopMarginMobile: { default: 0 },
      blockRightMarginMobile: { default: 0 },
      blockBottomMarginMobile: { default: 20 },
      blockLeftMarginMobile: { default: 0 },
      
      blockTopPadding: { default: 20 },
      blockRightPadding: { default: 20 },
      blockBottomPadding: { default: 20 },
      blockLeftPadding: { default: 20 },
      blockTopPaddingTablet: { default: 20 },
      blockRightPaddingTablet: { default: 20 },
      blockBottomPaddingTablet: { default: 20 },
      blockLeftPaddingTablet: { default: 20 },
      blockTopPaddingMobile: { default: 16 },
      blockRightPaddingMobile: { default: 16 },
      blockBottomPaddingMobile: { default: 16 },
      blockLeftPaddingMobile: { default: 16 },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="uagb/content-manager"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        {
          'data-type': 'uagb/content-manager',
          'class': `uagb-block-${HTMLAttributes['data-block-id']} uagb-content-manager`,
        },
        HTMLAttributes
      ),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(UAGBContentManagerView);
  },

  addCommands() {
    return {
      setUAGBContentManager:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
      updateUAGBContentManager:
        (attrs) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, attrs);
        },
    };
  },
});

// 🔧 Content Manager API 연동 함수들

/**
 * Post 목록 조회 API
 */
export const getPostsAPI = async (
  postTypeSlug: string,
  page: number = 1,
  limit: number = 20,
  filters: Partial<ContentManagerFilter> = {},
  sort: ContentManagerSort = { field: 'date', direction: 'desc' }
) => {
  try {
    const response = await fetch('http://localhost:3000/api/post-creation/archive', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        postTypeSlug,
        limit,
        offset: (page - 1) * limit,
        orderBy: sort.field === 'date' ? 'createdAt' : sort.field,
        sortOrder: sort.direction.toUpperCase(),
        filters: {
          status: filters.status === 'all' ? undefined : filters.status,
          author: filters.author,
          dateRange: filters.dateRange
        },
        search: filters.search
      })
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    const result = await response.json();
    return result.data;
    
  } catch (error) {
    console.error('Get posts API error:', error);
    throw error;
  }
};

/**
 * Post 업데이트 API
 */
export const updatePostAPI = async (postId: string, updates: any) => {
  try {
    const response = await fetch(`http://localhost:3000/api/post-creation/posts/${postId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    const result = await response.json();
    return result.data;
    
  } catch (error) {
    console.error('Update post API error:', error);
    throw error;
  }
};

/**
 * Post 삭제 API
 */
export const deletePostAPI = async (postId: string) => {
  try {
    const response = await fetch(`http://localhost:3000/api/post-creation/posts/${postId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    const result = await response.json();
    return result;
    
  } catch (error) {
    console.error('Delete post API error:', error);
    throw error;
  }
};

export default UAGBContentManagerBlock;