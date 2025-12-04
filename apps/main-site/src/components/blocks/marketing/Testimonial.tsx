/**
 * Testimonial Block Renderer
 */

import { BlockRendererProps } from '../BlockRenderer';

export const TestimonialBlock = ({ node }: BlockRendererProps) => {
  const {
    quote = '',
    author = '',
    role = '',
    avatar,
    style = 'card',
    rating,
  } = node.props;

  if (style === 'minimal') {
    return (
      <div className="py-6">
        <p className="text-lg italic text-gray-700 mb-4">"{quote}"</p>
        <div className="text-sm text-gray-600">
          <span className="font-semibold">{author}</span>
          {role && <span>, {role}</span>}
        </div>
      </div>
    );
  }

  if (style === 'quote') {
    return (
      <blockquote className="border-l-4 border-blue-500 pl-6 py-4">
        <p className="text-xl text-gray-700 mb-4">"{quote}"</p>
        <footer className="flex items-center gap-3">
          {avatar && <img src={avatar} alt={author} className="w-12 h-12 rounded-full" />}
          <div>
            <div className="font-semibold">{author}</div>
            {role && <div className="text-sm text-gray-600">{role}</div>}
          </div>
        </footer>
      </blockquote>
    );
  }

  // Default card style
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {rating && (
        <div className="flex gap-1 mb-3">
          {[...Array(5)].map((_, i) => (
            <span key={i} className={i < rating ? 'text-yellow-400' : 'text-gray-300'}>
              ★
            </span>
          ))}
        </div>
      )}
      <p className="text-gray-700 mb-4">{quote}</p>
      <div className="flex items-center gap-3">
        {avatar && <img src={avatar} alt={author} className="w-12 h-12 rounded-full" />}
        <div>
          <div className="font-semibold">{author}</div>
          {role && <div className="text-sm text-gray-600">{role}</div>}
        </div>
      </div>
    </div>
  );
};
