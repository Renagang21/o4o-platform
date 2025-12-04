/**
 * Row Block Renderer
 */

import { BlockRendererProps } from '../BlockRenderer';

export const RowBlock = ({ node, children }: BlockRendererProps) => {
  const {
    gap = 'md',
    align = 'start',
    justify = 'start',
    wrap = true,
  } = node.props;

  const gapClasses = {
    none: 'gap-0',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  };

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  };

  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
  };

  return (
    <div
      className={`flex ${wrap ? 'flex-wrap' : 'flex-nowrap'} ${
        gapClasses[gap as keyof typeof gapClasses] || 'gap-4'
      } ${alignClasses[align as keyof typeof alignClasses] || 'items-start'} ${
        justifyClasses[justify as keyof typeof justifyClasses] || 'justify-start'
      }`}
    >
      {children}
    </div>
  );
};
