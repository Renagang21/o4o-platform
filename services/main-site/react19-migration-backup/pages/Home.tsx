import React from 'react';
import { Link } from 'react-router-dom';
import HeroSection from '../components/home/HeroSection';
import StepGuide from '../components/home/StepGuide';
import TrustSlider from '../components/home/TrustSlider';
import BrandPreview from '../components/home/BrandPreview';
import Footer from '../components/home/Footer';

const Home: React.FC = () => {
  const services = [
    {
      id: 'dropshipping',
      title: '드랍쉬핑',
      description: '정보 중심 제품의 B2B2C 플랫폼',
      icon: '🛍️',
      features: ['4-Way 생태계', '파트너 시스템', '등급별 혜택', '신뢰도 기반 거래'],
      status: 'available',
      href: '/dropshipping',
      color: 'from-blue-500 to-purple-600'
    },
    {
      id: 'crowdfunding',
      title: '크라우드펀딩',
      description: '투명성 기반 신뢰도 펀딩',
      icon: '🚀',
      features: ['투명성 허브', '전문가 검증', '파트너 크로스 프로모션', '드랍쉬핑 연동'],
      status: 'coming_soon',
      href: '/crowdfunding',
      color: 'from-orange-500 to-red-600'
    },
    {
      id: 'signage',
      title: '디지털 사이니지',
      description: '타겟 마케팅 기반 스마트 디스플레이',
      icon: '📺',
      features: ['드래그앤드롭 에디터', '실시간 업데이트', '타겟 콘텐츠', '다중 디스플레이 관리'],
      status: 'coming_soon',
      href: '/signage',
      color: 'from-green-500 to-teal-600'
    },
    {
      id: 'forum',
      title: '포럼',
      description: '전문가와 고객이 만나는 지식 커뮤니티',
      icon: '💬',
      features: ['전문가 상담', 'Q&A 시스템', '제품별 커뮤니티', '실시간 정보 공유'],
      status: 'coming_soon',
      href: '/forum',
      color: 'from-purple-500 to-pink-600'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <HeroSection />
      <StepGuide />
      
      {/* Services Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              🌟 o4o-Platform 통합 서비스
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              하나의 플랫폼에서 모든 비즈니스 기회를 잡으세요
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
            {services.map((service) => (
              <div
                key={service.id}
                className={`bg-gradient-to-br ${service.color} text-white transform transition-all duration-300 hover:scale-105 rounded-xl shadow-xl`}
              >
                <div className="p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div className="text-5xl">{service.icon}</div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        service.status === 'available' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {service.status === 'available' ? '이용 가능' : '출시 예정'}
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold mb-3">{service.title}</h3>
                  <p className="text-white text-opacity-90 mb-6 leading-relaxed">
                    {service.description}
                  </p>

                  <div className="space-y-2 mb-8">
                    {service.features.map((feature, index) => (
                      <div key={index} className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-white rounded-full mr-3" />
                        <span className="text-sm text-white text-opacity-90">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {service.status === 'available' ? (
                    <Link
                      to={service.href}
                      className="block w-full bg-white text-gray-900 text-center py-3 px-6 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                    >
                      시작하기
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="w-full bg-white bg-opacity-50 text-white text-center py-3 px-6 rounded-lg font-medium cursor-not-allowed"
                    >
                      곧 출시 예정
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 통합 플랫폼 소개 */}
          <div className="mt-16">
            <div className="bg-white rounded-xl shadow-xl p-8 lg:p-12">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  🔗 통합 플랫폼의 힘
                </h3>
                <p className="text-lg text-gray-600 mb-8">
                  모든 서비스가 하나로 연결되어 시너지 효과를 극대화합니다
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">🔄</span>
                    </div>
                    <h4 className="font-medium text-gray-900 mb-2">데이터 연동</h4>
                    <p className="text-sm text-gray-600">
                      펀딩 성공 제품이 자동으로 드랍쉬핑으로 전환되고, 
                      포럼 인기 토픽이 사이니지 콘텐츠가 됩니다
                    </p>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">🤝</span>
                    </div>
                    <h4 className="font-medium text-gray-900 mb-2">파트너 생태계</h4>
                    <p className="text-sm text-gray-600">
                      모든 서비스에서 파트너들이 활동하며, 
                      법적 준수 기반의 건전한 수수료 시스템을 제공합니다
                    </p>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">📊</span>
                    </div>
                    <h4 className="font-medium text-gray-900 mb-2">통합 분석</h4>
                    <p className="text-sm text-gray-600">
                      모든 서비스의 데이터가 통합되어 
                      더 정확한 인사이트와 개인화 서비스를 제공합니다
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <TrustSlider />
      <BrandPreview />
      <Footer />
    </div>
  );
};

export default Home;