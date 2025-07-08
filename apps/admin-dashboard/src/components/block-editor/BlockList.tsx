import React from 'react';
import { BlockType } from '@/types/block-editor';
import { SortableBlock } from './SortableBlock';

interface BlockListProps {
  blocks: BlockType[];
  selectedBlockId: string | null;
  readOnly?: boolean;
  onError?: (error: string) => void;
}

export const BlockList: React.FC<BlockListProps> = ({
  blocks,
  selectedBlockId,
  readOnly = false,
  onError
}) => {
  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className="block-list space-y-4">
      {blocks.map((block, index) => (
        <SortableBlock
          key={block.id}
          block={block}
          index={index}
          isSelected={selectedBlockId === block.id}
          readOnly={readOnly}
          onError={onError}
        />
      ))}
    </div>
  );
};