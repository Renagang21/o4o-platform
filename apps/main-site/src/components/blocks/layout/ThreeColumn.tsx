/**
 * ThreeColumn Block Renderer
 */

import { BlockRendererProps } from '../BlockRenderer';

export const ThreeColumnBlock = ({ node, children }: BlockRendererProps) => {
  const { gap = 'md' } = node.props;

  const gapClasses = {
    none: 'gap-0',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  };

  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${
        gapClasses[gap as keyof typeof gapClasses] || 'gap-4'
      }`}
    >
      {children}
    </div>
  );
};
