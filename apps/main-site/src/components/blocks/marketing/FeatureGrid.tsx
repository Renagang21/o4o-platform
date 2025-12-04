/**
 * FeatureGrid Block Renderer
 */

import { BlockRendererProps } from '../BlockRenderer';

export const FeatureGridBlock = ({ node, children }: BlockRendererProps) => {
  const { columns = 3, gap = 'md' } = node.props;

  const columnClasses = {
    2: 'md:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
  };

  const gapClasses = {
    sm: 'gap-4',
    md: 'gap-6',
    lg: 'gap-8',
  };

  return (
    <div
      className={`grid grid-cols-1 ${columnClasses[columns as keyof typeof columnClasses] || 'lg:grid-cols-3'} ${
        gapClasses[gap as keyof typeof gapClasses] || 'gap-6'
      }`}
    >
      {children}
    </div>
  );
};
