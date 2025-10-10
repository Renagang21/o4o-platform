/**
 * BlockInserterButton Component
 * + button that appears between blocks for quick insertion
 */

import React, { useState } from 'react';
import { Plus } from 'lucide-react';

interface BlockInserterButtonProps {
  onInsert: (position: 'before' | 'after') => void;
  position?: 'between' | 'end';
  className?: string;
}

export const BlockInserterButton: React.FC<BlockInserterButtonProps> = ({
  onInsert,
  position = 'between',
  className = '',
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`block-inserter ${position === 'end' ? 'block-inserter--end' : ''} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="block-inserter__line"></div>
      <button
        type="button"
        className={`block-inserter__button ${isHovered ? 'is-visible' : ''}`}
        onClick={() => onInsert(position === 'end' ? 'after' : 'after')}
        aria-label="Add block"
        title="Add block"
      >
        <Plus size={18} strokeWidth={2.5} />
      </button>
    </div>
  );
};

export default BlockInserterButton;
