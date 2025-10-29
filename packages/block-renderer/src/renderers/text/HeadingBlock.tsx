/**
 * Heading Block Renderer
 */

import React from 'react';
import DOMPurify from 'dompurify';
import { BlockRendererProps } from '../../types/block.types';
import { extractTextContent, getBlockData } from '../../utils/block-parser';
import { getColorClassName, getColorStyle } from '../../utils/colors';
import { getAlignmentClass } from '../../utils/typography';
import clsx from 'clsx';

export const HeadingBlock: React.FC<BlockRendererProps> = ({ block }) => {
  const text = extractTextContent(block);

  if (!text) return null;

  // Get heading level (1-6)
  const level = getBlockData(block, 'level', 2);
  const HeadingTag = `h${Math.min(Math.max(level, 1), 6)}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

  // Get styling data
  const alignment = getBlockData(block, 'align') || getBlockData(block, 'alignment', 'left');
  const textColor = getBlockData(block, 'textColor');
  const customTextColor = getBlockData(block, 'customTextColor') || getBlockData(block, 'style')?.color?.text;
  const className = getBlockData(block, 'className', '');

  // Default heading classes by level
  const headingClasses: Record<string, string> = {
    h1: 'text-4xl font-bold mb-6 text-gray-900',
    h2: 'text-3xl font-semibold mb-5 text-gray-800',
    h3: 'text-2xl font-semibold mb-4 text-gray-800',
    h4: 'text-xl font-medium mb-3 text-gray-700',
    h5: 'text-lg font-medium mb-2 text-gray-700',
    h6: 'text-base font-medium mb-2 text-gray-600',
  };

  // Build class names
  const classNames = clsx(
    'block-heading',
    headingClasses[HeadingTag],
    getAlignmentClass(alignment),
    textColor && getColorClassName('color', textColor),
    className
  );

  // Build inline styles
  const style: React.CSSProperties = {
    textAlign: alignment as any,
    ...getColorStyle('color', customTextColor),
  };

  return (
    <HeadingTag
      className={classNames}
      style={style}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(text) }}
    />
  );
};

export default HeadingBlock;
