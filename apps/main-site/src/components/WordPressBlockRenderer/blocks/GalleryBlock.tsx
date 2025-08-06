import { FC } from 'react';
import { MainSiteBlock } from '../../../utils/wordpress-block-parser';

interface GalleryBlockProps {
  block: MainSiteBlock;
}

interface GalleryImage {
  id?: string;
  url: string;
  alt?: string;
  caption?: string;
  link?: string;
  fullUrl?: string;
}

export const GalleryBlock: FC<GalleryBlockProps> = ({ block }) => {
  const { data } = block;
  
  if (!data?.images || data.images.length === 0) return null;
  
  const columns = data.columns || 3;
  const imageCrop = data.imageCrop !== false;
  
  const galleryClassNames = [
    'wp-block-gallery',
    `columns-${columns}`,
    imageCrop && 'is-cropped',
    data.align && `align${data.align}`,
  ].filter(Boolean).join(' ');
  
  const renderImage = (image: GalleryImage, index: number) => {
    const imgElement = (
      <img
        src={image.url}
        alt={image.alt || ''}
        className={`w-full ${imageCrop ? 'h-full object-cover' : 'h-auto'}`}
        loading="lazy"
      />
    );
    
    let wrappedImage = imgElement;
    
    // Handle link destination
    if (data.linkTo === 'media' && image.fullUrl) {
      wrappedImage = (
        <a href={image.fullUrl} target="_blank" rel="noopener noreferrer">
          {imgElement}
        </a>
      );
    } else if (data.linkTo === 'attachment' && image.link) {
      wrappedImage = (
        <a href={image.link}>
          {imgElement}
        </a>
      );
    }
    
    return (
      <li key={image.id || index} className="blocks-gallery-item">
        <figure className={imageCrop ? 'aspect-square' : ''}>
          {wrappedImage}
          {image.caption && (
            <figcaption 
              className="blocks-gallery-item__caption"
              dangerouslySetInnerHTML={{ __html: image.caption }}
            />
          )}
        </figure>
      </li>
    );
  };
  
  return (
    <figure className={galleryClassNames}>
      <ul className="blocks-gallery-grid grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {data.images.map((image: GalleryImage, index: number) => renderImage(image, index))}
      </ul>
    </figure>
  );
};