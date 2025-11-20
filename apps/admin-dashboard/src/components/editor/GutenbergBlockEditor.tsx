/**
 * GutenbergBlockEditor Component
 * Enhanced WordPress Gutenberg-like editor with 3-column layout
 *
 * State Management:
 * - Block state: blocks, selectedBlockId, copiedBlock
 * - UI state: 9 modal/panel toggles (isBlockInserterOpen, isFullscreen, etc.)
 * - Document state: documentTitle, postSettings, isDirty
 * - Session state: sessionRestored
 *
 * Optimization patterns:
 * - Custom hooks: useBlockManagement, useBlockHistory, useDragAndDrop
 * - useMemo: editorContext to prevent unnecessary re-renders
 * - useEffect: Synchronizes selectedBlock with selectedBlockId
 *
 * Why many useState hooks?
 * - Most are independent UI toggles (safe to separate)
 * - Consolidating would require complex reducer (higher risk)
 * - Current structure is maintainable and debuggable
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
import { BlockListItem } from './BlockListItem';
// Toast components
import { useToast } from './hooks/useToast';
import { Toast } from './components/Toast';
// AI Chat Panel
import { AIChatPanel } from './AIChatPanel';
import { EditorContext, AIAction } from '@/services/ai/ConversationalAI';
// Phase 1-C: New Block Request Panel
import { NewBlockRequestPanel } from './NewBlockRequestPanel';
import { NewBlockRequest } from '@/services/ai/types';
// Phase 2-C: Block-level AI editing
import { BlockAIModal } from '../ai/BlockAIModal';
// Phase 2-C Remaining: Section-level AI reconstruction
import { SectionAIModal } from '../ai/SectionAIModal';
// Phase 2-C Remaining: Page-level AI improvement
import { PageImproveModal } from '../ai/PageImproveModal';
// Phase 2-A: Runtime Block Generation
import { blockCodeGenerator, BlockGenerationError, BlockGenerationErrorType } from '@/services/ai/BlockCodeGenerator';
import { compileComponent } from '@/blocks/runtime/runtime-code-loader';
import { runtimeBlockRegistry } from '@/blocks/runtime/runtime-block-registry';
import { BlockDefinition } from '@/blocks/registry/types';
// Custom hooks
import { useBlockManagement } from './hooks/useBlockManagement';
import { useBlockHistory } from './hooks/useBlockHistory';
import { useSlashCommands } from './hooks/useSlashCommands';
import { useDragAndDrop } from './hooks/useDragAndDrop';
import { useKeyboardShortcuts } from './hooks/keyboard';
import { CheckCircle, XCircle, Info, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { devLog, devError } from '@/utils/logger';
import { useCustomizerSettings } from '@/hooks/useCustomizerSettings';
import { useThemeTokens } from '@/hooks/useThemeTokens';
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
  const [isDirty, setIsDirty] = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);

  // List View state - use external control, default to false if not provided
  const showListView = externalShowListView ?? false;
  const toggleListView = externalOnToggleListView ?? (() => {});

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

  // Phase 1-C: New Block Request Panel state
  const [newBlocksRequest, setNewBlocksRequest] = useState<NewBlockRequest[]>([]);

  // Phase 2-C: Block AI editing state
  const [isBlockAIModalOpen, setIsBlockAIModalOpen] = useState(false);
  const [blockToEdit, setBlockToEdit] = useState<Block | null>(null);
  const [initialAIAction, setInitialAIAction] = useState<'refine' | 'improve' | 'translate-ko'>('refine');

  // Phase 2-C Remaining: Section selection state
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set());
  const [isSectionAIModalOpen, setIsSectionAIModalOpen] = useState(false);

  // Phase 2-C Remaining: Page-level AI improvement state
  const [isPageImproveModalOpen, setIsPageImproveModalOpen] = useState(false);

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

  // Theme tokens hook
  const { tokens } = useThemeTokens();

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

  // Phase 2-A: Handle block generation from NewBlockRequest
  const handleGenerateBlock = useCallback(async (spec: NewBlockRequest) => {
    let usedFallback = false;
    let generatedCode;

    try {
      devLog('🚀 Generating block from spec:', spec);

      // Step 1: Generate code using AI
      try {
        generatedCode = await blockCodeGenerator.generate(spec);
      } catch (genError: any) {
        // Phase 1-D: Handle categorized errors
        if (genError instanceof BlockGenerationError) {
          // Show detailed error toast with type
          const errorMsg = `${genError.type}: ${genError.message}`;
          showToast(errorMsg, 'error');

          // If fallback code is attached, use it
          if (genError.fallbackCode) {
            usedFallback = true;
            generatedCode = genError.fallbackCode;
            // Show fallback warning
            setTimeout(() => {
              showToast('⚠️ Fallback 컴포넌트가 사용되었습니다', 'warning');
            }, 500);
          } else {
            throw genError;
          }
        } else {
          throw genError;
        }
      }

      // Step 2: Compile the component
      const compileResult = compileComponent(generatedCode.componentCode);

      if (!compileResult.success || !compileResult.component) {
        // Phase 1-D: Compilation error
        const compileError = new BlockGenerationError(
          BlockGenerationErrorType.COMPILATION_ERROR,
          'Failed to compile component',
          compileResult.error
        );
        showToast(`${compileError.type}: ${compileError.message}`, 'error');
        throw compileError;
      }

      // Step 3: Create block definition
      const blockDefinition: BlockDefinition = {
        name: generatedCode.blockName,
        title: spec.componentName,
        category: spec.spec.category || 'widgets',
        icon: 'Package', // AI-generated blocks use Package icon
        description: spec.reason,
        component: compileResult.component,
        attributes: (spec.spec.props || []).reduce((acc, prop) => {
          acc[prop] = { type: 'string', default: '' };
          return acc;
        }, {} as any),
      };

      // Step 4: Register in runtime registry
      runtimeBlockRegistry.registerRuntimeBlock(
        blockDefinition,
        compileResult.component,
        {
          componentName: spec.componentName,
          reason: spec.reason,
          props: spec.spec.props,
          style: spec.spec.style,
          category: spec.spec.category,
        }
      );

      // Step 5: Replace placeholder with new block (if placeholderId exists)
      if (spec.placeholderId) {
        const newBlocks = blocks.map(block => {
          // Find placeholder block by data attribute matching
          if (block.type === 'o4o/placeholder' &&
              block.attributes?.placeholderId === spec.placeholderId) {
            // Phase 1-D: Replace with new block and mark as AI-generated
            return {
              ...block,
              type: generatedCode.blockName,
              attributes: {
                // Phase 1-D: Add AI-generated metadata
                isAIGenerated: true,
                aiComponentName: spec.componentName,
                aiGeneratedAt: new Date().toISOString(),
                aiReason: spec.reason,
                isFallback: usedFallback,
              },
            };
          }
          return block;
        });
        updateBlocks(newBlocks);
      }

      // Step 6: Remove from newBlocksRequest list
      setNewBlocksRequest(prev =>
        prev.filter(req => req.placeholderId !== spec.placeholderId)
      );

      // Phase 1-D: Success message with fallback indicator
      if (usedFallback) {
        showToast(`${spec.componentName} 블록이 Fallback으로 생성되었습니다`, 'warning');
      } else {
        showToast(`${spec.componentName} 블록이 생성되고 등록되었습니다!`, 'success');
      }

      devLog('✅ Block generation complete:', generatedCode.blockName);
    } catch (error: any) {
      devError('❌ Block generation failed:', error);

      // Phase 1-D: Enhanced error message
      if (error instanceof BlockGenerationError) {
        showToast(`${error.type}: ${error.message}`, 'error');
      } else {
        showToast(error.message || '블록 생성 중 오류가 발생했습니다', 'error');
      }

      throw error;
    }
  }, [blocks, updateBlocks, showToast]);

  // ✨ Block movement handlers - from blockManagement hook
  const handleDuplicate = blockManagement.handleDuplicate;
  const handleMoveUp = blockManagement.handleMoveUp;
  const handleMoveDown = blockManagement.handleMoveDown;

  // Phase 2-C: Block AI editing handlers
  const handleOpenBlockAIModal = useCallback((blockId: string, actionType: 'edit' | 'improve' | 'translate' = 'edit') => {
    const block = blocks.find(b => b.id === blockId);
    if (block) {
      setBlockToEdit(block);

      // Map action type to initial AI action
      const actionMap: Record<'edit' | 'improve' | 'translate', 'refine' | 'improve' | 'translate-ko'> = {
        'edit': 'refine',
        'improve': 'improve',
        'translate': 'translate-ko',
      };
      setInitialAIAction(actionMap[actionType]);

      setIsBlockAIModalOpen(true);
    }
  }, [blocks]);

  const handleApplyRefinedBlock = useCallback((refinedBlock: Block) => {
    const newBlocks = blocks.map(b =>
      b.id === refinedBlock.id ? refinedBlock : b
    );
    updateBlocks(newBlocks);
    showToast('블록이 AI로 개선되었습니다!', 'success');
  }, [blocks, updateBlocks, showToast]);

  // Phase 2-C Remaining: Section selection handlers
  const handleToggleBlockSelection = useCallback((blockId: string) => {
    setSelectedBlockIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(blockId)) {
        newSet.delete(blockId);
      } else {
        newSet.add(blockId);
      }
      return newSet;
    });
  }, []);

  // Check if selected blocks are continuous
  const areSelectedBlocksContinuous = useCallback((): boolean => {
    if (selectedBlockIds.size < 2) return true;

    const selectedIndices = Array.from(selectedBlockIds)
      .map(id => blocks.findIndex(b => b.id === id))
      .filter(index => index !== -1)
      .sort((a, b) => a - b);

    // Check if indices are consecutive
    for (let i = 1; i < selectedIndices.length; i++) {
      if (selectedIndices[i] !== selectedIndices[i - 1] + 1) {
        return false;
      }
    }
    return true;
  }, [selectedBlockIds, blocks]);

  // Get selected blocks in order
  const getSelectedBlocksInOrder = useCallback((): Block[] => {
    return blocks.filter(b => selectedBlockIds.has(b.id));
  }, [blocks, selectedBlockIds]);

  // Handle section AI reconstruction
  const handleOpenSectionAIModal = useCallback(() => {
    // Validate: at least 2 blocks selected
    if (selectedBlockIds.size < 2) {
      showToast('섹션 재구성은 최소 2개 이상의 블록을 선택해야 합니다', 'error');
      return;
    }

    // Validate: blocks must be continuous
    if (!areSelectedBlocksContinuous()) {
      showToast('섹션은 연속된 블록만 선택할 수 있습니다', 'error');
      return;
    }

    // Open section AI modal
    setIsSectionAIModalOpen(true);
  }, [selectedBlockIds, areSelectedBlocksContinuous, showToast]);

  // Apply refined section blocks
  const handleApplyRefinedSection = useCallback((refinedBlocks: Block[]) => {
    // Get indices of selected blocks
    const selectedIndices = Array.from(selectedBlockIds)
      .map(id => blocks.findIndex(b => b.id === id))
      .filter(index => index !== -1)
      .sort((a, b) => a - b);

    if (selectedIndices.length === 0) {
      showToast('선택된 블록을 찾을 수 없습니다', 'error');
      return;
    }

    // Replace selected blocks with refined blocks
    const firstIndex = selectedIndices[0];
    const lastIndex = selectedIndices[selectedIndices.length - 1];
    const newBlocks = [
      ...blocks.slice(0, firstIndex),
      ...refinedBlocks,
      ...blocks.slice(lastIndex + 1),
    ];

    updateBlocks(newBlocks);

    // Clear selection
    setSelectedBlockIds(new Set());

    showToast(`섹션이 AI로 재구성되었습니다! (${refinedBlocks.length}개 블록)`, 'success');
  }, [blocks, selectedBlockIds, updateBlocks, showToast]);

  // Apply improved page blocks
  const handleApplyImprovedPage = useCallback((improvedBlocks: Block[]) => {
    // Replace entire blocks array with improved version
    updateBlocks(improvedBlocks);

    // Clear selection
    setSelectedBlockIds(new Set());

    showToast(`페이지가 AI로 개선되었습니다! (${improvedBlocks.length}개 블록)`, 'success');
  }, [updateBlocks, showToast]);

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

  /**
   * Callback Factory Pattern
   *
   * These factories create stable callbacks that:
   * 1. Don't depend on blocks state (use blockManagement.blocksRef instead)
   * 2. Are cached per block ID in callbacksMapRef
   * 3. Prevent re-renders when blocks array changes
   *
   * This is necessary because:
   * - DynamicRenderer receives these callbacks as props
   * - If callbacks change, child components (ParagraphBlock, HeadingBlock) re-render
   * - Re-renders can cause Slate to lose focus
   *
   * Similar to the ref pattern used in NewColumnBlock and NewColumnsBlock
   */
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
              onClick={toggleListView}
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
              <span>{showListView ? 'Hide' : 'Show'} List</span>
            </button>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Phase 2-C Remaining: Page-level AI Improvement Button */}
            <button
              onClick={() => setIsPageImproveModalOpen(true)}
              disabled={blocks.length === 0}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                blocks.length === 0
                  ? "text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 shadow-sm hover:shadow-md"
              )}
              title="페이지 전체 AI 개선"
            >
              <Sparkles className="w-4 h-4" />
              <span>페이지 AI 개선</span>
            </button>

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
        {showListView && (
          <div className="fixed left-0 bottom-0 w-64 bg-white border-r border-gray-200 overflow-y-auto z-40 shadow-lg" style={{ top: hideHeader ? '55px' : '56px' }}>
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">
                Block List
              </h3>
              {blocks.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No blocks yet</p>
              ) : (
                <div className="space-y-1">
                  {blocks.map((block, index) => {
                    const blockContent = typeof block.content === 'string'
                      ? block.content
                      : block.content?.text || '';
                    const preview = (blockContent || '').replace(/<[^>]*>/g, '').substring(0, 50);

                    return (
                      <BlockListItem
                        key={block.id}
                        blockId={block.id}
                        blockType={block.type}
                        blockIndex={index}
                        blockPreview={preview}
                        isSelected={selectedBlockId === block.id}
                        canMoveUp={index > 0}
                        canMoveDown={index < blocks.length - 1}
                        isDragging={draggedBlockId === block.id}
                        onSelect={() => {
                          setSelectedBlockId(block.id);
                          // Scroll to block
                          const blockElement = document.querySelector(`[data-block-id="${block.id}"]`);
                          if (blockElement) {
                            blockElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }}
                        onMoveUp={() => handleMoveUp(block.id)}
                        onMoveDown={() => handleMoveDown(block.id)}
                        onDuplicate={() => handleDuplicate(block.id)}
                        onDelete={() => handleBlockDelete(block.id)}
                        onDragStart={(e) => handleDragStart(block.id, e)}
                        onDragEnd={(e) => handleDragEnd(block.id, e)}
                        onDragOver={(e) => handleDragOver(block.id, e)}
                        onDrop={(e) => {
                          const draggedId = e.dataTransfer.getData('application/block-id') || e.dataTransfer.getData('text/plain');
                          handleDrop(block.id, draggedId, e);
                        }}
                      />
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
          className={`flex-1 transition-all duration-300 overflow-y-auto ${
            showListView ? 'ml-64' : 'ml-0'
          } ${
            isBlockInserterOpen ? 'ml-80' : ''
          } ${
            sidebarOpen ? 'mr-80' : 'mr-0'
          }`}
          style={{
            paddingTop: '10px',
            maxHeight: hideHeader ? 'calc(100vh - 10px)' : 'calc(100vh - 70px)',
            backgroundColor: tokens.colors.background
          }}
        >
          <div
            className="mx-auto p-8 shadow-md transition-all duration-300 ease-in-out"
            style={{
              width: `${currentConfig.width}px`,
              maxWidth: '100%',
              backgroundColor: tokens.colors.surface,
              fontFamily: tokens.typography.fontFamilyBody,
              fontSize: tokens.typography.fontSizeBase,
              lineHeight: tokens.typography.lineHeightBase,
              color: tokens.colors.textPrimary,
              // Apply theme tokens as CSS variables
              '--o4o-color-primary': tokens.colors.primary,
              '--o4o-color-primary-hover': tokens.colors.primaryHover,
              '--o4o-color-primary-active': tokens.colors.primaryActive,
              '--o4o-color-primary-soft': tokens.colors.primarySoft,
              '--o4o-color-background': tokens.colors.background,
              '--o4o-color-surface': tokens.colors.surface,
              '--o4o-color-surface-muted': tokens.colors.surfaceMuted,
              '--o4o-color-border-subtle': tokens.colors.borderSubtle,
              '--o4o-color-text-primary': tokens.colors.textPrimary,
              '--o4o-color-text-muted': tokens.colors.textMuted,
              '--o4o-font-family-heading': tokens.typography.fontFamilyHeading,
              '--o4o-font-family-body': tokens.typography.fontFamilyBody,
              '--o4o-font-size-base': tokens.typography.fontSizeBase,
              '--o4o-line-height-base': tokens.typography.lineHeightBase,
              '--o4o-spacing-section-y': `${tokens.spacing.sectionY}px`,
              '--o4o-spacing-block-gap': `${tokens.spacing.blockGap}px`,
              '--o4o-spacing-grid-gap': `${tokens.spacing.gridGap}px`,
              '--o4o-radius-sm': tokens.radius.sm,
              '--o4o-radius-md': tokens.radius.md,
              '--o4o-radius-lg': tokens.radius.lg,
            } as React.CSSProperties}
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
              <>
                {/* Phase 2-C Remaining: Section Reconstruction Toolbar */}
                {selectedBlockIds.size >= 2 && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-purple-100 border-2 border-purple-300 rounded-lg shadow-md animate-slideIn">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-purple-600 text-white rounded-full font-bold text-sm">
                          {selectedBlockIds.size}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-purple-900">
                            {selectedBlockIds.size}개의 블록이 선택됨
                          </p>
                          <p className="text-xs text-purple-700">
                            {areSelectedBlocksContinuous()
                              ? '연속된 블록 섹션'
                              : '⚠️ 연속되지 않은 블록 (섹션 재구성 불가)'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Section AI Reconstruction Button */}
                        <Button
                          onClick={handleOpenSectionAIModal}
                          disabled={!areSelectedBlocksContinuous()}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2",
                            "bg-gradient-to-r from-purple-500 to-purple-600",
                            "hover:from-purple-600 hover:to-purple-700",
                            "text-white font-medium text-sm rounded-md",
                            "shadow-md hover:shadow-lg transition-all",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                          )}
                        >
                          <Sparkles className="w-4 h-4" />
                          섹션 AI 재구성
                        </Button>

                        {/* Clear Selection Button */}
                        <Button
                          onClick={() => setSelectedBlockIds(new Set())}
                          variant="outline"
                          className="flex items-center gap-2 px-3 py-2 text-sm border-purple-300 text-purple-700 hover:bg-purple-50"
                        >
                          <X className="w-4 h-4" />
                          선택 해제
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

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
                    onOpenAIModal={handleOpenBlockAIModal}
                    isBlockSelected={selectedBlockIds.has(block.id)}
                    onToggleSelection={handleToggleBlockSelection}
                    canMoveUp={index > 0}
                    canMoveDown={index < blocks.length - 1}
                  >
                    {renderBlock(block)}
                  </BlockWrapper>
                ))}
              </div>

                {/* Add block button - shown when blocks exist */}
                {blocks.length > 0 && (
                  <div className="mt-6 mb-4 text-center">
                    <button
                      onClick={() => setIsBlockInserterOpen(true)}
                      className="px-6 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 text-gray-600 hover:text-blue-600 text-sm font-medium transition-colors"
                    >
                      + Add Block
                    </button>
                  </div>
                )}
              </>
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
        onGenerate={(result) => {
          // Phase 1-A: GenerateResult 처리 (v1/v2 호환)
          // result.blocks: 생성된 블록 배열
          // result.newBlocksRequest: 새로운 블록 요청 (있는 경우만)

          updateBlocks(result.blocks);

          // Phase 1-C: newBlocksRequest 저장 및 표시
          if (result.newBlocksRequest && result.newBlocksRequest.length > 0) {
            setNewBlocksRequest(result.newBlocksRequest);
            showToast(
              `AI 페이지가 생성되었습니다! (${result.newBlocksRequest.length}개의 새 블록 요청 포함)`,
              'success'
            );
          } else {
            setNewBlocksRequest([]);
            showToast('AI 페이지가 생성되었습니다!', 'success');
          }
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

      {/* Phase 1-C: New Block Request Panel */}
      {newBlocksRequest.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t shadow-lg p-4">
          <NewBlockRequestPanel
            newBlocksRequest={newBlocksRequest}
            variant="bottom"
            onScrollToPlaceholder={(placeholderId) => {
              // Scroll to placeholder block
              const element = document.querySelector(`[data-placeholder-id="${placeholderId}"]`);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Flash highlight effect
                element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
                setTimeout(() => {
                  element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
                }, 2000);
              }
            }}
            onGenerateBlock={handleGenerateBlock}
          />
        </div>
      )}

      {/* Phase 2-C: Block AI Edit Modal */}
      <BlockAIModal
        isOpen={isBlockAIModalOpen}
        onClose={() => {
          setIsBlockAIModalOpen(false);
          setBlockToEdit(null);
        }}
        block={blockToEdit}
        onApply={handleApplyRefinedBlock}
        initialAction={initialAIAction}
      />

      {/* Phase 2-C Remaining: Section AI Reconstruction Modal */}
      <SectionAIModal
        isOpen={isSectionAIModalOpen}
        onClose={() => {
          setIsSectionAIModalOpen(false);
        }}
        blocks={getSelectedBlocksInOrder()}
        onApply={handleApplyRefinedSection}
      />

      {/* Phase 2-C Remaining: Page AI Improvement Modal */}
      <PageImproveModal
        isOpen={isPageImproveModalOpen}
        onClose={() => {
          setIsPageImproveModalOpen(false);
        }}
        blocks={blocks}
        documentTitle={documentTitle}
        onApply={handleApplyImprovedPage}
      />
    </div>
  );
};

export default GutenbergBlockEditor;
