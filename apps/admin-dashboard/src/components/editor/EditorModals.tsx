/**
 * EditorModals Component
 * Extracted from GutenbergBlockEditor.tsx
 *
 * Consolidates all modal components used in the editor:
 * - Design Library Modal
 * - AI Generator Modal
 * - AI Chat Panel
 * - Slash Command Menu
 * - New Block Request Panel
 * - Block AI Edit Modal
 * - Section AI Reconstruction Modal
 * - Page AI Improvement Modal
 */

import React from 'react';
import { Block } from '@/types/post.types';
import { EditorContext, AIAction } from '@/services/ai/ConversationalAI';
import { NewBlockRequest } from '@/services/ai/types';
import DesignLibraryModalImproved from './DesignLibraryModalImproved';
import { SimpleAIModal } from '../ai/SimpleAIModal';
import { AIChatPanel } from './AIChatPanel';
import { NewBlockRequestPanel } from './NewBlockRequestPanel';
import { BlockAIModal } from '../ai/BlockAIModal';
import { SectionAIModal } from '../ai/SectionAIModal';
import { PageImproveModal } from '../ai/PageImproveModal';
import SlashCommandMenu from './SlashCommandMenu';

interface EditorModalsProps {
  // Design Library
  isDesignLibraryOpen: boolean;
  onCloseDesignLibrary: () => void;
  onApplyTemplate: (templateBlocks: Block[]) => void;

  // AI Generator
  isAIGeneratorOpen: boolean;
  onCloseAIGenerator: () => void;
  onGenerate: (result: { blocks: Block[]; newBlocksRequest?: NewBlockRequest[] }) => void;

  // AI Chat
  isAIChatOpen: boolean;
  editorContext: EditorContext;
  onExecuteAIActions: (actions: AIAction[]) => void;

  // Slash Command Menu
  isSlashMenuOpen: boolean;
  slashQuery: string;
  slashMenuPosition: { top: number; left: number };
  recentBlocks: string[];
  onSlashCommandSelect: (blockType: string) => void;
  onCloseSlashMenu: () => void;

  // New Block Request Panel
  newBlocksRequest: NewBlockRequest[];
  onGenerateBlock: (spec: NewBlockRequest) => Promise<void>;

  // Block AI Modal
  isBlockAIModalOpen: boolean;
  blockToEdit: Block | null;
  initialAIAction?: 'refine' | 'improve' | 'translate-ko'; // Internal type used by BlockAIModal
  onCloseBlockAIModal: () => void;
  onApplyRefinedBlock: (refinedBlock: Block) => void;

  // Section AI Modal
  isSectionAIModalOpen: boolean;
  selectedBlocks: Block[];
  onCloseSectionAIModal: () => void;
  onApplyRefinedSection: (refinedBlocks: Block[]) => void;

  // Page Improve Modal
  isPageImproveModalOpen: boolean;
  allBlocks: Block[];
  documentTitle: string;
  onClosePageImproveModal: () => void;
  onApplyImprovedPage: (improvedBlocks: Block[]) => void;
}

export const EditorModals: React.FC<EditorModalsProps> = ({
  isDesignLibraryOpen,
  onCloseDesignLibrary,
  onApplyTemplate,
  isAIGeneratorOpen,
  onCloseAIGenerator,
  onGenerate,
  isAIChatOpen,
  editorContext,
  onExecuteAIActions,
  isSlashMenuOpen,
  slashQuery,
  slashMenuPosition,
  recentBlocks,
  onSlashCommandSelect,
  onCloseSlashMenu,
  newBlocksRequest,
  onGenerateBlock,
  isBlockAIModalOpen,
  blockToEdit,
  initialAIAction,
  onCloseBlockAIModal,
  onApplyRefinedBlock,
  isSectionAIModalOpen,
  selectedBlocks,
  onCloseSectionAIModal,
  onApplyRefinedSection,
  isPageImproveModalOpen,
  allBlocks,
  documentTitle,
  onClosePageImproveModal,
  onApplyImprovedPage,
}) => {
  return (
    <>
      {/* Design Library Modal */}
      <DesignLibraryModalImproved
        isOpen={isDesignLibraryOpen}
        onClose={onCloseDesignLibrary}
        onApplyTemplate={onApplyTemplate}
      />

      {/* AI Generator Modal */}
      <SimpleAIModal
        isOpen={isAIGeneratorOpen}
        onClose={onCloseAIGenerator}
        onGenerate={onGenerate}
      />

      {/* AI Chat Panel */}
      {isAIChatOpen && (
        <div className="fixed right-0 top-14 bottom-0 w-96 bg-white border-l shadow-xl z-50">
          <AIChatPanel
            editorContext={editorContext}
            onExecuteActions={onExecuteAIActions}
            config={{ provider: 'gemini', model: 'gemini-2.5-flash' }}
          />
        </div>
      )}

      {/* Slash Command Menu */}
      {isSlashMenuOpen && (
        <SlashCommandMenu
          query={slashQuery}
          onSelectBlock={onSlashCommandSelect}
          onClose={onCloseSlashMenu}
          position={slashMenuPosition}
          recentBlocks={recentBlocks}
        />
      )}

      {/* New Block Request Panel */}
      {newBlocksRequest.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t shadow-lg p-4">
          <NewBlockRequestPanel
            newBlocksRequest={newBlocksRequest}
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
            onGenerateBlock={onGenerateBlock}
          />
        </div>
      )}

      {/* Block AI Edit Modal */}
      <BlockAIModal
        isOpen={isBlockAIModalOpen}
        onClose={onCloseBlockAIModal}
        block={blockToEdit}
        onApply={onApplyRefinedBlock}
        initialAction={initialAIAction}
      />

      {/* Section AI Reconstruction Modal */}
      <SectionAIModal
        isOpen={isSectionAIModalOpen}
        onClose={onCloseSectionAIModal}
        blocks={selectedBlocks}
        onApply={onApplyRefinedSection}
      />

      {/* Page AI Improvement Modal */}
      <PageImproveModal
        isOpen={isPageImproveModalOpen}
        onClose={onClosePageImproveModal}
        blocks={allBlocks}
        documentTitle={documentTitle}
        onApply={onApplyImprovedPage}
      />
    </>
  );
};
