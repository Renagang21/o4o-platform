import React, { useEffect, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useSensors,
  useSensor,
  PointerSensor,
  KeyboardSensor,
  closestCorners
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { useBlockEditorStore } from '@/stores/block-editor-store';
import { BlockType } from '@/types/block-editor';
import { BlockList } from './BlockList';
import { BlockInserter } from './BlockInserter';
import { EditorToolbar } from './EditorToolbar';
import { InspectorPanel } from './InspectorPanel';
import { Card } from '@/components/ui/card';

interface BlockEditorProps {
  initialBlocks?: BlockType[];
  onSave?: (data: { blocks: BlockType[] }) => void;
  autoSave?: boolean;
  autoSaveInterval?: number;
  readOnly?: boolean;
  className?: string;
}

export const BlockEditor: React.FC<BlockEditorProps> = ({
  initialBlocks = [],
  onSave,
  autoSave = false,
  autoSaveInterval = 30000, // 30초
  readOnly = false,
  className = ''
}) => {
  const {
    blocks,
    selectedBlockId,
    isDragging,
    isLoading,
    error,
    loadBlocks,
    moveBlock,
    selectBlock,
    getEditorData,
    setError
  } = useBlockEditorStore();

  // DnD 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px 이동 후 드래그 시작
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 초기 데이터 로드
  useEffect(() => {
    if (initialBlocks.length > 0) {
      loadBlocks(initialBlocks);
    }
  }, [initialBlocks, loadBlocks]);

  // 자동 저장
  useEffect(() => {
    if (!autoSave || !onSave) return;

    const interval = setInterval(() => {
      const data = getEditorData();
      if (data.blocks.length > 0) {
        onSave(data);
      }
    }, autoSaveInterval);

    return () => clearInterval(interval);
  }, [autoSave, autoSaveInterval, onSave, getEditorData]);

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (readOnly) return;

      // Ctrl/Cmd + S: 저장
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        if (onSave) {
          onSave(getEditorData());
        }
      }

      // Escape: 블록 선택 해제
      if (event.key === 'Escape') {
        selectBlock(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [readOnly, onSave, getEditorData, selectBlock]);

  // 드래그 시작
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    selectBlock(active.id as string);
  }, [selectBlock]);

  // 드래그 종료
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex(block => block.id === active.id);
      const newIndex = blocks.findIndex(block => block.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        moveBlock(active.id as string, newIndex);
      }
    }
  }, [blocks, moveBlock]);

  // 에러 처리
  const handleError = useCallback((error: string) => {
    setError(error);
    console.error('BlockEditor Error:', error);
  }, [setError]);

  // 블록 ID 배열 (드래그 앤 드롭용)
  const blockIds = blocks.map(block => block.id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">에디터를 로드하는 중...</span>
      </div>
    );
  }

  return (
    <div className={`block-editor flex ${className}`}>
      {/* 메인 에디터 영역 */}
      <div className="flex-1 min-w-0">
        {/* 툴바 */}
        {!readOnly && (
          <EditorToolbar
            onSave={onSave ? () => onSave(getEditorData()) : undefined}
            className="mb-4"
          />
        )}

        {/* 에러 표시 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-1 text-red-600 hover:text-red-800 text-xs underline"
            >
              닫기
            </button>
          </div>
        )}

        {/* 에디터 콘텐츠 */}
        <Card className="p-6">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                <BlockList 
                  blocks={blocks}
                  selectedBlockId={selectedBlockId}
                  readOnly={readOnly}
                  onError={handleError}
                />
                
                {/* 블록 추가 버튼 */}
                {!readOnly && blocks.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">
                      첫 번째 블록을 추가하여 콘텐츠 작성을 시작하세요.
                    </p>
                    <BlockInserter />
                  </div>
                )}
                
                {!readOnly && blocks.length > 0 && (
                  <div className="mt-4">
                    <BlockInserter />
                  </div>
                )}
              </div>
            </SortableContext>

            {/* 드래그 오버레이 */}
            <DragOverlay>
              {isDragging && selectedBlockId && (
                <div className="opacity-50">
                  {/* 드래그 중인 블록의 미리보기 */}
                  <Card className="p-4 border-2 border-blue-500">
                    <div className="text-gray-600">블록 이동 중...</div>
                  </Card>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </Card>
      </div>

      {/* 인스펙터 패널 */}
      {!readOnly && (
        <div className="w-80 ml-6">
          <InspectorPanel />
        </div>
      )}
    </div>
  );
};