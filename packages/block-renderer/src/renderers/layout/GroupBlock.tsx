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

  // Get layout-specific properties
  const gridTemplateColumns = getBlockData(block, 'gridTemplateColumns');
  const gap = getBlockData(block, 'gap');
  const alignItems = getBlockData(block, 'alignItems');
  const justifyContent = getBlockData(block, 'justifyContent');
  const flexDirection = getBlockData(block, 'flexDirection');
  const justifySelf = getBlockData(block, 'justifySelf');
  const padding = getBlockData(block, 'padding');

  // Build class names
  const groupClasses = clsx(
    'block-group',
    backgroundColor && getColorClassName('background-color', backgroundColor),
    textColor && getColorClassName('color', textColor),
    gradient && `has-${gradient}-gradient-background`,
    alignment && `align${alignment}`,
    layout === 'flex' && 'flex',
    layout === 'grid' && 'grid',
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

  // Add grid-specific styles
  if (layout === 'grid' || gridTemplateColumns) {
    style.display = 'grid';
    if (gridTemplateColumns) style.gridTemplateColumns = gridTemplateColumns;
    if (gap) style.gap = gap;
    if (alignItems) style.alignItems = alignItems;
  }

  // Add flex-specific styles
  if (layout === 'flex' || flexDirection) {
    style.display = 'flex';
    if (flexDirection) style.flexDirection = flexDirection as any;
    if (justifyContent) style.justifyContent = justifyContent;
    if (gap) style.gap = gap;
    if (alignItems) style.alignItems = alignItems;
  }

  // Add self-alignment
  if (justifySelf) {
    style.justifySelf = justifySelf;
  }

  // Add padding
  if (padding) {
    if (typeof padding === 'object') {
      style.paddingTop = padding.top;
      style.paddingRight = padding.right;
      style.paddingBottom = padding.bottom;
      style.paddingLeft = padding.left;
    } else {
      style.padding = padding;
    }
  }

  const Tag = tagName as React.ElementType;

  return (
    <Tag className={groupClasses} style={style}>
      <BlockRenderer blocks={innerBlocks} />
    </Tag>
  );
};

export default GroupBlock;
