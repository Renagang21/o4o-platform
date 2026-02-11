/**
 * Heading Block Renderer
 */

import { BlockRendererProps } from '../BlockRenderer';

const alignClasses = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

const sizeClasses = {
  1: 'text-5xl font-bold',
  2: 'text-4xl font-bold',
  3: 'text-3xl font-bold',
  4: 'text-2xl font-semibold',
  5: 'text-xl font-semibold',
  6: 'text-lg font-semibold',
};

export const HeadingBlock = ({ node }: BlockRendererProps) => {
  const { text = 'Heading', level = 2, align = 'left', color } = node.props;
  const Tag = `h${level}` as React.ElementType;

  return (
    <Tag
      className={`${sizeClasses[level as keyof typeof sizeClasses] || sizeClasses[2]} ${
        alignClasses[align as keyof typeof alignClasses] || 'text-left'
      }`}
      style={color ? { color } : undefined}
    >
      {text}
    </Tag>
  );
};
