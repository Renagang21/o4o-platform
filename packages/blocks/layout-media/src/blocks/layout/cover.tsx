import React, { useState } from 'react';
import { BlockDefinition } from '@o4o/block-core';

interface CoverBlockProps {
  attributes: {
    url?: string;
    overlayColor?: string;
    minHeight?: number;
    contentPosition?: string;
    isDark?: boolean;
  };
  setAttributes: (attrs: Partial<CoverBlockProps['attributes']>) => void;
}

const Edit: React.FC<CoverBlockProps> = ({ attributes, setAttributes }) => {
  const {
    url,
    overlayColor = 'rgba(0,0,0,0.5)',
    minHeight = 400,
    contentPosition = 'center center',
    isDark = true
  } = attributes;

  const [isSelectingMedia, setIsSelectingMedia] = useState(!url);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setAttributes({ url: imageUrl });
      setIsSelectingMedia(false);
    }
  };

  const handleUrlInput = (imageUrl: string) => {
    if (imageUrl.trim()) {
      setAttributes({ url: imageUrl.trim() });
      setIsSelectingMedia(false);
    }
  };

  const [justifyContent, alignItems] = contentPosition.split(' ');

  const coverStyle: React.CSSProperties = {
    position: 'relative',
    minHeight: `${minHeight}px`,
    backgroundImage: url ? `url(${url})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    display: 'flex',
    justifyContent: justifyContent === 'left' ? 'flex-start' : justifyContent === 'right' ? 'flex-end' : 'center',
    alignItems: alignItems === 'top' ? 'flex-start' : alignItems === 'bottom' ? 'flex-end' : 'center',
    color: isDark ? '#ffffff' : '#000000',
    padding: '20px'
  };

  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: overlayColor,
    pointerEvents: 'none'
  };

  return (
    <div>
      <div className="block-editor-block-toolbar">
        <label>
          Min Height:
          <input
            type="number"
            value={minHeight}
            onChange={(e) => setAttributes({ minHeight: Number(e.target.value) })}
            min="50"
            max="1000"
            style={{ width: '80px', marginLeft: '5px' }}
          />
          px
        </label>

        <select
          value={contentPosition}
          onChange={(e) => setAttributes({ contentPosition: e.target.value })}
          style={{ marginLeft: '10px' }}
        >
          <option value="left top">Top Left</option>
          <option value="center top">Top Center</option>
          <option value="right top">Top Right</option>
          <option value="left center">Center Left</option>
          <option value="center center">Center</option>
          <option value="right center">Center Right</option>
          <option value="left bottom">Bottom Left</option>
          <option value="center bottom">Bottom Center</option>
          <option value="right bottom">Bottom Right</option>
        </select>

        <label style={{ marginLeft: '10px' }}>
          <input
            type="checkbox"
            checked={isDark}
            onChange={(e) => setAttributes({ isDark: e.target.checked })}
          />
          Dark text
        </label>

        <input
          type="color"
          value={overlayColor.startsWith('rgba') ? '#000000' : overlayColor}
          onChange={(e) => setAttributes({ overlayColor: e.target.value + '80' })}
          style={{ marginLeft: '10px' }}
          title="Overlay color"
        />

        <button onClick={() => setIsSelectingMedia(true)} style={{ marginLeft: '10px' }}>
          {url ? 'Replace' : 'Add'} Media
        </button>
      </div>

      <div className="wp-block-cover" style={coverStyle}>
        <div style={overlayStyle} />

        {isSelectingMedia && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'white',
            padding: '20px',
            borderRadius: '4px',
            zIndex: 10
          }}>
            <p style={{ color: '#000' }}>Select background image:</p>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
            />
            <p style={{ margin: '10px 0', color: '#000' }}>or</p>
            <input
              type="url"
              placeholder="Paste image URL"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleUrlInput((e.target as HTMLInputElement).value);
                }
              }}
              style={{ width: '250px', padding: '5px' }}
            />
          </div>
        )}

        {!isSelectingMedia && (
          <div className="wp-block-cover__inner-container" style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
              Cover content goes here
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const Save: React.FC<Pick<CoverBlockProps, 'attributes'>> = ({ attributes }) => {
  const {
    url,
    overlayColor = 'rgba(0,0,0,0.5)',
    minHeight = 400,
    contentPosition = 'center center',
    isDark = true
  } = attributes;

  const [justifyContent, alignItems] = contentPosition.split(' ');

  const coverStyle: React.CSSProperties = {
    position: 'relative',
    minHeight: `${minHeight}px`,
    backgroundImage: url ? `url(${url})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    display: 'flex',
    justifyContent: justifyContent === 'left' ? 'flex-start' : justifyContent === 'right' ? 'flex-end' : 'center',
    alignItems: alignItems === 'top' ? 'flex-start' : alignItems === 'bottom' ? 'flex-end' : 'center',
    color: isDark ? '#ffffff' : '#000000',
    padding: '20px'
  };

  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: overlayColor
  };

  return (
    <div className="wp-block-cover" style={coverStyle}>
      <div style={overlayStyle} />
      <div className="wp-block-cover__inner-container" style={{ position: 'relative', zIndex: 1 }} />
    </div>
  );
};

const CoverBlock: BlockDefinition = {
  name: 'o4o/cover',
  title: 'Cover',
  category: 'layout',
  icon: 'cover-image',
  description: 'Add an image or video with a text overlay.',
  keywords: ['cover', 'hero', 'banner', 'background'],

  attributes: {
    url: {
      type: 'string'
    },
    overlayColor: {
      type: 'string',
      default: 'rgba(0,0,0,0.5)'
    },
    minHeight: {
      type: 'number',
      default: 400
    },
    contentPosition: {
      type: 'string',
      default: 'center center'
    },
    isDark: {
      type: 'boolean',
      default: true
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

export default CoverBlock;
