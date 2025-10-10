/**
 * ColumnBlock Component
 * Single column within a Columns block - supports nested blocks via InnerBlocks
 */

import React from 'react';
import { Block } from '@/types/post.types';
import { InnerBlocks } from '../InnerBlocks';
import { BlockProps } from '@/blocks/registry/types';

interface ColumnBlockProps extends BlockProps {
  attributes?: {
    width?: number; // Column width in percentage
    verticalAlignment?: 'top' | 'center' | 'bottom';
    backgroundColor?: string;
    padding?: number;
  };
  innerBlocks?: Block[];
  onInnerBlocksChange?: (blocks: Block[]) => void;
}

const ColumnBlock: React.FC<ColumnBlockProps> = ({
  id,
  attributes = {},
  innerBlocks = [],
  onInnerBlocksChange,
  isSelected,
  onSelect,
}) => {
  const {
    width = 50,
    verticalAlignment = 'top',
    backgroundColor = '',
    padding = 16,
  } = attributes;

  // Handle inner blocks change
  const handleInnerBlocksChange = (newBlocks: unknown[]) => {
    if (onInnerBlocksChange) {
      onInnerBlocksChange(newBlocks as Block[]);
    }
  };

  // Get vertical alignment class
  const getAlignmentClass = () => {
    switch (verticalAlignment) {
      case 'center': return 'justify-center';
      case 'bottom': return 'justify-end';
      default: return 'justify-start';
    }
  };

  return (
    <div
      className={`wp-block-column ${getAlignmentClass()}`}
      style={{
        width: `${width}%`,
        backgroundColor: backgroundColor || undefined,
        padding: padding ? `${padding}px` : '16px',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
    >
      <InnerBlocks
        parentBlockId={id || 'column'}
        blocks={innerBlocks as Block[]}
        onBlocksChange={handleInnerBlocksChange}
        selectedBlockId={isSelected ? id : null}
        placeholder="Add blocks to this column..."
        renderAppender={true}
        orientation="vertical"
        className="column-inner-blocks"
        currentDepth={2}
      />
    </div>
  );
};

export default ColumnBlock;
