/**
 * GutenbergBlockEditor Component (Refactored)
 * Enhanced WordPress Gutenberg-like editor
 *
 * Refactored Structure:
 * - Core hooks: useGutenbergEditor, useEditorUI, useBlockSelection
 * - UI components: EditorShell, EditorToolbar, BlockListSidebar, EditorCanvas
 * - Preserved functionality: All features remain identical
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/editor.css';
import '../../styles/inspector-sidebar.css';
import { Block } from '@/types/post.types';
import { GutenbergBlockEditorProps, PostSettings } from './types/editor';
import { useToast } from './hooks/useToast';
import { Toast } from './components/Toast';
import { useGutenbergEditor } from './hooks/useGutenbergEditor';
import { useEditorUI } from './hooks/useEditorUI';
import { useBlockSelection } from './hooks/useBlockSelection';
import { useSlashCommands } from './hooks/useSlashCommands';
import { useDragAndDrop } from './hooks/useDragAndDrop';
import { useKeyboardShortcuts } from './hooks/keyboard';
import { useCustomizerSettings } from '@/hooks/useCustomizerSettings';
import { useThemeTokens } from '@/hooks/useThemeTokens';
import { useAIHandlers } from './hooks/useAIHandlers';
import { useBlockCallbacks } from './hooks/useBlockCallbacks';
import { EditorShell } from './editor-shell/EditorShell';
import { EditorModals } from './EditorModals';
import { initializeWordPress } from '@/utils/wordpress-initializer';
import { registerAllBlocks } from '@/blocks';

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
  // Toast notifications
  const { toast, showToast } = useToast();

  // Core editor hook
  const editor = useGutenbergEditor({
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
  });

  // UI state hook
  const ui = useEditorUI();

  // Block selection hook
  const selection = useBlockSelection({ blocks: editor.blocks });

  // List View state
  const showListView = externalShowListView ?? false;
  const toggleListView = externalOnToggleListView ?? (() => {});

  // Viewport mode hook
  const { viewportMode, currentConfig, switchViewport, containerSettings } = useCustomizerSettings();

  // Theme tokens hook
  const { tokens } = useThemeTokens();

  const navigate = useNavigate();

  // Initialize block registry
  useEffect(() => {
    registerAllBlocks();
  }, []);

  // Initialize WordPress
  useEffect(() => {
    initializeWordPress().catch(error => {
      // Failed to initialize WordPress
    });
  }, []);

  // Listen for custom "open-block-inserter" event
  useEffect(() => {
    const handleOpenBlockInserter = () => {
      ui.setIsBlockInserterOpen(true);
    };

    window.addEventListener('open-block-inserter', handleOpenBlockInserter);
    return () => window.removeEventListener('open-block-inserter', handleOpenBlockInserter);
  }, [ui]);

  // Slash Commands Hook
  const slashCommands = useSlashCommands({
    blocksRef: editor.blockManagement.blocksRef,
    updateBlocks: editor.updateBlocks,
    selectedBlockId: editor.selectedBlockId,
    setSelectedBlockId: editor.setSelectedBlockId,
  });

  // Drag and drop hook
  const { draggedBlockId, dragOverBlockId, handleDragStart, handleDragOver, handleDrop, handleDragEnd } = useDragAndDrop({
    blocks: editor.blocks,
    updateBlocks: editor.updateBlocks
  });

  // Block CRUD handlers (needed for AI handlers and callbacks)
  const handleBlockUpdate = editor.blockManagement.handleBlockUpdate;
  const handleBlockDelete = editor.blockManagement.handleBlockDelete;
  const handleDuplicate = editor.blockManagement.handleDuplicate;
  const handleMoveUp = editor.blockManagement.handleMoveUp;
  const handleMoveDown = editor.blockManagement.handleMoveDown;
  const handleBlockTypeChange = editor.blockManagement.handleBlockTypeChange;
  const handleAddBlock = editor.blockManagement.handleAddBlock;

  // AI handlers hook
  const {
    handleGenerateBlock,
    handleOpenBlockAIModal,
    handleApplyRefinedBlock,
    handleOpenSectionAIModal,
    handleApplyRefinedSection,
    handleApplyImprovedPage,
    editorContext,
    handleExecuteAIActions,
  } = useAIHandlers({
    editor,
    ui,
    selection,
    showToast,
    handleBlockUpdate,
    handleBlockDelete,
    handleDuplicate,
  });

  // Detect "/" input for slash commands (auto-triggers slash menu)
  useEffect(() => {
    const handleInput = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target.isContentEditable) return;

      const blockWrapper = target.closest('[data-block-id]') as HTMLElement;
      const blockId = blockWrapper?.getAttribute('data-block-id');
      if (!blockId) return;

      const text = target.textContent || '';
      const slashIndex = text.lastIndexOf('/');

      if (slashIndex !== -1 && /^\/[\w\s]*$/.test(text.substring(slashIndex))) {
        const selection = window.getSelection();
        const range = selection?.getRangeAt(0);
        if (range) {
          const rect = range.getBoundingClientRect();
          slashCommands.openSlashMenu(
            text.substring(slashIndex + 1),
            blockId,
            { top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX }
          );
          slashCommands.slashMenuRef.current = { query: text.substring(slashIndex + 1), blockId };
        }
      } else if (slashCommands.isSlashMenuOpen && !text.includes('/')) {
        slashCommands.closeSlashMenu();
      }
    };

    document.addEventListener('input', handleInput);
    return () => document.removeEventListener('input', handleInput);
  }, [slashCommands]);

  // Additional block handlers
  const handleBlockCopy = useCallback(
    async (blockId: string) => editor.blockManagement.handleBlockCopy(blockId, ui.setCopiedBlock),
    [editor.blockManagement, ui]
  );

  const handleBlockPaste = useCallback(
    async (afterBlockId?: string) => editor.blockManagement.handleBlockPaste(ui.copiedBlock, afterBlockId),
    [editor.blockManagement, ui.copiedBlock]
  );

  const handleInsertBlock = useCallback(
    (blockType: string) => editor.blockManagement.handleInsertBlock(blockType, ui.setIsBlockInserterOpen),
    [editor.blockManagement, ui]
  );

  // Phase 3: Block replacement handler (Placeholder → Alternative Block)
  const handleBlockReplace = useCallback((blockId: string, newBlockType: string, newAttributes: Record<string, any>) => {
    editor.setBlocks(prevBlocks =>
      prevBlocks.map(block =>
        block.id === blockId
          ? { ...block, type: newBlockType, attributes: newAttributes, content: {} }
          : block
      )
    );
    showToast(`블록이 ${newBlockType}(으)로 교체되었습니다`, 'success');
  }, [editor, showToast]);

  // Slash command handler
  const handleSlashCommandSelect = slashCommands.handleSlashCommandSelect;

  // Preview handler
  const handlePreview = useCallback(() => {
    const previewContent = {
      title: editor.documentTitle,
      blocks: editor.blocks,
    };

    sessionStorage.setItem('previewContent', JSON.stringify(previewContent));
    window.open('/admin/preview', '_blank');
  }, [editor.documentTitle, editor.blocks]);

  // Template application handler
  const handleApplyTemplate = useCallback(
    (templateBlocks: Block[]) => {
      editor.updateBlocks(templateBlocks);
      editor.setSelectedBlockId(null);
      showToast('템플릿이 적용되었습니다!', 'success');
    },
    [editor, showToast]
  );

  // Block callbacks hook (provides memoized callback factory)
  const { getBlockCallbacks } = useBlockCallbacks({
    blocks: editor.blocks,
    handleBlockUpdate,
    handleBlockDelete,
    handleDuplicate,
    handleMoveUp,
    handleMoveDown,
    handleAddBlock,
    handleBlockTypeChange,
    handleBlockReplace,
    handleBlockCopy,
    handleBlockPaste,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    handleGenerateBlock,
    setSelectedBlockId: editor.setSelectedBlockId,
    updateBlocks: editor.updateBlocks,
    blocksRef: editor.blockManagement.blocksRef,
  });

  // Keyboard shortcuts
  useKeyboardShortcuts({
    handleSave: editor.handleSave,
    handleUndo: editor.handleUndo,
    handleRedo: editor.handleRedo,
    isBlockInserterOpen: ui.isBlockInserterOpen,
    setIsBlockInserterOpen: ui.setIsBlockInserterOpen,
    selectedBlockId: editor.selectedBlockId,
    setSelectedBlockId: editor.setSelectedBlockId,
    blocks: editor.blocks,
    handleBlockDelete,
    handleDuplicate,
    handleBlockCopy,
    handleBlockPaste,
    handleBlockTypeChange,
    showToast,
  });

  // Block settings change handler
  const handleBlockSettingsChange = useCallback((settings: any) => {
    if (editor.selectedBlockId && settings.attributes) {
      const newBlocks = editor.blocks.map(block => {
        if (block.id === editor.selectedBlockId) {
          return {
            ...block,
            attributes: { ...block.attributes, ...settings.attributes }
          };
        }
        return block;
      });
      editor.updateBlocks(newBlocks);
      editor.setIsDirty(true);
    }
  }, [editor]);

  return (
    <>
      <EditorShell
        documentTitle={editor.documentTitle}
        onTitleChange={editor.handleTitleChange}
        blocks={editor.blocks}
        selectedBlockId={editor.selectedBlockId}
        setSelectedBlockId={editor.setSelectedBlockId}
        selectedBlockIds={selection.selectedBlockIds}
        postSettings={editor.postSettings}
        onPostSettingsChange={editor.handlePostSettingsChange}
        mode={mode}
        showListView={showListView}
        onToggleListView={toggleListView}
        isBlockInserterOpen={ui.isBlockInserterOpen}
        setIsBlockInserterOpen={ui.setIsBlockInserterOpen}
        sidebarOpen={ui.sidebarOpen}
        setSidebarOpen={ui.setSidebarOpen}
        activeTab={ui.activeTab}
        setActiveTab={ui.setActiveTab}
        isCodeView={ui.isCodeView}
        onCodeChange={(value) => {
          try {
            const parsed = JSON.parse(value);
            editor.setBlocks(parsed);
          } catch (error) {
            // Invalid JSON
          }
        }}
        hideHeader={hideHeader}
        onInsertBlock={handleInsertBlock}
        onMoveUp={handleMoveUp}
        onMoveDown={handleMoveDown}
        onDuplicate={handleDuplicate}
        onDelete={handleBlockDelete}
        onOpenBlockAIModal={handleOpenBlockAIModal}
        onBlockSettingsChange={handleBlockSettingsChange}
        onUpdateBlocks={editor.updateBlocks}
        onToggleBlockSelection={selection.handleToggleBlockSelection}
        onClearSelection={selection.clearSelection}
        areSelectedBlocksContinuous={selection.areSelectedBlocksContinuous()}
        onOpenPageImprove={() => ui.setIsPageImproveModalOpen(true)}
        onToggleAIChat={() => ui.setIsAIChatOpen(!ui.isAIChatOpen)}
        isAIChatOpen={ui.isAIChatOpen}
        onOpenSectionAIModal={handleOpenSectionAIModal}
        draggedBlockId={draggedBlockId}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        currentWidth={currentConfig.width}
        themeTokens={tokens}
        getBlockCallbacks={getBlockCallbacks}
      />

      {/* Toast Notifications */}
      {toast && <Toast toast={toast} />}

      {/* All Modals */}
      <EditorModals
        isDesignLibraryOpen={ui.isDesignLibraryOpen}
        onCloseDesignLibrary={() => ui.setIsDesignLibraryOpen(false)}
        onApplyTemplate={handleApplyTemplate}
        isAIGeneratorOpen={ui.isAIGeneratorOpen}
        onCloseAIGenerator={() => ui.setIsAIGeneratorOpen(false)}
        onGenerate={(result) => {
          editor.updateBlocks(result.blocks);
          if (result.newBlocksRequest && result.newBlocksRequest.length > 0) {
            ui.setNewBlocksRequest(result.newBlocksRequest);
            showToast(
              `AI 페이지가 생성되었습니다! (${result.newBlocksRequest.length}개의 새 블록 요청 포함)`,
              'success'
            );
          } else {
            ui.setNewBlocksRequest([]);
            showToast('AI 페이지가 생성되었습니다!', 'success');
          }
        }}
        isAIChatOpen={ui.isAIChatOpen}
        editorContext={editorContext}
        onExecuteAIActions={handleExecuteAIActions}
        isSlashMenuOpen={slashCommands.isSlashMenuOpen}
        slashQuery={slashCommands.slashQuery}
        slashMenuPosition={slashCommands.slashMenuPosition}
        recentBlocks={slashCommands.recentBlocks}
        onSlashCommandSelect={handleSlashCommandSelect}
        onCloseSlashMenu={slashCommands.closeSlashMenu}
        newBlocksRequest={ui.newBlocksRequest}
        onGenerateBlock={handleGenerateBlock}
        isBlockAIModalOpen={ui.isBlockAIModalOpen}
        blockToEdit={ui.blockToEdit}
        initialAIAction={ui.initialAIAction}
        onCloseBlockAIModal={ui.handleCloseBlockAIModal}
        onApplyRefinedBlock={handleApplyRefinedBlock}
        isSectionAIModalOpen={ui.isSectionAIModalOpen}
        selectedBlocks={selection.getSelectedBlocksInOrder()}
        onCloseSectionAIModal={() => ui.setIsSectionAIModalOpen(false)}
        onApplyRefinedSection={handleApplyRefinedSection}
        isPageImproveModalOpen={ui.isPageImproveModalOpen}
        allBlocks={editor.blocks}
        documentTitle={editor.documentTitle}
        onClosePageImproveModal={() => ui.setIsPageImproveModalOpen(false)}
        onApplyImprovedPage={handleApplyImprovedPage}
      />
    </>
  );
};

export default GutenbergBlockEditor;
