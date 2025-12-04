/**
 * ImageCaption Block Renderer
 */

import { BlockRendererProps } from '../BlockRenderer';

export const ImageCaptionBlock = ({ node }: BlockRendererProps) => {
  const {
    imageUrl = '',
    caption = '',
    alt = '',
    captionPosition = 'bottom',
    imageWidth = 'full',
  } = node.props;

  const widthClasses = {
    full: 'w-full',
    '3/4': 'w-3/4',
    '1/2': 'w-1/2',
    '1/3': 'w-1/3',
  };

  return (
    <figure className={`${widthClasses[imageWidth as keyof typeof widthClasses] || 'w-full'} mx-auto`}>
      {captionPosition === 'top' && caption && (
        <figcaption className="text-sm text-gray-600 mb-2 text-center italic">{caption}</figcaption>
      )}
      <img src={imageUrl} alt={alt || caption} className="w-full rounded-lg" />
      {captionPosition === 'bottom' && caption && (
        <figcaption className="text-sm text-gray-600 mt-2 text-center italic">{caption}</figcaption>
      )}
    </figure>
  );
};
