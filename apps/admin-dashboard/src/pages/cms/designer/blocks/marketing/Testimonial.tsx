/**
 * Marketing Block - Testimonial
 *
 * Single customer testimonial with quote, author, and role
 */

export interface TestimonialProps {
  quote: string;
  author: string;
  role?: string;
  company?: string;
  avatar?: string;
  rating?: number;
  layout?: 'card' | 'quote' | 'minimal';
}

export default function Testimonial({
  quote = 'This product changed my life. Highly recommend!',
  author = 'John Doe',
  role = 'CEO',
  company = 'Acme Inc',
  avatar,
  rating = 5,
  layout = 'card',
}: TestimonialProps) {
  if (layout === 'minimal') {
    return (
      <div className="py-6">
        <p className="text-lg italic text-gray-700 mb-4">"{quote}"</p>
        <div className="flex items-center gap-3">
          {avatar && (
            <img
              src={avatar}
              alt={author}
              className="w-12 h-12 rounded-full object-cover"
            />
          )}
          <div>
            <div className="font-semibold text-gray-900">{author}</div>
            {role && <div className="text-sm text-gray-600">{role}{company ? ` at ${company}` : ''}</div>}
          </div>
        </div>
      </div>
    );
  }

  if (layout === 'quote') {
    return (
      <div className="relative py-8 px-6">
        <div className="text-6xl text-blue-200 absolute top-0 left-0">"</div>
        <p className="text-xl text-gray-700 mb-6 relative z-10 pl-8">{quote}</p>
        <div className="flex items-center gap-4">
          {avatar && (
            <img
              src={avatar}
              alt={author}
              className="w-16 h-16 rounded-full object-cover border-2 border-blue-500"
            />
          )}
          <div>
            <div className="font-bold text-gray-900">{author}</div>
            {role && <div className="text-gray-600">{role}{company ? ` at ${company}` : ''}</div>}
            {rating > 0 && (
              <div className="flex gap-1 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={i < rating ? 'text-yellow-400' : 'text-gray-300'}>
                    ★
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default: card layout
  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      {rating > 0 && (
        <div className="flex gap-1 mb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className={i < rating ? 'text-yellow-400' : 'text-gray-300'}>
              ★
            </span>
          ))}
        </div>
      )}
      <p className="text-gray-700 mb-6 italic">"{quote}"</p>
      <div className="flex items-center gap-4">
        {avatar && (
          <img
            src={avatar}
            alt={author}
            className="w-12 h-12 rounded-full object-cover"
          />
        )}
        <div>
          <div className="font-semibold text-gray-900">{author}</div>
          {role && <div className="text-sm text-gray-600">{role}{company ? ` at ${company}` : ''}</div>}
        </div>
      </div>
    </div>
  );
}
