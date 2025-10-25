/**
 * BlockAddButton Component
 *
 * Add block button that appears between blocks
 * Extracted from EnhancedBlockWrapper to reduce complexity
 */

import { Plus } from 'lucide-react';

export interface BlockAddButtonProps {
  /** Button position */
  position: 'top' | 'bottom';
  /** Add block handler */
  onAddBlock: (position: 'before' | 'after') => void;
  /** Show button flag */
  show: boolean;
}

/**
 * Add block button component
 *
 * Features:
 * - Appears on hover between blocks
 * - Positioned at top or bottom of block
 * - Smooth opacity transition
 * - Calls onAddBlock with 'before' or 'after' position
 *
 * @example
 * ```typescript
 * <BlockAddButton
 *   position="top"
 *   onAddBlock={(pos) => handleAddBlock(pos)}
 *   show={isHovered && !isSelected}
 * />
 * ```
 */
export const BlockAddButton: React.FC<BlockAddButtonProps> = ({
  position,
  onAddBlock,
  show,
}) => {
  if (!show) return null;

  const clickPosition = position === 'top' ? 'before' : 'after';
  const title = position === 'top' ? 'Add block before' : 'Add block after';

  return (
    <button
      className={`absolute ${
        position === 'top' ? '-top-3' : '-bottom-3'
      } left-1/2 -translate-x-1/2 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-1 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-all duration-200 z-40 shadow-md hover:shadow-lg`}
      onClick={(e) => {
        e.stopPropagation();
        onAddBlock(clickPosition);
      }}
      title={title}
    >
      <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
    </button>
  );
};
