import React, { useState } from 'react';
import { BlockDefinition } from '@o4o/block-core';

const Edit: React.FC<any> = ({ attributes, setAttributes }) => {
  const { url, alt, caption, align, width, height, linkTo, href } = attributes;
  const [isEditing, setIsEditing] = useState(!url);
  
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAttributes({ 
          url: event.target?.result as string,
          alt: file.name 
        });
        setIsEditing(false);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const updateAttribute = (key: string, value: any) => {
    setAttributes({ [key]: value });
  };
  
  const alignmentOptions = ['none', 'left', 'center', 'right', 'wide', 'full'];
  const linkOptions = ['none', 'media', 'custom'];
  
  if (isEditing || !url) {
    return (
      <div className="wp-block-image-placeholder" style={{ 
        padding: '40px', 
        background: '#f0f0f0', 
        textAlign: 'center',
        borderRadius: '4px'
      }}>
        <p>Select an image</p>
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleImageSelect}
        />
        <br />
        <input 
          type="url" 
          placeholder="Or enter image URL"
          value={url || ''}
          onChange={(e) => {
            setAttributes({ url: e.target.value });
            if (e.target.value) setIsEditing(false);
          }}
          style={{ marginTop: '10px', width: '300px' }}
        />
      </div>
    );
  }
  
  const figureClass = [
    'wp-block-image',
    align && align !== 'none' && `align${align}`,
    `size-large`
  ].filter(Boolean).join(' ');
  
  return (
    <div>
      <div className="block-editor-block-toolbar">
        <button onClick={() => setIsEditing(true)}>Replace</button>
        
        <select 
          value={align || 'none'} 
          onChange={(e) => updateAttribute('align', e.target.value)}
        >
          {alignmentOptions.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        
        <select 
          value={linkTo || 'none'} 
          onChange={(e) => updateAttribute('linkTo', e.target.value)}
        >
          {linkOptions.map(option => (
            <option key={option} value={option}>Link to {option}</option>
          ))}
        </select>
      </div>
      
      <figure className={figureClass}>
        <img 
          src={url} 
          alt={alt || ''} 
          width={width}
          height={height}
          style={{ maxWidth: '100%', height: 'auto' }}
        />
        {caption && (
          <figcaption>
            <input 
              type="text"
              value={caption}
              onChange={(e) => updateAttribute('caption', e.target.value)}
              placeholder="Write caption..."
              style={{ width: '100%', border: 'none', textAlign: 'center' }}
            />
          </figcaption>
        )}
      </figure>
      
      <div style={{ marginTop: '10px' }}>
        <input 
          type="text"
          value={alt || ''}
          onChange={(e) => updateAttribute('alt', e.target.value)}
          placeholder="Alt text (describe the image)"
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
};

const Save: React.FC<any> = ({ attributes }) => {
  const { url, alt, caption, align, width, height, linkTo, href } = attributes;
  
  if (!url) return null;
  
  const figureClass = [
    'wp-block-image',
    align && align !== 'none' && `align${align}`,
    `size-large`
  ].filter(Boolean).join(' ');
  
  const img = (
    <img 
      src={url} 
      alt={alt || ''} 
      width={width}
      height={height}
    />
  );
  
  const image = linkTo === 'media' ? (
    <a href={url}>{img}</a>
  ) : linkTo === 'custom' && href ? (
    <a href={href}>{img}</a>
  ) : img;
  
  return (
    <figure className={figureClass}>
      {image}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
};

const ImageBlock: BlockDefinition = {
  name: 'o4o/image',
  title: 'Image',
  category: 'media',
  icon: 'format-image',
  description: 'Insert an image.',
  keywords: ['image', 'photo', 'picture', 'img'],
  
  attributes: {
    url: {
      type: 'string',
      source: 'attribute',
      selector: 'img',
      attribute: 'src'
    },
    alt: {
      type: 'string',
      source: 'attribute',
      selector: 'img',
      attribute: 'alt',
      default: ''
    },
    caption: {
      type: 'string',
      source: 'html',
      selector: 'figcaption'
    },
    align: {
      type: 'string',
      default: 'none'
    },
    width: {
      type: 'number'
    },
    height: {
      type: 'number'
    },
    linkTo: {
      type: 'string',
      default: 'none'
    },
    href: {
      type: 'string'
    }
  },
  
  supports: {
    align: ['left', 'center', 'right', 'wide', 'full'],
    anchor: true,
    className: true
  },
  
  edit: Edit,
  save: Save
};

export default ImageBlock;