/**
 * RichText Block Renderer
 */

import { ContentRenderer } from '@o4o/content-editor';
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
    <ContentRenderer
      html={content}
      className={`prose prose-lg max-w-none ${alignClasses[align as keyof typeof alignClasses] || 'text-left'}`}
    />
  );
};
