/**
 * [testimonials] 숏코드 컴포넌트
 */

import React from 'react';
import { ShortcodeRendererProps } from '../../lib/shortcode/renderer';

const TestimonialsShortcode: React.FC<ShortcodeRendererProps> = ({
  shortcode,
  editorMode = false
}) => {
  const {
    count = 3,
    layout = 'grid',
    show_images = true,
    className = ''
  } = shortcode.attributes;

  // 기본 후기 데이터
  const defaultTestimonials = [
    {
      id: 1,
      content: "이 서비스는 정말 환상적입니다. 우리 비즈니스를 완전히 변화시켰어요!",
      author: "김민수",
      position: "CEO, 테크스타트업",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      rating: 5
    },
    {
      id: 2,
      content: "고객 지원이 최고예요. 언제나 빠르고 친절하게 도움을 주십니다.",
      author: "이영희",
      position: "마케팅 매니저, 글로벌컴퍼니",
      image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
      rating: 5
    },
    {
      id: 3,
      content: "가격 대비 성능이 뛰어나고, 사용하기도 매우 간편합니다.",
      author: "박철수",
      position: "개발팀장, 이노베이션랩",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      rating: 4
    }
  ];

  const testimonials = defaultTestimonials.slice(0, Number(count));

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <svg
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

  if (layout === 'carousel') {
    return (
      <div className={`testimonials-shortcode carousel ${editorMode ? 'editor-mode' : ''} ${className}`}>
        <div className="testimonials-carousel relative bg-gray-50 py-12 px-6 rounded-lg">
          <div className="testimonial-item text-center max-w-2xl mx-auto">
            <svg className="w-8 h-8 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 11-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            
            <blockquote className="text-lg text-gray-700 mb-6">
              "{testimonials[0]?.content}"
            </blockquote>
            
            <div className="testimonial-author">
              {show_images && testimonials[0]?.image && (
                <img
                  src={testimonials[0].image}
                  alt={testimonials[0].author}
                  className="w-12 h-12 rounded-full mx-auto mb-3"
                />
              )}
              <div className="author-info">
                <div className="author-name font-medium text-gray-900">{testimonials[0]?.author}</div>
                <div className="author-position text-sm text-gray-600">{testimonials[0]?.position}</div>
              </div>
              <div className="rating flex justify-center mt-2">
                {renderStars(testimonials[0]?.rating || 5)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`testimonials-shortcode grid ${editorMode ? 'editor-mode' : ''} ${className}`}>
      <div className={`testimonials-grid grid gap-6 ${testimonials.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
        {testimonials.map((testimonial) => (
          <div
            key={testimonial.id}
            className="testimonial-card bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200"
          >
            <div className="testimonial-content mb-4">
              <div className="rating flex mb-3">
                {renderStars(testimonial.rating)}
              </div>
              
              <blockquote className="text-gray-700 mb-4">
                "{testimonial.content}"
              </blockquote>
            </div>
            
            <div className="testimonial-author flex items-center">
              {show_images && testimonial.image && (
                <img
                  src={testimonial.image}
                  alt={testimonial.author}
                  className="w-10 h-10 rounded-full mr-3"
                />
              )}
              <div className="author-info">
                <div className="author-name font-medium text-gray-900">{testimonial.author}</div>
                <div className="author-position text-sm text-gray-600">{testimonial.position}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editorMode && (
        <div className="shortcode-editor-overlay">
          <div className="shortcode-info bg-blue-500 text-white text-xs px-2 py-1 rounded">
            Testimonials: {testimonials.length} items ({layout})
          </div>
        </div>
      )}
    </div>
  );
};

export default TestimonialsShortcode;