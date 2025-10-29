/**
 * Buttons Block Renderer
 * Container for multiple button blocks
 */

import React from 'react';
import { BlockRendererProps } from '../../types/block.types';
import { getBlockData } from '../../utils/block-parser';
import { BlockRenderer } from '../../BlockRenderer';
import clsx from 'clsx';

export const ButtonsBlock: React.FC<BlockRendererProps> = ({ block }) => {
  const innerBlocks = block.innerBlocks || [];

  if (innerBlocks.length === 0) return null;

  // Get buttons settings
  const layout = getBlockData(block, 'layout');
  const orientation = layout?.orientation || 'horizontal';
  const justification = layout?.justifyContent || 'left';
  const className = getBlockData(block, 'className', '');

  // Build class names
  const buttonsClasses = clsx(
    'block-buttons flex gap-2 mb-4',
    orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap',
    justification === 'center' && 'justify-center',
    justification === 'right' && 'justify-end',
    justification === 'space-between' && 'justify-between',
    className
  );

  return (
    <div className={buttonsClasses}>
      <BlockRenderer blocks={innerBlocks} />
    </div>
  );
};

export default ButtonsBlock;
