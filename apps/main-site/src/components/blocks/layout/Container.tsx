/**
 * Container Block Renderer
 */

import { BlockRendererProps } from '../BlockRenderer';

const maxWidthClasses = {
  sm: 'max-w-3xl',
  md: 'max-w-5xl',
  lg: 'max-w-7xl',
  xl: 'max-w-screen-2xl',
  full: 'w-full',
};

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export const ContainerBlock = ({ node, children }: BlockRendererProps) => {
  const {
    maxWidth = 'lg',
    padding = 'md',
    centered = true,
    bgColor,
  } = node.props;

  return (
    <div
      className={`${maxWidthClasses[maxWidth as keyof typeof maxWidthClasses] || 'max-w-7xl'} ${
        paddingClasses[padding as keyof typeof paddingClasses] || 'p-6'
      } ${centered ? 'mx-auto' : ''}`}
      style={bgColor ? { backgroundColor: bgColor } : undefined}
    >
      {children}
    </div>
  );
};
