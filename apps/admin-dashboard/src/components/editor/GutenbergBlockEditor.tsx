/**
 * GutenbergBlockEditor Component
 * Enhanced WordPress Gutenberg-like editor with 3-column layout
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EditorHeader } from './EditorHeader';
import '../../styles/editor.css';
import { postApi, mediaApi } from '@/services/api/postApi';
import { Block } from '@/types/post.types';
import BlockInserter from './BlockInserter';
import InspectorPanel from './InspectorPanel';
import DesignLibraryModal from './DesignLibraryModal';
import SimplifiedParagraphBlock from './blocks/SimplifiedParagraphBlock';
import EnhancedHeadingBlock from './blocks/EnhancedHeadingBlock';
import ListBlock from './blocks/ListBlock';
import ImageBlock from './blocks/ImageBlock';
// import { QuoteBlock } from './blocks/QuoteBlock'; // TODO: Fix QuoteBlock interface
import ButtonBlock from './blocks/ButtonBlock';
import ColumnsBlock from './blocks/ColumnsBlock';
// Toast 기능을 직접 구현
import { CheckCircle, XCircle, Info } from 'lucide-react';

// Block interface는 이제 @/types/post.types에서 import

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
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);
  const [copiedBlock, setCopiedBlock] = useState<Block | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isDesignLibraryOpen, setIsDesignLibraryOpen] = useState(false);
  const navigate = useNavigate();
  
  // Simple toast function
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

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

  // Handle block copy
  const handleBlockCopy = useCallback(
    (blockId: string) => {
      const block = blocks.find((b) => b.id === blockId);
      if (block) {
        setCopiedBlock({ ...block });
        // 선택사항: 클립보드에도 복사
        const blockData = JSON.stringify(block);
        navigator.clipboard.writeText(blockData).catch(() => {
          // 클립보드 접근 실패 시 내부 상태만 사용
        });
      }
    },
    [blocks]
  );

  // Handle block paste
  const handleBlockPaste = useCallback(
    (afterBlockId?: string) => {
      if (copiedBlock) {
        const newBlock = {
          ...copiedBlock,
          id: `block-${Date.now()}`,
        };
        
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
  const handleSave = useCallback(async () => {
    try {
      showToast('Saving draft...', 'info');
      
      // API로 저장
      const response = await postApi.saveDraft({
        title: documentTitle,
        content: blocks,
        status: 'draft',
      });
      
      if (response.success) {
        setIsDirty(false);
        onSave?.();
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
      showToast('Publishing post...', 'info');
      
      // 먼저 게시글 생성/업데이트
      const response = await postApi.create({
        title: documentTitle,
        content: blocks,
        status: 'published',
      });
      
      if (response.success && response.data) {
        setIsDirty(false);
        onPublish?.();
        showToast('Post published successfully!', 'success');
        // 발행 후 게시글 페이지로 이동 (2초 후)
        setTimeout(() => {
          // navigate(`/posts/${response.data.id}`);
        }, 2000);
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

  // Handle drag start
  const handleDragStart = useCallback((blockId: string) => {
    setDraggedBlockId(blockId);
  }, []);

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent, blockId: string) => {
    e.preventDefault();
    setDragOverBlockId(blockId);
  }, []);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent, targetBlockId: string) => {
    e.preventDefault();
    
    if (!draggedBlockId || draggedBlockId === targetBlockId) {
      setDraggedBlockId(null);
      setDragOverBlockId(null);
      return;
    }

    const draggedIndex = blocks.findIndex(b => b.id === draggedBlockId);
    const targetIndex = blocks.findIndex(b => b.id === targetBlockId);
    
    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedBlockId(null);
      setDragOverBlockId(null);
      return;
    }

    const newBlocks = [...blocks];
    const [draggedBlock] = newBlocks.splice(draggedIndex, 1);
    
    // Insert at the correct position
    const insertIndex = draggedIndex < targetIndex ? targetIndex : targetIndex;
    newBlocks.splice(insertIndex, 0, draggedBlock);
    
    updateBlocks(newBlocks);
    setDraggedBlockId(null);
    setDragOverBlockId(null);
  }, [draggedBlockId, blocks, updateBlocks]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedBlockId(null);
    setDragOverBlockId(null);
  }, []);

  // Handle preview
  const handlePreview = useCallback(() => {
    // Create preview content
    const previewContent = {
      title: documentTitle,
      blocks: blocks,
    };
    
    // Store in session storage for preview page
    sessionStorage.setItem('previewContent', JSON.stringify(previewContent));
    
    // Open preview in new tab
    window.open('/preview', '_blank');
  }, [documentTitle, blocks]);

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
      // Delete key for block deletion
      if (e.key === 'Delete' && selectedBlockId && !e.shiftKey) {
        const target = e.target as HTMLElement;
        if (!target.isContentEditable && target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          handleBlockDelete(selectedBlockId);
        }
      }
      // Tab navigation between blocks
      if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (selectedBlockId) {
          const currentIndex = blocks.findIndex(b => b.id === selectedBlockId);
          if (e.shiftKey) {
            // Previous block
            if (currentIndex > 0) {
              setSelectedBlockId(blocks[currentIndex - 1].id);
            }
          } else {
            // Next block
            if (currentIndex < blocks.length - 1) {
              setSelectedBlockId(blocks[currentIndex + 1].id);
            }
          }
        } else if (blocks.length > 0) {
          setSelectedBlockId(blocks[0].id);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleUndo, handleRedo, isBlockInserterOpen, selectedBlockId, blocks, handleBlockDelete]);

  // Handle block type change
  const handleBlockTypeChange = useCallback(
    (blockId: string, newType: string) => {
      const newBlocks = blocks.map((block) => {
        if (block.id === blockId) {
          // Convert heading types
          if (newType.startsWith('core/heading-')) {
            const level = parseInt(newType.replace('core/heading-h', ''));
            return {
              ...block,
              type: 'core/heading',
              content: { text: typeof block.content === 'string' ? block.content : block.content?.text || '', level },
              attributes: block.attributes || {},
            };
          }
          // Convert to paragraph
          if (newType === 'core/paragraph') {
            return {
              ...block,
              type: 'core/paragraph',
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

  // Handle template application
  const handleApplyTemplate = useCallback(
    (templateBlocks: Block[]) => {
      // Replace all current blocks with template blocks, preserving document title
      updateBlocks(templateBlocks);
      setSelectedBlockId(null);
      showToast('템플릿이 적용되었습니다!', 'success');
    },
    [updateBlocks]
  );

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
      isDragging: draggedBlockId === block.id,
      onDragStart: () => handleDragStart(block.id),
      onDragOver: (e: React.DragEvent) => handleDragOver(e, block.id),
      onDrop: (e: React.DragEvent) => handleDrop(e, block.id),
      onDragEnd: handleDragEnd,
      onCopy: () => handleBlockCopy(block.id),
      onPaste: () => handleBlockPaste(block.id),
      onChangeType: (newType: string) => handleBlockTypeChange(block.id, newType),
    };

    const blockIndex = blocks.findIndex((b) => b.id === block.id);
    const enhancedProps = {
      ...commonProps,
      canMoveUp: blockIndex > 0,
      canMoveDown: blockIndex < blocks.length - 1,
    };

    switch (block.type) {
      case 'core/paragraph':
      case 'paragraph': // Support both formats
        return <SimplifiedParagraphBlock key={block.id} {...enhancedProps} onChangeType={commonProps.onChangeType} />;
      case 'core/heading':
      case 'heading': // Support both formats
        return (
          <EnhancedHeadingBlock
            key={block.id}
            {...enhancedProps}
            attributes={{ 
              level: block.content?.level || 2,
              ...block.attributes
            }}
            onChangeType={commonProps.onChangeType}
          />
        );
      case 'core/list':
      case 'list': // Support both formats
        return <ListBlock key={block.id} {...commonProps} />;
      case 'core/quote':
        // TODO: Fix QuoteBlock interface
        return <SimplifiedParagraphBlock key={block.id} {...enhancedProps} />;
      case 'core/image':
      case 'image': // Support both formats
        return <ImageBlock key={block.id} {...commonProps} />;
      case 'core/button':
      case 'button': // Support both formats
        return <ButtonBlock key={block.id} {...commonProps} />;
      case 'core/columns':
      case 'columns': // Support both formats
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
        onPreview={handlePreview}
        onOpenDesignLibrary={() => setIsDesignLibraryOpen(true)}
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
            {/* Title Section - WordPress-style two-tier design */}
            <div className="mb-10">
              {/* Title Preview Display */}
              <div className="mb-6">
                <h1 className="text-4xl font-light text-gray-800 leading-tight">
                  {documentTitle || 'Untitled Document'}
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
                      console.error('Invalid JSON');
                    }
                  }}
                  className="w-full min-h-[500px] font-mono text-sm p-4 border border-gray-300 rounded"
                />
              </div>
            ) : (
              <div className="blocks-container">
                {blocks.map((block) => (
                  <div
                    key={block.id}
                    className={`block-item ${
                      dragOverBlockId === block.id ? 'drag-over' : ''
                    } ${
                      selectedBlockId === block.id ? 'block-selected' : ''
                    }`}
                    onDragOver={(e) => handleDragOver(e, block.id)}
                    onDrop={(e) => handleDrop(e, block.id)}
                  >
                    {renderBlock(block)}
                  </div>
                ))}
              </div>
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
          onUploadFeaturedImage={async () => {
            // 미디어 업로드
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = async (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) {
                try {
                  // 업로드 진행률 표시 (선택사항)
                  const response = await mediaApi.upload(file, (_progress) => {
                    // TODO: 프로그레스 바 표시 - _progress%
                  });
                  
                  if (response.success && response.data) {
                    // TODO: Featured Image 상태 업데이트
                    // setFeaturedImage(response.data);
                  } else {
                    // TODO: 에러 알림 표시 - response.error
                  }
                } catch (error) {
                  // TODO: 에러 알림 표시 - 'Upload error'
                }
              }
            };
            input.click();
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
      
      {/* Simple Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg bg-white ${
            toast.type === 'success' ? 'border-green-200' :
            toast.type === 'error' ? 'border-red-200' :
            'border-blue-200'
          }`}>
            {toast.type === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
            {toast.type === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
            {toast.type === 'info' && <Info className="h-5 w-5 text-blue-500" />}
            <p className="text-sm font-medium text-gray-900">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Design Library Modal */}
      <DesignLibraryModal
        isOpen={isDesignLibraryOpen}
        onClose={() => setIsDesignLibraryOpen(false)}
        onApplyTemplate={handleApplyTemplate}
      />
    </div>
  );
};

export default GutenbergBlockEditor;