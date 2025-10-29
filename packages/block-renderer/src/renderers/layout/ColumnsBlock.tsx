/**
 * Columns Block Renderer
 * Container for multiple column blocks
 */

import React from 'react';
import { BlockRendererProps } from '../../types/block.types';
import { getBlockData } from '../../utils/block-parser';
import { BlockRenderer } from '../../BlockRenderer';
import clsx from 'clsx';

export const ColumnsBlock: React.FC<BlockRendererProps> = ({ block }) => {
  const innerBlocks = block.innerBlocks || [];

  if (innerBlocks.length === 0) return null;

  // Get columns settings
  const verticalAlignment = getBlockData(block, 'verticalAlignment');
  const isStackedOnMobile = getBlockData(block, 'isStackedOnMobile', true);
  const className = getBlockData(block, 'className', '');

  // Build class names
  const columnsClasses = clsx(
    'block-columns grid gap-4 mb-4',
    verticalAlignment && `items-${verticalAlignment}`,
    isStackedOnMobile ? 'md:grid-cols-1' : '',
    className
  );

  return (
    <div
      className={columnsClasses}
      style={{
        gridTemplateColumns: `repeat(${innerBlocks.length}, 1fr)`,
      }}
    >
      {innerBlocks.map((column, index) => (
        <BlockRenderer key={column.id || `column-${index}`} blocks={column} />
      ))}
    </div>
  );
};

export default ColumnsBlock;
