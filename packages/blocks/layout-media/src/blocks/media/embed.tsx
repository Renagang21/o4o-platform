import React, { useState } from 'react';
import { BlockDefinition } from '@o4o/block-core';

interface EmbedBlockProps {
  attributes: {
    url?: string;
    caption?: string;
    type?: string;
    aspectRatio?: '16-9' | '4-3' | '1-1';
  };
  setAttributes: (attrs: Partial<EmbedBlockProps['attributes']>) => void;
}

const Edit: React.FC<EmbedBlockProps> = ({ attributes, setAttributes }) => {
  const { url, caption, type, aspectRatio } = attributes;
  const [inputUrl, setInputUrl] = useState(url || '');
  const [isEditing, setIsEditing] = useState(!url);

  const detectEmbedType = (embedUrl: string): string => {
    if (embedUrl.includes('youtube.com') || embedUrl.includes('youtu.be')) return 'youtube';
    if (embedUrl.includes('vimeo.com')) return 'vimeo';
    if (embedUrl.includes('twitter.com') || embedUrl.includes('x.com')) return 'twitter';
    if (embedUrl.includes('instagram.com')) return 'instagram';
    if (embedUrl.includes('facebook.com')) return 'facebook';
    if (embedUrl.includes('soundcloud.com')) return 'soundcloud';
    if (embedUrl.includes('spotify.com')) return 'spotify';
    return 'custom';
  };

  const getEmbedUrl = (originalUrl: string, embedType: string): string => {
    if (embedType === 'youtube') {
      const videoId = originalUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : originalUrl;
    }
    if (embedType === 'vimeo') {
      const videoId = originalUrl.match(/vimeo\.com\/(\d+)/)?.[1];
      return videoId ? `https://player.vimeo.com/video/${videoId}` : originalUrl;
    }
    return originalUrl;
  };

  const handleEmbed = () => {
    if (!inputUrl.trim()) return;

    const embedType = detectEmbedType(inputUrl);
    const embedUrl = getEmbedUrl(inputUrl, embedType);

    setAttributes({
      url: embedUrl,
      type: embedType
    });
    setIsEditing(false);
  };

  if (isEditing || !url) {
    return (
      <div className="wp-block-embed-placeholder" style={{
        padding: '40px',
        background: '#f0f0f0',
        textAlign: 'center',
        borderRadius: '4px'
      }}>
        <p>Embed URL</p>
        <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
          Supported: YouTube, Vimeo, Twitter, Instagram, Facebook, SoundCloud, Spotify
        </p>
        <input
          type="url"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleEmbed()}
          placeholder="Paste URL here..."
          style={{ width: '80%', padding: '8px', fontSize: '14px' }}
        />
        <button onClick={handleEmbed} style={{ marginLeft: '10px', padding: '8px 16px' }}>
          Embed
        </button>
      </div>
    );
  }

  const aspectRatioStyle = aspectRatio === '16-9'
    ? { paddingBottom: '56.25%' }
    : aspectRatio === '4-3'
    ? { paddingBottom: '75%' }
    : aspectRatio === '1-1'
    ? { paddingBottom: '100%' }
    : { paddingBottom: '56.25%' };

  return (
    <div>
      <div className="block-editor-block-toolbar">
        <span style={{ marginRight: '10px' }}>Type: {type || 'custom'}</span>

        <select
          value={aspectRatio || '16-9'}
          onChange={(e) => setAttributes({ aspectRatio: e.target.value as '16-9' | '4-3' | '1-1' })}
        >
          <option value="16-9">16:9</option>
          <option value="4-3">4:3</option>
          <option value="1-1">1:1</option>
        </select>

        <button onClick={() => setIsEditing(true)} style={{ marginLeft: '10px' }}>
          Replace
        </button>
      </div>

      <figure className="wp-block-embed">
        <div className="wp-block-embed__wrapper" style={{
          position: 'relative',
          width: '100%',
          ...aspectRatioStyle
        }}>
          <iframe
            src={url}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none'
            }}
            allowFullScreen
            title="Embedded content"
          />
        </div>
        <figcaption>
          <input
            type="text"
            value={caption || ''}
            onChange={(e) => setAttributes({ caption: e.target.value })}
            placeholder="Write caption..."
            style={{ width: '100%', border: 'none', textAlign: 'center', fontSize: '13px' }}
          />
        </figcaption>
      </figure>
    </div>
  );
};

const Save: React.FC<Pick<EmbedBlockProps, 'attributes'>> = ({ attributes }) => {
  const { url, caption, aspectRatio } = attributes;

  if (!url) return null;

  const aspectRatioStyle = aspectRatio === '16-9'
    ? { paddingBottom: '56.25%' }
    : aspectRatio === '4-3'
    ? { paddingBottom: '75%' }
    : aspectRatio === '1-1'
    ? { paddingBottom: '100%' }
    : { paddingBottom: '56.25%' };

  return (
    <figure className="wp-block-embed">
      <div className="wp-block-embed__wrapper" style={{
        position: 'relative',
        width: '100%',
        ...aspectRatioStyle
      }}>
        <iframe
          src={url}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none'
          }}
          allowFullScreen
          title="Embedded content"
        />
      </div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
};

const EmbedBlock: BlockDefinition = {
  name: 'o4o/embed',
  title: 'Embed',
  category: 'media',
  icon: 'embed-generic',
  description: 'Embed videos, tweets, and other content from external sources.',
  keywords: ['embed', 'youtube', 'vimeo', 'twitter', 'iframe'],

  attributes: {
    url: {
      type: 'string'
    },
    caption: {
      type: 'string',
      source: 'html',
      selector: 'figcaption'
    },
    type: {
      type: 'string',
      default: 'custom'
    },
    aspectRatio: {
      type: 'string',
      default: '16-9'
    }
  },

  supports: {
    align: ['wide', 'full'],
    anchor: true,
    className: true
  },

  edit: Edit,
  save: Save
};

export default EmbedBlock;
