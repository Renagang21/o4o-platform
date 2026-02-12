/**
 * useGutenbergEditor Hook
 * Core editor state and logic management
 *
 * This hook consolidates:
 * - Block state management
 * - Document metadata (title, settings)
 * - Save/publish operations
 * - Session restoration
 * - Integration with existing hooks (useBlockHistory, useBlockManagement, etc.)
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Block } from '@/types/post.types';
import { PostSettings, O4OBlockEditorProps } from '../types/editor';
import { useBlockHistory } from './useBlockHistory';
import { useBlockManagement } from './useBlockManagement';
import { postApi } from '@/services/api/postApi';
import { debugTokenStatus } from '@/utils/token-debug';
import {
  saveEditorSession,
  loadEditorSession,
} from '@/utils/history-manager';

interface UseGutenbergEditorOptions {
  propDocumentTitle: string;
  initialBlocks: Block[];
  onChange?: (blocks: Block[]) => void;
  onTitleChange?: (title: string) => void;
  onSave?: () => void;
  onPublish?: () => void;
  slug: string;
  propPostSettings?: Partial<PostSettings>;
  onPostSettingsChange?: (settings: Partial<PostSettings>) => void;
  disableSessionRestore: boolean;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export function useGutenbergEditor(options: UseGutenbergEditorOptions) {
  const {
    propDocumentTitle,
    initialBlocks,
    onChange,
    onTitleChange,
    onSave,
    onPublish,
    slug,
    propPostSettings,
    onPostSettingsChange,
    disableSessionRestore,
    showToast,
  } = options;

  // Core state
  const [blocks, setBlocks] = useState<Block[]>(() => {
    if (initialBlocks.length > 0) {
      return initialBlocks;
    }
    return [];
  });

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState(propDocumentTitle);
  const [isDirty, setIsDirty] = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<any>(null);

  // Post settings state
  const [postSettings, setPostSettings] = useState<PostSettings>({
    status: 'draft',
    visibility: 'public',
    publishDate: new Date().toISOString().slice(0, 16),
    author: 'Admin User',
    featuredImage: undefined,
    excerpt: '',
    slugError: false,
    categories: [],
    tags: [],
    template: 'default',
    commentStatus: true,
    pingStatus: true,
    sticky: false,
    format: 'standard',
    ...propPostSettings,
    slug: propPostSettings?.slug || slug || '',
  });

  // Block History Hook
  const blockHistory = useBlockHistory({
    initialBlocks: blocks,
    documentTitle,
  });

  // Session restoration on mount
  useEffect(() => {
    if (disableSessionRestore || sessionRestored || initialBlocks.length > 0) return;

    const storedSession = loadEditorSession();
    if (storedSession && storedSession.history.length > 0) {
      const restoredBlocks = storedSession.history[storedSession.historyIndex].blocks;
      const nonEmptyBlocks = restoredBlocks.filter(block => {
        if (typeof block.content === 'string') {
          return block.content.trim().length > 0;
        }
        if (typeof block.content === 'object' && block.content !== null) {
          const text = (block.content as any).text || '';
          return text.trim().length > 0;
        }
        return false;
      });

      if (nonEmptyBlocks.length > 0) {
        blockHistory.setHistoryState(storedSession.history, storedSession.historyIndex);
        setBlocks(nonEmptyBlocks);
        setDocumentTitle(storedSession.documentTitle);
        setSessionRestored(true);
        showToast('편집 내역이 복원되었습니다', 'info');
      }
    }
  }, [disableSessionRestore, sessionRestored, initialBlocks.length, blockHistory, showToast]);

  // Sync blocks with initialBlocks prop changes
  useEffect(() => {
    if (initialBlocks && initialBlocks.length > 0 && !sessionRestored) {
      setBlocks(initialBlocks);
      blockHistory.resetHistory(initialBlocks);
      setIsDirty(false);
    }
  }, [initialBlocks, sessionRestored, blockHistory]);

  // Sync title with prop changes
  useEffect(() => {
    setDocumentTitle(propDocumentTitle);
  }, [propDocumentTitle]);

  // Save session on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveEditorSession(blockHistory.history, blockHistory.historyIndex, documentTitle);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      saveEditorSession(blockHistory.history, blockHistory.historyIndex, documentTitle);
    };
  }, [blockHistory.history, blockHistory.historyIndex, documentTitle]);

  // Sync post settings with prop changes
  useEffect(() => {
    if (propPostSettings) {
      setPostSettings(prev => ({ ...prev, ...propPostSettings }));
    }
  }, [propPostSettings]);

  // Update slug when propPostSettings or slug prop changes
  useEffect(() => {
    const newSlug = propPostSettings?.slug || slug || '';
    if (newSlug !== postSettings.slug) {
      setPostSettings(prev => ({ ...prev, slug: newSlug }));
    }
  }, [propPostSettings?.slug, slug, postSettings.slug]);

  // Update selectedBlock when selectedBlockId changes
  useEffect(() => {
    if (selectedBlockId) {
      const block = blocks.find(b => b.id === selectedBlockId);
      setSelectedBlock(block || null);
    } else {
      setSelectedBlock(null);
    }
  }, [selectedBlockId, blocks]);

  // Update blocks and history
  const updateBlocks = useCallback(
    (newBlocks: Block[], skipOnChange = false) => {
      setBlocks(newBlocks);
      setIsDirty(true);

      blockHistory.addToHistory(newBlocks);

      if (!skipOnChange) {
        onChange?.(newBlocks);
      }
    },
    [blockHistory, onChange]
  );

  // Block Management Hook
  const blockManagement = useBlockManagement({
    updateBlocks,
    setSelectedBlockId,
    setIsDirty,
  });

  // Sync blocksRef with current blocks
  useEffect(() => {
    blockManagement.setBlocksRef(blocks);
  }, [blocks, blockManagement]);

  // Undo/Redo handlers
  const handleUndo = useCallback(() => {
    const newBlocks = blockHistory.handleUndo();
    if (newBlocks) {
      setBlocks(newBlocks);
    }
  }, [blockHistory]);

  const handleRedo = useCallback(() => {
    const newBlocks = blockHistory.handleRedo();
    if (newBlocks) {
      setBlocks(newBlocks);
    }
  }, [blockHistory]);

  // Save handler
  const handleSave = useCallback(async () => {
    try {
      if (onSave) {
        await onSave();
        setIsDirty(false);
        showToast('Draft saved', 'success');
        return;
      }

      if (import.meta.env.DEV) {
        debugTokenStatus();
      }
      showToast('Saving draft...', 'info');
      const response = await postApi.saveDraft({
        title: documentTitle,
        content: blocks,
        status: 'draft',
      });
      if (response.success) {
        setIsDirty(false);
        showToast('Draft saved successfully', 'success');
      } else {
        showToast(response.error || 'Failed to save draft', 'error');
      }
    } catch (error) {
      showToast('Failed to save draft. Please try again.', 'error');
    }
  }, [documentTitle, blocks, onSave, showToast]);

  // Publish handler
  const handlePublish = useCallback(async () => {
    try {
      if (onPublish) {
        await onPublish();
        setIsDirty(false);
        showToast('Published successfully', 'success');
        return;
      }

      if (import.meta.env.DEV) {
        debugTokenStatus();
      }
      showToast('Publishing post...', 'info');
      const response = await postApi.create({
        title: documentTitle,
        content: blocks,
        status: 'published',
      });
      if (response.success && response.data) {
        setIsDirty(false);
        showToast('Post published successfully!', 'success');
      } else {
        showToast(response.error || 'Failed to publish post', 'error');
      }
    } catch (error) {
      showToast('Failed to publish post. Please try again.', 'error');
    }
  }, [documentTitle, blocks, onPublish, showToast]);

  // Title change handler
  const handleTitleChange = useCallback((newTitle: string) => {
    setDocumentTitle(newTitle);
    setIsDirty(true);
    onTitleChange?.(newTitle);
  }, [onTitleChange]);

  // Post settings change handler
  const handlePostSettingsChange = useCallback((settings: Partial<PostSettings>) => {
    setPostSettings(prev => ({ ...prev, ...settings }));
    setIsDirty(true);
    onPostSettingsChange?.(settings);
  }, [onPostSettingsChange]);

  return {
    // State
    blocks,
    selectedBlockId,
    documentTitle,
    postSettings,
    isDirty,
    sessionRestored,
    selectedBlock,

    // State setters
    setBlocks,
    setSelectedBlockId,
    setDocumentTitle,
    setPostSettings,
    setIsDirty,
    setSelectedBlock,

    // Core operations
    updateBlocks,
    handleUndo,
    handleRedo,
    handleSave,
    handlePublish,
    handleTitleChange,
    handlePostSettingsChange,

    // Sub-hooks
    blockHistory,
    blockManagement,
  };
}
