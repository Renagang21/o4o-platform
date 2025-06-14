import React from 'react';
import { Star } from 'lucide-react';

const TrustSlider: React.FC = () => {
  const testimonials = [
    {
      name: '김지원',
      role: '헬스케어 브랜드 대표',
      content: '전문적인 제품 개발과 브랜딩 지원으로 성공적인 런칭을 할 수 있었습니다.',
      rating: 5
    },
    {
      name: '이민수',
      role: '뷰티 브랜드 운영자',
      content: '품질 관리와 배송 시스템이 완벽해서 고객 만족도가 높습니다.',
      rating: 5
    },
    {
      name: '박서연',
      role: '웰니스 스타트업 대표',
      content: '맞춤형 솔루션과 전문가 컨설팅이 큰 도움이 되었습니다.',
      rating: 5
    }
  ];

  const certifications = [
    { name: 'GMP', image: '/images/cert-gmp.png' },
    { name: 'ISO', image: '/images/cert-iso.png' },
    { name: 'FDA', image: '/images/cert-fda.png' }
  ];

  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">
            신뢰할 수 있는 파트너
          </h2>
          <p className="text-xl text-gray-600">
            많은 브랜드가 선택한 이유
          </p>
        </div>

        {/* Testimonials */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-white p-8 rounded-2xl shadow-lg"
            >
              <div className="flex items-center mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-600 mb-6">{testimonial.content}</p>
              <div>
                <p className="font-semibold text-gray-900">{testimonial.name}</p>
                <p className="text-gray-500">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Certifications */}
        <div className="flex justify-center items-center gap-12">
          {certifications.map((cert, index) => (
            <div key={index} className="text-center">
              <img
                src={cert.image}
                alt={cert.name}
                className="h-16 w-auto mb-4"
              />
              <p className="text-gray-600 font-medium">{cert.name}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustSlider; 