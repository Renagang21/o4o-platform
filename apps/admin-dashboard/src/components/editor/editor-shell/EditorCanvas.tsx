/**
 * EditorCanvas Component
 * Central canvas where blocks are rendered and edited
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { Block } from '@/types/post.types';
import { BlockWrapper } from '../BlockWrapper';
import { DynamicRenderer } from '@/blocks/registry/DynamicRenderer';
import { Button } from '@/components/ui/button';
import { Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditorCanvasProps {
  // Document state
  documentTitle: string;
  onTitleChange: (title: string) => void;
  blocks: Block[];
  isCodeView: boolean;
  onCodeChange: (value: string) => void;

  // Selection state
  selectedBlockId: string | null;
  setSelectedBlockId: (id: string | null) => void;
  selectedBlockIds: Set<string>;
  onToggleBlockSelection: (id: string) => void;
  onClearSelection: () => void;
  areSelectedBlocksContinuous: boolean;

  // Block operations
  onOpenBlockInserter: () => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenBlockAIModal: (blockId: string, actionType: 'edit' | 'improve' | 'translate') => void;

  // Drag and drop
  draggedBlockId: string | null;
  onDragStart: (id: string, e: React.DragEvent) => void;
  onDragEnd: (id: string, e: React.DragEvent) => void;
  onDragOver: (id: string, e: React.DragEvent) => void;
  onDrop: (id: string, draggedId: string, e: React.DragEvent) => void;

  // Section AI
  onOpenSectionAIModal: () => void;

  // Viewport/theme
  currentWidth: number;
  themeTokens: any;
  hideHeader: boolean;

  // Block callbacks factory
  getBlockCallbacks: (blockId: string) => any;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  documentTitle,
  onTitleChange,
  blocks,
  isCodeView,
  onCodeChange,
  selectedBlockId,
  setSelectedBlockId,
  selectedBlockIds,
  onToggleBlockSelection,
  onClearSelection,
  areSelectedBlocksContinuous,
  onOpenBlockInserter,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onOpenBlockAIModal,
  draggedBlockId,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onOpenSectionAIModal,
  currentWidth,
  themeTokens,
  hideHeader,
  getBlockCallbacks,
}) => {
  // Render block component
  const renderBlock = useCallback((block: Block) => {
    const blockIndex = blocks.findIndex((b) => b.id === block.id);
    const callbacks = getBlockCallbacks(block.id);

    const commonProps = {
      id: block.id,
      content: typeof block.content === 'string' ? block.content : block.content?.text || '',
      ...callbacks,
      isSelected: selectedBlockId === block.id,
      attributes: block.attributes || {},
      innerBlocks: block.innerBlocks || [],
      isDragging: draggedBlockId === block.id,
      canMoveUp: blockIndex > 0,
      canMoveDown: blockIndex < blocks.length - 1,
    };

    const normalizedBlock = {
      ...block,
      content: typeof block.content === 'string'
        ? block.content
        : block.content?.text || '',
      innerBlocks: block.innerBlocks || [],
    };

    return (
      <DynamicRenderer
        key={block.id}
        block={normalizedBlock}
        {...commonProps}
      />
    );
  }, [blocks, selectedBlockId, draggedBlockId, getBlockCallbacks]);

  return (
    <div
      className="mx-auto p-8 shadow-md transition-all duration-300 ease-in-out"
      style={{
        width: `${currentWidth}px`,
        maxWidth: '100%',
        backgroundColor: themeTokens.colors.surface,
        fontFamily: themeTokens.typography.fontFamilyBody,
        fontSize: themeTokens.typography.fontSizeBase,
        lineHeight: themeTokens.typography.lineHeightBase,
        color: themeTokens.colors.textPrimary,
        // Apply theme tokens as CSS variables
        '--o4o-color-primary': themeTokens.colors.primary,
        '--o4o-color-primary-hover': themeTokens.colors.primaryHover,
        '--o4o-color-primary-active': themeTokens.colors.primaryActive,
        '--o4o-color-primary-soft': themeTokens.colors.primarySoft,
        '--o4o-color-background': themeTokens.colors.background,
        '--o4o-color-surface': themeTokens.colors.surface,
        '--o4o-color-surface-muted': themeTokens.colors.surfaceMuted,
        '--o4o-color-border-subtle': themeTokens.colors.borderSubtle,
        '--o4o-color-text-primary': themeTokens.colors.textPrimary,
        '--o4o-color-text-muted': themeTokens.colors.textMuted,
        '--o4o-font-family-heading': themeTokens.typography.fontFamilyHeading,
        '--o4o-font-family-body': themeTokens.typography.fontFamilyBody,
        '--o4o-font-size-base': themeTokens.typography.fontSizeBase,
        '--o4o-line-height-base': themeTokens.typography.lineHeightBase,
        '--o4o-spacing-section-y': `${themeTokens.spacing.sectionY}px`,
        '--o4o-spacing-block-gap': `${themeTokens.spacing.blockGap}px`,
        '--o4o-spacing-grid-gap': `${themeTokens.spacing.gridGap}px`,
        '--o4o-radius-sm': themeTokens.radius.sm,
        '--o4o-radius-md': themeTokens.radius.md,
        '--o4o-radius-lg': themeTokens.radius.lg,
      } as React.CSSProperties}
    >
      {/* Title Section */}
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
            onChange={(e) => onTitleChange(e.target.value)}
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
                onCodeChange(e.target.value);
              } catch (error) {
                // Invalid JSON - ignore
              }
            }}
            className="w-full min-h-[500px] font-mono text-sm p-4 border border-gray-300 rounded"
          />
        </div>
      ) : (
        <>
          {/* Section Reconstruction Toolbar */}
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
                      {areSelectedBlocksContinuous
                        ? '연속된 블록 섹션'
                        : '⚠️ 연속되지 않은 블록 (섹션 재구성 불가)'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Section AI Reconstruction Button */}
                  <Button
                    onClick={onOpenSectionAIModal}
                    disabled={!areSelectedBlocksContinuous}
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
                    onClick={onClearSelection}
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
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onDuplicate={() => onDuplicate(block.id)}
                onDelete={() => onDelete(block.id)}
                onMoveUp={() => onMoveUp(block.id)}
                onMoveDown={() => onMoveDown(block.id)}
                onOpenAIModal={onOpenBlockAIModal}
                isBlockSelected={selectedBlockIds.has(block.id)}
                onToggleSelection={onToggleBlockSelection}
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
                onClick={onOpenBlockInserter}
                className="px-6 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 text-gray-600 hover:text-blue-600 text-sm font-medium transition-colors"
              >
                + Add Block
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
