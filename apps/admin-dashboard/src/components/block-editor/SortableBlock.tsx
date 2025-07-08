import React, { useState, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BlockType } from '@/types/block-editor';
import { useBlockEditorStore } from '@/stores/block-editor-store';
import { blockRegistry } from '@/lib/block-registry';
import { BlockToolbar } from './BlockToolbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, Plus } from 'lucide-react';
import { BlockInserter } from './BlockInserter';

interface SortableBlockProps {
  block: BlockType;
  index: number;
  isSelected: boolean;
  readOnly?: boolean;
  onError?: (error: string) => void;
}

export const SortableBlock: React.FC<SortableBlockProps> = ({
  block,
  index,
  isSelected,
  readOnly = false,
  onError
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showInserter, setShowInserter] = useState(false);

  const { selectBlock, updateBlock, deleteBlock, duplicateBlock } = useBlockEditorStore();

  // 드래그 앤 드롭 설정
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: block.id,
    disabled: readOnly || isEditing
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  // 블록 정의 가져오기
  const blockDefinition = blockRegistry.getBlock(block.type);
  
  if (!blockDefinition) {
    return (
      <Card className="p-4 border-red-200 bg-red-50">
        <p className="text-red-600 text-sm">
          알 수 없는 블록 타입: {block.type}
        </p>
      </Card>
    );
  }

  const BlockComponent = blockDefinition.component;

  // 블록 선택
  const handleSelect = useCallback(() => {
    if (readOnly) return;
    selectBlock(block.id);
  }, [block.id, selectBlock, readOnly]);

  // 블록 속성 변경
  const handleChange = useCallback((attributes: Partial<BlockType['attributes']>) => {
    updateBlock(block.id, attributes);
  }, [block.id, updateBlock]);

  // 블록 삭제
  const handleDelete = useCallback(() => {
    deleteBlock(block.id);
  }, [block.id, deleteBlock]);

  // 블록 복제
  const handleDuplicate = useCallback(() => {
    duplicateBlock(block.id);
  }, [block.id, duplicateBlock]);

  // 편집 모드 토글
  const handleEditToggle = useCallback(() => {
    setIsEditing(prev => !prev);
  }, []);

  // 에러 처리
  const handleError = useCallback((error: string) => {
    if (onError) {
      onError(`Block ${block.id}: ${error}`);
    }
  }, [block.id, onError]);

  return (
    <div className="relative group">
      {/* 블록 위 인서터 */}
      {!readOnly && showInserter && (
        <div className="mb-4">
          <BlockInserter
            position={index}
            onInsert={() => setShowInserter(false)}
            onCancel={() => setShowInserter(false)}
          />
        </div>
      )}

      <div
        ref={setNodeRef}
        style={style}
        className={`
          relative transition-all duration-200
          ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
          ${isHovered && !isSelected ? 'ring-1 ring-gray-300' : ''}
          ${isDragging ? 'z-50' : ''}
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleSelect}
      >
        {/* 블록 툴바 */}
        {(isSelected || isHovered) && !readOnly && !isDragging && (
          <BlockToolbar
            block={block}
            isEditing={isEditing}
            onEdit={handleEditToggle}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onMoveUp={index > 0 ? () => {} : undefined} // TODO: 구현 필요
            onMoveDown={index < 10 ? () => {} : undefined} // TODO: 구현 필요
            className="absolute -top-12 left-0 z-10"
          />
        )}

        {/* 드래그 핸들 */}
        {!readOnly && (isSelected || isHovered) && (
          <div
            {...attributes}
            {...listeners}
            className="absolute -left-8 top-2 p-1 cursor-grab active:cursor-grabbing opacity-50 hover:opacity-100 transition-opacity"
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </div>
        )}

        {/* 실제 블록 컴포넌트 */}
        <div className="block-content">
          <BlockComponent
            block={block}
            isSelected={isSelected}
            isEditing={isEditing}
            onChange={handleChange}
            onSelect={handleSelect}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
          />
        </div>

        {/* 블록 아래 인서터 버튼 */}
        {!readOnly && (isSelected || isHovered) && (
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 rounded-full bg-white border border-gray-300 shadow-sm hover:bg-gray-50"
              onClick={(e) => {
                e.stopPropagation();
                setShowInserter(true);
              }}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};