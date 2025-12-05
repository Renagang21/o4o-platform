/**
 * Additional Block - Quote
 *
 * Blockquote with optional citation
 */

export interface QuoteProps {
  quote: string;
  author?: string;
  source?: string;
  style?: 'default' | 'bordered' | 'highlighted';
  size?: 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  md: 'text-lg',
  lg: 'text-xl',
  xl: 'text-2xl',
};

export default function Quote({
  quote = 'This is a quote.',
  author,
  source,
  style = 'default',
  size = 'lg',
}: QuoteProps) {
  if (style === 'highlighted') {
    return (
      <blockquote className="py-6 px-8 bg-blue-50 border-l-4 border-blue-500 rounded-r">
        <p className={`${sizeClasses[size]} italic text-gray-800 mb-4`}>"{quote}"</p>
        {(author || source) && (
          <footer className="text-sm text-gray-600">
            {author && <cite className="font-semibold not-italic">{author}</cite>}
            {source && <span className="ml-2">— {source}</span>}
          </footer>
        )}
      </blockquote>
    );
  }

  if (style === 'bordered') {
    return (
      <blockquote className="py-6 px-8 border-2 border-gray-300 rounded">
        <p className={`${sizeClasses[size]} italic text-gray-800 mb-4`}>"{quote}"</p>
        {(author || source) && (
          <footer className="text-sm text-gray-600">
            {author && <cite className="font-semibold not-italic">{author}</cite>}
            {source && <span className="ml-2">— {source}</span>}
          </footer>
        )}
      </blockquote>
    );
  }

  // Default style
  return (
    <blockquote className="py-4 px-6 border-l-4 border-gray-300">
      <p className={`${sizeClasses[size]} italic text-gray-700 mb-3`}>"{quote}"</p>
      {(author || source) && (
        <footer className="text-sm text-gray-600">
          {author && <cite className="font-semibold not-italic">{author}</cite>}
          {source && <span className="ml-2">— {source}</span>}
        </footer>
      )}
    </blockquote>
  );
}
