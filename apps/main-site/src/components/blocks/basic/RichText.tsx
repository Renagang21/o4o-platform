/**
 * RichText Block Renderer
 */

import { BlockRendererProps } from '../BlockRenderer';

export const RichTextBlock = ({ node }: BlockRendererProps) => {
  const { content = '', align = 'left' } = node.props;

  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
    justify: 'text-justify',
  };

  return (
    <div
      className={`prose prose-lg max-w-none ${alignClasses[align as keyof typeof alignClasses] || 'text-left'}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};
