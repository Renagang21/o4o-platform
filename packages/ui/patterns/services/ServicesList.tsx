import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  CheckCircle, 
  Clock, 
  Users, 
  Star,
  ArrowRight,
  Tag
} from 'lucide-react';

interface ServiceDetail {
  id: string;
  title: string;
  description: string;
  fullDescription?: string;
  features: string[];
  duration?: string;
  teamSize?: string;
  price?: string;
  priceDescription?: string;
  category?: string;
  rating?: number;
  reviewCount?: number;
  tags?: string[];
}

interface ServicesListProps {
  title?: string;
  subtitle?: string;
  description?: string;
  services: ServiceDetail[];
  showExpandable?: boolean;
  showCategories?: boolean;
  showPricing?: boolean;
  showRatings?: boolean;
  backgroundColor?: string;
  className?: string;
}

export const ServicesList: React.FC<ServicesListProps> = ({
  title = '서비스 상세 안내',
  subtitle,
  description = '각 서비스의 상세 내용과 포함 사항을 확인해보세요.',
  services = [
    {
      id: '1',
      title: '웹사이트 개발 패키지',
      description: '기업 맞춤형 반응형 웹사이트를 개발하여 온라인 비즈니스 기반을 구축합니다.',
      fullDescription: '최신 웹 기술을 활용하여 사용자 경험을 극대화하고, SEO에 최적화된 웹사이트를 제작합니다. 관리자 시스템을 포함하여 콘텐츠 관리가 용이하며, 모든 디바이스에서 완벽하게 작동합니다.',
      features: [
        '반응형 디자인 (모바일, 태블릿, 데스크톱)',
        'SEO 최적화 및 검색엔진 등록',
        '관리자 시스템 (CMS)',
        '소셜미디어 연동',
        'Google Analytics 설정',
        '3개월 무료 유지보수'
      ],
      duration: '4-6주',
      teamSize: '3-4명',
      price: '300만원',
      priceDescription: '기본 패키지 기준',
      category: '웹 개발',
      rating: 4.9,
      reviewCount: 127,
      tags: ['React', 'Node.js', 'PostgreSQL']
    },
    {
      id: '2',
      title: '모바일 앱 개발',
      description: 'iOS와 Android 플랫폼을 위한 고품질 네이티브 또는 크로스플랫폼 앱을 개발합니다.',
      fullDescription: '사용자 중심의 UI/UX 디자인과 안정적인 백엔드 시스템을 구축하여 완성도 높은 모바일 앱을 제공합니다. 앱스토어 등록부터 런칭 후 마케팅 지원까지 포함됩니다.',
      features: [
        'iOS & Android 네이티브 개발',
        '백엔드 API 개발',
        '푸시 알림 시스템',
        '앱스토어 등록 및 심사 지원',
        '사용자 분석 도구 연동',
        '6개월 기술 지원'
      ],
      duration: '8-12주',
      teamSize: '4-5명',
      price: '800만원',
      priceDescription: '플랫폼당 기준',
      category: '모바일',
      rating: 4.8,
      reviewCount: 89,
      tags: ['React Native', 'Flutter', 'Firebase']
    },
    {
      id: '3',
      title: 'UI/UX 디자인 컨설팅',
      description: '사용자 경험을 극대화하는 직관적이고 매력적인 인터페이스 디자인을 제공합니다.',
      fullDescription: '깊이 있는 사용자 리서치를 바탕으로 브랜드 아이덴티티에 맞는 일관성 있는 디자인 시스템을 구축합니다. 프로토타이핑부터 최종 디자인까지 전 과정을 포함합니다.',
      features: [
        '사용자 리서치 및 페르소나 정의',
        '와이어프레임 및 프로토타입',
        '비주얼 디자인 및 브랜딩',
        '디자인 시스템 구축',
        '사용성 테스트',
        '개발팀 협업 지원'
      ],
      duration: '6-8주',
      teamSize: '2-3명',
      price: '400만원',
      priceDescription: '프로젝트 규모에 따라',
      category: '디자인',
      rating: 4.9,
      reviewCount: 156,
      tags: ['Figma', 'Adobe Creative', 'Principle']
    },
    {
      id: '4',
      title: '데이터 분석 솔루션',
      description: '비즈니스 데이터를 수집, 분석하여 의사결정에 필요한 인사이트를 제공합니다.',
      fullDescription: '다양한 데이터 소스를 통합하여 실시간 대시보드를 구축하고, 비즈니스 성과를 측정할 수 있는 KPI 체계를 수립합니다. 예측 분석과 리포팅 자동화를 포함합니다.',
      features: [
        '데이터 수집 및 정제 시스템',
        '실시간 대시보드 구축',
        'KPI 지표 설계',
        '예측 분석 모델링',
        '자동 리포팅 시스템',
        '데이터 시각화'
      ],
      duration: '10-14주',
      teamSize: '3-4명',
      price: '600만원',
      priceDescription: '데이터 규모에 따라',
      category: '데이터',
      rating: 4.7,
      reviewCount: 73,
      tags: ['Python', 'Tableau', 'AWS']
    }
  ],
  showExpandable = true,
  showCategories = true,
  showPricing = true,
  showRatings = true,
  backgroundColor = 'bg-secondary',
  className = ''
}) => {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', ...Array.from(new Set(services.map(s => s.category).filter(Boolean)))];

  const filteredServices = selectedCategory === 'all' 
    ? services 
    : services.filter(s => s.category === selectedCategory);

  const toggleExpanded = (serviceId: string) => {
    setExpandedItems(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const renderRating = (rating: number, reviewCount: number) => (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i} 
            className={`w-4 h-4 ${i < Math.floor(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
          />
        ))}
      </div>
      <span className="text-sm text-secondary">
        {rating} ({reviewCount}개 리뷰)
      </span>
    </div>
  );

  return (
    <section className={`services-list py-16 md:py-24 ${backgroundColor} ${className}`}>
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
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

          {/* Category Filter */}
          {showCategories && categories.length > 2 && (
            <div className="flex flex-wrap justify-center gap-2 mb-12">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-accent-primary text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {category === 'all' ? '전체' : category}
                </button>
              ))}
            </div>
          )}

          {/* Services List */}
          <div className="space-y-6">
            {filteredServices.map((service) => {
              const isExpanded = expandedItems.includes(service.id);
              
              return (
                <div key={service.id} className="card rounded-lg shadow-theme overflow-hidden">
                  {/* Service Header */}
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Category & Rating */}
                        <div className="flex items-center gap-4 mb-3">
                          {service.category && (
                            <span className="inline-block px-3 py-1 bg-accent-primary/10 text-accent-primary text-sm font-medium rounded-full">
                              {service.category}
                            </span>
                          )}
                          {showRatings && service.rating && service.reviewCount && (
                            renderRating(service.rating, service.reviewCount)
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="text-xl font-bold mb-3">{service.title}</h3>

                        {/* Description */}
                        <p className="text-secondary leading-relaxed mb-4">
                          {service.description}
                        </p>

                        {/* Meta Info */}
                        <div className="flex flex-wrap items-center gap-6 text-sm text-secondary mb-4">
                          {service.duration && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>기간: {service.duration}</span>
                            </div>
                          )}
                          {service.teamSize && (
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              <span>팀 규모: {service.teamSize}</span>
                            </div>
                          )}
                        </div>

                        {/* Price */}
                        {showPricing && service.price && (
                          <div className="mb-4">
                            <div className="text-2xl font-bold text-accent-primary">
                              {service.price}
                            </div>
                            {service.priceDescription && (
                              <div className="text-sm text-secondary">
                                {service.priceDescription}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Tags */}
                        {service.tags && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {service.tags.map((tag) => (
                              <span 
                                key={tag}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                              >
                                <Tag className="w-3 h-3" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 ml-6">
                        <button className="btn-theme-primary px-6 py-2 rounded-lg font-medium whitespace-nowrap">
                          상담 신청
                        </button>
                        
                        {showExpandable && (
                          <button
                            onClick={() => toggleExpanded(service.id)}
                            className="flex items-center gap-2 text-accent-primary hover:text-accent-secondary transition-colors"
                          >
                            <span className="text-sm">
                              {isExpanded ? '접기' : '자세히'}
                            </span>
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {showExpandable && isExpanded && (
                    <div className="border-t border-theme bg-accent-primary/5 p-6">
                      {/* Full Description */}
                      {service.fullDescription && (
                        <div className="mb-6">
                          <h4 className="font-semibold mb-3">상세 설명</h4>
                          <p className="text-secondary leading-relaxed">
                            {service.fullDescription}
                          </p>
                        </div>
                      )}

                      {/* Features */}
                      <div>
                        <h4 className="font-semibold mb-3">포함 사항</h4>
                        <div className="grid md:grid-cols-2 gap-3">
                          {service.features.map((feature, index) => (
                            <div key={index} className="flex items-start gap-3">
                              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                              <span className="text-sm">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Additional CTA */}
                      <div className="mt-6 pt-6 border-t border-theme">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">더 자세한 정보가 필요하신가요?</div>
                            <div className="text-sm text-secondary">무료 상담을 통해 맞춤 제안서를 받아보세요</div>
                          </div>
                          <button className="flex items-center gap-2 text-accent-primary font-medium hover:gap-3 transition-all">
                            무료 상담 신청
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom CTA */}
          <div className="text-center mt-12">
            <div className="card p-8 rounded-2xl shadow-theme">
              <h3 className="text-xl font-bold mb-4">원하는 서비스를 찾지 못하셨나요?</h3>
              <p className="text-secondary mb-6">
                고객의 특별한 요구사항에 맞는 맞춤형 솔루션을 제안해드립니다.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="btn-theme-primary px-8 py-3 rounded-lg font-semibold">
                  맞춤 상담 신청
                </button>
                <button className="btn-theme-secondary px-8 py-3 rounded-lg font-semibold">
                  포트폴리오 보기
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};