/**
 * useEditorState Hook
 *
 * Consolidates 17 useState calls into a single reducer
 * Reduces complexity and makes state transitions more predictable
 */

import { useReducer, useCallback } from 'react';
import { Block } from '@/types/post.types';

// ============================================================================
// Types
// ============================================================================

export interface PostSettings {
  status: 'draft' | 'pending' | 'private' | 'publish' | 'scheduled';
  visibility: 'public' | 'private' | 'password';
  publishDate: string;
  author: string;
  featuredImage?: string;
  excerpt: string;
  slug: string;
  slugError?: boolean;
  categories: string[];
  tags: string[];
  template: string;
  commentStatus: boolean;
  pingStatus: boolean;
  sticky: boolean;
  format: 'standard' | 'aside' | 'gallery' | 'link' | 'image' | 'quote' | 'status' | 'video' | 'audio' | 'chat';
}

export interface EditorState {
  // Document state
  blocks: Block[];
  documentTitle: string;
  selectedBlockId: string | null;
  copiedBlock: Block | null;

  // UI state
  isBlockInserterOpen: boolean;
  isFullscreen: boolean;
  isBlockListOpen: boolean;
  isCodeView: boolean;
  isDesignLibraryOpen: boolean;
  isAIGeneratorOpen: boolean;
  isAIChatOpen: boolean;
  sidebarOpen: boolean;
  activeTab: 'blocks' | 'settings';

  // Post settings
  postSettings: PostSettings;

  // Session state
  isDirty: boolean;
  sessionRestored: boolean;
}

export type EditorAction =
  // Block actions
  | { type: 'SET_BLOCKS'; payload: Block[] }
  | { type: 'SET_SELECTED_BLOCK_ID'; payload: string | null }
  | { type: 'SET_COPIED_BLOCK'; payload: Block | null }

  // Document actions
  | { type: 'SET_DOCUMENT_TITLE'; payload: string }

  // UI toggle actions
  | { type: 'TOGGLE_BLOCK_INSERTER' }
  | { type: 'TOGGLE_FULLSCREEN' }
  | { type: 'TOGGLE_BLOCK_LIST' }
  | { type: 'TOGGLE_CODE_VIEW' }
  | { type: 'TOGGLE_DESIGN_LIBRARY' }
  | { type: 'TOGGLE_AI_GENERATOR' }
  | { type: 'TOGGLE_AI_CHAT' }
  | { type: 'TOGGLE_SIDEBAR' }

  // UI set actions
  | { type: 'SET_BLOCK_INSERTER_OPEN'; payload: boolean }
  | { type: 'SET_FULLSCREEN'; payload: boolean }
  | { type: 'SET_BLOCK_LIST_OPEN'; payload: boolean }
  | { type: 'SET_CODE_VIEW'; payload: boolean }
  | { type: 'SET_DESIGN_LIBRARY_OPEN'; payload: boolean }
  | { type: 'SET_AI_GENERATOR_OPEN'; payload: boolean }
  | { type: 'SET_AI_CHAT_OPEN'; payload: boolean }
  | { type: 'SET_SIDEBAR_OPEN'; payload: boolean }
  | { type: 'SET_ACTIVE_TAB'; payload: 'blocks' | 'settings' }

  // Post settings actions
  | { type: 'UPDATE_POST_SETTINGS'; payload: Partial<PostSettings> }

  // Session actions
  | { type: 'SET_DIRTY'; payload: boolean }
  | { type: 'SET_SESSION_RESTORED'; payload: boolean }

  // Batch actions
  | { type: 'RESTORE_SESSION'; payload: { blocks: Block[]; documentTitle: string } }
  | { type: 'RESET_EDITOR' };

// ============================================================================
// Initial State
// ============================================================================

export const DEFAULT_POST_SETTINGS: PostSettings = {
  status: 'draft',
  visibility: 'public',
  publishDate: new Date().toISOString(),
  author: '',
  excerpt: '',
  slug: '',
  categories: [],
  tags: [],
  template: 'default',
  commentStatus: true,
  pingStatus: true,
  sticky: false,
  format: 'standard',
};

