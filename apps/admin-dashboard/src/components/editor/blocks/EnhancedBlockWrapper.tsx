/**
 * EnhancedBlockWrapper Component (Refactored)
 * 향상된 블록 래퍼 - 완벽한 블록 조작 기능
 *
 * Refactored to use:
 * - useBlockToolbar hook (toolbar positioning)
 * - useBlockFocus hook (auto-focus logic)
 * - useBlockKeyboard hook (keyboard shortcuts)
 * - BlockToolbar component (toolbar UI)
 * - BlockAddButton component (add buttons)
 */

import { useState, useRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useBlockToolbar } from '../hooks/useBlockToolbar';
import { useBlockFocus } from '../hooks/useBlockFocus';
import { useBlockKeyboard } from '../hooks/useBlockKeyboard';
import { BlockToolbar } from './shared/BlockToolbar';
import { BlockAddButton } from './shared/BlockAddButton';
import type { BaseEditor } from 'slate';
import type { ReactEditor } from 'slate-react';

interface EnhancedBlockWrapperProps {
  id: string;
  type: string;
  children: ReactNode;
  isSelected: boolean;
  onSelect: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onAddBlock?: (position: 'before' | 'after') => void;
  onCopy?: () => void;
  onPaste?: () => void;
  isDragging?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  className?: string;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  customToolbarContent?: ReactNode;
  customSidebarContent?: ReactNode;
  onAlignChange?: (align: 'left' | 'center' | 'right' | 'justify') => void;
  currentAlign?: 'left' | 'center' | 'right' | 'justify';
  onToggleBold?: () => void;
  onToggleItalic?: () => void;
  onToggleLink?: () => void;
  onChangeType?: (newType: string) => void;
  currentType?: string;
  isBold?: boolean;
  isItalic?: boolean;

  // Optional: Simple mode configuration
  variant?: 'simple' | 'enhanced'; // Default: 'enhanced'
  showToolbar?: boolean;           // Default: true (enhanced), false (simple)
  showAddButtons?: boolean;        // Default: true (enhanced), false (simple)
  enableKeyboardShortcuts?: boolean; // Default: true (enhanced), false (simple)
  disableAutoFocus?: boolean;      // Disable auto-focus (for Slate.js blocks)

  // Slate.js editor support
  slateEditor?: BaseEditor & ReactEditor; // Pass Slate editor for proper focus handling

  // Optional label for display purposes (used by some blocks for Inspector)
  label?: string;
}

const EnhancedBlockWrapper: React.FC<EnhancedBlockWrapperProps> = ({
  id,
  type,
  children,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onAddBlock,
  onCopy,
  onPaste,
  isDragging = false,
  canMoveUp = true,
  canMoveDown = true,
  className,
  onDragStart,
  onDragOver: _onDragOver,
  onDrop: _onDrop,
  onDragEnd,
  customToolbarContent,
  onAlignChange,
  currentAlign = 'left',
  onToggleBold,
  onToggleItalic,
  onToggleLink,
  onChangeType,
  currentType,
  isBold = false,
  isItalic = false,
  variant = 'enhanced',
  showToolbar: showToolbarProp,
  showAddButtons: showAddButtonsProp,
  enableKeyboardShortcuts: enableKeyboardShortcutsProp,
  disableAutoFocus = false,
  slateEditor
}) => {
  // Determine feature flags based on variant
  const isSimpleMode = variant === 'simple';
  const showToolbar = showToolbarProp !== undefined ? showToolbarProp : !isSimpleMode;
  const showAddButtons = showAddButtonsProp !== undefined ? showAddButtonsProp : !isSimpleMode;
  const enableKeyboardShortcuts = enableKeyboardShortcutsProp !== undefined ? enableKeyboardShortcutsProp : !isSimpleMode;
  const [isHovered, setIsHovered] = useState(false);
  const blockRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Use toolbar positioning hook
  const { showToolbar: shouldShowToolbar, toolbarPosition } = useBlockToolbar({
    blockRef,
    isSelected,
    isHovered,
  });

  // Use auto-focus hook (supports both DOM and Slate editors)
  useBlockFocus({
    blockRef,
    isSelected: disableAutoFocus ? false : isSelected,
    slateEditor,
  });

  // Use keyboard shortcuts hook (only if enabled)
  useBlockKeyboard({
    isSelected: enableKeyboardShortcuts ? isSelected : false,
    onDelete,
    onCopy,
    onPaste,
    onDuplicate,
    onMoveUp,
    onMoveDown,
    onAddBlock,
    canMoveUp,
    canMoveDown,
  });

  return (
    <div
      ref={blockRef}
      data-block-id={id}
      data-block-type={type}
      className={cn(
        'block-wrapper group relative transition-all duration-200',
        'mb-2', // Reduced margin between blocks for compact editing
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => {
        // Only select if not already selected to prevent unnecessary re-renders
        if (!isSelected) {
          onSelect();
        }
      }}
    >
      {/* Block toolbar */}
      {showToolbar && shouldShowToolbar && isSelected && (
        <BlockToolbar
          ref={toolbarRef}
          id={id}
          type={type}
          position={toolbarPosition}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onAddBlock={onAddBlock}
          onCopy={onCopy}
          onPaste={onPaste}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          customToolbarContent={customToolbarContent}
          onAlignChange={onAlignChange}
          currentAlign={currentAlign}
          onToggleBold={onToggleBold}
          onToggleItalic={onToggleItalic}
          onToggleLink={onToggleLink}
          onChangeType={onChangeType}
          currentType={currentType}
          isBold={isBold}
          isItalic={isItalic}
        />
      )}

      {/* Add block button - top */}
      {showAddButtons && onAddBlock && (
        <BlockAddButton
          position="top"
          onAddBlock={onAddBlock}
          show={isHovered}
        />
      )}

      {/* Block content */}
      <div
        className={cn(
          'block-content relative',
          isDragging && 'opacity-50'
        )}
      >
        {children}
      </div>

      {/* Add block button - bottom */}
      {showAddButtons && onAddBlock && (
        <BlockAddButton
          position="bottom"
          onAddBlock={onAddBlock}
          show={isHovered}
        />
      )}
    </div>
  );
};

export default EnhancedBlockWrapper;
