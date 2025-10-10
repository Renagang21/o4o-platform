/**
 * BlockWrapper Component
 * Unified wrapper for all blocks with selection, hover, and drag-and-drop support
 */

import React, { useState, useRef } from 'react';
import { BlockDragHandle } from './BlockDragHandle';
import { BlockControls } from './BlockControls';

interface BlockWrapperProps {
  blockId: string;
  blockType: string;
  isSelected?: boolean;
  isMultiSelected?: boolean;
  children: React.ReactNode;
  onSelect?: (blockId: string) => void;
  onDragStart?: (blockId: string, e: React.DragEvent) => void;
  onDragEnd?: (blockId: string, e: React.DragEvent) => void;
  onDragOver?: (blockId: string, e: React.DragEvent) => void;
  onDrop?: (targetBlockId: string, draggedBlockId: string, e: React.DragEvent) => void;
  onDuplicate?: (blockId: string) => void;
  onDelete?: (blockId: string) => void;
  onMoveUp?: (blockId: string) => void;
  onMoveDown?: (blockId: string) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  className?: string;
}

export const BlockWrapper: React.FC<BlockWrapperProps> = ({
  blockId,
  blockType,
  isSelected = false,
  isMultiSelected = false,
  children,
  onSelect,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp = true,
  canMoveDown = true,
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const blockRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    // Only select if clicking on the wrapper, not on interactive elements
    if (e.target === blockRef.current || e.target === e.currentTarget) {
      onSelect?.(blockId);
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setIsDropTarget(true);
    onDragOver?.(blockId, e);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropTarget(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropTarget(false);

    const draggedBlockId = e.dataTransfer.getData('application/block-id') ||
                           e.dataTransfer.getData('text/plain');

    if (draggedBlockId && draggedBlockId !== blockId) {
      onDrop?.(blockId, draggedBlockId, e);
    }
  };

  const classNames = [
    'block-editor-block',
    isSelected && 'is-selected',
    isMultiSelected && 'is-multi-selected',
    isHovered && 'is-hovered',
    isDropTarget && 'is-drop-target',
    className
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={blockRef}
      className={classNames}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-block-id={blockId}
      data-block-type={blockType}
      tabIndex={isSelected ? 0 : -1}
      role="article"
      aria-label={`${blockType.replace('core/', '').replace('o4o/', '')} block${isSelected ? ', selected' : ''}`}
      aria-selected={isSelected}
      aria-describedby={isSelected ? `block-desc-${blockId}` : undefined}
    >
      {/* Drag Handle */}
      <BlockDragHandle
        blockId={blockId}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      />

      {/* Block Type Label */}
      <div className="block-editor-block__type-label">
        {blockType}
      </div>

      {/* Block Controls */}
      <BlockControls
        blockId={blockId}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
      />

      {/* Block Content */}
      <div className="block-editor-block__content">
        {children}
      </div>

      {/* Screen reader description */}
      {isSelected && (
        <div id={`block-desc-${blockId}`} className="sr-only">
          {blockType.replace('core/', '').replace('o4o/', '')} block is selected.
          Press Tab to move to next block, Shift+Tab for previous.
          Press Enter to add a new block after this one.
          Press Delete or Backspace to remove empty blocks.
          Press Ctrl+D to duplicate this block.
          {canMoveUp && ' Press up arrow to select previous block.'}
          {canMoveDown && ' Press down arrow to select next block.'}
        </div>
      )}
    </div>
  );
};

export default BlockWrapper;
