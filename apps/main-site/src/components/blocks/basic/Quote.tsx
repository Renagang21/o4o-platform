/**
 * Quote Block Renderer
 */

import { BlockRendererProps } from '../BlockRenderer';

export const QuoteBlock = ({ node }: BlockRendererProps) => {
  const {
    quote = '',
    author = '',
    style = 'default',
    color = '#1f2937',
  } = node.props;

  const styleClasses = {
    default: 'border-l-4 border-gray-300 pl-4 italic',
    bordered: 'border-2 border-gray-300 p-6 rounded-lg',
    highlighted: 'bg-gray-50 p-6 rounded-lg border-l-4 border-blue-500',
  };

  return (
    <blockquote
      className={`${styleClasses[style as keyof typeof styleClasses] || styleClasses.default} my-4`}
      style={{ color }}
    >
      <p className="text-lg mb-2">{quote}</p>
      {author && <footer className="text-sm text-gray-600 not-italic">— {author}</footer>}
    </blockquote>
  );
};
