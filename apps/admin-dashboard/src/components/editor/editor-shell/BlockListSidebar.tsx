/**
 * BlockListSidebar Component
 * Left sidebar showing list of all blocks in the document
 */

import React from 'react';
import { Block } from '@/types/post.types';
import { BlockListItem } from '../BlockListItem';

interface BlockListSidebarProps {
  blocks: Block[];
  selectedBlockId: string | null;
  draggedBlockId: string | null;
  hideHeader: boolean;
  onSelectBlock: (blockId: string) => void;
  onMoveUp: (blockId: string) => void;
  onMoveDown: (blockId: string) => void;
  onDuplicate: (blockId: string) => void;
  onDelete: (blockId: string) => void;
  onDragStart: (blockId: string, e: React.DragEvent) => void;
  onDragEnd: (blockId: string, e: React.DragEvent) => void;
  onDragOver: (blockId: string, e: React.DragEvent) => void;
  onDrop: (blockId: string, draggedId: string, e: React.DragEvent) => void;
}

export const BlockListSidebar: React.FC<BlockListSidebarProps> = ({
  blocks,
  selectedBlockId,
  draggedBlockId,
  hideHeader,
  onSelectBlock,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}) => {
  return (
    <div
      className="fixed left-0 bottom-0 w-64 bg-white border-r border-gray-200 overflow-y-auto z-40 shadow-lg"
      style={{ top: hideHeader ? '55px' : '56px' }}
    >
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">
          Block List
        </h3>
        {blocks.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No blocks yet</p>
        ) : (
          <div className="space-y-1">
            {blocks.map((block, index) => {
              const blockContent = typeof block.content === 'string'
                ? block.content
                : block.content?.text || '';
              const preview = (blockContent || '').replace(/<[^>]*>/g, '').substring(0, 50);

              return (
                <BlockListItem
                  key={block.id}
                  blockId={block.id}
                  blockType={block.type}
                  blockIndex={index}
                  blockPreview={preview}
                  isSelected={selectedBlockId === block.id}
                  canMoveUp={index > 0}
                  canMoveDown={index < blocks.length - 1}
                  isDragging={draggedBlockId === block.id}
                  onSelect={() => {
                    onSelectBlock(block.id);
                    // Scroll to block
                    const blockElement = document.querySelector(`[data-block-id="${block.id}"]`);
                    if (blockElement) {
                      blockElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }}
                  onMoveUp={() => onMoveUp(block.id)}
                  onMoveDown={() => onMoveDown(block.id)}
                  onDuplicate={() => onDuplicate(block.id)}
                  onDelete={() => onDelete(block.id)}
                  onDragStart={(e) => onDragStart(block.id, e)}
                  onDragEnd={(e) => onDragEnd(block.id, e)}
                  onDragOver={(e) => onDragOver(block.id, e)}
                  onDrop={(e) => {
                    const draggedId = e.dataTransfer.getData('application/block-id') || e.dataTransfer.getData('text/plain');
                    onDrop(block.id, draggedId, e);
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
