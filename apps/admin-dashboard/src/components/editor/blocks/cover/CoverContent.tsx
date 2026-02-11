/**
 * CoverContent Component
 * Manages inner content blocks and positioning within Cover Block
 */

import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Plus,
  Type,
  Heading,
  MousePointer,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Underline,
  Link,
  Palette,
  ChevronDown,
  GripVertical,
  Trash2,
  Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LayoutGrid, CoverPosition, getPositionClassName } from '../shared/LayoutGrid';
import {
  CoverInnerBlock,
  CoverLayoutSettings
} from './types';

interface CoverContentProps {
  innerBlocks: CoverInnerBlock[];
  layout: CoverLayoutSettings;
  onInnerBlocksChange: (blocks: CoverInnerBlock[]) => void;
  onLayoutChange: (layout: CoverLayoutSettings) => void;
  isSelected: boolean;
  placeholder?: string;
  className?: string;
}

const CoverContent: React.FC<CoverContentProps> = ({
  innerBlocks,
  layout,
  onInnerBlocksChange,
  onLayoutChange,
  isSelected,
  placeholder = 'Write title...',
  className
}) => {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [showBlockInserter, setShowBlockInserter] = useState(false);
  const [showPositionGrid, setShowPositionGrid] = useState(false);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);

  // Generate unique block ID
  const generateBlockId = (): string => {
    return `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Add new inner block
  const addInnerBlock = useCallback((type: string, position?: number) => {
    const newBlock: CoverInnerBlock = {
      id: generateBlockId(),
      type,
      content: '',
      attributes: getDefaultAttributesForType(type)
    };

    const newBlocks = [...innerBlocks];
    if (position !== undefined) {
      newBlocks.splice(position, 0, newBlock);
    } else {
      newBlocks.push(newBlock);
    }

    onInnerBlocksChange(newBlocks);
    setSelectedBlockId(newBlock.id);
    setShowBlockInserter(false);
  }, [innerBlocks, onInnerBlocksChange]);

  // Update inner block
  const updateInnerBlock = useCallback((blockId: string, updates: Partial<CoverInnerBlock>) => {
    const newBlocks = innerBlocks.map(block =>
      block.id === blockId ? { ...block, ...updates } : block
    );
    onInnerBlocksChange(newBlocks);
  }, [innerBlocks, onInnerBlocksChange]);

  // Delete inner block
  const deleteInnerBlock = useCallback((blockId: string) => {
    const newBlocks = innerBlocks.filter(block => block.id !== blockId);
    onInnerBlocksChange(newBlocks);
    setSelectedBlockId(null);
  }, [innerBlocks, onInnerBlocksChange]);

  // Duplicate inner block
  const duplicateInnerBlock = useCallback((blockId: string) => {
    const blockIndex = innerBlocks.findIndex(block => block.id === blockId);
    if (blockIndex === -1) return;

    const originalBlock = innerBlocks[blockIndex];
    const newBlock: CoverInnerBlock = {
      ...originalBlock,
      id: generateBlockId()
    };

    const newBlocks = [...innerBlocks];
    newBlocks.splice(blockIndex + 1, 0, newBlock);
    onInnerBlocksChange(newBlocks);
  }, [innerBlocks, onInnerBlocksChange]);

  // Move inner block
  const moveInnerBlock = useCallback((blockId: string, direction: 'up' | 'down') => {
    const blockIndex = innerBlocks.findIndex(block => block.id === blockId);
    if (blockIndex === -1) return;

    const newIndex = direction === 'up' ? blockIndex - 1 : blockIndex + 1;
    if (newIndex < 0 || newIndex >= innerBlocks.length) return;

    const newBlocks = [...innerBlocks];
    const [movedBlock] = newBlocks.splice(blockIndex, 1);
    newBlocks.splice(newIndex, 0, movedBlock);
    onInnerBlocksChange(newBlocks);
  }, [innerBlocks, onInnerBlocksChange]);

  // Handle position change
  const handlePositionChange = (position: CoverPosition) => {
    onLayoutChange({ ...layout, contentPosition: position });
  };

  // Handle content edit
  const handleContentEdit = (blockId: string, content: string) => {
    updateInnerBlock(blockId, { content });
  };

  // Handle attribute change
  const handleAttributeChange = (blockId: string, key: string, value: any) => {
    const block = innerBlocks.find(b => b.id === blockId);
    if (!block) return;

    const newAttributes = { ...block.attributes, [key]: value };
    updateInnerBlock(blockId, { attributes: newAttributes });
  };

  // Get default attributes for block type
  function getDefaultAttributesForType(type: string): Record<string, any> {
    switch (type) {
      case 'o4o/heading':
        return {
          level: 2,
          align: 'center',
          color: '#ffffff',
          fontSize: 'large'
        };
      case 'o4o/paragraph':
        return {
          align: 'center',
          color: '#ffffff',
          fontSize: 'medium'
        };
      case 'o4o/button':
        return {
          align: 'center',
          backgroundColor: '#ffffff',
          textColor: '#000000',
          borderRadius: 5,
          text: 'Click here'
        };
      default:
        return {};
    }
  }

  // Block inserter
  const BlockInserter = () => {
    if (!showBlockInserter) return null;

    const blockTypes = [
      { type: 'o4o/heading', label: 'Heading', icon: Heading },
      { type: 'o4o/paragraph', label: 'Paragraph', icon: Type },
      { type: 'o4o/button', label: 'Button', icon: MousePointer }
    ];

    return (
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-40 bg-white rounded-lg shadow-lg border border-gray-200 p-2 min-w-48">
        <div className="space-y-1">
          {blockTypes.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              onClick={() => addInnerBlock(type)}
              className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50 rounded transition-colors"
            >
              <Icon className="h-4 w-4 text-gray-500" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Block toolbar
  const BlockToolbar = ({ block }: { block: CoverInnerBlock }) => {
    if (!isSelected || selectedBlockId !== block.id) return null;

    return (
      <div className="absolute -top-10 left-0 z-30 bg-white rounded-lg shadow-lg border border-gray-200 p-1 flex items-center gap-1">
        {/* Block type indicator */}
        <div className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded">
          {block.type.split('/')[1]}
        </div>

        {/* Text formatting (for text blocks) */}
        {(block.type === 'o4o/paragraph' || block.type === 'o4o/heading') && (
          <>
            <div className="w-px h-4 bg-gray-300" />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => {
                const isBold = block.attributes?.fontWeight === 'bold';
                handleAttributeChange(block.id, 'fontWeight', isBold ? 'normal' : 'bold');
              }}
            >
              <Bold className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => {
                const isItalic = block.attributes?.fontStyle === 'italic';
                handleAttributeChange(block.id, 'fontStyle', isItalic ? 'normal' : 'italic');
              }}
            >
              <Italic className="h-3 w-3" />
            </Button>

            <div className="w-px h-4 bg-gray-300" />

            {/* Text alignment */}
            {['left', 'center', 'right', 'justify'].map((align) => {
              const icons = {
                left: AlignLeft,
                center: AlignCenter,
                right: AlignRight,
                justify: AlignJustify
              };
              const Icon = icons[align as keyof typeof icons];

              return (
                <Button
                  key={align}
                  variant={block.attributes?.align === align ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => handleAttributeChange(block.id, 'align', align)}
                >
                  <Icon className="h-3 w-3" />
                </Button>
              );
            })}
          </>
        )}

        <div className="w-px h-4 bg-gray-300" />

        {/* Block actions */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => duplicateInnerBlock(block.id)}
          title="Duplicate"
        >
          <Copy className="h-3 w-3" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
          onClick={() => deleteInnerBlock(block.id)}
          title="Delete"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    );
  };

  // Render inner block
  const renderInnerBlock = (block: CoverInnerBlock, index: number) => {
    const isSelected = selectedBlockId === block.id;
    const { attributes = {} } = block;

    const blockStyle: React.CSSProperties = {
      color: attributes.color || '#ffffff',
      fontSize: getFontSize(attributes.fontSize),
      fontWeight: attributes.fontWeight || 'normal',
      fontStyle: attributes.fontStyle || 'normal',
      textAlign: attributes.align || 'center'
    };

    const handleBlockClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedBlockId(block.id);
    };

    const handleBlockKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        addInnerBlock('o4o/paragraph', index + 1);
      } else if (e.key === 'Backspace' && block.content === '') {
        e.preventDefault();
        deleteInnerBlock(block.id);
      }
    };

    switch (block.type) {
      case 'o4o/heading':
        const HeadingTag = `h${attributes.level || 2}` as React.ElementType;
        return (
          <div key={block.id} className="relative group" onClick={handleBlockClick}>
            <HeadingTag
              contentEditable={isSelected}
              suppressContentEditableWarning
              className={cn(
                'outline-none transition-all rounded px-2 py-1',
                isSelected ? 'ring-2 ring-blue-400 ring-opacity-50 bg-black bg-opacity-20' : '',
                !block.content && 'text-opacity-60'
              )}
              style={blockStyle}
              onInput={(e) => handleContentEdit(block.id, e.currentTarget.textContent || '')}
              onKeyDown={handleBlockKeyDown}
              data-placeholder={block.content ? undefined : 'Add heading...'}
            >
              {block.content}
            </HeadingTag>
            <BlockToolbar block={block} />
          </div>
        );

      case 'o4o/paragraph':
        return (
          <div key={block.id} className="relative group" onClick={handleBlockClick}>
            <p
              contentEditable={isSelected}
              suppressContentEditableWarning
              className={cn(
                'outline-none transition-all rounded px-2 py-1',
                isSelected ? 'ring-2 ring-blue-400 ring-opacity-50 bg-black bg-opacity-20' : '',
                !block.content && 'text-opacity-60'
              )}
              style={blockStyle}
              onInput={(e) => handleContentEdit(block.id, e.currentTarget.textContent || '')}
              onKeyDown={handleBlockKeyDown}
              data-placeholder={block.content ? undefined : 'Add text...'}
            >
              {block.content}
            </p>
            <BlockToolbar block={block} />
          </div>
        );

      case 'o4o/button':
        return (
          <div key={block.id} className="relative group" onClick={handleBlockClick}>
            <button
              className={cn(
                'px-6 py-3 rounded font-medium transition-all',
                isSelected ? 'ring-2 ring-blue-400 ring-opacity-50' : ''
              )}
              style={{
                backgroundColor: attributes.backgroundColor || '#ffffff',
                color: attributes.textColor || '#000000',
                borderRadius: `${attributes.borderRadius || 5}px`
              }}
            >
              {isSelected ? (
                <span
                  contentEditable
                  suppressContentEditableWarning
                  className="outline-none"
                  onInput={(e) => handleContentEdit(block.id, e.currentTarget.textContent || '')}
                  onKeyDown={handleBlockKeyDown}
                >
                  {block.content || attributes.text || 'Button'}
                </span>
              ) : (
                block.content || attributes.text || 'Button'
              )}
            </button>
            <BlockToolbar block={block} />
          </div>
        );

      default:
        return null;
    }
  };

  // Get font size value
  const getFontSize = (size: string): string => {
    const sizeMap: Record<string, string> = {
      small: '0.875rem',
      medium: '1rem',
      large: '1.25rem',
      'x-large': '1.5rem',
      'xx-large': '2rem'
    };
    return sizeMap[size] || size || '1rem';
  };

  // Position controls
  const PositionControls = () => {
    if (!isSelected) return null;

    return (
      <div className="absolute bottom-4 right-4 z-30">
        <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-lg shadow-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPositionGrid(!showPositionGrid)}
            className="flex items-center gap-2 h-10 px-3 rounded-lg"
          >
            <MousePointer className="h-4 w-4" />
            Position
            <ChevronDown className={cn(
              "h-3 w-3 transition-transform",
              showPositionGrid && "rotate-180"
            )} />
          </Button>

          {showPositionGrid && (
            <div className="p-4 border-t border-gray-200 min-w-64">
              <LayoutGrid
                mode="cover-position"
                currentPosition={layout.contentPosition}
                onPositionChange={handlePositionChange}
                showGrid={true}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={cn('cover-content relative h-full', className)}>
      {/* Content container */}
      <div
        ref={contentRef}
        className={cn(
          'absolute inset-0 z-20 p-8',
          getPositionClassName(layout.contentPosition)
        )}
        style={{
          minHeight: `${layout.minHeight}px`
        }}
      >
        {/* Inner blocks */}
        <div className="space-y-4 max-w-4xl">
          {innerBlocks.length > 0 ? (
            innerBlocks.map((block, index) => renderInnerBlock(block, index))
          ) : (
            isSelected && (
              <div className="text-center">
                <h2
                  className="text-3xl font-bold text-white text-opacity-60 cursor-pointer"
                  onClick={() => addInnerBlock('o4o/heading')}
                >
                  {placeholder}
                </h2>
                <p className="text-white text-opacity-40 mt-2 text-sm">
                  Click to add content
                </p>
              </div>
            )
          )}

          {/* Add block button */}
          {isSelected && (
            <div className="flex justify-center relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBlockInserter(!showBlockInserter)}
                className="bg-white bg-opacity-90 hover:bg-opacity-100"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Block
              </Button>
              <BlockInserter />
            </div>
          )}
        </div>
      </div>

      {/* Position controls */}
      <PositionControls />
    </div>
  );
};

export default CoverContent;