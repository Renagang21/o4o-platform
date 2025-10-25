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
import DefaultBlockAppender from './DefaultBlockAppender';
// Toast components
import { useToast } from './hooks/useToast';
import { Toast } from './components/Toast';
// AI Chat Panel
import { AIChatPanel } from './AIChatPanel';
import { EditorContext, AIAction } from '@/services/ai/ConversationalAI';
// Clipboard utilities
import { copyBlockToClipboard, pasteBlockFromClipboard } from './utils/clipboard-utils';
// Drag and drop hook
import { useDragAndDrop } from './hooks/useDragAndDrop';
// Keyboard shortcuts hook
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
  // Initialize with empty state or BlockAppender
  const [blocks, setBlocks] = useState<Block[]>(() => {
    if (initialBlocks.length > 0) {
      // When loading existing content, add BlockAppender at the end
      return [
        ...initialBlocks,
        {
          id: `block-appender-${Date.now()}`,
          type: 'o4o/block-appender',
          content: { text: '' },
          attributes: {},
        }
      ];
    }
    // Start with one BlockAppender for empty editor
    return [
      {
        id: `block-appender-${Date.now()}`,
        type: 'o4o/block-appender',
        content: { text: '' },
        attributes: {},
      }
    ];
  });
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState(propDocumentTitle);
  const [isBlockInserterOpen, setIsBlockInserterOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBlockListOpen, setIsBlockListOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([createHistoryEntry(blocks)]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isDirty, setIsDirty] = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);
  
  // Initialize block registry
  useEffect(() => {
    registerAllBlocks();
  }, []);

  // Session restoration on mount
  useEffect(() => {
    if (disableSessionRestore || sessionRestored || initialBlocks.length > 0) return;

    const storedSession = loadEditorSession();
    if (storedSession && storedSession.history.length > 0) {
      // Filter out empty blocks from restored session, but preserve BlockAppender
      const restoredBlocks = storedSession.history[storedSession.historyIndex].blocks;
      const nonEmptyBlocks = restoredBlocks.filter(block => {
        // Always keep BlockAppender blocks (they're meant to be empty)
        if (block.type === 'o4o/block-appender') {
          return true;
        }

        // Filter other blocks based on content
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
        // Check if BlockAppender already exists
        const hasBlockAppender = nonEmptyBlocks.some(b => b.type === 'o4o/block-appender');

        // Add BlockAppender at the end if not present
        const blocksWithAppender = hasBlockAppender
          ? nonEmptyBlocks
          : [
              ...nonEmptyBlocks,
              {
                id: `block-appender-${Date.now()}`,
                type: 'o4o/block-appender',
                content: { text: '' },
                attributes: {},
              }
            ];

        setHistory(storedSession.history);
        setHistoryIndex(storedSession.historyIndex);
        setBlocks(blocksWithAppender);
        setDocumentTitle(storedSession.documentTitle);
        setSessionRestored(true);
        showToast('편집 내역이 복원되었습니다', 'info');
      }
    }
  }, [disableSessionRestore, sessionRestored, initialBlocks.length]);

  // Sync blocks with initialBlocks prop changes
  useEffect(() => {
    if (initialBlocks && initialBlocks.length > 0 && !sessionRestored) {
      // Add BlockAppender at the end when syncing
      const blocksWithAppender = [
        ...initialBlocks,
        {
          id: `block-appender-${Date.now()}`,
          type: 'o4o/block-appender',
          content: { text: '' },
          attributes: {},
        }
      ];
      setBlocks(blocksWithAppender);
      setHistory([createHistoryEntry(blocksWithAppender)]);
      setHistoryIndex(0);
      setIsDirty(false);
    }
  }, [initialBlocks, sessionRestored]);
  
  // Sync title with prop changes
  useEffect(() => {
    setDocumentTitle(propDocumentTitle);
  }, [propDocumentTitle]);

  // Save session on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveEditorSession(history, historyIndex, documentTitle);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Final save on unmount
      saveEditorSession(history, historyIndex, documentTitle);
    };
  }, [history, historyIndex, documentTitle]);
  
  // Sync post settings with prop changes
  useEffect(() => {
    if (propPostSettings) {
      setPostSettings(prev => ({ ...prev, ...propPostSettings }));
    }
  }, [propPostSettings]);
  const [isCodeView, setIsCodeView] = useState(false);
  const [copiedBlock, setCopiedBlock] = useState<Block | null>(null);
  const { toast, showToast } = useToast();
  const [isDesignLibraryOpen, setIsDesignLibraryOpen] = useState(false);
  const [isAIGeneratorOpen, setIsAIGeneratorOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  // Slash command menu states
  const [isSlashMenuOpen, setIsSlashMenuOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });
  const [slashTriggerBlockId, setSlashTriggerBlockId] = useState<string | null>(null);
  const [recentBlocks, setRecentBlocks] = useState<string[]>([]);
  const slashMenuRef = useRef<{ query: string; blockId: string | null }>({ query: '', blockId: null });
  
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
    allBlocks: blocks.filter(b => b.type !== 'o4o/block-appender'), // BlockAppender 제외
    documentTitle,
    blockCount: blocks.filter(b => b.type !== 'o4o/block-appender').length,
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

  // Update blocks and history
  const updateBlocks = useCallback(
    (newBlocks: Block[], skipOnChange = false) => {
      setBlocks(newBlocks);
      setIsDirty(true);

      // Add to history with optimization
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(createHistoryEntry(newBlocks));

      // Trim history to max size
      const trimmedHistory = trimHistory(newHistory);
      setHistory(trimmedHistory);
      setHistoryIndex(trimmedHistory.length - 1);

      // Save to session storage
      saveEditorSession(trimmedHistory, trimmedHistory.length - 1, documentTitle);

      // Notify parent (unless skipped for initialization)
      // Filter out transient blocks (e.g., BlockAppender) before notifying parent
      if (!skipOnChange) {
        const blocksToNotify = newBlocks.filter(block => block.type !== 'o4o/block-appender');
        onChange?.(blocksToNotify);
      }
    },
    [history, historyIndex, documentTitle, onChange]
  );

  // Drag and drop hook - must be after updateBlocks is defined
  const { draggedBlockId, dragOverBlockId, handleDragStart, handleDragOver, handleDrop, handleDragEnd } = useDragAndDrop({ blocks, updateBlocks });

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setBlocks(history[newIndex].blocks);

      // Update session storage
      saveEditorSession(history, newIndex, documentTitle);
    }
  }, [history, historyIndex, documentTitle]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setBlocks(history[newIndex].blocks);

      // Update session storage
      saveEditorSession(history, newIndex, documentTitle);
    }
  }, [history, historyIndex, documentTitle]);

  // Handle block update
  const handleBlockUpdate = useCallback(
    (blockId: string, content: any, attributes?: any) => {
      const newBlocks = blocks.map((block) =>
        block.id === blockId
          ? {
              ...block,
              content: typeof content === 'string' ? { text: content } : content,
              attributes: attributes || block.attributes,
            }
          : block
      );
      updateBlocks(newBlocks);
    },
    [blocks, updateBlocks]
  );

  // Handle block deletion
  const handleBlockDelete = useCallback(
    (blockId: string) => {
      const newBlocks = blocks.filter((block) => block.id !== blockId);
      // Allow completely empty editor - don't auto-create blocks
      updateBlocks(newBlocks);
      setSelectedBlockId(null);
    },
    [blocks, updateBlocks]
  );

  // Handle block copy with HTML + JSON clipboard support
  const handleBlockCopy = useCallback(
    async (blockId: string) => {
      const block = blocks.find((b) => b.id === blockId);
      if (!block) return;

      await copyBlockToClipboard(block, setCopiedBlock);
    },
    [blocks]
  );

  // Handle block paste with clipboard reading support
  const handleBlockPaste = useCallback(
    async (afterBlockId?: string) => {
      const newBlock = await pasteBlockFromClipboard(copiedBlock);

      // Insert the block
      if (newBlock) {
        if (afterBlockId) {
          const index = blocks.findIndex((b) => b.id === afterBlockId);
          const newBlocks = [...blocks];
          newBlocks.splice(index + 1, 0, newBlock);
          updateBlocks(newBlocks);
        } else {
          // 마지막에 추가
          updateBlocks([...blocks, newBlock]);
        }

        setSelectedBlockId(newBlock.id);
        setIsDirty(true);
      }
    },
    [blocks, copiedBlock, updateBlocks]
  );

  // Handle block insertion
  const handleInsertBlock = useCallback(
    (blockType: string) => {
      const newBlock: Block = {
        id: `block-${Date.now()}`,
        type: blockType,
        content: blockType.includes('heading') ? { text: '', level: 2 } : { text: '' },
        attributes: {},
      };

      // Add Block 버튼은 항상 맨 끝(BlockAppender 앞)에 삽입
      const blockAppenderIndex = blocks.findIndex((b) => b.type === 'o4o/block-appender');
      const insertIndex = blockAppenderIndex !== -1 ? blockAppenderIndex : blocks.length;

      const newBlocks = [...blocks];
      newBlocks.splice(insertIndex, 0, newBlock);
      updateBlocks(newBlocks);
      setSelectedBlockId(newBlock.id);
      setIsBlockInserterOpen(false);
    },
    [blocks, updateBlocks]
  );

  // Handle add block at position
  const handleAddBlock = useCallback(
    (blockId: string, position: 'before' | 'after', blockType = 'o4o/paragraph', initialContent?: any) => {
      const index = blocks.findIndex((b) => b.id === blockId);
      const newBlock: Block = {
        id: `block-${Date.now()}`,
        type: blockType,
        content: initialContent || { text: '' },
        attributes: {},
      };

      const newBlocks = [...blocks];
      const insertIndex = position === 'after' ? index + 1 : index;
      newBlocks.splice(insertIndex, 0, newBlock);
      updateBlocks(newBlocks);
      setSelectedBlockId(newBlock.id);

      // Auto-scroll to new block after DOM update
      setTimeout(() => {
        const newBlockElement = document.querySelector(`[data-block-id="${newBlock.id}"]`);
        if (newBlockElement) {
          newBlockElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center', // Center the block in viewport
          });
        }
      }, 100);
    },
    [blocks, updateBlocks]
  );

  // Handle slash command block selection
  const handleSlashCommandSelect = useCallback(
    (blockType: string) => {
      const triggerBlockId = slashTriggerBlockId || selectedBlockId;

      // Handle regular block slash command
      if (!triggerBlockId) return;

      // Special handling for BlockAppender
      if (triggerBlockId.startsWith('block-appender')) {
        // Find BlockAppender index
        const blockAppenderIndex = blocks.findIndex(b => b.id === triggerBlockId);

        // Create new block to replace BlockAppender
        const newBlock: Block = {
          id: `block-${Date.now()}`,
          type: blockType,
          content: blockType.includes('heading') ? { text: '', level: 2 } : { text: '' },
          attributes: {},
        };

        // Create new BlockAppender to add after the new block
        const newBlockAppender: Block = {
          id: `block-appender-${Date.now()}`,
          type: 'o4o/block-appender',
          content: { text: '' },
          attributes: {},
        };

        // Replace BlockAppender with new block and add new BlockAppender after
        const newBlocks = [...blocks];
        if (blockAppenderIndex !== -1) {
          // Replace BlockAppender at its position with new block
          newBlocks[blockAppenderIndex] = newBlock;
          // Add new BlockAppender right after the new block
          newBlocks.splice(blockAppenderIndex + 1, 0, newBlockAppender);
        } else {
          // Fallback: if BlockAppender not found, add at end
          newBlocks.push(newBlock, newBlockAppender);
        }

        updateBlocks(newBlocks);
        setSelectedBlockId(newBlock.id);

        // Update recent blocks
        setRecentBlocks(prev => {
          const updated = [blockType, ...prev.filter(t => t !== blockType)];
          return updated.slice(0, 5);
        });

        // Close slash menu
        setIsSlashMenuOpen(false);
        setSlashQuery('');
        setSlashTriggerBlockId(null);

        // Focus new block
        setTimeout(() => {
          const newBlockElement = document.querySelector(`[data-block-id="${newBlock.id}"]`);
          if (newBlockElement) {
            const editableElement = newBlockElement.querySelector('[contenteditable="true"]') as HTMLElement;
            if (editableElement) {
              editableElement.focus();
            }
          }
        }, 50);

        return;
      }

      // Find the block that triggered slash command
      const blockIndex = blocks.findIndex(b => b.id === triggerBlockId);
      if (blockIndex === -1) return;

      const triggerBlock = blocks[blockIndex];

      // Remove "/" and query text from the trigger block
      let cleanedText = '';
      if (triggerBlock.content && typeof triggerBlock.content === 'object' && 'text' in triggerBlock.content) {
        const text = triggerBlock.content.text as string || '';
        // Find and remove the "/" and everything after it
        const slashIndex = text.lastIndexOf('/');
        if (slashIndex !== -1) {
          cleanedText = text.substring(0, slashIndex);
        } else {
          cleanedText = text;
        }
      }

      // Create new block
      const newBlock: Block = {
        id: `block-${Date.now()}`,
        type: blockType,
        content: blockType.includes('heading') ? { text: '', level: 2 } : { text: '' },
        attributes: {},
      };

      const newBlocks = [...blocks];

      // If trigger block is empty (only had "/"), replace it
      if (!cleanedText.trim()) {
        newBlocks[blockIndex] = newBlock;
      } else {
        // Update trigger block and insert new block after
        newBlocks[blockIndex] = {
          ...triggerBlock,
          content: { ...triggerBlock.content, text: cleanedText }
        };
        newBlocks.splice(blockIndex + 1, 0, newBlock);
      }

      updateBlocks(newBlocks);
      setSelectedBlockId(newBlock.id);

      // Update recent blocks
      setRecentBlocks(prev => {
        const updated = [blockType, ...prev.filter(t => t !== blockType)];
        return updated.slice(0, 5); // Keep only 5 most recent
      });

      // Close slash menu
      setIsSlashMenuOpen(false);
      setSlashQuery('');
      setSlashTriggerBlockId(null);

      // Focus new block
      setTimeout(() => {
        const newBlockElement = document.querySelector(`[data-block-id="${newBlock.id}"]`);
        if (newBlockElement) {
          const editableElement = newBlockElement.querySelector('[contenteditable="true"]') as HTMLElement;
          if (editableElement) {
            editableElement.focus();
          }
        }
      }, 50);
    },
    [blocks, selectedBlockId, slashTriggerBlockId, updateBlocks]
  );

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

            setSlashMenuPosition({
              top: rect.bottom + window.scrollY + 4,
              left: rect.left + window.scrollX
            });
          }

          setSlashQuery(query);
          setSlashTriggerBlockId(blockId);
          setIsSlashMenuOpen(true);
          slashMenuRef.current = { query, blockId };
          return;
        }
      }

      // Close menu if "/" was removed
      if (isSlashMenuOpen && !text.includes('/')) {
        setIsSlashMenuOpen(false);
        setSlashQuery('');
        setSlashTriggerBlockId(null);
      }
    };

    document.addEventListener('input', handleInput);
    return () => document.removeEventListener('input', handleInput);
  }, [isSlashMenuOpen]);

  // Handle save
  const handleSave = useCallback(async () => {
    try {
      // Filter out transient blocks (e.g., BlockAppender)
      const blocksToSave = blocks.filter(block => block.type !== 'o4o/block-appender');

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
        content: blocksToSave,
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
      // Filter out transient blocks (e.g., BlockAppender)
      const blocksToSave = blocks.filter(block => block.type !== 'o4o/block-appender');

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
        content: blocksToSave,
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

  // Handle block duplication
  const handleDuplicate = useCallback((blockId: string) => {
    const blockIndex = blocks.findIndex((b) => b.id === blockId);
    if (blockIndex === -1) return;

    const blockToDuplicate = blocks[blockIndex];
    const duplicatedBlock: Block = {
      ...blockToDuplicate,
      id: `block-${Date.now()}`,
    };

    const newBlocks = [...blocks];
    newBlocks.splice(blockIndex + 1, 0, duplicatedBlock);
    updateBlocks(newBlocks);
    setSelectedBlockId(duplicatedBlock.id);
  }, [blocks, updateBlocks]);

  // Handle block move up
  const handleMoveUp = useCallback((blockId: string) => {
    const blockIndex = blocks.findIndex((b) => b.id === blockId);
    if (blockIndex <= 0) return;

    const newBlocks = [...blocks];
    const [block] = newBlocks.splice(blockIndex, 1);
    newBlocks.splice(blockIndex - 1, 0, block);
    updateBlocks(newBlocks);

    // Re-trigger selection to restore focus after DOM update
    setSelectedBlockId(null);
    setTimeout(() => {
      setSelectedBlockId(blockId);
    }, 0);
  }, [blocks, updateBlocks]);

  // Handle block move down
  const handleMoveDown = useCallback((blockId: string) => {
    const blockIndex = blocks.findIndex((b) => b.id === blockId);
    if (blockIndex === -1 || blockIndex >= blocks.length - 1) return;

    const newBlocks = [...blocks];
    const [block] = newBlocks.splice(blockIndex, 1);
    newBlocks.splice(blockIndex + 1, 0, block);
    updateBlocks(newBlocks);

    // Re-trigger selection to restore focus after DOM update
    setSelectedBlockId(null);
    setTimeout(() => {
      setSelectedBlockId(blockId);
    }, 0);
  }, [blocks, updateBlocks]);

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

            const newBlocks = [...blocks];
            if (action.position === 'before' && action.targetBlockId) {
              const idx = blocks.findIndex(b => b.id === action.targetBlockId);
              newBlocks.splice(idx, 0, newBlock);
            } else if (action.position === 'after' && action.targetBlockId) {
              const idx = blocks.findIndex(b => b.id === action.targetBlockId);
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
            const blockIndex = blocks.findIndex(b => b.id === action.targetBlockId);
            if (blockIndex !== -1) {
              const newBlocks = [...blocks];
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
  }, [blocks, updateBlocks, handleBlockUpdate, handleBlockDelete, handleDuplicate, showToast]);

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

  // Handle block type change
  const handleBlockTypeChange = useCallback(
    (blockId: string, newType: string) => {
      const newBlocks = blocks.map((block) => {
        if (block.id === blockId) {
          // Convert heading types
          if (newType.startsWith('o4o/heading-')) {
            const level = parseInt(newType.replace('o4o/heading-h', ''));
            return {
              ...block,
              type: 'o4o/heading',
              content: { text: typeof block.content === 'string' ? block.content : block.content?.text || '', level },
              attributes: block.attributes || {},
            };
          }
          // Convert to paragraph
          if (newType === 'o4o/paragraph') {
            return {
              ...block,
              type: 'o4o/paragraph',
              content: { text: typeof block.content === 'string' ? block.content : block.content?.text || '' },
              attributes: block.attributes || {},
            };
          }
        }
        return block;
      });
      updateBlocks(newBlocks);
    },
    [blocks, updateBlocks]
  );

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

  // Keep a stable ref to blocks for callback closures
  const blocksRef = useRef(blocks);
  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

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
      const newBlocks = blocksRef.current.map(b =>
        b.id === blockId ? { ...b, ...updates } : b
      );
      updateBlocks(newBlocks);
    },
    [updateBlocks]
  );

  const createOnInnerBlocksChange = useCallback((blockId: string) =>
    (newInnerBlocks: Block[]) => {
      const newBlocks = blocksRef.current.map(b =>
        b.id === blockId ? { ...b, innerBlocks: newInnerBlocks } : b
      );
      updateBlocks(newBlocks);
    },
    [updateBlocks]
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
              {blocks.filter(b => b.type !== 'o4o/block-appender').length} blocks
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
      {isSlashMenuOpen && (
        <SlashCommandMenu
          query={slashQuery}
          onSelectBlock={handleSlashCommandSelect}
          onClose={() => {
            setIsSlashMenuOpen(false);
            setSlashQuery('');
            setSlashTriggerBlockId(null);
          }}
          position={slashMenuPosition}
          recentBlocks={recentBlocks}
        />
      )}
    </div>
  );
};

export default GutenbergBlockEditor;
