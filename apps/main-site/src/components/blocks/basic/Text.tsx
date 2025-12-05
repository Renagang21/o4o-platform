/**
 * Text Block Renderer
 */

import { BlockRendererProps } from '../BlockRenderer';

const alignClasses = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
  justify: 'text-justify',
};

const sizeClasses = {
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
};

export const TextBlock = ({ node }: BlockRendererProps) => {
  const { text = '', align = 'left', color, size = 'base' } = node.props;

  return (
    <p
      className={`${sizeClasses[size as keyof typeof sizeClasses] || 'text-base'} ${
        alignClasses[align as keyof typeof alignClasses] || 'text-left'
      }`}
      style={color ? { color } : undefined}
    >
      {text}
    </p>
  );
};
