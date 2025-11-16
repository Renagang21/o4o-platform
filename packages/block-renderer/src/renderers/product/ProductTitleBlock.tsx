/**
 * Product Title Block Renderer
 * Displays the product title with customizable styling
 */

import React from 'react';
import { BlockRendererProps } from '../../types/block.types';
import { getBlockData } from '../../utils/block-parser';
import clsx from 'clsx';

export const ProductTitleBlock: React.FC<BlockRendererProps> = ({ block }) => {
  // Access post data injected by CPTSingle
  const postData = (block as any)._postData;

  if (!postData || !postData.title) {
    return null;
  }

  // Get styling options
  const align = getBlockData(block, 'align', 'left');
  const level = getBlockData(block, 'level', 1);
  const className = getBlockData(block, 'className', '');

  const HeadingTag = `h${Math.min(Math.max(level, 1), 6)}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

  const headingClasses: Record<string, string> = {
    h1: 'text-4xl font-bold mb-4',
    h2: 'text-3xl font-semibold mb-4',
    h3: 'text-2xl font-semibold mb-3',
    h4: 'text-xl font-medium mb-3',
    h5: 'text-lg font-medium mb-2',
    h6: 'text-base font-medium mb-2',
  };

  const classNames = clsx(
    'product-title',
    headingClasses[HeadingTag],
    `text-${align}`,
    className
  );

  return (
    <HeadingTag className={classNames}>
      {postData.title}
    </HeadingTag>
  );
};
