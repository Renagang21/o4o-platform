/**
 * Embed Block Renderer
 * Handles embedded content (YouTube, Vimeo, etc.)
 */

import React from 'react';
import DOMPurify from 'dompurify';
import { BlockRendererProps } from '../../types/block.types';
import { getBlockData } from '../../utils/block-parser';
import clsx from 'clsx';

export const EmbedBlock: React.FC<BlockRendererProps> = ({ block }) => {
  const url = getBlockData(block, 'url');

  if (!url) return null;

  const type = getBlockData(block, 'type');
  const providerNameSlug = getBlockData(block, 'providerNameSlug');
  const responsive = getBlockData(block, 'responsive', true);
  const caption = getBlockData(block, 'caption');
  const className = getBlockData(block, 'className', '');

  // Build class names
  const embedClasses = clsx(
    'block-embed mb-6',
    responsive && 'responsive-embed',
    className
  );

  // Build iframe src based on provider
  let embedUrl = url;
  if (providerNameSlug === 'youtube' && !url.includes('embed')) {
    const videoId = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?]+)/)?.[1];
    if (videoId) {
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    }
  } else if (providerNameSlug === 'vimeo' && !url.includes('player.vimeo.com')) {
    const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
    if (videoId) {
      embedUrl = `https://player.vimeo.com/video/${videoId}`;
    }
  }

  return (
    <figure className={embedClasses}>
      <div className={responsive ? 'relative pb-[56.25%] h-0' : ''}>
        <iframe
          src={embedUrl}
          className={responsive ? 'absolute top-0 left-0 w-full h-full' : 'w-full'}
          style={responsive ? undefined : { height: '400px' }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
      {caption && (
        <figcaption
          className="mt-2 text-sm text-gray-600 text-center"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(caption) }}
        />
      )}
    </figure>
  );
};

export default EmbedBlock;
