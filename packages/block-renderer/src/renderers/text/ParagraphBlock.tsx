/**
 * Paragraph Block Renderer
 */

import React from 'react';
import DOMPurify from 'dompurify';
import { BlockRendererProps } from '../../types/block.types';
import { extractTextContent, getBlockData } from '../../utils/block-parser';
import { getColorClassName, getColorStyle } from '../../utils/colors';
import { getFontSizeClass, getAlignmentClass } from '../../utils/typography';
import clsx from 'clsx';

export const ParagraphBlock: React.FC<BlockRendererProps> = ({ block }) => {
  const text = extractTextContent(block);

  if (!text) return null;

  // Get styling data
  const alignment = getBlockData(block, 'align') || getBlockData(block, 'alignment', 'left');
  const fontSize = getBlockData(block, 'fontSize');
  const textColor = getBlockData(block, 'textColor');
  const backgroundColor = getBlockData(block, 'backgroundColor');
  const customTextColor = getBlockData(block, 'customTextColor') || getBlockData(block, 'style')?.color?.text;
  const customBackgroundColor = getBlockData(block, 'customBackgroundColor') || getBlockData(block, 'style')?.color?.background;
  const dropCap = getBlockData(block, 'dropCap', false);
  const className = getBlockData(block, 'className', '');

  // Build class names
  const classNames = clsx(
    'block-paragraph mb-4 text-gray-700 leading-relaxed',
    getAlignmentClass(alignment),
    dropCap && 'has-drop-cap',
    fontSize && getFontSizeClass(fontSize),
    textColor && getColorClassName('color', textColor),
    backgroundColor && getColorClassName('background-color', backgroundColor),
    className
  );

  // Build inline styles
  const style: React.CSSProperties = {
    textAlign: alignment as any,
    ...getColorStyle('color', customTextColor),
    ...getColorStyle('backgroundColor', customBackgroundColor),
  };

  return (
    <p
      className={classNames}
      style={style}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(text) }}
    />
  );
};

export default ParagraphBlock;
