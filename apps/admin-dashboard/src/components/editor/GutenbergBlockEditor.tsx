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
import { EditorShell } from './editor-shell/EditorShell';
import { initializeWordPress } from '@/utils/wordpress-initializer';
import { registerAllBlocks } from '@/blocks';
import { EditorContext, AIAction } from '@/services/ai/ConversationalAI';
import { NewBlockRequest } from '@/services/ai/types';
import { blockCodeGenerator, BlockGenerationError, BlockGenerationErrorType } from '@/services/ai/BlockCodeGenerator';
import { compileComponent } from '@/blocks/runtime/runtime-code-loader';
import { runtimeBlockRegistry } from '@/blocks/runtime/runtime-block-registry';
import { BlockDefinition } from '@/blocks/registry/types';
import { devLog, devError } from '@/utils/logger';
import DesignLibraryModalImproved from './DesignLibraryModalImproved';
import { SimpleAIModal } from '../ai/SimpleAIModal';
import { AIChatPanel } from './AIChatPanel';
import { NewBlockRequestPanel } from './NewBlockRequestPanel';
import { BlockAIModal } from '../ai/BlockAIModal';
import { SectionAIModal } from '../ai/SectionAIModal';
import { PageImproveModal } from '../ai/PageImproveModal';
import SlashCommandMenu from './SlashCommandMenu';

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

  // Detect "/" input for slash commands
  useEffect(() => {
    const handleInput = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target.isContentEditable) return;

      const blockWrapper = target.closest('[data-block-id]') as HTMLElement;
      if (!blockWrapper) return;

      const blockId = blockWrapper.getAttribute('data-block-id');
      if (!blockId) return;

      const text = target.textContent || '';
      const slashIndex = text.lastIndexOf('/');

      if (slashIndex !== -1) {
        const query = text.substring(slashIndex + 1);
        const afterSlash = text.substring(slashIndex);

        if (afterSlash === '/' || /^\/[\w\s]*$/.test(afterSlash)) {
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

      if (slashCommands.isSlashMenuOpen && !text.includes('/')) {
        slashCommands.closeSlashMenu();
      }
    };

    document.addEventListener('input', handleInput);
    return () => document.removeEventListener('input', handleInput);
  }, [slashCommands]);

  // Block CRUD handlers
  const handleBlockUpdate = editor.blockManagement.handleBlockUpdate;
  const handleBlockDelete = editor.blockManagement.handleBlockDelete;

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

  const handleAddBlock = editor.blockManagement.handleAddBlock;
  const handleDuplicate = editor.blockManagement.handleDuplicate;
  const handleMoveUp = editor.blockManagement.handleMoveUp;
  const handleMoveDown = editor.blockManagement.handleMoveDown;
  const handleBlockTypeChange = editor.blockManagement.handleBlockTypeChange;

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

  // AI Page Generator handler
  const handleGenerateBlock = useCallback(async (spec: NewBlockRequest) => {
    let usedFallback = false;
    let generatedCode;

    try {
      devLog('🚀 Generating block from spec:', spec);

      try {
        generatedCode = await blockCodeGenerator.generate(spec);
      } catch (genError: any) {
        if (genError instanceof BlockGenerationError) {
          const errorMsg = `${genError.type}: ${genError.message}`;
          showToast(errorMsg, 'error');

          if (genError.fallbackCode) {
            usedFallback = true;
            generatedCode = genError.fallbackCode;
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

      const compileResult = compileComponent(generatedCode.componentCode);

      if (!compileResult.success || !compileResult.component) {
        const compileError = new BlockGenerationError(
          BlockGenerationErrorType.COMPILATION_ERROR,
          'Failed to compile component',
          compileResult.error
        );
        showToast(`${compileError.type}: ${compileError.message}`, 'error');
        throw compileError;
      }

      const blockDefinition: BlockDefinition = {
        name: generatedCode.blockName,
        title: spec.componentName,
        category: spec.spec.category || 'widgets',
        icon: 'Package',
        description: spec.reason,
        component: compileResult.component,
        attributes: (spec.spec.props || []).reduce((acc, prop) => {
          acc[prop] = { type: 'string', default: '' };
          return acc;
        }, {} as any),
      };

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

      if (spec.placeholderId) {
        const newBlocks = editor.blocks.map(block => {
          if (block.type === 'o4o/placeholder' &&
              block.attributes?.placeholderId === spec.placeholderId) {
            return {
              ...block,
              type: generatedCode.blockName,
              attributes: {
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
        editor.updateBlocks(newBlocks);
      }

      ui.setNewBlocksRequest(prev =>
        prev.filter(req => req.placeholderId !== spec.placeholderId)
      );

      if (usedFallback) {
        showToast(`${spec.componentName} 블록이 Fallback으로 생성되었습니다`, 'warning');
      } else {
        showToast(`${spec.componentName} 블록이 생성되고 등록되었습니다!`, 'success');
      }

      devLog('✅ Block generation complete:', generatedCode.blockName);
    } catch (error: any) {
      devError('❌ Block generation failed:', error);

      if (error instanceof BlockGenerationError) {
        showToast(`${error.type}: ${error.message}`, 'error');
      } else {
        showToast(error.message || '블록 생성 중 오류가 발생했습니다', 'error');
      }

      throw error;
    }
  }, [editor.blocks, editor.updateBlocks, showToast, ui]);

  // Block AI editing handlers
  const handleOpenBlockAIModal = useCallback((blockId: string, actionType: 'edit' | 'improve' | 'translate' = 'edit') => {
    const block = editor.blocks.find(b => b.id === blockId);
    if (block) {
      ui.handleOpenBlockAIModal(block, actionType);
    }
  }, [editor.blocks, ui]);

  const handleApplyRefinedBlock = useCallback((refinedBlock: Block) => {
    const newBlocks = editor.blocks.map(b =>
      b.id === refinedBlock.id ? refinedBlock : b
    );
    editor.updateBlocks(newBlocks);
    showToast('블록이 AI로 개선되었습니다!', 'success');
  }, [editor.blocks, editor.updateBlocks, showToast]);

  // Section AI handlers
  const handleOpenSectionAIModal = useCallback(() => {
    if (selection.selectedBlockIds.size < 2) {
      showToast('섹션 재구성은 최소 2개 이상의 블록을 선택해야 합니다', 'error');
      return;
    }

    if (!selection.areSelectedBlocksContinuous()) {
      showToast('섹션은 연속된 블록만 선택할 수 있습니다', 'error');
      return;
    }

    ui.setIsSectionAIModalOpen(true);
  }, [selection, showToast, ui]);

  const handleApplyRefinedSection = useCallback((refinedBlocks: Block[]) => {
    const selectedIndices = Array.from(selection.selectedBlockIds)
      .map(id => editor.blocks.findIndex(b => b.id === id))
      .filter(index => index !== -1)
      .sort((a, b) => a - b);

    if (selectedIndices.length === 0) {
      showToast('선택된 블록을 찾을 수 없습니다', 'error');
      return;
    }

    const firstIndex = selectedIndices[0];
    const lastIndex = selectedIndices[selectedIndices.length - 1];
    const newBlocks = [
      ...editor.blocks.slice(0, firstIndex),
      ...refinedBlocks,
      ...editor.blocks.slice(lastIndex + 1),
    ];

    editor.updateBlocks(newBlocks);
    selection.clearSelection();
    showToast(`섹션이 AI로 재구성되었습니다! (${refinedBlocks.length}개 블록)`, 'success');
  }, [editor.blocks, selection, editor.updateBlocks, showToast]);

  // Page AI improvement handler
  const handleApplyImprovedPage = useCallback((improvedBlocks: Block[]) => {
    editor.updateBlocks(improvedBlocks);
    selection.clearSelection();
    showToast(`페이지가 AI로 개선되었습니다! (${improvedBlocks.length}개 블록)`, 'success');
  }, [editor.updateBlocks, selection, showToast]);

  // AI Chat - EditorContext
  const editorContext: EditorContext = useMemo(() => ({
    selectedBlockId: editor.selectedBlockId,
    selectedBlock: editor.blocks.find(b => b.id === editor.selectedBlockId) || null,
    allBlocks: editor.blocks,
    documentTitle: editor.documentTitle,
    blockCount: editor.blocks.length,
  }), [editor.selectedBlockId, editor.blocks, editor.documentTitle]);

  // AI Chat - Execute actions
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

            const newBlocks = [...editor.blockManagement.blocksRef.current!];
            if (action.position === 'before' && action.targetBlockId) {
              const idx = editor.blockManagement.blocksRef.current!.findIndex(b => b.id === action.targetBlockId);
              newBlocks.splice(idx, 0, newBlock);
            } else if (action.position === 'after' && action.targetBlockId) {
              const idx = editor.blockManagement.blocksRef.current!.findIndex(b => b.id === action.targetBlockId);
              newBlocks.splice(idx + 1, 0, newBlock);
            } else if (typeof action.position === 'number') {
              newBlocks.splice(action.position, 0, newBlock);
            } else {
              newBlocks.push(newBlock);
            }

            editor.updateBlocks(newBlocks);
            editor.setSelectedBlockId(newBlock.id);
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
            editor.updateBlocks(action.blocks);
            showToast(`${action.blocks.length}개 블록으로 교체되었습니다`, 'success');
          }
          break;

        case 'move':
          if (action.targetBlockId && typeof action.position === 'number') {
            const blockIndex = editor.blockManagement.blocksRef.current!.findIndex(b => b.id === action.targetBlockId);
            if (blockIndex !== -1) {
              const newBlocks = [...editor.blockManagement.blocksRef.current!];
              const [block] = newBlocks.splice(blockIndex, 1);
              newBlocks.splice(action.position, 0, block);
              editor.updateBlocks(newBlocks);
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
  }, [editor, handleBlockUpdate, handleBlockDelete, handleDuplicate, showToast]);

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

  // Callback Factory Pattern
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
    () => editor.setSelectedBlockId(blockId),
    [editor]
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

  const createOnReplaceWithBlock = useCallback((blockId: string) =>
    (newBlockType: string, newAttributes: Record<string, any>) => handleBlockReplace(blockId, newBlockType, newAttributes),
    [handleBlockReplace]
  );

  const createOnUpdate = useCallback((blockId: string) =>
    (updates: any) => {
      const newBlocks = editor.blockManagement.blocksRef.current!.map(b =>
        b.id === blockId ? { ...b, ...updates } : b
      );
      editor.updateBlocks(newBlocks);
    },
    [editor]
  );

  const createOnInnerBlocksChange = useCallback((blockId: string) =>
    (newInnerBlocks: Block[]) => {
      const newBlocks = editor.blockManagement.blocksRef.current!.map(b =>
        b.id === blockId ? { ...b, innerBlocks: newInnerBlocks } : b
      );
      editor.updateBlocks(newBlocks);
    },
    [editor]
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
        onReplaceWithBlock: createOnReplaceWithBlock(blockId),
        onGenerateBlock: handleGenerateBlock,
      });
    }
    return callbacksMapRef.current.get(blockId);
  }, [createOnChange, createOnDelete, createOnDuplicate, createOnMoveUp, createOnMoveDown, createOnAddBlock, createOnSelect, createOnDragStart, createOnDragOver, createOnDrop, createOnDragEnd, createOnCopy, createOnPaste, createOnChangeType, createOnUpdate, createOnInnerBlocksChange, createOnReplaceWithBlock, handleGenerateBlock]);

  // Clean up stale callbacks
  useEffect(() => {
    const currentBlockIds = new Set(editor.blocks.map(b => b.id));
    const cachedBlockIds = Array.from(callbacksMapRef.current.keys());

    cachedBlockIds.forEach(id => {
      if (!currentBlockIds.has(id)) {
        callbacksMapRef.current.delete(id);
      }
    });
  }, [editor.blocks]);

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

      {/* Design Library Modal */}
      <DesignLibraryModalImproved
        isOpen={ui.isDesignLibraryOpen}
        onClose={() => ui.setIsDesignLibraryOpen(false)}
        onApplyTemplate={handleApplyTemplate}
      />

      {/* AI Generator Modal */}
      <SimpleAIModal
        isOpen={ui.isAIGeneratorOpen}
        onClose={() => ui.setIsAIGeneratorOpen(false)}
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
      />

      {/* AI Chat Panel */}
      {ui.isAIChatOpen && (
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

      {/* New Block Request Panel */}
      {ui.newBlocksRequest.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t shadow-lg p-4">
          <NewBlockRequestPanel
            newBlocksRequest={ui.newBlocksRequest}
            variant="bottom"
            onScrollToPlaceholder={(placeholderId) => {
              const element = document.querySelector(`[data-placeholder-id="${placeholderId}"]`);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

      {/* Block AI Edit Modal */}
      <BlockAIModal
        isOpen={ui.isBlockAIModalOpen}
        onClose={ui.handleCloseBlockAIModal}
        block={ui.blockToEdit}
        onApply={handleApplyRefinedBlock}
        initialAction={ui.initialAIAction}
      />

      {/* Section AI Reconstruction Modal */}
      <SectionAIModal
        isOpen={ui.isSectionAIModalOpen}
        onClose={() => ui.setIsSectionAIModalOpen(false)}
        blocks={selection.getSelectedBlocksInOrder()}
        onApply={handleApplyRefinedSection}
      />

      {/* Page AI Improvement Modal */}
      <PageImproveModal
        isOpen={ui.isPageImproveModalOpen}
        onClose={() => ui.setIsPageImproveModalOpen(false)}
        blocks={editor.blocks}
        documentTitle={editor.documentTitle}
        onApply={handleApplyImprovedPage}
      />
    </>
  );
};

export default GutenbergBlockEditor;
