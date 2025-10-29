/**
 * Media Block Renderers
 * Handles image, video, gallery, and audio blocks
 */

import React from 'react';
import { Block } from '@/types/post.types';

export const renderImage = (block: Block) => {
  const { content, attributes } = block;

  return (
    <figure key={block.id} className="mb-6">
      <img
        src={content?.url || attributes?.url || ''}
        alt={content?.alt || attributes?.alt || ''}
        className="w-full h-auto rounded-lg"
        style={{
          maxWidth: attributes?.width || '100%',
          height: attributes?.height || 'auto',
        }}
      />
      {(content?.caption || attributes?.caption) && (
        <figcaption className="mt-2 text-sm text-gray-600 text-center">
          {content?.caption || attributes?.caption}
        </figcaption>
      )}
    </figure>
  );
};

export const renderVideo = (block: Block) => {
  const { content, attributes } = block;

  return (
    <figure key={block.id} className="mb-6">
      <video
        src={content?.url || attributes?.url || ''}
        controls
        className="w-full rounded-lg"
        style={{
          maxWidth: attributes?.width || '100%',
        }}
      />
      {(content?.caption || attributes?.caption) && (
        <figcaption className="mt-2 text-sm text-gray-600 text-center">
          {content?.caption || attributes?.caption}
        </figcaption>
      )}
    </figure>
  );
};

export const renderGallery = (block: Block) => {
  const { content, attributes } = block;
  const images = content?.images || attributes?.images || [];
  const columns = attributes?.columns || 3;

  return (
    <div
      key={block.id}
      className="mb-6 grid gap-4"
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
      }}
    >
      {images.map((image: any, index: number) => (
        <figure key={index}>
          <img
            src={image.url || ''}
            alt={image.alt || ''}
            className="w-full h-auto rounded-lg"
          />
          {image.caption && (
            <figcaption className="mt-1 text-xs text-gray-600 text-center">
              {image.caption}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
};

export const renderAudio = (block: Block) => {
  const { content, attributes } = block;

  return (
    <figure key={block.id} className="mb-6">
      <audio
        src={content?.url || attributes?.url || ''}
        controls
        className="w-full"
      />
      {(content?.caption || attributes?.caption) && (
        <figcaption className="mt-2 text-sm text-gray-600 text-center">
          {content?.caption || attributes?.caption}
        </figcaption>
      )}
    </figure>
  );
};
