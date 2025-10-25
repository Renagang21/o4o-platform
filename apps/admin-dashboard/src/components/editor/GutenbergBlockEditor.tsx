/**
 * GutenbergBlockEditor Component
 * Enhanced WordPress Gutenberg-like editor with 3-column layout
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/editor.css';
import '../../styles/inspector-sidebar.css';
import { postApi } from '@/services/api/postApi';
import { debugTokenStatus } from '@/utils/token-debug';
import { Block } from '@/types/post.types';
import GutenbergBlockInserter from './GutenbergBlockInserter';
import { initializeWordPress } from '@/utils/wordpress-initializer';
import DesignLibraryModalImproved from './DesignLibraryModalImproved';
import { SimpleAIModal } from '../ai/SimpleAIModal';
import { DynamicRenderer } from '@/blocks/registry/DynamicRenderer';
import { registerAllBlocks } from '@/blocks';
import GutenbergSidebar from './GutenbergSidebar';
import { BlockWrapper } from './BlockWrapper';
import SlashCommandMenu from './SlashCommandMenu';
// Toast components
import { useToast } from './hooks/useToast';
import { Toast } from './components/Toast';
// AI Chat Panel
import { AIChatPanel } from './AIChatPanel';
import { EditorContext, AIAction } from '@/services/ai/ConversationalAI';
// Custom hooks
import { useBlockManagement } from './hooks/useBlockManagement';
import { useBlockHistory } from './hooks/useBlockHistory';
import { useSlashCommands } from './hooks/useSlashCommands';
import { useDragAndDrop } from './hooks/useDragAndDrop';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCustomizerSettings } from '@/hooks/useCustomizerSettings';
import {
  saveEditorSession,
  loadEditorSession,
  clearEditorSession,
  hasStoredSession,
  createHistoryEntry,
  trimHistory,
  type HistoryEntry,
} from '@/utils/history-manager';

// Block interface는 이제 @/types/post.types에서 import

interface PostSettings {
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

interface GutenbergBlockEditorProps {
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
  hideHeader?: boolean; // Hide header when embedded in another editor
  // Skip restoring previous local session (used when editing an existing post)
  disableSessionRestore?: boolean;
  // External control of list view (for EditorHeader integration)
  showListView?: boolean;
  onToggleListView?: () => void;
}

const GutenbergBlockEditor: React.FC<GutenbergBlockEditorProps> = ({
  documentTitle: propDocumentTitle = '',
  initialBlocks = [],
  onChange,
  onTitleChange,
  onSave,
  onPublish,
  slug = '',
  postSettings: propPostSettings,
  onPostSettingsChange,
  mode = 'post',
  hideHeader = false,
  disableSessionRestore = false,
  showListView: externalShowListView,
  onToggleListView: externalOnToggleListView,
}) => {
  // Initialize with empty state or initial blocks
  const [blocks, setBlocks] = useState<Block[]>(() => {
    if (initialBlocks.length > 0) {
      return initialBlocks;
    }
    // Start with empty editor
    return [];
  });
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState(propDocumentTitle);
  const [isBlockInserterOpen, setIsBlockInserterOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBlockListOpen, setIsBlockListOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);

  // Toast notifications
  const { toast, showToast } = useToast();

  // ✨ Block History Hook
  const blockHistory = useBlockHistory({
    initialBlocks: blocks,
    documentTitle,
  });

  // Initialize block registry
  useEffect(() => {
    registerAllBlocks();
  }, []);

  // Session restoration on mount
  useEffect(() => {
    if (disableSessionRestore || sessionRestored || initialBlocks.length > 0) return;

    const storedSession = loadEditorSession();
    if (storedSession && storedSession.history.length > 0) {
      // Filter out empty blocks from restored session
      const restoredBlocks = storedSession.history[storedSession.historyIndex].blocks;
      const nonEmptyBlocks = restoredBlocks.filter(block => {
        // Filter blocks based on content
        if (typeof block.content === 'string') {
          return block.content.trim().length > 0;
        }
        if (typeof block.content === 'object' && block.content !== null) {
          const text = (block.content as any).text || '';
          return text.trim().length > 0;
        }
        return false;
      });

      // Only restore if there are blocks
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
      // Final save on unmount
      saveEditorSession(blockHistory.history, blockHistory.historyIndex, documentTitle);
    };
  }, [blockHistory.history, blockHistory.historyIndex, documentTitle]);
  
  // Sync post settings with prop changes
  useEffect(() => {
    if (propPostSettings) {
      setPostSettings(prev => ({ ...prev, ...propPostSettings }));
    }
  }, [propPostSettings]);

  const [isCodeView, setIsCodeView] = useState(false);
  const [copiedBlock, setCopiedBlock] = useState<Block | null>(null);
  const [isDesignLibraryOpen, setIsDesignLibraryOpen] = useState(false);
  const [isAIGeneratorOpen, setIsAIGeneratorOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  
  // Sidebar states
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'document' | 'block'>('document');
  const [selectedBlock, setSelectedBlock] = useState<any>(null);
  
  // Post settings state - ensure slug from props is preserved
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
    slug: propPostSettings?.slug || slug || '' // Ensure slug is not overridden
  });
  
  const navigate = useNavigate();

  // Viewport mode hook
  const { viewportMode, currentConfig, switchViewport, containerSettings } = useCustomizerSettings();

  // ⭐ AI Chat - EditorContext 생성
  const editorContext: EditorContext = useMemo(() => ({
    selectedBlockId,
    selectedBlock: blocks.find(b => b.id === selectedBlockId) || null,
    allBlocks: blocks,
    documentTitle,
    blockCount: blocks.length,
  }), [selectedBlockId, blocks, documentTitle]);

  // Initialize WordPress on mount
  useEffect(() => {
    initializeWordPress().catch(error => {
      // Failed to initialize WordPress
    });
  }, []);
  
  // Update slug when propPostSettings or slug prop changes
  useEffect(() => {
    const newSlug = propPostSettings?.slug || slug || '';
    if (newSlug !== postSettings.slug) {
      setPostSettings(prev => ({ ...prev, slug: newSlug }));
    }
  }, [propPostSettings?.slug, slug]);
  
  // Update selectedBlock when selectedBlockId changes
  useEffect(() => {
    if (selectedBlockId) {
      const block = blocks.find(b => b.id === selectedBlockId);
      setSelectedBlock(block || null);
    } else {
      setSelectedBlock(null);
    }
  }, [selectedBlockId, blocks]);

  // Sync list view state with external prop
  useEffect(() => {
    if (externalShowListView !== undefined) {
      setIsBlockListOpen(externalShowListView);
    }
  }, [externalShowListView]);

  // ✨ Update blocks and history
  const updateBlocks = useCallback(
    (newBlocks: Block[], skipOnChange = false) => {
      setBlocks(newBlocks);
      setIsDirty(true);

      // Add to history
      blockHistory.addToHistory(newBlocks);

      // Notify parent (unless skipped for initialization)
      if (!skipOnChange) {
        onChange?.(newBlocks);
      }
    },
    [blockHistory, onChange]
  );

  // ✨ Block Management Hook
  const blockManagement = useBlockManagement({
    updateBlocks,
    setSelectedBlockId,
    setIsDirty,
  });

  // Sync blocksRef with current blocks
  useEffect(() => {
    blockManagement.setBlocksRef(blocks);
  }, [blocks, blockManagement]);

  // ✨ Slash Commands Hook
  const slashCommands = useSlashCommands({
    blocksRef: blockManagement.blocksRef,
    updateBlocks,
    selectedBlockId,
    setSelectedBlockId,
  });

  // Drag and drop hook - must be after updateBlocks is defined
  const { draggedBlockId, dragOverBlockId, handleDragStart, handleDragOver, handleDrop, handleDragEnd } = useDragAndDrop({ blocks, updateBlocks });

  // ✨ Undo
  const handleUndo = useCallback(() => {
    const newBlocks = blockHistory.handleUndo();
    if (newBlocks) {
      setBlocks(newBlocks);
    }
  }, [blockHistory]);

  // ✨ Redo
  const handleRedo = useCallback(() => {
    const newBlocks = blockHistory.handleRedo();
    if (newBlocks) {
      setBlocks(newBlocks);
    }
  }, [blockHistory]);

  // ✨ Block CRUD handlers - wrappers around blockManagement hook
  const handleBlockUpdate = blockManagement.handleBlockUpdate;
  const handleBlockDelete = blockManagement.handleBlockDelete;

  const handleBlockCopy = useCallback(
    async (blockId: string) => blockManagement.handleBlockCopy(blockId, setCopiedBlock),
    [blockManagement]
  );

  const handleBlockPaste = useCallback(
    async (afterBlockId?: string) => blockManagement.handleBlockPaste(copiedBlock, afterBlockId),
    [blockManagement, copiedBlock]
  );

  const handleInsertBlock = useCallback(
    (blockType: string) => blockManagement.handleInsertBlock(blockType, setIsBlockInserterOpen),
    [blockManagement]
  );

  const handleAddBlock = blockManagement.handleAddBlock;

  // ✨ Slash command handler - from slashCommands hook
  const handleSlashCommandSelect = slashCommands.handleSlashCommandSelect;

  // Listen for custom "open-block-inserter" event from EditorHeader
  useEffect(() => {
    const handleOpenBlockInserter = () => {
      setIsBlockInserterOpen(true);
    };

    window.addEventListener('open-block-inserter', handleOpenBlockInserter);
    return () => window.removeEventListener('open-block-inserter', handleOpenBlockInserter);
  }, []);

  // Detect "/" input in contentEditable elements
  useEffect(() => {
    const handleInput = (e: Event) => {
      const target = e.target as HTMLElement;

      // Only proceed if it's a contentEditable element
      if (!target.isContentEditable) return;

      // Get the block ID from the closest block wrapper
      const blockWrapper = target.closest('[data-block-id]') as HTMLElement;
      if (!blockWrapper) return;

      const blockId = blockWrapper.getAttribute('data-block-id');
      if (!blockId) return;

      const text = target.textContent || '';

      // Check if text contains "/"
      const slashIndex = text.lastIndexOf('/');
      if (slashIndex !== -1) {
        // Get query after "/"
        const query = text.substring(slashIndex + 1);

        // Only show menu if "/" is at the end or followed by search text
        const afterSlash = text.substring(slashIndex);
        if (afterSlash === '/' || /^\/[\w\s]*$/.test(afterSlash)) {
          // Get cursor position for menu placement
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            const position = {
              top: rect.bottom + window.scrollY + 4,
              left: rect.left + window.scrollX
            };

            slashCommands.openSlashMenu(query, blockId, position);
            slashCommands.slashMenuRef.current = { query, blockId };
          }
          return;
        }
      }

      // Close menu if "/" was removed
      if (slashCommands.isSlashMenuOpen && !text.includes('/')) {
        slashCommands.closeSlashMenu();
      }
    };

    document.addEventListener('input', handleInput);
    return () => document.removeEventListener('input', handleInput);
  }, [slashCommands]);

  // Handle save
  const handleSave = useCallback(async () => {
    try {
      // If parent provided handler, delegate to avoid duplicate creates
      if (onSave) {
        await onSave();
        setIsDirty(false);
        showToast('Draft saved', 'success');
        return;
      }

      // Fallback (no parent handler): save draft directly
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

  // Handle publish
  const handlePublish = useCallback(async () => {
    try {
      if (onPublish) {
        await onPublish();
        setIsDirty(false);
        showToast('Published successfully', 'success');
        return;
      }

      // Fallback (no parent handler): create directly
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

  // Toggle fullscreen
  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, [isFullscreen]);

  // Toggle code view
  const handleToggleCodeView = useCallback(() => {
    setIsCodeView(!isCodeView);
  }, [isCodeView]);

  // ✨ Block movement handlers - from blockManagement hook
  const handleDuplicate = blockManagement.handleDuplicate;
  const handleMoveUp = blockManagement.handleMoveUp;
  const handleMoveDown = blockManagement.handleMoveDown;

  // ⭐ AI Chat - Execute AI actions (must be after all helper functions)
  const handleExecuteAIActions = useCallback((actions: AIAction[]) => {
    actions.forEach(action => {
      switch (action.action) {
        case 'insert':
          if (action.blockType) {
            const newBlock: Block = {
              id: `block-${Date.now()}`,
              type: action.blockType,
              content: action.content || { text: '' },
              attributes: action.attributes || {},
            };

            const newBlocks = [...blockManagement.blocksRef.current!];
            if (action.position === 'before' && action.targetBlockId) {
              const idx = blockManagement.blocksRef.current!.findIndex(b => b.id === action.targetBlockId);
              newBlocks.splice(idx, 0, newBlock);
            } else if (action.position === 'after' && action.targetBlockId) {
              const idx = blockManagement.blocksRef.current!.findIndex(b => b.id === action.targetBlockId);
              newBlocks.splice(idx + 1, 0, newBlock);
            } else if (typeof action.position === 'number') {
              newBlocks.splice(action.position, 0, newBlock);
            } else {
              newBlocks.push(newBlock);
            }

            updateBlocks(newBlocks);
            setSelectedBlockId(newBlock.id);
            showToast('블록이 추가되었습니다', 'success');
          }
          break;

        case 'update':
          if (action.targetBlockId) {
            handleBlockUpdate(action.targetBlockId, action.content, action.attributes);
            showToast('블록이 업데이트되었습니다', 'success');
          }
          break;

        case 'delete':
          if (action.targetBlockId) {
            handleBlockDelete(action.targetBlockId);
            showToast('블록이 삭제되었습니다', 'success');
          }
          break;

        case 'replace':
          if (action.blocks) {
            updateBlocks(action.blocks);
            showToast(`${action.blocks.length}개 블록으로 교체되었습니다`, 'success');
          }
          break;

        case 'move':
          if (action.targetBlockId && typeof action.position === 'number') {
            const blockIndex = blockManagement.blocksRef.current!.findIndex(b => b.id === action.targetBlockId);
            if (blockIndex !== -1) {
              const newBlocks = [...blockManagement.blocksRef.current!];
              const [block] = newBlocks.splice(blockIndex, 1);
              newBlocks.splice(action.position, 0, block);
              updateBlocks(newBlocks);
              showToast('블록이 이동되었습니다', 'success');
            }
          }
          break;

        case 'duplicate':
          if (action.targetBlockId) {
            handleDuplicate(action.targetBlockId);
          }
          break;

        default:
          console.warn('Unknown action:', action);
      }
    });
  }, [blockManagement, updateBlocks, handleBlockUpdate, handleBlockDelete, handleDuplicate, showToast]);

  // Handle preview
  const handlePreview = useCallback(() => {
    // Create preview content
    const previewContent = {
      title: documentTitle,
      blocks: blocks,
    };
    
    // Store in session storage for preview page
    sessionStorage.setItem('previewContent', JSON.stringify(previewContent));
    
    // Open preview in new tab with correct route
    window.open('/admin/preview', '_blank');
  }, [documentTitle, blocks]);

  // Removed automatic tab switching - let user control the tab selection

  // Handle navigation with unsaved changes warning
  const handleNavigation = useCallback(() => {
    if (isDirty) {
      const confirmLeave = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirmLeave) return;
    }
    navigate('/admin');
  }, [isDirty, navigate]);

  // ✨ Handle block type change - from blockManagement hook
  const handleBlockTypeChange = blockManagement.handleBlockTypeChange;

  // Keyboard shortcuts
  useKeyboardShortcuts({
    handleSave,
    handleUndo,
    handleRedo,
    isBlockInserterOpen,
    setIsBlockInserterOpen,
    selectedBlockId,
    setSelectedBlockId,
    blocks,
    handleBlockDelete,
    handleDuplicate,
    handleBlockCopy,
    handleBlockPaste,
    handleBlockTypeChange,
    showToast,
  });

  // Handle template application
  const handleApplyTemplate = useCallback(
    (templateBlocks: Block[]) => {
      // Replace all current blocks with template blocks, preserving document title
      updateBlocks(templateBlocks);
      setSelectedBlockId(null);
      showToast('템플릿이 적용되었습니다!', 'success');
    },
    [updateBlocks, showToast]
  );

  // ✨ blocksRef is now managed by blockManagement hook

  // Create stable callback factories that don't depend on blocks state
  // This prevents re-renders when blocks change
  const createOnChange = useCallback((blockId: string) =>
    (content: any, attributes?: any) => handleBlockUpdate(blockId, content, attributes),
    [handleBlockUpdate]
  );

  const createOnDelete = useCallback((blockId: string) =>
    () => handleBlockDelete(blockId),
    [handleBlockDelete]
  );

  const createOnDuplicate = useCallback((blockId: string) =>
    () => handleDuplicate(blockId),
    [handleDuplicate]
  );

  const createOnMoveUp = useCallback((blockId: string) =>
    () => handleMoveUp(blockId),
    [handleMoveUp]
  );

  const createOnMoveDown = useCallback((blockId: string) =>
    () => handleMoveDown(blockId),
    [handleMoveDown]
  );

  const createOnAddBlock = useCallback((blockId: string) =>
    (position: 'before' | 'after', type?: string) => handleAddBlock(blockId, position, type),
    [handleAddBlock]
  );

  const createOnSelect = useCallback((blockId: string) =>
    () => setSelectedBlockId(blockId),
    []
  );

  const createOnDragStart = useCallback((blockId: string) =>
    (e: React.DragEvent) => handleDragStart(blockId, e),
    [handleDragStart]
  );

  const createOnDragOver = useCallback((blockId: string) =>
    (e: React.DragEvent) => handleDragOver(blockId, e),
    [handleDragOver]
  );

  const createOnDrop = useCallback((blockId: string) =>
    (e: React.DragEvent) => {
      const draggedId = e.dataTransfer.getData('application/block-id') || e.dataTransfer.getData('text/plain');
      handleDrop(blockId, draggedId, e);
    },
    [handleDrop]
  );

  const createOnDragEnd = useCallback((blockId: string) =>
    (e: React.DragEvent) => handleDragEnd(blockId, e),
    [handleDragEnd]
  );

  const createOnCopy = useCallback((blockId: string) =>
    () => handleBlockCopy(blockId),
    [handleBlockCopy]
  );

  const createOnPaste = useCallback((blockId: string) =>
    () => handleBlockPaste(blockId),
    [handleBlockPaste]
  );

  const createOnChangeType = useCallback((blockId: string) =>
    (newType: string) => handleBlockTypeChange(blockId, newType),
    [handleBlockTypeChange]
  );

  const createOnUpdate = useCallback((blockId: string) =>
    (updates: any) => {
      const newBlocks = blockManagement.blocksRef.current!.map(b =>
        b.id === blockId ? { ...b, ...updates } : b
      );
      updateBlocks(newBlocks);
    },
    [blockManagement, updateBlocks]
  );

  const createOnInnerBlocksChange = useCallback((blockId: string) =>
    (newInnerBlocks: Block[]) => {
      const newBlocks = blockManagement.blocksRef.current!.map(b =>
        b.id === blockId ? { ...b, innerBlocks: newInnerBlocks } : b
      );
      updateBlocks(newBlocks);
    },
    [blockManagement, updateBlocks]
  );

  // Memoize callback map per block ID
  const callbacksMapRef = useRef<Map<string, any>>(new Map());

  const getBlockCallbacks = useCallback((blockId: string) => {
    if (!callbacksMapRef.current.has(blockId)) {
      callbacksMapRef.current.set(blockId, {
        onChange: createOnChange(blockId),
        onDelete: createOnDelete(blockId),
        onDuplicate: createOnDuplicate(blockId),
        onMoveUp: createOnMoveUp(blockId),
        onMoveDown: createOnMoveDown(blockId),
        onAddBlock: createOnAddBlock(blockId),
        onSelect: createOnSelect(blockId),
        onDragStart: createOnDragStart(blockId),
        onDragOver: createOnDragOver(blockId),
        onDrop: createOnDrop(blockId),
        onDragEnd: createOnDragEnd(blockId),
        onCopy: createOnCopy(blockId),
        onPaste: createOnPaste(blockId),
        onChangeType: createOnChangeType(blockId),
        onUpdate: createOnUpdate(blockId),
        onInnerBlocksChange: createOnInnerBlocksChange(blockId),
      });
    }
    return callbacksMapRef.current.get(blockId);
  }, [createOnChange, createOnDelete, createOnDuplicate, createOnMoveUp, createOnMoveDown, createOnAddBlock, createOnSelect, createOnDragStart, createOnDragOver, createOnDrop, createOnDragEnd, createOnCopy, createOnPaste, createOnChangeType, createOnUpdate, createOnInnerBlocksChange]);

  // Clean up stale callbacks when blocks are removed
  useEffect(() => {
    const currentBlockIds = new Set(blocks.map(b => b.id));
    const cachedBlockIds = Array.from(callbacksMapRef.current.keys());

    cachedBlockIds.forEach(id => {
      if (!currentBlockIds.has(id)) {
        callbacksMapRef.current.delete(id);
      }
    });
  }, [blocks]);

  // Render block component
  const renderBlock = (block: Block) => {
    const blockIndex = blocks.findIndex((b) => b.id === block.id);
    const callbacks = getBlockCallbacks(block.id);

    const commonProps = {
      id: block.id,
      content: typeof block.content === 'string' ? block.content : block.content?.text || '',
      ...callbacks,
      isSelected: selectedBlockId === block.id,
      attributes: block.attributes || {},
      innerBlocks: block.innerBlocks || [], // Pass innerBlocks for columns/column and other container blocks
      isDragging: draggedBlockId === block.id,
      canMoveUp: blockIndex > 0,
      canMoveDown: blockIndex < blocks.length - 1,
    };

    // Normalize block content to ensure it's a string
    const normalizedBlock = {
      ...block,
      content: typeof block.content === 'string'
        ? block.content
        : block.content?.text || '',
      innerBlocks: block.innerBlocks || [], // Preserve innerBlocks in normalized block
    };

    // Use DynamicRenderer for all blocks
    return (
      <DynamicRenderer
        key={block.id}
        block={normalizedBlock}
        {...commonProps}
      />
    );
  };

  return (
    <div className="h-full w-full bg-transparent flex flex-col">
      {/* Top Toolbar - only show when not embedded (hideHeader=false) */}
      {!hideHeader && (
        <div className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center px-4 z-50">
          <div className="flex items-center gap-2">
            {/* Block List Toggle Button */}
            <button
              onClick={() => setIsBlockListOpen(!isBlockListOpen)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              title="Toggle block list"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              <span>{isBlockListOpen ? 'Hide' : 'Show'} List</span>
            </button>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* ⭐ AI Chat Toggle Button */}
            <button
              onClick={() => setIsAIChatOpen(!isAIChatOpen)}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isAIChatOpen
                  ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              title="AI 어시스턴트"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              <span>AI Chat</span>
            </button>

            <span className="text-sm text-gray-500">
              {blocks.length} blocks
            </span>
          </div>
        </div>
      )}

      {/* Main Layout */}
      <div className="flex-1 flex relative" style={{ marginTop: hideHeader ? '0' : '56px' }}>
        {/* Block List Sidebar */}
        {!hideHeader && isBlockListOpen && (
          <div className="fixed left-0 top-14 bottom-0 w-64 bg-white border-r border-gray-200 overflow-y-auto z-40 shadow-lg">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">
                Block List
              </h3>
              {blocks.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No blocks yet</p>
              ) : (
                <div className="space-y-1">
                  {blocks.map((block, index) => {
                    const blockType = block.type.replace('o4o/', '');
                    const blockContent = typeof block.content === 'string'
                      ? block.content
                      : block.content?.text || '';
                    const preview = blockContent.replace(/<[^>]*>/g, '').substring(0, 50);

                    return (
                      <button
                        key={block.id}
                        onClick={() => {
                          setSelectedBlockId(block.id);
                          // Scroll to block
                          const blockElement = document.querySelector(`[data-block-id="${block.id}"]`);
                          if (blockElement) {
                            blockElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }}
                        className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                          selectedBlockId === block.id
                            ? 'bg-blue-50 border border-blue-200'
                            : 'hover:bg-gray-100 border border-transparent'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-mono text-gray-400 mt-0.5">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-gray-700 capitalize">
                              {blockType}
                            </div>
                            {preview && (
                              <div className="text-xs text-gray-500 truncate mt-0.5">
                                {preview}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Block Inserter */}
        <GutenbergBlockInserter
          isOpen={isBlockInserterOpen}
          onClose={() => setIsBlockInserterOpen(false)}
          onSelect={handleInsertBlock}
        />

        {/* Editor Canvas */}
        <div
          className={`flex-1 transition-all duration-300 overflow-y-auto bg-gray-100 ${
            !hideHeader && isBlockListOpen ? 'ml-64' : 'ml-0'
          } ${
            isBlockInserterOpen ? 'ml-80' : ''
          } ${
            sidebarOpen ? 'mr-80' : 'mr-0'
          }`}
          style={{ paddingTop: '10px', maxHeight: hideHeader ? 'calc(100vh - 10px)' : 'calc(100vh - 70px)' }}
        >
          <div
            className="mx-auto p-8 bg-white shadow-md transition-all duration-300 ease-in-out"
            style={{
              width: `${currentConfig.width}px`,
              maxWidth: '100%',
            }}
          >
            {/* Title Section - WordPress-style two-tier design */}
            <div className="mb-10">
              {/* Title Preview Display */}
              <div className="mb-6">
                <h1 className="text-4xl font-light text-gray-800 leading-tight">
                  {documentTitle || ''}
                </h1>
                <div className="mt-2 h-px bg-gradient-to-r from-gray-200 to-transparent"></div>
              </div>
              
              {/* Title Input Field */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Document Title
                </label>
                <input
                  type="text"
                  value={documentTitle}
                  onChange={(e) => {
                    setDocumentTitle(e.target.value);
                    setIsDirty(true);
                    // Notify parent component of title change
                    if (onTitleChange) {
                      onTitleChange(e.target.value);
                    }
                  }}
                  placeholder="Enter your title here..."
                  className="w-full px-0 py-1 text-xl font-medium text-gray-900 border-0 border-b-2 border-transparent hover:border-gray-200 focus:border-blue-500 outline-none transition-colors bg-transparent"
                  autoComplete="off"
                />
                <p className="mt-2 text-xs text-gray-500">
                  This title will appear at the top of your page
                </p>
              </div>
            </div>

            {/* Blocks */}
            {isCodeView ? (
              <div>
                <textarea
                  value={JSON.stringify(blocks, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setBlocks(parsed);
                    } catch (error) {
                      // Error log removed
                    }
                  }}
                  className="w-full min-h-[500px] font-mono text-sm p-4 border border-gray-300 rounded"
                />
              </div>
            ) : (
              <div className="blocks-container">
                {/* Render all blocks */}
                {blocks.map((block, index) => (
                  <BlockWrapper
                    key={block.id}
                    blockId={block.id}
                    blockType={block.type}
                    isSelected={selectedBlockId === block.id}
                    onSelect={setSelectedBlockId}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onDuplicate={() => handleDuplicate(block.id)}
                    onDelete={() => handleBlockDelete(block.id)}
                    onMoveUp={() => handleMoveUp(block.id)}
                    onMoveDown={() => handleMoveDown(block.id)}
                    canMoveUp={index > 0}
                    canMoveDown={index < blocks.length - 1}
                  >
                    {renderBlock(block)}
                  </BlockWrapper>
                ))}
              </div>
            )}

            {/* Add block button - shown when blocks exist */}
            {!isCodeView && blocks.length > 0 && (
              <div className="mt-6 mb-4 text-center">
                <button
                  onClick={() => setIsBlockInserterOpen(true)}
                  className="px-6 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 text-gray-600 hover:text-blue-600 text-sm font-medium transition-colors"
                >
                  + Add Block
                </button>
              </div>
            )}
          </div>
        </div>

        {/* GutenbergSidebar - Right Sidebar */}
        {sidebarOpen && (
          <div className={cn(
            "fixed right-0 bg-white border-l overflow-y-auto transition-all duration-300 z-30",
            "shadow-lg"
          )}
               style={{
                 top: hideHeader ? '55px' : '60px',
                 height: hideHeader ? 'calc(100vh - 55px)' : 'calc(100vh - 60px)',
                 width: '280px'
               }}>
            <GutenbergSidebar
              activeTab={activeTab}
              postSettings={postSettings}
              blockSettings={selectedBlockId ? {
                id: selectedBlockId,
                type: blocks.find(b => b.id === selectedBlockId)?.type || '',
                attributes: blocks.find(b => b.id === selectedBlockId)?.attributes || {}
              } : undefined}
              mode={mode}
              onPostSettingsChange={(settings) => {
                setPostSettings(prev => ({ ...prev, ...settings }));
                setIsDirty(true);
                onPostSettingsChange?.(settings);
              }}
              onBlockSettingsChange={(settings) => {
                if (selectedBlockId && settings.attributes) {
                  const newBlocks = blocks.map(block => {
                    if (block.id === selectedBlockId) {
                      return {
                        ...block,
                        attributes: { ...block.attributes, ...settings.attributes }
                      };
                    }
                    return block;
                  });
                  updateBlocks(newBlocks);
                  setIsDirty(true);
                }
              }}
              onTabChange={(tab) => setActiveTab(tab)}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        )}
      </div>

      {/* Toast Notifications */}
      {toast && <Toast toast={toast} />}

      {/* Design Library Modal */}
      <DesignLibraryModalImproved
        isOpen={isDesignLibraryOpen}
        onClose={() => setIsDesignLibraryOpen(false)}
        onApplyTemplate={handleApplyTemplate}
      />

      {/* AI Generator Modal */}
      <SimpleAIModal
        isOpen={isAIGeneratorOpen}
        onClose={() => setIsAIGeneratorOpen(false)}
        onGenerate={(generatedBlocks) => {
          // Replace existing blocks with AI generated blocks
          // No conversion needed - use blocks as-is from SimpleAIGenerator
          updateBlocks(generatedBlocks);
          showToast('AI 페이지가 생성되었습니다!', 'success');
        }}
      />

      {/* ⭐ AI Chat Panel - 대화형 편집기 */}
      {isAIChatOpen && (
        <div className="fixed right-0 top-14 bottom-0 w-96 bg-white border-l shadow-xl z-50">
          <AIChatPanel
            editorContext={editorContext}
            onExecuteActions={handleExecuteAIActions}
            config={{ provider: 'gemini', model: 'gemini-2.5-flash' }}
          />
        </div>
      )}

      {/* Slash Command Menu */}
      {slashCommands.isSlashMenuOpen && (
        <SlashCommandMenu
          query={slashCommands.slashQuery}
          onSelectBlock={handleSlashCommandSelect}
          onClose={slashCommands.closeSlashMenu}
          position={slashCommands.slashMenuPosition}
          recentBlocks={slashCommands.recentBlocks}
        />
      )}
    </div>
  );
};

export default GutenbergBlockEditor;
