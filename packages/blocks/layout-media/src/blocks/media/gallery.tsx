import React, { useState } from 'react';
import { BlockDefinition } from '@o4o/block-core';

interface GalleryImage {
  id: number;
  url: string;
  alt?: string;
  caption?: string;
}

interface GalleryBlockProps {
  attributes: {
    images: GalleryImage[];
    columns: number;
    imageCrop: boolean;
    linkTo: 'none' | 'media' | 'attachment';
  };
  setAttributes: (attrs: Partial<GalleryBlockProps['attributes']>) => void;
}

const Edit: React.FC<GalleryBlockProps> = ({ attributes, setAttributes }) => {
  const { images = [], columns = 3, imageCrop, linkTo } = attributes;
  const [isSelecting, setIsSelecting] = useState(images.length === 0);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: GalleryImage[] = Array.from(files).map((file, index) => ({
      id: Date.now() + index,
      url: URL.createObjectURL(file),
      alt: file.name,
      caption: ''
    }));

    setAttributes({ images: [...images, ...newImages] });
    setIsSelecting(false);
  };

  const handleImageUrlAdd = (url: string) => {
    if (!url.trim()) return;

    const newImage: GalleryImage = {
      id: Date.now(),
      url: url.trim(),
      alt: '',
      caption: ''
    };

    setAttributes({ images: [...images, newImage] });
  };

  const removeImage = (imageId: number) => {
    setAttributes({ images: images.filter((img: GalleryImage) => img.id !== imageId) });
  };

  const updateCaption = (imageId: number, caption: string) => {
    setAttributes({
      images: images.map((img: GalleryImage) =>
        img.id === imageId ? { ...img, caption } : img
      )
    });
  };

  if (isSelecting || images.length === 0) {
    return (
      <div className="wp-block-gallery-placeholder" style={{
        padding: '40px',
        background: '#f0f0f0',
        textAlign: 'center',
        borderRadius: '4px'
      }}>
        <p>Create a gallery</p>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
        />
        <p style={{ margin: '10px 0' }}>or</p>
        <input
          type="url"
          placeholder="Paste image URL"
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleImageUrlAdd((e.target as HTMLInputElement).value);
              (e.target as HTMLInputElement).value = '';
            }
          }}
          style={{ width: '300px', padding: '5px' }}
        />
      </div>
    );
  }

  const gridTemplateColumns = `repeat(${columns}, 1fr)`;

  return (
    <div>
      <div className="block-editor-block-toolbar">
        <label>
          Columns:
          <input
            type="number"
            value={columns}
            onChange={(e) => setAttributes({ columns: Number(e.target.value) })}
            min="1"
            max="8"
            style={{ width: '60px', marginLeft: '5px' }}
          />
        </label>

        <label style={{ marginLeft: '10px' }}>
          <input
            type="checkbox"
            checked={imageCrop !== false}
            onChange={(e) => setAttributes({ imageCrop: e.target.checked })}
          />
          Crop images
        </label>

        <select
          value={linkTo || 'none'}
          onChange={(e) => setAttributes({ linkTo: e.target.value as 'none' | 'media' | 'attachment' })}
          style={{ marginLeft: '10px' }}
        >
          <option value="none">No link</option>
          <option value="media">Media file</option>
          <option value="attachment">Attachment page</option>
        </select>

        <button onClick={() => setIsSelecting(true)} style={{ marginLeft: '10px' }}>
          Add Images
        </button>
      </div>

      <ul
        className="wp-block-gallery"
        style={{
          display: 'grid',
          gridTemplateColumns,
          gap: '8px',
          listStyle: 'none',
          padding: 0,
          margin: 0
        }}
      >
        {images.map((image: GalleryImage) => (
          <li key={image.id} className="wp-block-gallery-item">
            <figure style={{ margin: 0, position: 'relative' }}>
              <img
                src={image.url}
                alt={image.alt || ''}
                style={{
                  width: '100%',
                  height: imageCrop !== false ? '200px' : 'auto',
                  objectFit: imageCrop !== false ? 'cover' : 'contain',
                  display: 'block'
                }}
              />
              <button
                onClick={() => removeImage(image.id)}
                style={{
                  position: 'absolute',
                  top: '5px',
                  right: '5px',
                  background: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
              {image.caption !== undefined && (
                <figcaption>
                  <input
                    type="text"
                    value={image.caption}
                    onChange={(e) => updateCaption(image.id, e.target.value)}
                    placeholder="Write caption..."
                    style={{ width: '100%', border: 'none', padding: '4px', fontSize: '12px' }}
                  />
                </figcaption>
              )}
            </figure>
          </li>
        ))}
      </ul>
    </div>
  );
};

const Save: React.FC<Pick<GalleryBlockProps, 'attributes'>> = ({ attributes }) => {
  const { images = [], columns = 3, imageCrop, linkTo } = attributes;

  if (images.length === 0) return null;

  const gridTemplateColumns = `repeat(${columns}, 1fr)`;

  return (
    <ul
      className="wp-block-gallery"
      style={{
        display: 'grid',
        gridTemplateColumns,
        gap: '8px',
        listStyle: 'none',
        padding: 0
      }}
    >
      {images.map((image: GalleryImage) => {
        const img = (
          <img
            src={image.url}
            alt={image.alt || ''}
            style={{
              width: '100%',
              height: imageCrop !== false ? '200px' : 'auto',
              objectFit: imageCrop !== false ? 'cover' : 'contain'
            }}
          />
        );

        const imgElement = linkTo === 'media' ? (
          <a href={image.url} target="_blank" rel="noopener noreferrer">{img}</a>
        ) : img;

        return (
          <li key={image.id} className="wp-block-gallery-item">
            <figure style={{ margin: 0 }}>
              {imgElement}
              {image.caption && (
                <figcaption style={{ fontSize: '12px', padding: '4px' }}>
                  {image.caption}
                </figcaption>
              )}
            </figure>
          </li>
        );
      })}
    </ul>
  );
};

const GalleryBlock: BlockDefinition = {
  name: 'o4o/gallery',
  title: 'Gallery',
  category: 'media',
  icon: 'format-gallery',
  description: 'Display multiple images in a rich gallery.',
  keywords: ['gallery', 'images', 'photos'],

  attributes: {
    images: {
      type: 'array',
      default: []
    },
    columns: {
      type: 'number',
      default: 3
    },
    imageCrop: {
      type: 'boolean',
      default: true
    },
    linkTo: {
      type: 'string',
      default: 'none'
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

export default GalleryBlock;