export const createInitialState = (
  initialBlocks: Block[] = [],
  initialTitle: string = ''
): EditorState => ({
  // Document state
  blocks: initialBlocks,
  documentTitle: initialTitle,
  selectedBlockId: null,
  copiedBlock: null,

  // UI state
  isBlockInserterOpen: false,
  isFullscreen: false,
  isBlockListOpen: false,
  isCodeView: false,
  isDesignLibraryOpen: false,
  isAIGeneratorOpen: false,
  isAIChatOpen: false,
  sidebarOpen: true,
  activeTab: 'blocks',

  // Post settings
  postSettings: DEFAULT_POST_SETTINGS,

  // Session state
  isDirty: false,
  sessionRestored: false,
});

// ============================================================================
// Reducer
// ============================================================================

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    // Block actions
    case 'SET_BLOCKS':
      return { ...state, blocks: action.payload };

    case 'SET_SELECTED_BLOCK_ID':
      return { ...state, selectedBlockId: action.payload };

    case 'SET_COPIED_BLOCK':
      return { ...state, copiedBlock: action.payload };

    // Document actions
    case 'SET_DOCUMENT_TITLE':
      return { ...state, documentTitle: action.payload };

    // UI toggle actions
    case 'TOGGLE_BLOCK_INSERTER':
      return { ...state, isBlockInserterOpen: !state.isBlockInserterOpen };

    case 'TOGGLE_FULLSCREEN':
      return { ...state, isFullscreen: !state.isFullscreen };

    case 'TOGGLE_BLOCK_LIST':
      return { ...state, isBlockListOpen: !state.isBlockListOpen };

    case 'TOGGLE_CODE_VIEW':
      return { ...state, isCodeView: !state.isCodeView };

    case 'TOGGLE_DESIGN_LIBRARY':
      return { ...state, isDesignLibraryOpen: !state.isDesignLibraryOpen };

    case 'TOGGLE_AI_GENERATOR':
      return { ...state, isAIGeneratorOpen: !state.isAIGeneratorOpen };

    case 'TOGGLE_AI_CHAT':
      return { ...state, isAIChatOpen: !state.isAIChatOpen };

    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };

    // UI set actions
    case 'SET_BLOCK_INSERTER_OPEN':
      return { ...state, isBlockInserterOpen: action.payload };

    case 'SET_FULLSCREEN':
      return { ...state, isFullscreen: action.payload };

    case 'SET_BLOCK_LIST_OPEN':
      return { ...state, isBlockListOpen: action.payload };

    case 'SET_CODE_VIEW':
      return { ...state, isCodeView: action.payload };

    case 'SET_DESIGN_LIBRARY_OPEN':
      return { ...state, isDesignLibraryOpen: action.payload };

    case 'SET_AI_GENERATOR_OPEN':
      return { ...state, isAIGeneratorOpen: action.payload };

    case 'SET_AI_CHAT_OPEN':
      return { ...state, isAIChatOpen: action.payload };

    case 'SET_SIDEBAR_OPEN':
      return { ...state, sidebarOpen: action.payload };

    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };

    // Post settings actions
    case 'UPDATE_POST_SETTINGS':
      return {
        ...state,
        postSettings: { ...state.postSettings, ...action.payload },
      };

    // Session actions
    case 'SET_DIRTY':
      return { ...state, isDirty: action.payload };

    case 'SET_SESSION_RESTORED':
      return { ...state, sessionRestored: action.payload };

    // Batch actions
    case 'RESTORE_SESSION':
      return {
        ...state,
        blocks: action.payload.blocks,
        documentTitle: action.payload.documentTitle,
        sessionRestored: true,
      };

    case 'RESET_EDITOR':
      return createInitialState();

    default:
      return state;
  }
}

// ============================================================================
// Hook
// ============================================================================

