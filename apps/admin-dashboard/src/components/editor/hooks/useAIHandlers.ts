/**
 * useAIHandlers Hook
 * Extracted from GutenbergBlockEditor.tsx
 *
 * Handles all AI-related operations:
 * - Block generation from specs
 * - Block AI editing (improve, translate)
 * - Section AI reconstruction
 * - Page AI improvement
 * - AI Chat action execution
 */

import { useCallback, useMemo } from 'react';
import { Block } from '@/types/post.types';
import { EditorContext, AIAction } from '@/services/ai/ConversationalAI';
import { NewBlockRequest } from '@/services/ai/types';
import { blockCodeGenerator, BlockGenerationError, BlockGenerationErrorType } from '@/services/ai/BlockCodeGenerator';
import { compileComponent } from '@/blocks/runtime/runtime-code-loader';
import { runtimeBlockRegistry } from '@/blocks/runtime/runtime-block-registry';
import { BlockDefinition } from '@/blocks/registry/types';
import { devLog, devError } from '@/utils/logger';

interface UseAIHandlersProps {
  editor: {
    blocks: Block[];
    updateBlocks: (blocks: Block[]) => void;
    selectedBlockId: string | null;
    setSelectedBlockId: (id: string | null) => void;
    documentTitle: string;
    blockManagement: {
      blocksRef: React.RefObject<Block[]>;
    };
  };
  ui: {
    setNewBlocksRequest: React.Dispatch<React.SetStateAction<NewBlockRequest[]>>;
    handleOpenBlockAIModal: (block: Block, actionType?: 'edit' | 'improve' | 'translate') => void;
    setIsSectionAIModalOpen: (open: boolean) => void;
  };
  selection: {
    selectedBlockIds: Set<string>;
    areSelectedBlocksContinuous: () => boolean;
    clearSelection: () => void;
  };
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  handleBlockUpdate: (blockId: string, content: any, attributes?: any) => void;
  handleBlockDelete: (blockId: string) => void;
  handleDuplicate: (blockId: string) => void;
}

export function useAIHandlers({
  editor,
  ui,
  selection,
  showToast,
  handleBlockUpdate,
  handleBlockDelete,
  handleDuplicate,
}: UseAIHandlersProps) {

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

          // fallbackCode is dynamically attached to the error
          if ((genError as any).fallbackCode) {
            usedFallback = true;
            generatedCode = (genError as any).fallbackCode;
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

  return {
    handleGenerateBlock,
    handleOpenBlockAIModal,
    handleApplyRefinedBlock,
    handleOpenSectionAIModal,
    handleApplyRefinedSection,
    handleApplyImprovedPage,
    editorContext,
    handleExecuteAIActions,
  };
}
