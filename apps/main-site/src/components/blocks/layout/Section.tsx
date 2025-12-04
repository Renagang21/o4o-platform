/**
 * Section Block Renderer
 */

import { BlockRendererProps } from '../BlockRenderer';

const paddingClasses = {
  none: '',
  sm: 'py-8',
  md: 'py-12',
  lg: 'py-16',
  xl: 'py-24',
};

const maxWidthClasses = {
  sm: 'max-w-3xl',
  md: 'max-w-5xl',
  lg: 'max-w-7xl',
  full: 'max-w-full',
};

export const SectionBlock = ({ node, children }: BlockRendererProps) => {
  const {
    bgColor,
    padding = 'md',
    maxWidth = 'lg',
    className = '',
  } = node.props;

  return (
    <section
      className={`w-full ${paddingClasses[padding as keyof typeof paddingClasses] || 'py-12'} ${className}`}
      style={bgColor ? { backgroundColor: bgColor } : undefined}
    >
      <div className={`${maxWidthClasses[maxWidth as keyof typeof maxWidthClasses] || 'max-w-7xl'} mx-auto px-4 sm:px-6 lg:px-8`}>
        {children}
      </div>
    </section>
  );
};
