/**
 * Audio Block Renderer
 */

import React from 'react';
import DOMPurify from 'dompurify';
import { BlockRendererProps } from '../../types/block.types';
import { getBlockData } from '../../utils/block-parser';
import clsx from 'clsx';

export const AudioBlock: React.FC<BlockRendererProps> = ({ block }) => {
  const src = getBlockData(block, 'src') || getBlockData(block, 'url');

  if (!src) return null;

  // Get audio data
  const caption = getBlockData(block, 'caption');
  const autoplay = getBlockData(block, 'autoplay', false);
  const loop = getBlockData(block, 'loop', false);
  const preload = getBlockData(block, 'preload', 'metadata');
  const className = getBlockData(block, 'className', '');

  // Build class names
  const figureClasses = clsx(
    'block-audio mb-6',
    className
  );

  return (
    <figure className={figureClasses}>
      <audio
        src={src}
        controls
        autoPlay={autoplay}
        loop={loop}
        preload={preload}
        className="w-full"
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

export default AudioBlock;
