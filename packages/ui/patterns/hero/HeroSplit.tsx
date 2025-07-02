import React from 'react';
import { ArrowRight, Check, Star } from 'lucide-react';

interface Benefit {
  text: string;
  isHighlighted?: boolean;
}

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  avatar?: string;
  rating?: number;
}

interface HeroSplitProps {
  title: string;
  subtitle?: string;
  description?: string;
  benefits?: Benefit[];
  testimonial?: Testimonial;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  onPrimaryClick?: () => void;
  onSecondaryClick?: () => void;
  rightImage: string;
  imageAlt?: string;
  backgroundColor?: string;
  className?: string;
}

export const HeroSplit: React.FC<HeroSplitProps> = ({
  title,
  subtitle,
  description,
  benefits = [
    { text: '간단한 설정과 빠른 시작' },
    { text: '전문가 수준의 결과물', isHighlighted: true },
    { text: '24/7 고객 지원 서비스' }
  ],
  testimonial,
  primaryButtonText = '무료로 시작하기',
  secondaryButtonText = '데모 보기',
  onPrimaryClick,
  onSecondaryClick,
  rightImage,
  imageAlt = 'Product showcase',
  backgroundColor = 'bg-gradient-to-br from-gray-50 to-blue-50',
  className = ''
}) => {
  return (
    <section className={`hero-split py-16 md:py-24 ${backgroundColor} ${className}`}>
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div>
            {/* Subtitle */}
            {subtitle && (
              <div className="mb-6">
                <span className="inline-block px-4 py-2 bg-accent-primary text-white text-sm font-semibold rounded-full">
                  {subtitle}
                </span>
              </div>
            )}

            {/* Main Title */}
            <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              {title}
            </h1>

            {/* Description */}
            {description && (
              <p className="text-lg text-secondary mb-8 leading-relaxed">
                {description}
              </p>
            )}

            {/* Benefits List */}
            {benefits.length > 0 && (
              <div className="mb-8 space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${
                      benefit.isHighlighted 
                        ? 'bg-accent-primary text-white' 
                        : 'bg-green-100 text-green-600'
                    }`}>
                      <Check className="w-4 h-4" />
                    </div>
                    <span className={`text-base ${
                      benefit.isHighlighted ? 'font-semibold text-accent-primary' : 'text-secondary'
                    }`}>
                      {benefit.text}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Testimonial */}
            {testimonial && (
              <div className="mb-8 p-6 bg-white rounded-xl shadow-theme border-l-4 border-accent-primary">
                {/* Rating */}
                {testimonial.rating && (
                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                )}
                
                {/* Quote */}
                <blockquote className="text-gray-700 mb-4 italic">
                  "{testimonial.quote}"
                </blockquote>
                
                {/* Author */}
                <div className="flex items-center gap-3">
                  {testimonial.avatar && (
                    <img
                      src={testimonial.avatar}
                      alt={testimonial.author}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <div className="font-semibold text-sm">{testimonial.author}</div>
                    <div className="text-xs text-secondary">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              {primaryButtonText && (
                <button
                  onClick={onPrimaryClick}
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 btn-theme-primary rounded-lg font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-theme"
                >
                  {primaryButtonText}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              )}
              
              {secondaryButtonText && (
                <button
                  onClick={onSecondaryClick}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 btn-theme-secondary rounded-lg font-semibold text-lg transition-all duration-300"
                >
                  {secondaryButtonText}
                </button>
              )}
            </div>

            {/* Trust Indicators */}
            <div className="mt-8 pt-8 border-t border-theme">
              <div className="flex items-center gap-6 text-sm text-secondary">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>14일 무료 체험</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>신용카드 불필요</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>언제든 취소 가능</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Image */}
          <div className="relative">
            <div className="relative z-10">
              <img
                src={rightImage}
                alt={imageAlt}
                className="w-full h-auto rounded-2xl shadow-theme"
              />
            </div>

            {/* Decorative Elements */}
            <div className="absolute -top-4 -left-4 w-full h-full bg-accent-primary/10 rounded-2xl -z-10"></div>
            
            {/* Floating Elements */}
            <div className="absolute top-8 -left-8 bg-white rounded-lg shadow-theme p-4 z-20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold">성공률</div>
                  <div className="text-xs text-secondary">98.5%</div>
                </div>
              </div>
            </div>

            <div className="absolute bottom-8 -right-8 bg-white rounded-lg shadow-theme p-4 z-20">
              <div className="text-center">
                <div className="text-2xl font-bold text-accent-primary">10K+</div>
                <div className="text-xs text-secondary">만족한 고객</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};