export function useEditorState(initialBlocks: Block[] = [], initialTitle: string = '') {
  const [state, dispatch] = useReducer(
    editorReducer,
    createInitialState(initialBlocks, initialTitle)
  );

  // Convenience action creators
  const actions = {
    // Block actions
    setBlocks: useCallback((blocks: Block[]) => {
      dispatch({ type: 'SET_BLOCKS', payload: blocks });
    }, []),

    setSelectedBlockId: useCallback((id: string | null) => {
      dispatch({ type: 'SET_SELECTED_BLOCK_ID', payload: id });
    }, []),

    setCopiedBlock: useCallback((block: Block | null) => {
      dispatch({ type: 'SET_COPIED_BLOCK', payload: block });
    }, []),

    // Document actions
    setDocumentTitle: useCallback((title: string) => {
      dispatch({ type: 'SET_DOCUMENT_TITLE', payload: title });
    }, []),

    // UI toggle actions
    toggleBlockInserter: useCallback(() => {
      dispatch({ type: 'TOGGLE_BLOCK_INSERTER' });
    }, []),

    toggleFullscreen: useCallback(() => {
      dispatch({ type: 'TOGGLE_FULLSCREEN' });
    }, []),

    toggleBlockList: useCallback(() => {
      dispatch({ type: 'TOGGLE_BLOCK_LIST' });
    }, []),

    toggleCodeView: useCallback(() => {
      dispatch({ type: 'TOGGLE_CODE_VIEW' });
    }, []),

    toggleDesignLibrary: useCallback(() => {
      dispatch({ type: 'TOGGLE_DESIGN_LIBRARY' });
    }, []),

    toggleAIGenerator: useCallback(() => {
      dispatch({ type: 'TOGGLE_AI_GENERATOR' });
    }, []),

    toggleAIChat: useCallback(() => {
      dispatch({ type: 'TOGGLE_AI_CHAT' });
    }, []),

    toggleSidebar: useCallback(() => {
      dispatch({ type: 'TOGGLE_SIDEBAR' });
    }, []),

    // UI set actions
    setBlockInserterOpen: useCallback((open: boolean) => {
      dispatch({ type: 'SET_BLOCK_INSERTER_OPEN', payload: open });
    }, []),

    setFullscreen: useCallback((fullscreen: boolean) => {
      dispatch({ type: 'SET_FULLSCREEN', payload: fullscreen });
    }, []),

    setBlockListOpen: useCallback((open: boolean) => {
      dispatch({ type: 'SET_BLOCK_LIST_OPEN', payload: open });
    }, []),

    setCodeView: useCallback((codeView: boolean) => {
      dispatch({ type: 'SET_CODE_VIEW', payload: codeView });
    }, []),

    setDesignLibraryOpen: useCallback((open: boolean) => {
      dispatch({ type: 'SET_DESIGN_LIBRARY_OPEN', payload: open });
    }, []),

    setAIGeneratorOpen: useCallback((open: boolean) => {
      dispatch({ type: 'SET_AI_GENERATOR_OPEN', payload: open });
    }, []),

    setAIChatOpen: useCallback((open: boolean) => {
      dispatch({ type: 'SET_AI_CHAT_OPEN', payload: open });
    }, []),

    setSidebarOpen: useCallback((open: boolean) => {
      dispatch({ type: 'SET_SIDEBAR_OPEN', payload: open });
    }, []),

    setActiveTab: useCallback((tab: 'blocks' | 'settings') => {
      dispatch({ type: 'SET_ACTIVE_TAB', payload: tab });
    }, []),

    // Post settings actions
    updatePostSettings: useCallback((settings: Partial<PostSettings>) => {
      dispatch({ type: 'UPDATE_POST_SETTINGS', payload: settings });
    }, []),

    // Session actions
    setDirty: useCallback((dirty: boolean) => {
      dispatch({ type: 'SET_DIRTY', payload: dirty });
    }, []),

    setSessionRestored: useCallback((restored: boolean) => {
      dispatch({ type: 'SET_SESSION_RESTORED', payload: restored });
    }, []),

    // Batch actions
    restoreSession: useCallback((blocks: Block[], documentTitle: string) => {
      dispatch({ type: 'RESTORE_SESSION', payload: { blocks, documentTitle } });
    }, []),

    resetEditor: useCallback(() => {
      dispatch({ type: 'RESET_EDITOR' });
    }, []),
  };

  return { state, dispatch, actions };
}
