/**
 * IconText Block Renderer
 */

import { BlockRendererProps } from '../BlockRenderer';

export const IconTextBlock = ({ node }: BlockRendererProps) => {
  const {
    icon = '⭐',
    text = '',
    layout = 'horizontal',
    iconSize = 'md',
    gap = 'md',
    align = 'left',
  } = node.props;

  const iconSizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
    xl: 'text-5xl',
  };

  const gapClasses = {
    sm: 'gap-1',
    md: 'gap-2',
    lg: 'gap-4',
    xl: 'gap-6',
  };

  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };

  return (
    <div
      className={`flex ${layout === 'vertical' ? 'flex-col items-center' : 'flex-row items-center'} ${
        gapClasses[gap as keyof typeof gapClasses] || 'gap-2'
      } ${alignClasses[align as keyof typeof alignClasses] || 'justify-start'}`}
    >
      <span className={iconSizeClasses[iconSize as keyof typeof iconSizeClasses] || 'text-2xl'}>{icon}</span>
      <span className="text-base">{text}</span>
    </div>
  );
};
