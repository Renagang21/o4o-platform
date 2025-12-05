/**
 * TwoColumn Block Renderer
 */

import { BlockRendererProps } from '../BlockRenderer';

export const TwoColumnBlock = ({ node, children }: BlockRendererProps) => {
  const {
    ratio = '50/50',
    gap = 'md',
    reverseOnMobile = false,
  } = node.props;

  const gapClasses = {
    none: 'gap-0',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  };

  const ratioClasses = {
    '33/67': 'md:grid-cols-[1fr_2fr]',
    '40/60': 'md:grid-cols-[2fr_3fr]',
    '50/50': 'md:grid-cols-2',
    '60/40': 'md:grid-cols-[3fr_2fr]',
    '67/33': 'md:grid-cols-[2fr_1fr]',
  };

  return (
    <div
      className={`grid grid-cols-1 ${
        ratioClasses[ratio as keyof typeof ratioClasses] || 'md:grid-cols-2'
      } ${gapClasses[gap as keyof typeof gapClasses] || 'gap-4'} ${
        reverseOnMobile ? 'flex-col-reverse md:grid' : ''
      }`}
    >
      {children}
    </div>
  );
};
