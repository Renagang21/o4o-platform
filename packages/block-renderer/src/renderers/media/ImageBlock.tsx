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

  // Show placeholder if no URL
  const imageElement = !url ? (
    <div
      className={clsx(imageClasses, 'bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center')}
      style={{
        maxWidth: width || '100%',
        minHeight: height || '200px',
      }}
    >
      <div className="text-center text-gray-400 p-4">
        <svg className="mx-auto h-12 w-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-sm">{alt || 'Image placeholder'}</p>
      </div>
    </div>
  ) : (
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
