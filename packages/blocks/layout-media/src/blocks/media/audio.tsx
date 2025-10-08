import React, { useState } from 'react';
import { BlockDefinition } from '@o4o/block-core';

interface AudioBlockProps {
  attributes: {
    src?: string;
    caption?: string;
    autoplay?: boolean;
    loop?: boolean;
    preload?: 'none' | 'metadata' | 'auto';
  };
  setAttributes: (attrs: Partial<AudioBlockProps['attributes']>) => void;
}

const Edit: React.FC<AudioBlockProps> = ({ attributes, setAttributes }) => {
  const { src, caption, autoplay, loop, preload } = attributes;
  const [isSelecting, setIsSelecting] = useState(!src);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAttributes({ src: url });
      setIsSelecting(false);
    }
  };

  const handleUrlInput = (url: string) => {
    if (url.trim()) {
      setAttributes({ src: url.trim() });
      setIsSelecting(false);
    }
  };

  if (isSelecting || !src) {
    return (
      <div className="wp-block-audio-placeholder" style={{
        padding: '40px',
        background: '#f0f0f0',
        textAlign: 'center',
        borderRadius: '4px'
      }}>
        <p>Upload audio or enter URL</p>
        <input
          type="file"
          accept="audio/*"
          onChange={handleFileUpload}
        />
        <p style={{ margin: '10px 0' }}>or</p>
        <input
          type="url"
          placeholder="Paste audio URL (mp3, wav, ogg)"
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleUrlInput((e.target as HTMLInputElement).value);
            }
          }}
          style={{ width: '300px', padding: '5px' }}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="block-editor-block-toolbar">
        <label>
          <input
            type="checkbox"
            checked={autoplay || false}
            onChange={(e) => setAttributes({ autoplay: e.target.checked })}
          />
          Autoplay
        </label>

        <label style={{ marginLeft: '10px' }}>
          <input
            type="checkbox"
            checked={loop || false}
            onChange={(e) => setAttributes({ loop: e.target.checked })}
          />
          Loop
        </label>

        <select
          value={preload || 'metadata'}
          onChange={(e) => setAttributes({ preload: e.target.value as 'none' | 'metadata' | 'auto' })}
          style={{ marginLeft: '10px' }}
        >
          <option value="none">Preload: None</option>
          <option value="metadata">Preload: Metadata</option>
          <option value="auto">Preload: Auto</option>
        </select>

        <button onClick={() => setIsSelecting(true)} style={{ marginLeft: '10px' }}>
          Replace
        </button>
      </div>

      <figure className="wp-block-audio">
        <audio
          src={src}
          controls
          autoPlay={autoplay}
          loop={loop}
          preload={preload || 'metadata'}
          style={{ width: '100%' }}
        />
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

const Save: React.FC<Pick<AudioBlockProps, 'attributes'>> = ({ attributes }) => {
  const { src, caption, autoplay, loop, preload } = attributes;

  if (!src) return null;

  return (
    <figure className="wp-block-audio">
      <audio
        src={src}
        controls
        autoPlay={autoplay}
        loop={loop}
        preload={preload || 'metadata'}
      />
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
};

const AudioBlock: BlockDefinition = {
  name: 'o4o/audio',
  title: 'Audio',
  category: 'media',
  icon: 'format-audio',
  description: 'Embed an audio file.',
  keywords: ['audio', 'sound', 'music', 'podcast', 'mp3'],

  attributes: {
    src: {
      type: 'string',
      source: 'attribute',
      selector: 'audio',
      attribute: 'src'
    },
    caption: {
      type: 'string',
      source: 'html',
      selector: 'figcaption'
    },
    autoplay: {
      type: 'boolean',
      default: false
    },
    loop: {
      type: 'boolean',
      default: false
    },
    preload: {
      type: 'string',
      default: 'metadata'
    }
  },

  supports: {
    align: true,
    anchor: true,
    className: true
  },

  edit: Edit,
  save: Save
};

export default AudioBlock;
