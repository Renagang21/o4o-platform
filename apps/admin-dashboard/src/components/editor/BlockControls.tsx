/**
 * BlockControls Component
 * Top-right action buttons for blocks (duplicate, delete, etc.)
 */

import React from 'react';
import { Copy, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

interface BlockControlsProps {
  blockId: string;
  onDuplicate?: (blockId: string) => void;
  onDelete?: (blockId: string) => void;
  onMoveUp?: (blockId: string) => void;
  onMoveDown?: (blockId: string) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  className?: string;
}

export const BlockControls: React.FC<BlockControlsProps> = ({
  blockId,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp = true,
  canMoveDown = true,
  className = ''
}) => {
  return (
    <div className={`block-editor-block__controls ${className}`}>
      {onMoveUp && canMoveUp && (
        <button
          className="block-editor-block__control-button"
          onClick={() => onMoveUp(blockId)}
          aria-label="Move block up"
          title="Move up"
          type="button"
        >
          <ChevronUp size={16} />
        </button>
      )}

      {onMoveDown && canMoveDown && (
        <button
          className="block-editor-block__control-button"
          onClick={() => onMoveDown(blockId)}
          aria-label="Move block down"
          title="Move down"
          type="button"
        >
          <ChevronDown size={16} />
        </button>
      )}

      {onDuplicate && (
        <button
          className="block-editor-block__control-button"
          onClick={() => onDuplicate(blockId)}
          aria-label="Duplicate block"
          title="Duplicate"
          type="button"
        >
          <Copy size={16} />
        </button>
      )}

      {onDelete && (
        <button
          className="block-editor-block__control-button block-editor-block__control-button--remove"
          onClick={() => onDelete(blockId)}
          aria-label="Remove block"
          title="Remove"
          type="button"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
};

export default BlockControls;
