/**
 * Image Block Renderer
 */

import { BlockRendererProps } from '../BlockRenderer';

export const ImageBlock = ({ node }: BlockRendererProps) => {
  const {
    src = '',
    alt = '',
    width = 'full',
    height = 'auto',
    rounded = 'md',
    objectFit = 'cover',
  } = node.props;

  const widthClasses = {
    full: 'w-full',
    '3/4': 'w-3/4',
    '1/2': 'w-1/2',
    '1/3': 'w-1/3',
    '1/4': 'w-1/4',
  };

  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  };

  const objectFitClasses = {
    cover: 'object-cover',
    contain: 'object-contain',
    fill: 'object-fill',
    none: 'object-none',
  };

  return (
    <img
      src={src}
      alt={alt}
      className={`${widthClasses[width as keyof typeof widthClasses] || 'w-full'} ${
        roundedClasses[rounded as keyof typeof roundedClasses] || 'rounded-md'
      } ${objectFitClasses[objectFit as keyof typeof objectFitClasses] || 'object-cover'}`}
      style={{ height: height === 'auto' ? 'auto' : height }}
    />
  );
};
