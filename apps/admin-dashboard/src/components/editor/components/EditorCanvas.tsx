import { FC, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { BlockWrapper } from './BlockWrapper';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import type { Block, ThemeConfig } from '../types';

interface EditorCanvasProps {
  blocks: Block[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  onUpdateBlock: (id: string, updates: Partial<Block>) => void;
  onDeleteBlock: (id: string) => void;
  onMoveBlock: (id: string, direction: 'up' | 'down') => void;
  onDuplicateBlock: (id: string) => void;
  onAddBlock: (type: string, afterId?: string) => void;
  setBlocks: React.Dispatch<React.SetStateAction<Block[]>>;
  theme: ThemeConfig | null;
}

export const EditorCanvas: FC<EditorCanvasProps> = ({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onUpdateBlock,
  onDeleteBlock,
  onMoveBlock,
  onDuplicateBlock,
  onAddBlock,
  setBlocks,
  theme
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // 드래그앤드롭 훅 사용
  const {
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    getDropIndicatorStyle,
    getDraggingStyle,
    isDragging
  } = useDragAndDrop(blocks, setBlocks);

  // 클릭 외부 영역 감지
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (canvasRef.current && !canvasRef.current.contains(e.target as Node)) {
        onSelectBlock(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onSelectBlock]);

  // 테마 스타일 적용
  const canvasStyle = theme ? {
    maxWidth: theme.layout?.contentWidth || '840px',
    fontFamily: theme.typography?.fontFamily?.body || 'inherit',
    fontSize: theme.typography?.fontSize?.base || '16px',
    lineHeight: theme.typography?.lineHeight?.body || 1.6,
    color: theme.colors?.text || '#000000'
  } : {};

  return (
    <div className="editor-canvas-wrapper min-h-full bg-gray-50">
      <div 
        ref={canvasRef}
        className="editor-canvas mx-auto py-8 px-6"
        style={canvasStyle}
      >
        {/* 빈 상태 또는 첫 블록 추가 */}
        {blocks.length === 0 ? (
          <div className="empty-canvas text-center py-16">
            <p className="text-gray-500 mb-4">콘텐츠를 추가하려면 블록을 선택하세요</p>
            <button
              onClick={() => onAddBlock('paragraph')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              첫 블록 추가
            </button>
          </div>
        ) : (
          <div className="blocks-container space-y-1">
            {blocks.map((block, index) => (
              <div 
                key={block.id} 
                className="block-item-wrapper relative"
                draggable
                onDragStart={(e) => handleDragStart(e, block.id)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, block.id)}
                onDragEnter={(e) => handleDragEnter(e, block.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, block.id)}
                style={{
                  ...getDraggingStyle(block.id),
                  position: 'relative'
                }}
              >
                {/* 드롭 인디케이터 */}
                <div 
                  className="drop-indicator"
                  style={getDropIndicatorStyle(block.id)}
                />
                
                {/* 블록 사이 추가 버튼 */}
                {index === 0 && !isDragging && (
                  <BlockInserterButton
                    onClick={(type) => onAddBlock(type, undefined)}
                    position="before"
                  />
                )}
                
                {/* 블록 래퍼 */}
                <BlockWrapper
                  block={block}
                  blocks={blocks}
                  setBlocks={setBlocks}
                  isSelected={selectedBlockId === block.id}
                  onSelect={() => onSelectBlock(block.id)}
                  onUpdate={(updates) => onUpdateBlock(block.id, updates)}
                  onDelete={() => onDeleteBlock(block.id)}
                  onMoveUp={() => index > 0 && onMoveBlock(block.id, 'up')}
                  onMoveDown={() => index < blocks.length - 1 && onMoveBlock(block.id, 'down')}
                  onDuplicate={() => onDuplicateBlock(block.id)}
                  theme={theme}
                />
                
                {/* 블록 사이 추가 버튼 */}
                {!isDragging && (
                  <BlockInserterButton
                    onClick={(type) => onAddBlock(type, block.id)}
                    position="after"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// 블록 사이 추가 버튼 컴포넌트
const BlockInserterButton: FC<{
  onClick: (type: string) => void;
  position: 'before' | 'after';
}> = ({ onClick, position }) => {
  return (
    <div className={`block-inserter-line group relative h-4 -my-2 ${position === 'before' ? '-mt-4' : ''}`}>
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2">
          <div className="h-px bg-blue-400 flex-1 w-16"></div>
          <button
            onClick={() => onClick('paragraph')}
            className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors"
            title="블록 추가"
          >
            <Plus className="w-4 h-4" />
          </button>
          <div className="h-px bg-blue-400 flex-1 w-16"></div>
        </div>
      </div>
    </div>
  );
};