import React from 'react';
import { 
  Code, 
  Smartphone, 
  Globe, 
  Palette, 
  Shield, 
  Zap,
  ArrowRight,
  CheckCircle,
  Star
} from 'lucide-react';

interface Service {
  id: string;
  title: string;
  description: string;
  features?: string[];
  icon?: React.ReactNode;
  price?: string;
  priceDescription?: string;
  link?: string;
  popular?: boolean;
  image?: string;
}

interface ServicesGridProps {
  title?: string;
  subtitle?: string;
  description?: string;
  services: Service[];
  columns?: 2 | 3 | 4;
  showPricing?: boolean;
  showFeatures?: boolean;
  cardStyle?: 'minimal' | 'detailed' | 'pricing';
  backgroundColor?: string;
  className?: string;
}

export const ServicesGrid: React.FC<ServicesGridProps> = ({
  title = '우리의 서비스',
  subtitle,
  description = '전문적이고 체계적인 서비스로 고객의 성공을 지원합니다.',
  services = [
    {
      id: '1',
      title: '웹 개발',
      description: '최신 기술을 활용한 반응형 웹사이트와 웹 애플리케이션을 개발합니다.',
      features: ['반응형 디자인', 'SEO 최적화', '성능 최적화', '보안 강화'],
      icon: <Globe className="w-6 h-6" />,
      price: '300만원부터',
      priceDescription: '프로젝트 규모에 따라',
      popular: true
    },
    {
      id: '2',
      title: '모바일 앱',
      description: 'iOS와 Android 플랫폼을 위한 네이티브 및 크로스 플랫폼 앱을 개발합니다.',
      features: ['크로스 플랫폼', '네이티브 성능', '앱스토어 등록', '유지보수'],
      icon: <Smartphone className="w-6 h-6" />,
      price: '500만원부터',
      priceDescription: '플랫폼당'
    },
    {
      id: '3',
      title: 'UI/UX 디자인',
      description: '사용자 중심의 직관적이고 아름다운 인터페이스를 디자인합니다.',
      features: ['사용자 리서치', '프로토타이핑', '디자인 시스템', 'A/B 테스트'],
      icon: <Palette className="w-6 h-6" />,
      price: '200만원부터',
      priceDescription: '화면 수에 따라'
    },
    {
      id: '4',
      title: '시스템 개발',
      description: '확장 가능하고 안정적인 백엔드 시스템과 API를 개발합니다.',
      features: ['클라우드 아키텍처', 'API 개발', '데이터베이스 설계', '모니터링'],
      icon: <Code className="w-6 h-6" />,
      price: '상담 후 견적',
      priceDescription: '요구사항에 따라'
    },
    {
      id: '5',
      title: '보안 컨설팅',
      description: '시스템 보안 진단부터 보안 정책 수립까지 종합적인 보안 서비스를 제공합니다.',
      features: ['보안 진단', '취약점 분석', '보안 정책', '교육 프로그램'],
      icon: <Shield className="w-6 h-6" />,
      price: '100만원부터',
      priceDescription: '진단 범위에 따라'
    },
    {
      id: '6',
      title: '성능 최적화',
      description: '웹사이트와 애플리케이션의 속도와 성능을 극대화합니다.',
      features: ['속도 분석', '코드 최적화', 'CDN 설정', '모니터링 구축'],
      icon: <Zap className="w-6 h-6" />,
      price: '150만원부터',
      priceDescription: '최적화 범위에 따라'
    }
  ],
  columns = 3,
  showPricing = false,
  showFeatures = true,
  cardStyle = 'detailed',
  backgroundColor = 'bg-primary',
  className = ''
}) => {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-2 lg:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4'
  };

  const renderServiceCard = (service: Service) => {
    if (cardStyle === 'minimal') {
      return (
        <div key={service.id} className="group text-center">
          {/* Icon */}
          <div className="w-16 h-16 bg-accent-primary/10 text-accent-primary rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-accent-primary group-hover:text-white transition-colors duration-300">
            {service.icon}
          </div>
          
          {/* Title */}
          <h3 className="text-xl font-bold mb-3">{service.title}</h3>
          
          {/* Description */}
          <p className="text-secondary leading-relaxed">{service.description}</p>
          
          {/* Link */}
          {service.link && (
            <div className="mt-4">
              <a 
                href={service.link}
                className="inline-flex items-center gap-2 text-accent-primary font-medium hover:gap-3 transition-all"
              >
                자세히 보기
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>
      );
    }

    if (cardStyle === 'pricing') {
      return (
        <div 
          key={service.id} 
          className={`card p-8 rounded-2xl shadow-theme hover:shadow-lg transition-all duration-300 relative ${
            service.popular ? 'ring-2 ring-accent-primary' : ''
          }`}
        >
          {/* Popular Badge */}
          {service.popular && (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="inline-flex items-center gap-1 px-4 py-1 bg-accent-primary text-white text-sm font-medium rounded-full">
                <Star className="w-3 h-3" />
                인기
              </span>
            </div>
          )}

          {/* Icon */}
          <div className="w-16 h-16 bg-accent-primary/10 text-accent-primary rounded-2xl flex items-center justify-center mb-6">
            {service.icon}
          </div>

          {/* Title */}
          <h3 className="text-2xl font-bold mb-4">{service.title}</h3>

          {/* Price */}
          {service.price && (
            <div className="mb-6">
              <div className="text-3xl font-bold text-accent-primary mb-1">
                {service.price}
              </div>
              {service.priceDescription && (
                <div className="text-sm text-secondary">
                  {service.priceDescription}
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <p className="text-secondary mb-6 leading-relaxed">{service.description}</p>

          {/* Features */}
          {showFeatures && service.features && (
            <div className="mb-8">
              <ul className="space-y-3">
                {service.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CTA Button */}
          <button className="w-full btn-theme-primary py-3 rounded-lg font-semibold transition-colors">
            상담 신청
          </button>
        </div>
      );
    }

    // Default: detailed style
    return (
      <div 
        key={service.id} 
        className="group card p-8 rounded-2xl shadow-theme hover:shadow-lg transition-all duration-300"
      >
        {/* Image */}
        {service.image && (
          <div className="mb-6 -mx-8 -mt-8">
            <img 
              src={service.image} 
              alt={service.title}
              className="w-full h-48 object-cover rounded-t-2xl"
            />
          </div>
        )}

        {/* Icon */}
        <div className="w-14 h-14 bg-accent-primary/10 text-accent-primary rounded-xl flex items-center justify-center mb-6 group-hover:bg-accent-primary group-hover:text-white transition-colors duration-300">
          {service.icon}
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold mb-4">{service.title}</h3>

        {/* Description */}
        <p className="text-secondary mb-6 leading-relaxed">{service.description}</p>

        {/* Features */}
        {showFeatures && service.features && (
          <div className="mb-6">
            <ul className="space-y-2">
              {service.features.slice(0, 3).map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 bg-accent-primary rounded-full flex-shrink-0"></div>
                  <span>{feature}</span>
                </li>
              ))}
              {service.features.length > 3 && (
                <li className="text-sm text-secondary">
                  +{service.features.length - 3}개 더
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Price */}
        {showPricing && service.price && (
          <div className="mb-6 p-4 bg-accent-primary/5 rounded-lg">
            <div className="text-lg font-bold text-accent-primary">
              {service.price}
            </div>
            {service.priceDescription && (
              <div className="text-sm text-secondary">
                {service.priceDescription}
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="flex items-center justify-between">
          <button className="btn-theme-primary px-6 py-2 rounded-lg font-medium">
            자세히 보기
          </button>
          <ArrowRight className="w-5 h-5 text-secondary group-hover:text-accent-primary group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    );
  };

  return (
    <section className={`services-grid py-16 md:py-24 ${backgroundColor} ${className}`}>
      <div className="container mx-auto px-6">
        {/* Header */}
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

        {/* Services Grid */}
        <div className={`grid grid-cols-1 ${gridCols[columns]} gap-8`}>
          {services.map(renderServiceCard)}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <div className="inline-block p-8 card rounded-2xl shadow-theme">
            <h3 className="text-xl font-bold mb-4">맞춤형 솔루션이 필요하신가요?</h3>
            <p className="text-secondary mb-6">
              고객의 특별한 요구사항에 맞는 커스텀 솔루션을 제공해드립니다.
            </p>
            <button className="btn-theme-primary px-8 py-3 rounded-lg font-semibold">
              무료 상담 신청
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};