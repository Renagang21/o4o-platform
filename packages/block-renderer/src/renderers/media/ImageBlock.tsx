/**
 * Image Block Renderer
 */

import React from 'react';
import DOMPurify from 'dompurify';
import { BlockRendererProps } from '../../types/block.types';
import { getBlockData } from '../../utils/block-parser';
import { getAlignmentClass } from '../../utils/typography';
import clsx from 'clsx';

export const ImageBlock: React.FC<BlockRendererProps> = ({ block }) => {
  const url = getBlockData(block, 'url');

  if (!url) return null;

  // Get image data
  const alt = getBlockData(block, 'alt', '');
  const caption = getBlockData(block, 'caption');
  const width = getBlockData(block, 'width');
  const height = getBlockData(block, 'height');
  const alignment = getBlockData(block, 'align');
  const href = getBlockData(block, 'href');
  const sizeSlug = getBlockData(block, 'sizeSlug', 'large');
  const className = getBlockData(block, 'className', '');

  // Build class names
  const figureClasses = clsx(
    'block-image mb-6',
    getAlignmentClass(alignment),
    className
  );

  const imageClasses = clsx(
    'w-full h-auto rounded-lg',
    `size-${sizeSlug}`
  );

  const imageElement = (
    <img
      src={url}
      alt={alt}
      className={imageClasses}
      style={{
        maxWidth: width || '100%',
        height: height || 'auto',
      }}
      loading="lazy"
    />
  );

  return (
    <figure className={figureClasses}>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {imageElement}
        </a>
      ) : (
        imageElement
      )}
      {caption && (
        <figcaption
          className="mt-2 text-sm text-gray-600 text-center"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(caption) }}
        />
      )}
    </figure>
  );
};

export default ImageBlock;
