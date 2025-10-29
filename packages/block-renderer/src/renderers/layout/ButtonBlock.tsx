/**
 * Button Block Renderer
 */

import React from 'react';
import DOMPurify from 'dompurify';
import { BlockRendererProps } from '../../types/block.types';
import { extractTextContent, getBlockData } from '../../utils/block-parser';
import { getColorClassName, getColorStyle } from '../../utils/colors';
import clsx from 'clsx';

export const ButtonBlock: React.FC<BlockRendererProps> = ({ block }) => {
  const text = extractTextContent(block) || 'Click here';
  const url = getBlockData(block, 'url', '#');
  const linkTarget = getBlockData(block, 'linkTarget');
  const rel = getBlockData(block, 'rel');
  const backgroundColor = getBlockData(block, 'backgroundColor');
  const textColor = getBlockData(block, 'textColor');
  const gradient = getBlockData(block, 'gradient');
  const borderRadius = getBlockData(block, 'borderRadius');
  const width = getBlockData(block, 'width');
  const className = getBlockData(block, 'className', '');

  // Build class names
  const buttonClasses = clsx(
    'block-button inline-block px-6 py-3 rounded-lg transition-colors',
    'bg-blue-600 text-white hover:bg-blue-700',
    backgroundColor && getColorClassName('background-color', backgroundColor),
    textColor && getColorClassName('color', textColor),
    gradient && `has-${gradient}-gradient-background`,
    width === 100 && 'w-full',
    className
  );

  // Build inline styles
  const style: React.CSSProperties = {
    borderRadius: borderRadius ? `${borderRadius}px` : undefined,
    width: width && width !== 100 ? `${width}%` : undefined,
  };

  return (
    <div className="mb-4">
      <a
        href={url}
        target={linkTarget}
        rel={rel || (linkTarget === '_blank' ? 'noopener noreferrer' : undefined)}
        className={buttonClasses}
        style={style}
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(text) }}
      />
    </div>
  );
};

export default ButtonBlock;
