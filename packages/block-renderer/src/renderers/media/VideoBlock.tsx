/**
 * Video Block Renderer
 */

import React from 'react';
import DOMPurify from 'dompurify';
import { BlockRendererProps } from '../../types/block.types';
import { getBlockData } from '../../utils/block-parser';
import { getAlignmentClass } from '../../utils/typography';
import clsx from 'clsx';

export const VideoBlock: React.FC<BlockRendererProps> = ({ block }) => {
  const src = getBlockData(block, 'src') || getBlockData(block, 'url');

  if (!src) return null;

  // Get video data
  const caption = getBlockData(block, 'caption');
  const autoplay = getBlockData(block, 'autoplay', false);
  const loop = getBlockData(block, 'loop', false);
  const muted = getBlockData(block, 'muted', false);
  const controls = getBlockData(block, 'controls', true);
  const playsInline = getBlockData(block, 'playsInline', false);
  const poster = getBlockData(block, 'poster');
  const alignment = getBlockData(block, 'align');
  const className = getBlockData(block, 'className', '');

  // Build class names
  const figureClasses = clsx(
    'block-video mb-6',
    getAlignmentClass(alignment),
    className
  );

  return (
    <figure className={figureClasses}>
      <video
        src={src}
        poster={poster}
        controls={controls}
        autoPlay={autoplay}
        loop={loop}
        muted={muted}
        playsInline={playsInline}
        className="w-full rounded-lg"
      />
      {caption && (
        <figcaption
          className="mt-2 text-sm text-gray-600 text-center"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(caption) }}
        />
      )}
    </figure>
  );
};

export default VideoBlock;
