/**
 * OldSection Block Renderer (Legacy)
 */

import { BlockRendererProps } from '../BlockRenderer';

export const OldSectionBlock = ({ node, children }: BlockRendererProps) => {
  const {
    bgColor,
    padding = 'md',
    className = '',
  } = node.props;

  const paddingClasses = {
    none: '',
    sm: 'py-6',
    md: 'py-12',
    lg: 'py-20',
  };

  return (
    <section
      className={`w-full ${paddingClasses[padding as keyof typeof paddingClasses] || 'py-12'} ${className}`}
      style={bgColor ? { backgroundColor: bgColor } : undefined}
    >
      <div className="container mx-auto px-4">
        {children}
      </div>
    </section>
  );
};
