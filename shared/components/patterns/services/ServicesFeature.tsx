import React from 'react';
import { 
  CheckCircle, 
  ArrowRight, 
  Star, 
  Users, 
  Clock, 
  Award,
  Zap,
  Shield,
  Lightbulb,
  Target
} from 'lucide-react';

interface FeatureHighlight {
  id: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
}

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  company: string;
  avatar?: string;
  rating?: number;
}

interface ServicesFeatureProps {
  title?: string;
  subtitle?: string;
  description?: string;
  serviceTitle: string;
  serviceDescription: string;
  mainImage: string;
  features: string[];
  highlights?: FeatureHighlight[];
  testimonial?: Testimonial;
  benefits?: string[];
  ctaText?: string;
  onCTAClick?: () => void;
  layout?: 'image-left' | 'image-right' | 'centered';
  backgroundColor?: string;
  className?: string;
}

export const ServicesFeature: React.FC<ServicesFeatureProps> = ({
  title = '주요 서비스',
  subtitle,
  description,
  serviceTitle,
  serviceDescription,
  mainImage,
  features,
  highlights = [
    {
      id: '1',
      title: '전문성',
      description: '10년 이상의 경험을 가진 전문가들이 프로젝트를 담당합니다',
      icon: <Award className="w-6 h-6" />
    },
    {
      id: '2',
      title: '빠른 속도',
      description: '효율적인 개발 프로세스로 빠른 결과물을 제공합니다',
      icon: <Zap className="w-6 h-6" />
    },
    {
      id: '3',
      title: '안정성',
      description: '철저한 테스트와 품질 관리로 안정적인 서비스를 보장합니다',
      icon: <Shield className="w-6 h-6" />
    }
  ],
  testimonial,
  benefits = [
    '비즈니스 목표 달성률 300% 향상',
    '개발 시간 50% 단축',
    '운영 비용 40% 절감',
    '고객 만족도 98% 달성'
  ],
  ctaText = '무료 상담 신청',
  onCTAClick,
  layout = 'image-left',
  backgroundColor = 'bg-primary',
  className = ''
}) => {
  const defaultTestimonial: Testimonial = {
    quote: "정말 전문적이고 체계적인 서비스였습니다. 기대했던 것보다 훨씬 더 좋은 결과를 얻을 수 있었고, 팀의 전문성과 소통 능력이 인상적이었습니다.",
    author: "김철수",
    role: "CTO",
    company: "테크노베이션",
    rating: 5
  };

  const activeTestimonial = testimonial || defaultTestimonial;

  const renderHighlights = () => (
    <div className="grid md:grid-cols-3 gap-6 mb-12">
      {highlights.map((highlight) => (
        <div key={highlight.id} className="text-center">
          <div className="w-16 h-16 bg-accent-primary/10 text-accent-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            {highlight.icon}
          </div>
          <h3 className="font-bold mb-2">{highlight.title}</h3>
          <p className="text-secondary text-sm">{highlight.description}</p>
        </div>
      ))}
    </div>
  );

  const renderFeatures = () => (
    <div className="space-y-4">
      {features.map((feature, index) => (
        <div key={index} className="flex items-start gap-3">
          <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
          <span className="text-lg">{feature}</span>
        </div>
      ))}
    </div>
  );

  const renderTestimonial = () => (
    <div className="card p-8 rounded-2xl shadow-theme">
      {/* Rating */}
      {activeTestimonial.rating && (
        <div className="flex items-center gap-1 mb-4">
          {[...Array(activeTestimonial.rating)].map((_, i) => (
            <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
          ))}
        </div>
      )}
      
      {/* Quote */}
      <blockquote className="text-lg italic mb-6 leading-relaxed">
        "{activeTestimonial.quote}"
      </blockquote>
      
      {/* Author */}
      <div className="flex items-center gap-4">
        {activeTestimonial.avatar && (
          <img
            src={activeTestimonial.avatar}
            alt={activeTestimonial.author}
            className="w-12 h-12 rounded-full object-cover"
          />
        )}
        <div>
          <div className="font-semibold">{activeTestimonial.author}</div>
          <div className="text-sm text-secondary">
            {activeTestimonial.role} at {activeTestimonial.company}
          </div>
        </div>
      </div>
    </div>
  );

  const renderMainContent = () => {
    const imageContent = (
      <div className="relative">
        <img
          src={mainImage}
          alt={serviceTitle}
          className="w-full h-auto rounded-2xl shadow-theme"
        />
        
        {/* Floating Stats */}
        <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-theme p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-accent-primary">500+</div>
            <div className="text-sm text-secondary">성공 프로젝트</div>
          </div>
        </div>
        
        <div className="absolute -top-6 -right-6 bg-white rounded-xl shadow-theme p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">98%</div>
            <div className="text-sm text-secondary">고객 만족도</div>
          </div>
        </div>
      </div>
    );

    const textContent = (
      <div className="space-y-8">
        <div>
          <h3 className="text-3xl font-bold mb-4">{serviceTitle}</h3>
          <p className="text-lg text-secondary leading-relaxed mb-6">
            {serviceDescription}
          </p>
        </div>

        {renderFeatures()}

        {/* Benefits */}
        {benefits.length > 0 && (
          <div className="p-6 bg-accent-primary/5 rounded-xl">
            <h4 className="font-bold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-accent-primary" />
              주요 성과
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {benefits.map((benefit, index) => (
                <div key={index} className="text-sm font-medium text-accent-primary">
                  • {benefit}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={onCTAClick}
            className="flex items-center justify-center gap-2 btn-theme-primary px-8 py-4 rounded-lg font-semibold text-lg"
          >
            {ctaText}
            <ArrowRight className="w-5 h-5" />
          </button>
          
          <button className="flex items-center justify-center gap-2 btn-theme-secondary px-8 py-4 rounded-lg font-semibold text-lg">
            <Lightbulb className="w-5 h-5" />
            포트폴리오 보기
          </button>
        </div>
      </div>
    );

    if (layout === 'centered') {
      return (
        <div className="text-center">
          <div className="max-w-2xl mx-auto mb-12">
            {textContent}
          </div>
          <div className="max-w-4xl mx-auto">
            {imageContent}
          </div>
        </div>
      );
    }

    return (
      <div className={`grid lg:grid-cols-2 gap-12 items-center ${
        layout === 'image-right' ? 'lg:grid-cols-2' : ''
      }`}>
        {layout === 'image-left' ? (
          <>
            <div className="order-2 lg:order-1">{imageContent}</div>
            <div className="order-1 lg:order-2">{textContent}</div>
          </>
        ) : (
          <>
            <div>{textContent}</div>
            <div>{imageContent}</div>
          </>
        )}
      </div>
    );
  };

  return (
    <section className={`services-feature py-16 md:py-24 ${backgroundColor} ${className}`}>
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          {title && (
            <div className="text-center mb-16">
              {subtitle && (
                <div className="mb-4">
                  <span className="inline-block px-4 py-2 bg-accent-primary/10 text-accent-primary text-sm font-medium rounded-full">
                    {subtitle}
                  </span>
                </div>
              )}
              
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                {title}
              </h2>
              
              {description && (
                <p className="text-lg text-secondary max-w-3xl mx-auto leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          )}

          {/* Highlights */}
          {highlights.length > 0 && renderHighlights()}

          {/* Main Content */}
          {renderMainContent()}

          {/* Testimonial */}
          {activeTestimonial && (
            <div className="mt-16">
              <h3 className="text-2xl font-bold text-center mb-8">고객 후기</h3>
              <div className="max-w-3xl mx-auto">
                {renderTestimonial()}
              </div>
            </div>
          )}

          {/* Process Steps */}
          <div className="mt-16">
            <h3 className="text-2xl font-bold text-center mb-12">진행 과정</h3>
            <div className="grid md:grid-cols-4 gap-8">
              {[
                { step: '01', title: '상담 & 분석', desc: '요구사항 파악 및 분석' },
                { step: '02', title: '기획 & 설계', desc: '상세 기획 및 시스템 설계' },
                { step: '03', title: '개발 & 테스트', desc: '개발 진행 및 품질 테스트' },
                { step: '04', title: '배포 & 지원', desc: '서비스 배포 및 사후 지원' }
              ].map((process, index) => (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-accent-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                    {process.step}
                  </div>
                  <h4 className="font-bold mb-2">{process.title}</h4>
                  <p className="text-secondary text-sm">{process.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Final CTA */}
          <div className="mt-16 text-center">
            <div className="inline-block p-8 card rounded-2xl shadow-theme">
              <div className="flex items-center justify-center gap-4 mb-4">
                <Users className="w-8 h-8 text-accent-primary" />
                <Clock className="w-8 h-8 text-accent-primary" />
                <Award className="w-8 h-8 text-accent-primary" />
              </div>
              <h3 className="text-xl font-bold mb-4">지금 시작하세요!</h3>
              <p className="text-secondary mb-6">
                전문가와의 무료 상담을 통해 맞춤형 솔루션을 확인해보세요.
              </p>
              <button
                onClick={onCTAClick}
                className="btn-theme-primary px-8 py-3 rounded-lg font-semibold"
              >
                무료 상담 예약하기
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};