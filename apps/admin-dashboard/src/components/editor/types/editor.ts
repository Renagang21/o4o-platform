/**
 * Editor Types
 * Extracted from GutenbergBlockEditor.tsx for better organization
 */

import { Block } from '@/types/post.types';

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

export interface O4OBlockEditorProps {
  documentTitle?: string;
  initialBlocks?: Block[];
  onChange?: (blocks: Block[]) => void;
  onTitleChange?: (title: string) => void;
  onSave?: () => void;
  onPublish?: () => void;
  slug?: string;
  postSettings?: Partial<PostSettings>;
  onPostSettingsChange?: (settings: Partial<PostSettings>) => void;
  mode?: 'post' | 'page' | 'template' | 'pattern';
  hideHeader?: boolean;
  disableSessionRestore?: boolean;
  showListView?: boolean;
  onToggleListView?: () => void;
}

export interface EditorState {
  blocks: Block[];
  selectedBlockId: string | null;
  documentTitle: string;
  postSettings: PostSettings;
  isDirty: boolean;
  sessionRestored: boolean;
}

export interface EditorUIState {
  isBlockInserterOpen: boolean;
  isFullscreen: boolean;
  isCodeView: boolean;
  isDesignLibraryOpen: boolean;
  isAIGeneratorOpen: boolean;
  isAIChatOpen: boolean;
  sidebarOpen: boolean;
  activeTab: 'document' | 'block';
  isBlockAIModalOpen: boolean;
  isSectionAIModalOpen: boolean;
  isPageImproveModalOpen: boolean;
}
