/**
 * Group Block Renderer
 * Container for grouping multiple blocks with shared styling
 */

import React from 'react';
import { BlockRendererProps } from '../../types/block.types';
import { getBlockData } from '../../utils/block-parser';
import { BlockRenderer } from '../../BlockRenderer';
import { getColorClassName, getColorStyle } from '../../utils/colors';
import clsx from 'clsx';

export const GroupBlock: React.FC<BlockRendererProps> = ({ block }) => {
  const innerBlocks = block.innerBlocks || [];

  // Get group settings
  const tagName = getBlockData(block, 'tagName', 'div');
  const backgroundColor = getBlockData(block, 'backgroundColor');
  const textColor = getBlockData(block, 'textColor');
  const gradient = getBlockData(block, 'gradient');
  const customBackgroundColor = getBlockData(block, 'customBackgroundColor') || getBlockData(block, 'style')?.color?.background;
  const customTextColor = getBlockData(block, 'customTextColor') || getBlockData(block, 'style')?.color?.text;
  const alignment = getBlockData(block, 'align');
  const layout = getBlockData(block, 'layout');
  const className = getBlockData(block, 'className', '');

  // Build class names
  const groupClasses = clsx(
    'block-group mb-4 p-4 rounded-lg',
    backgroundColor && getColorClassName('background-color', backgroundColor),
    textColor && getColorClassName('color', textColor),
    gradient && `has-${gradient}-gradient-background`,
    alignment && `align${alignment}`,
    layout?.type === 'flex' && 'flex',
    layout?.orientation === 'horizontal' && 'flex-row',
    layout?.justifyContent && `justify-${layout.justifyContent}`,
    className
  );

  // Build inline styles
  const style: React.CSSProperties = {
    ...getColorStyle('backgroundColor', customBackgroundColor),
    ...getColorStyle('color', customTextColor),
  };

  const Tag = tagName as keyof JSX.IntrinsicElements;

  return (
    <Tag className={groupClasses} style={style}>
      <BlockRenderer blocks={innerBlocks} />
    </Tag>
  );
};

export default GroupBlock;
