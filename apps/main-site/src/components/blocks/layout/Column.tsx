/**
 * Column Block Renderer
 */

import { BlockRendererProps } from '../BlockRenderer';

export const ColumnBlock = ({ node, children }: BlockRendererProps) => {
  const {
    gap = 'md',
    align = 'start',
    width = 'auto',
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

  const widthClasses = {
    auto: 'w-auto',
    full: 'w-full',
    '1/2': 'w-1/2',
    '1/3': 'w-1/3',
    '2/3': 'w-2/3',
    '1/4': 'w-1/4',
    '3/4': 'w-3/4',
  };

  return (
    <div
      className={`flex flex-col ${gapClasses[gap as keyof typeof gapClasses] || 'gap-4'} ${
        alignClasses[align as keyof typeof alignClasses] || 'items-start'
      } ${widthClasses[width as keyof typeof widthClasses] || 'w-auto'}`}
    >
      {children}
    </div>
  );
};
