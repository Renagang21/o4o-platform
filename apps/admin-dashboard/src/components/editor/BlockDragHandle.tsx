/**
 * BlockDragHandle Component
 * Drag handle for WordPress Gutenberg-style block reordering
 */

import React from 'react';

interface BlockDragHandleProps {
  blockId: string;
  onDragStart?: (blockId: string, e: React.DragEvent) => void;
  onDragEnd?: (blockId: string, e: React.DragEvent) => void;
  className?: string;
}

export const BlockDragHandle: React.FC<BlockDragHandleProps> = ({
  blockId,
  onDragStart,
  onDragEnd,
  className = ''
}) => {
  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    // Set drag data
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', blockId);
    e.dataTransfer.setData('application/block-id', blockId);

    // Add dragging class to block
    const blockElement = (e.target as HTMLElement).closest('.block-editor-block');
    if (blockElement) {
      blockElement.classList.add('is-dragging');
    }

    onDragStart?.(blockId, e);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();

    // Remove dragging class
    const blockElement = (e.target as HTMLElement).closest('.block-editor-block');
    if (blockElement) {
      blockElement.classList.remove('is-dragging');
    }

    onDragEnd?.(blockId, e);
  };

  return (
    <button
      className={`block-editor-block__drag-handle ${className}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      aria-label="Drag to reorder block"
      title="Drag to reorder"
      type="button"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="16"
        height="16"
        aria-hidden="true"
        focusable="false"
      >
        {/* Six dots icon (⋮⋮) */}
        <path d="M8 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm8-12a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
      </svg>
    </button>
  );
};

export default BlockDragHandle;
