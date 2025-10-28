/**
 * Special Block Renderers
 * Handles cover, slide, youtube, file, social-links, and shortcode blocks
 */

import React from 'react';
import { Block } from '@/types/post.types';

// Extract text helper (used by cover and shortcode)
const extractText = (content: any, fallback: string = ''): string => {
  if (typeof content === 'string') {
    return content.replace(/<[^>]*>/g, '').trim() || fallback;
  }
  if (content?.text) return content.text;
  return fallback;
};

export const renderCover = (block: Block) => {
  const { content, attributes } = block;
  const coverUrl = attributes?.url || content?.url || '';
  const coverOverlayColor = attributes?.overlayColor || 'rgba(0,0,0,0.3)';
  const blockContent = extractText(content, '');

  return (
    <div
      key={block.id}
      className="relative mb-6 min-h-[400px] flex items-center justify-center rounded-lg overflow-hidden"
      style={{
        backgroundImage: coverUrl ? `url(${coverUrl})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div
        className="absolute inset-0"
        style={{ backgroundColor: coverOverlayColor }}
      />
      <div className="relative z-10 text-white text-center p-8">
        {blockContent && <h2 className="text-4xl font-bold">{blockContent}</h2>}
      </div>
    </div>
  );
};

export const renderSlide = (block: Block) => {
  const { attributes } = block;
  const slides = attributes?.slides || [];

  return (
    <div key={block.id} className="mb-6 bg-gray-100 rounded-lg p-8">
      <div className="text-center">
        <p className="text-sm text-gray-500 mb-4">Slide Block ({slides.length} slides)</p>
        {slides.length > 0 && (
          <div className="bg-white p-6 rounded shadow">
            <h3 className="text-xl font-semibold mb-2">{slides[0].title || 'Slide 1'}</h3>
            <p className="text-gray-700">{slides[0].content || ''}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const renderYoutube = (block: Block) => {
  const { content, attributes } = block;
  const youtubeUrl = attributes?.url || content?.url || '';
  const youtubeVideoId = attributes?.videoId || '';
  const embedUrl = youtubeVideoId
    ? `https://www.youtube.com/embed/${youtubeVideoId}`
    : youtubeUrl.includes('youtube.com') || youtubeUrl.includes('youtu.be')
      ? youtubeUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')
      : '';

  return (
    <div key={block.id} className="mb-6">
      {embedUrl ? (
        <div className="relative" style={{ paddingBottom: '56.25%', height: 0 }}>
          <iframe
            src={embedUrl}
            className="absolute top-0 left-0 w-full h-full rounded-lg"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="p-6 bg-gray-100 rounded-lg text-center text-gray-500">
          YouTube video URL not provided
        </div>
      )}
    </div>
  );
};

export const renderFile = (block: Block) => {
  const { content, attributes } = block;
  const fileUrl = attributes?.url || content?.url || '';
  const fileFileName = attributes?.fileName || content?.fileName || 'Download File';
  const fileSize = attributes?.fileSize || content?.fileSize || 0;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div key={block.id} className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <p className="font-medium text-gray-900">{fileFileName}</p>
          {fileSize > 0 && (
            <p className="text-sm text-gray-500">{formatBytes(fileSize)}</p>
          )}
        </div>
        {fileUrl && (
          <a
            href={fileUrl}
            download
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Download
          </a>
        )}
      </div>
    </div>
  );
};

export const renderSocialLinks = (block: Block) => {
  const { attributes } = block;
  const socialLinks = attributes?.links || [];

  return (
    <div key={block.id} className="mb-6 flex gap-4 justify-center">
      {socialLinks.map((link: any, index: number) => (
        <a
          key={index}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800"
          title={link.service}
        >
          {link.service || 'Social'}
        </a>
      ))}
    </div>
  );
};

export const renderShortcode = (block: Block) => {
  const { content, attributes } = block;
  const blockContent = extractText(content, '');
  const shortcode = attributes?.shortcode || blockContent || '';

  return (
    <div key={block.id} className="mb-6 p-4 bg-gray-50 rounded border border-gray-200">
      <code className="text-sm text-gray-700">{shortcode}</code>
    </div>
  );
};
