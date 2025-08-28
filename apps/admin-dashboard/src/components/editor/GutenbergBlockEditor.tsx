/**
 * GutenbergBlockEditor Component
 * Enhanced WordPress Gutenberg-like editor with 3-column layout
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EditorHeader } from './EditorHeader';
import BlockInserter from './BlockInserter';
import InspectorPanel from './InspectorPanel';
import ParagraphBlock from './blocks/ParagraphBlock';
import HeadingBlock from './blocks/HeadingBlock';
import ListBlock from './blocks/ListBlock';
import ImageBlock from './blocks/ImageBlock';
// import { QuoteBlock } from './blocks/QuoteBlock'; // TODO: Fix QuoteBlock interface
import ButtonBlock from './blocks/ButtonBlock';
import ColumnsBlock from './blocks/ColumnsBlock';

interface Block {
  id: string;
  type: string;
  content: any;
  attributes?: any;
}

interface GutenbergBlockEditorProps {
  initialBlocks?: Block[];
  onChange?: (blocks: Block[]) => void;
  onSave?: () => void;
  onPublish?: () => void;
}

const GutenbergBlockEditor: React.FC<GutenbergBlockEditorProps> = ({
  initialBlocks = [],
  onChange,
  onSave,
  onPublish,
}) => {
  const [blocks, setBlocks] = useState<Block[]>(
    initialBlocks.length > 0
      ? initialBlocks
      : [
          {
            id: `block-${Date.now()}`,
            type: 'core/paragraph',
            content: { text: '' },
            attributes: {},
          },
        ]
  );
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState('Untitled');
  const [isBlockInserterOpen, setIsBlockInserterOpen] = useState(true); // 기본적으로 열림
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [history, setHistory] = useState<Block[][]>([blocks]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isDirty, setIsDirty] = useState(false);
  const [isCodeView, setIsCodeView] = useState(false);
  const [activeTab, setActiveTab] = useState<'document' | 'block'>('document');
  const navigate = useNavigate();

  // Update blocks and history
  const updateBlocks = useCallback(
    (newBlocks: Block[]) => {
      setBlocks(newBlocks);
      setIsDirty(true);

      // Add to history
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newBlocks);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);

      // Notify parent
      onChange?.(newBlocks);
    },
    [history, historyIndex, onChange]
  );

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setBlocks(history[newIndex]);
    }
  }, [history, historyIndex]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setBlocks(history[newIndex]);
    }
  }, [history, historyIndex]);

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
      if (newBlocks.length === 0) {
        // Always keep at least one paragraph block
        newBlocks.push({
          id: `block-${Date.now()}`,
          type: 'core/paragraph',
          content: { text: '' },
          attributes: {},
        });
      }
      updateBlocks(newBlocks);
      setSelectedBlockId(null);
    },
    [blocks, updateBlocks]
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

      const insertIndex = selectedBlockId
        ? blocks.findIndex((b) => b.id === selectedBlockId) + 1
        : blocks.length;

      const newBlocks = [...blocks];
      newBlocks.splice(insertIndex, 0, newBlock);
      updateBlocks(newBlocks);
      setSelectedBlockId(newBlock.id);
      setIsBlockInserterOpen(false);
    },
    [blocks, selectedBlockId, updateBlocks]
  );

  // Handle add block at position
  const handleAddBlock = useCallback(
    (blockId: string, position: 'before' | 'after', blockType = 'core/paragraph') => {
      const index = blocks.findIndex((b) => b.id === blockId);
      const newBlock: Block = {
        id: `block-${Date.now()}`,
        type: blockType,
        content: { text: '' },
        attributes: {},
      };

      const newBlocks = [...blocks];
      const insertIndex = position === 'after' ? index + 1 : index;
      newBlocks.splice(insertIndex, 0, newBlock);
      updateBlocks(newBlocks);
      setSelectedBlockId(newBlock.id);
    },
    [blocks, updateBlocks]
  );

  // Handle save
  const handleSave = useCallback(() => {
    setIsDirty(false);
    onSave?.();
  }, [onSave]);

  // Handle publish
  const handlePublish = useCallback(() => {
    setIsDirty(false);
    onPublish?.();
  }, [onPublish]);

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

  // Switch to block tab when a block is selected
  useEffect(() => {
    if (selectedBlockId) {
      setActiveTab('block');
    }
  }, [selectedBlockId]);

  // Handle navigation with unsaved changes warning
  const handleNavigation = useCallback(() => {
    if (isDirty) {
      const confirmLeave = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirmLeave) return;
    }
    navigate('/admin');
  }, [isDirty, navigate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Save: Ctrl/Cmd + S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // Undo: Ctrl/Cmd + Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Redo: Ctrl/Cmd + Shift + Z
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        handleRedo();
      }
      // Toggle block inserter: /
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setIsBlockInserterOpen(!isBlockInserterOpen);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleUndo, handleRedo, isBlockInserterOpen]);

  // Render block component
  const renderBlock = (block: Block) => {
    const commonProps = {
      id: block.id,
      content: typeof block.content === 'string' ? block.content : block.content?.text || '',
      onChange: (content: any, attributes?: any) =>
        handleBlockUpdate(block.id, content, attributes),
      onDelete: () => handleBlockDelete(block.id),
      onDuplicate: () => {
        const newBlock = { ...block, id: `block-${Date.now()}` };
        const index = blocks.findIndex((b) => b.id === block.id);
        const newBlocks = [...blocks];
        newBlocks.splice(index + 1, 0, newBlock);
        updateBlocks(newBlocks);
      },
      onMoveUp: () => {
        const index = blocks.findIndex((b) => b.id === block.id);
        if (index > 0) {
          const newBlocks = [...blocks];
          [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
          updateBlocks(newBlocks);
        }
      },
      onMoveDown: () => {
        const index = blocks.findIndex((b) => b.id === block.id);
        if (index < blocks.length - 1) {
          const newBlocks = [...blocks];
          [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
          updateBlocks(newBlocks);
        }
      },
      onAddBlock: (position: 'before' | 'after', type?: string) =>
        handleAddBlock(block.id, position, type),
      isSelected: selectedBlockId === block.id,
      onSelect: () => setSelectedBlockId(block.id),
      attributes: block.attributes || {},
    };

    switch (block.type) {
      case 'core/paragraph':
        return <ParagraphBlock key={block.id} {...commonProps} />;
      case 'core/heading':
        return (
          <HeadingBlock
            key={block.id}
            {...commonProps}
            attributes={{ level: block.content?.level || 2 }}
          />
        );
      case 'core/list':
        return <ListBlock key={block.id} {...commonProps} />;
      case 'core/quote':
        // TODO: Fix QuoteBlock interface
        return <ParagraphBlock key={block.id} {...commonProps} />;
      case 'core/image':
        return <ImageBlock key={block.id} {...commonProps} />;
      case 'core/button':
        return <ButtonBlock key={block.id} {...commonProps} />;
      case 'core/columns':
        return <ColumnsBlock key={block.id} {...commonProps} />;
      default:
        return (
          <div key={block.id} className="p-4 border border-dashed border-gray-300">
            <span className="text-gray-500">Unsupported block type: {block.type}</span>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col">
      {/* Header */}
      <EditorHeader
        onSave={handleSave}
        onPublish={handlePublish}
        onBack={handleNavigation}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        isDirty={isDirty}
        onToggleListView={() => {}}
        onToggleCodeView={handleToggleCodeView}
        isCodeView={isCodeView}
      />

      {/* Main Layout */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Block Inserter */}
        <BlockInserter
          isOpen={isBlockInserterOpen}
          onClose={() => setIsBlockInserterOpen(false)}
          onInsertBlock={handleInsertBlock}
        />

        {/* Editor Canvas */}
        <div
          className={`flex-1 transition-all duration-300 ${
            isBlockInserterOpen ? 'ml-80' : 'ml-0'
          } mr-80`}
          style={{ paddingTop: '10px' }}
        >
          <div className="max-w-4xl mx-auto p-8">
            {/* Title */}
            <div className="mb-8">
              <input
                type="text"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                placeholder="Add title"
                className="w-full text-4xl font-bold border-none outline-none bg-transparent focus:ring-0"
              />
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
                      console.error('Invalid JSON');
                    }
                  }}
                  className="w-full min-h-[500px] font-mono text-sm p-4 border border-gray-300 rounded"
                />
              </div>
            ) : (
              blocks.map(renderBlock)
            )}

            {/* Add block button */}
            {!isCodeView && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setIsBlockInserterOpen(true)}
                  className="px-6 py-3 border-2 border-dashed border-gray-300 rounded hover:border-gray-400 hover:bg-gray-50 text-gray-600 text-sm transition-colors"
                >
                  + Add Block
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Inspector Panel with Document/Block tabs */}
        <InspectorPanel
          selectedBlock={selectedBlockId ? blocks.find(b => b.id === selectedBlockId) : undefined}
          documentSettings={{
            visibility: 'public',
            publishDate: '',
            categories: [],
            tags: [],
            featuredImage: '',
            excerpt: '',
            allowComments: true,
            allowPingbacks: true
          }}
          activeTab={activeTab}
          onUpdateBlock={(updates) => {
            if (selectedBlockId) {
              handleBlockUpdate(selectedBlockId, blocks.find(b => b.id === selectedBlockId)?.content, updates);
            }
          }}
          onUpdateDocument={() => {}}
        />
      </div>
    </div>
  );
};

export default GutenbergBlockEditor;