/**
 * GroupBlock Component
 * Container block that groups multiple blocks together with layout options
 * WordPress Gutenberg style with EnhancedBlockWrapper
 */

import React, { useCallback } from 'react';
import { Block } from '@/types/post.types';
import { InnerBlocks } from '../InnerBlocks';
import { BlockProps } from '@/blocks/registry/types';
import { LayoutGrid, LayoutList, Rows3 } from 'lucide-react';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';
import { cn } from '@/lib/utils';

interface GroupBlockProps extends BlockProps {
  attributes?: {
    layout?: 'flow' | 'flex' | 'grid';
    tagName?: 'div' | 'section' | 'article' | 'aside' | 'header' | 'footer';
    backgroundColor?: string;
    textColor?: string;
    padding?: { top: number; right: number; bottom: number; left: number };
    margin?: { top: number; right: number; bottom: number; left: number };
    borderRadius?: number;
    borderWidth?: number;
    borderColor?: string;
    // Flex layout
    flexDirection?: 'row' | 'column';
    flexWrap?: 'nowrap' | 'wrap';
    justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
    alignItems?: 'stretch' | 'flex-start' | 'center' | 'flex-end';
    gap?: number;
    // Grid layout
    gridColumns?: number;
    gridRows?: number;
    minHeight?: number;
  };
  innerBlocks?: Block[];
  onInnerBlocksChange?: (blocks: Block[]) => void;
}

const GroupBlock: React.FC<GroupBlockProps> = ({
  id,
  attributes = {},
  innerBlocks = [],
  onInnerBlocksChange,
  isSelected,
  onSelect,
  onChange,
}) => {
  const {
    layout = 'flow',
    tagName = 'div',
    backgroundColor = '',
    textColor = '',
    padding = { top: 0, right: 0, bottom: 0, left: 0 },
    margin = { top: 0, right: 0, bottom: 0, left: 0 },
    borderRadius = 0,
    borderWidth = 0,
    borderColor = '',
    flexDirection = 'row',
    flexWrap = 'nowrap',
    justifyContent = 'flex-start',
    alignItems = 'stretch',
    gap = 16,
    gridColumns = 2,
    gridRows = 1,
    minHeight = 0,
  } = attributes;

  // Handle layout change
  const handleLayoutChange = useCallback((newLayout: 'flow' | 'flex' | 'grid') => {
    if (onChange) {
      onChange(null, { ...attributes, layout: newLayout });
    }
  }, [attributes, onChange]);

  // Get layout-specific styles
  const getLayoutStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      backgroundColor: backgroundColor || undefined,
      color: textColor || undefined,
      padding: `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`,
      margin: `${margin.top}px ${margin.right}px ${margin.bottom}px ${margin.left}px`,
      borderRadius: borderRadius ? `${borderRadius}px` : undefined,
      border: borderWidth ? `${borderWidth}px solid ${borderColor || '#ddd'}` : undefined,
      minHeight: minHeight ? `${minHeight}px` : undefined,
    };

    switch (layout) {
      case 'flex':
        return {
          ...baseStyles,
          display: 'flex',
          flexDirection,
          flexWrap,
          justifyContent,
          alignItems,
          gap: `${gap}px`,
        };
      case 'grid':
        return {
          ...baseStyles,
          display: 'grid',
          gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
          gridTemplateRows: gridRows > 1 ? `repeat(${gridRows}, 1fr)` : undefined,
          gap: `${gap}px`,
        };
      default: // flow
        return baseStyles;
    }
  };

  // Handle inner blocks change
  const handleInnerBlocksChange = useCallback((newBlocks: Block[]) => {
    if (onInnerBlocksChange) {
      onInnerBlocksChange(newBlocks);
    }
  }, [onInnerBlocksChange]);

  // Create element based on tagName
  const TagName = tagName as React.ElementType;

  // Extract required props for EnhancedBlockWrapper
  const {
    onDelete = () => {},
    onDuplicate = () => {},
    onMoveUp = () => {},
    onMoveDown = () => {},
    onAddBlock,
  } = (attributes as any) || {};

  return (
    <EnhancedBlockWrapper
      id={id || 'group'}
      type="group"
      isSelected={isSelected || false}
      onSelect={onSelect || (() => {})}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onAddBlock={onAddBlock}
      className="wp-block-group"
      customToolbarContent={(
        <>
          {/* Layout switcher */}
          <button
            onClick={() => handleLayoutChange('flow')}
            className={cn(
              "p-1 rounded hover:bg-gray-100",
              layout === 'flow' && "bg-blue-100 text-blue-600"
            )}
            title="Flow Layout"
          >
            <LayoutList className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>
          <button
            onClick={() => handleLayoutChange('flex')}
            className={cn(
              "p-1 rounded hover:bg-gray-100",
              layout === 'flex' && "bg-blue-100 text-blue-600"
            )}
            title="Flex Layout"
          >
            <Rows3 className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>
          <button
            onClick={() => handleLayoutChange('grid')}
            className={cn(
              "p-1 rounded hover:bg-gray-100",
              layout === 'grid' && "bg-blue-100 text-blue-600"
            )}
            title="Grid Layout"
          >
            <LayoutGrid className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>
        </>
      )}
    >
      <TagName
        className={`wp-block-group__inner wp-block-group--layout-${layout}`}
        style={getLayoutStyles()}
      >
        {/* Inner blocks container */}
        <InnerBlocks
          parentBlockId={id || 'group'}
          blocks={innerBlocks}
          onBlocksChange={handleInnerBlocksChange}
          selectedBlockId={isSelected ? id : null}
          placeholder="Add blocks to this group..."
          renderAppender={true}
          orientation={layout === 'flex' && flexDirection === 'row' ? 'horizontal' : 'vertical'}
          className="group-inner-blocks"
          currentDepth={2}
        />
      </TagName>
    </EnhancedBlockWrapper>
  );
};

export default GroupBlock;
