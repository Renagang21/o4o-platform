/**
 * EditorShell Component
 * Main layout shell that composes all editor UI components
 */

import React from 'react';
import { Block } from '@/types/post.types';
import { PostSettings } from '../types/editor';
import { EditorToolbar } from './EditorToolbar';
import { BlockListSidebar } from './BlockListSidebar';
import { EditorCanvas } from './EditorCanvas';
import BlockInserter from '../BlockInserter';
import EditorSidebar from '../EditorSidebar';
import { cn } from '@/lib/utils';

interface EditorShellProps {
  // Document state
  documentTitle: string;
  onTitleChange: (title: string) => void;
  blocks: Block[];
  selectedBlockId: string | null;
  setSelectedBlockId: (id: string | null) => void;
  selectedBlockIds: Set<string>;
  postSettings: PostSettings;
  onPostSettingsChange: (settings: Partial<PostSettings>) => void;
  mode: 'post' | 'page' | 'template' | 'pattern';

  // UI state
  showListView: boolean;
  onToggleListView: () => void;
  isBlockInserterOpen: boolean;
  setIsBlockInserterOpen: (open: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeTab: 'document' | 'block';
  setActiveTab: (tab: 'document' | 'block') => void;
  isCodeView: boolean;
  onCodeChange: (value: string) => void;
  hideHeader: boolean;

  // Block operations
  onInsertBlock: (type: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenBlockAIModal: (blockId: string, actionType: 'edit' | 'improve' | 'translate') => void;
  onBlockSettingsChange: (settings: any) => void;
  onUpdateBlocks: (blocks: Block[]) => void;

  // Selection
  onToggleBlockSelection: (id: string) => void;
  onClearSelection: () => void;
  areSelectedBlocksContinuous: boolean;

  // AI
  onOpenPageImprove: () => void;
  onToggleAIChat: () => void;
  isAIChatOpen: boolean;
  onOpenSectionAIModal: () => void;

  // Drag and drop
  draggedBlockId: string | null;
  onDragStart: (id: string, e: React.DragEvent) => void;
  onDragEnd: (id: string, e: React.DragEvent) => void;
  onDragOver: (id: string, e: React.DragEvent) => void;
  onDrop: (id: string, draggedId: string, e: React.DragEvent) => void;

  // Viewport
  currentWidth: number;
  themeTokens: any;

  // Block callbacks
  getBlockCallbacks: (blockId: string) => any;
}

export const EditorShell: React.FC<EditorShellProps> = ({
  documentTitle,
  onTitleChange,
  blocks,
  selectedBlockId,
  setSelectedBlockId,
  selectedBlockIds,
  postSettings,
  onPostSettingsChange,
  mode,
  showListView,
  onToggleListView,
  isBlockInserterOpen,
  setIsBlockInserterOpen,
  sidebarOpen,
  setSidebarOpen,
  activeTab,
  setActiveTab,
  isCodeView,
  onCodeChange,
  hideHeader,
  onInsertBlock,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onOpenBlockAIModal,
  onBlockSettingsChange,
  onUpdateBlocks,
  onToggleBlockSelection,
  onClearSelection,
  areSelectedBlocksContinuous,
  onOpenPageImprove,
  onToggleAIChat,
  isAIChatOpen,
  onOpenSectionAIModal,
  draggedBlockId,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  currentWidth,
  themeTokens,
  getBlockCallbacks,
}) => {
  return (
    <div className="h-full w-full bg-transparent flex flex-col">
      {/* Top Toolbar */}
      {!hideHeader && (
        <EditorToolbar
          showListView={showListView}
          onToggleListView={onToggleListView}
          blockCount={blocks.length}
          onOpenPageImprove={onOpenPageImprove}
          canImprove={blocks.length > 0}
          onToggleAIChat={onToggleAIChat}
          isAIChatOpen={isAIChatOpen}
        />
      )}

      {/* Main Layout */}
      <div className="flex-1 flex relative" style={{ marginTop: hideHeader ? '0' : '56px' }}>
        {/* Block List Sidebar */}
        {showListView && (
          <BlockListSidebar
            blocks={blocks}
            selectedBlockId={selectedBlockId}
            draggedBlockId={draggedBlockId}
            hideHeader={hideHeader}
            onSelectBlock={setSelectedBlockId}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            onDrop={onDrop}
          />
        )}

        {/* Block Inserter */}
        <BlockInserter
          isOpen={isBlockInserterOpen}
          onClose={() => setIsBlockInserterOpen(false)}
          onSelect={onInsertBlock}
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
            backgroundColor: themeTokens.colors.background
          }}
        >
          <EditorCanvas
            documentTitle={documentTitle}
            onTitleChange={onTitleChange}
            blocks={blocks}
            isCodeView={isCodeView}
            onCodeChange={onCodeChange}
            selectedBlockId={selectedBlockId}
            setSelectedBlockId={setSelectedBlockId}
            selectedBlockIds={selectedBlockIds}
            onToggleBlockSelection={onToggleBlockSelection}
            onClearSelection={onClearSelection}
            areSelectedBlocksContinuous={areSelectedBlocksContinuous}
            onOpenBlockInserter={() => setIsBlockInserterOpen(true)}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onOpenBlockAIModal={onOpenBlockAIModal}
            draggedBlockId={draggedBlockId}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onOpenSectionAIModal={onOpenSectionAIModal}
            currentWidth={currentWidth}
            themeTokens={themeTokens}
            hideHeader={hideHeader}
            getBlockCallbacks={getBlockCallbacks}
          />
        </div>

        {/* Right Sidebar */}
        {sidebarOpen && (
          <div
            className={cn(
              "fixed right-0 bg-white border-l overflow-y-auto transition-all duration-300 z-30",
              "shadow-lg"
            )}
            style={{
              top: hideHeader ? '55px' : '60px',
              height: hideHeader ? 'calc(100vh - 55px)' : 'calc(100vh - 60px)',
              width: '280px'
            }}
          >
            <EditorSidebar
              activeTab={activeTab}
              postSettings={postSettings}
              blockSettings={selectedBlockId ? {
                id: selectedBlockId,
                type: blocks.find(b => b.id === selectedBlockId)?.type || '',
                attributes: blocks.find(b => b.id === selectedBlockId)?.attributes || {}
              } : undefined}
              mode={mode}
              onPostSettingsChange={onPostSettingsChange}
              onBlockSettingsChange={onBlockSettingsChange}
              onTabChange={setActiveTab}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
};
