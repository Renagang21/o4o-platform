/**
 * Marketing Block - ImageCaption
 *
 * Image with caption text below
 */

export interface ImageCaptionProps {
  src: string;
  alt: string;
  caption?: string;
  captionAlign?: 'left' | 'center' | 'right';
  width?: 'auto' | 'full' | 'lg' | 'md' | 'sm';
  rounded?: boolean;
}

const widthClasses = {
  auto: 'w-auto',
  full: 'w-full',
  lg: 'max-w-4xl mx-auto',
  md: 'max-w-2xl mx-auto',
  sm: 'max-w-lg mx-auto',
};

const alignClasses = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export default function ImageCaption({
  src = 'https://via.placeholder.com/800x600',
  alt = 'Image',
  caption,
  captionAlign = 'center',
  width = 'full',
  rounded = false,
}: ImageCaptionProps) {
  return (
    <figure className={widthClasses[width]}>
      <img
        src={src}
        alt={alt}
        className={`w-full h-auto ${rounded ? 'rounded-lg' : ''}`}
      />
      {caption && (
        <figcaption className={`mt-3 text-gray-600 text-sm ${alignClasses[captionAlign]}`}>
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
