import React from 'react';

interface ImageBlockProps {
  src: string;
  alt: string;
  caption?: string;
  alignment?: 'left' | 'center' | 'right' | 'wide' | 'full';
  settings?: {
    width?: string;
    height?: string;
    borderRadius?: string;
    objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  };
}

const ImageBlock: React.FC<ImageBlockProps> = ({ 
  src, 
  alt,
  caption,
  alignment = 'center',
  settings = {}
}) => {
  const containerClasses = `image-block image-align-${alignment}`;
  
  const imageStyle: React.CSSProperties = {
    width: settings.width || '100%',
    height: settings.height || 'auto',
    borderRadius: settings.borderRadius || '0',
    objectFit: settings.objectFit || 'cover',
  };

  return (
    <figure className={containerClasses}>
      <img 
        src={src} 
        alt={alt}
        style={imageStyle}
        loading="lazy"
      />
      {caption && (
        <figcaption className="text-sm text-gray-600 text-center mt-2">
          {caption}
        </figcaption>
      )}
    </figure>
  );
};

export default ImageBlock;