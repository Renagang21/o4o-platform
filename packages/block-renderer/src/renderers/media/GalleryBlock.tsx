/**
 * Gallery Block Renderer
 */

import React from 'react';
import DOMPurify from 'dompurify';
import { BlockRendererProps } from '../../types/block.types';
import { getBlockData } from '../../utils/block-parser';
import clsx from 'clsx';

interface GalleryImage {
  url: string;
  alt?: string;
  caption?: string;
  id?: string;
}

export const GalleryBlock: React.FC<BlockRendererProps> = ({ block }) => {
  const images: GalleryImage[] = getBlockData(block, 'images', []);

  if (!images || images.length === 0) return null;

  // Get gallery settings
  const columns = getBlockData(block, 'columns', 3);
  const imageCrop = getBlockData(block, 'imageCrop', true);
  const linkTo = getBlockData(block, 'linkTo', 'none');
  const sizeSlug = getBlockData(block, 'sizeSlug', 'large');
  const className = getBlockData(block, 'className', '');

  // Build class names
  const galleryClasses = clsx(
    'block-gallery mb-6 grid gap-4',
    `columns-${columns}`,
    imageCrop && 'is-cropped',
    className
  );

  return (
    <div
      className={galleryClasses}
      style={{
        gridTemplateColumns: `repeat(${Math.min(columns, images.length)}, 1fr)`,
      }}
    >
      {images.map((image, index) => {
        const imageElement = (
          <img
            src={image.url}
            alt={image.alt || ''}
            className={clsx(
              'w-full h-auto rounded-lg',
              imageCrop && 'object-cover aspect-square'
            )}
            loading="lazy"
          />
        );

        return (
          <figure key={image.id || index} className="m-0">
            {linkTo === 'media' ? (
              <a href={image.url} target="_blank" rel="noopener noreferrer">
                {imageElement}
              </a>
            ) : (
              imageElement
            )}
            {image.caption && (
              <figcaption
                className="mt-1 text-xs text-gray-600 text-center"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(image.caption) }}
              />
            )}
          </figure>
        );
      })}
    </div>
  );
};

export default GalleryBlock;
