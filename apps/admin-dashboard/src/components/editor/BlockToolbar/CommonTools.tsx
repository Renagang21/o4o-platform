/**
 * CommonTools Component
 * Common toolbar buttons for all blocks (drag, type change, more options)
 */

import React, { useState, useRef, useEffect } from 'react';
import { GripVertical, RefreshCw, MoreVertical, Copy, Trash2, ArrowUp, ArrowDown, Plus } from 'lucide-react';

interface CommonToolsProps {
  blockId: string;
  blockType: string;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onChangeType?: (newType: string) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

const CommonTools: React.FC<CommonToolsProps> = ({
  blockId,
  blockType,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onChangeType,
  canMoveUp = true,
  canMoveDown = true,
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const typeMenuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
      if (typeMenuRef.current && !typeMenuRef.current.contains(e.target as Node)) {
        setIsTypeMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Block type options based on current type
  const getTypeOptions = () => {
    const baseTypes = [
      { value: 'core/paragraph', label: 'Paragraph' },
      { value: 'core/heading-h2', label: 'Heading 2' },
      { value: 'core/heading-h3', label: 'Heading 3' },
      { value: 'core/heading-h4', label: 'Heading 4' },
      { value: 'core/quote', label: 'Quote' },
      { value: 'core/list', label: 'List' },
    ];

    // Filter out current type
    return baseTypes.filter(type => {
      if (blockType === 'core/heading') {
        return !type.value.startsWith('core/heading');
      }
      return type.value !== blockType;
    });
  };

  const handleTypeChange = (newType: string) => {
    onChangeType?.(newType);
    setIsTypeMenuOpen(false);
  };

  const getBlockTypeName = () => {
    if (blockType === 'core/paragraph') return 'Paragraph';
    if (blockType === 'core/heading') return 'Heading';
    if (blockType === 'core/quote') return 'Quote';
    if (blockType === 'core/list') return 'List';
    if (blockType === 'core/image') return 'Image';
    if (blockType === 'core/button') return 'Button';
    return blockType.replace('core/', '').replace('o4o/', '');
  };

  return (
    <>
      {/* Drag Handle */}
      <button
        type="button"
        className="block-editor-block-toolbar__button"
        title="Drag to reorder"
        aria-label="Drag handle"
      >
        <GripVertical size={20} />
      </button>

      {/* Block Type Converter */}
      <div className="block-editor-block-toolbar__group" ref={typeMenuRef} style={{ position: 'relative' }}>
        <button
          type="button"
          className="block-editor-block-toolbar__button"
          title="Change block type"
          aria-label="Change block type"
          onClick={() => setIsTypeMenuOpen(!isTypeMenuOpen)}
        >
          <RefreshCw size={20} />
        </button>

        {isTypeMenuOpen && (
          <div className="block-editor-block-toolbar__menu">
            <div className="block-editor-block-toolbar__menu-header">
              Change to:
            </div>
            {getTypeOptions().map(option => (
              <button
                key={option.value}
                type="button"
                className="block-editor-block-toolbar__menu-item"
                onClick={() => handleTypeChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="block-editor-block-toolbar__separator" />

      {/* More Options */}
      <div className="block-editor-block-toolbar__group" ref={moreMenuRef} style={{ position: 'relative' }}>
        <button
          type="button"
          className="block-editor-block-toolbar__button"
          title="More options"
          aria-label="More options"
          onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
        >
          <MoreVertical size={20} />
        </button>

        {isMoreMenuOpen && (
          <div className="block-editor-block-toolbar__menu block-editor-block-toolbar__menu--right">
            <button
              type="button"
              className="block-editor-block-toolbar__menu-item"
              onClick={() => {
                onDuplicate?.();
                setIsMoreMenuOpen(false);
              }}
            >
              <Copy size={16} />
              <span>Duplicate</span>
              <kbd>⌘D</kbd>
            </button>

            {canMoveUp && (
              <button
                type="button"
                className="block-editor-block-toolbar__menu-item"
                onClick={() => {
                  onMoveUp?.();
                  setIsMoreMenuOpen(false);
                }}
              >
                <ArrowUp size={16} />
                <span>Move Up</span>
              </button>
            )}

            {canMoveDown && (
              <button
                type="button"
                className="block-editor-block-toolbar__menu-item"
                onClick={() => {
                  onMoveDown?.();
                  setIsMoreMenuOpen(false);
                }}
              >
                <ArrowDown size={16} />
                <span>Move Down</span>
              </button>
            )}

            <div className="block-editor-block-toolbar__menu-separator" />

            <button
              type="button"
              className="block-editor-block-toolbar__menu-item is-destructive"
              onClick={() => {
                onDelete?.();
                setIsMoreMenuOpen(false);
              }}
            >
              <Trash2 size={16} />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default CommonTools;
