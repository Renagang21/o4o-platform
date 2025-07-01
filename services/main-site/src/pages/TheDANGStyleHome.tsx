import React from 'react';
import { Link } from 'react-router-dom';

const TheDANGStyleHome: React.FC = () => {
  const services = [
    {
      id: 'ecommerce',
      title: 'E-commerce',
      description: '통합 전자상거래 플랫폼',
      icon: '🛍️',
      status: 'available',
      href: '/shop',
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'signage',
      title: 'Digital Signage',
      description: '스마트 디지털 사이니지 관리',
      icon: '📺',
      status: 'available',
      href: '/signage',
      color: 'from-green-500 to-green-600'
    },
    {
      id: 'crowdfunding',
      title: 'Crowdfunding',
      description: '혁신적인 크라우드펀딩 플랫폼',
      icon: '🚀',
      status: 'coming_soon',
      href: '/crowdfunding',
      color: 'from-orange-500 to-orange-600'
    },
    {
      id: 'forum',
      title: 'Community Forum',
      description: '전문가와 고객이 만나는 커뮤니티',
      icon: '💬',
      status: 'coming_soon',
      href: '/forum',
      color: 'from-purple-500 to-purple-600'
    }
  ];

  return (
    <div className="min-h-screen bg-[#ecf0f3]">
      {/* 테스트 환경 배너 */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#ffebee',
        border: '2px solid #f44336',
        padding: '10px',
        textAlign: 'center',
        zIndex: 1000,
        fontSize: '14px',
        fontWeight: 'bold'
      }}>
        🧪 테스트 환경 | 
        <span style={{ margin: '0 15px' }}>
          <strong>고객:</strong> test@customer.com / pw123 
        </span>
        <span style={{ margin: '0 15px' }}>
          <strong>비즈니스:</strong> test@business.com / pw123
        </span>
        <span style={{ margin: '0 15px' }}>
          <strong>제휴사:</strong> test@affiliate.com / pw123
        </span>
        <span style={{ margin: '0 15px' }}>
          <strong>관리자:</strong> test@admin.com / pw123
        </span>
        | <Link to="/dropshipping" style={{ color: '#f44336', textDecoration: 'underline' }}>드롭쉬핑</Link>
        | <Link to="/admin-test" style={{ color: '#f44336', textDecoration: 'underline' }}>관리자</Link>
      </div>
      {/* Header Navigation - thedang.co.kr style */}
      <header className="bg-white shadow-sm" style={{ marginTop: '50px' }}>
        <nav className="max-w-[1200px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link to="/" className="text-2xl font-bold text-[#5787c5]">
                o4o-Platform
              </Link>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link 
                to="/about" 
                className="text-gray-700 hover:text-[#5787c5] transition-colors text-sm uppercase tracking-wide"
              >
                About
              </Link>
              <Link 
                to="/services" 
                className="text-gray-700 hover:text-[#5787c5] transition-colors text-sm uppercase tracking-wide"
              >
                Services
              </Link>
              <Link 
                to="/contact" 
                className="text-gray-700 hover:text-[#5787c5] transition-colors text-sm uppercase tracking-wide"
              >
                Contact
              </Link>
              <Link 
                to="/auth/login" 
                className="bg-[#5787c5] text-white px-6 py-2 rounded hover:bg-[#4a73a8] transition-colors text-sm uppercase tracking-wide"
              >
                Login
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section - thedang.co.kr style */}
      <section className="py-20 bg-white">
        <div className="max-w-[1200px] mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-light text-gray-900 mb-6 tracking-tight">
            통합 비즈니스
            <br />
            <span className="text-[#5787c5]">플랫폼</span>
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed font-light">
            하나의 플랫폼에서 모든 비즈니스 기회를 발견하고 성장시키세요.
            <br />
            e-commerce부터 크라우드펀딩까지, 통합된 서비스로 더 큰 성공을 이루어보세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/auth/register" 
              className="bg-[#5787c5] text-white px-8 py-4 rounded hover:bg-[#4a73a8] transition-colors text-sm uppercase tracking-wide font-medium"
            >
              시작하기
            </Link>
            <Link 
              to="/services" 
              className="border border-gray-300 text-gray-700 px-8 py-4 rounded hover:bg-gray-50 transition-colors text-sm uppercase tracking-wide font-medium"
            >
              서비스 둘러보기
            </Link>
          </div>
        </div>
      </section>

      {/* Services Banner - TipTap Editable Content */}
      <section className="py-16 bg-[#ecf0f3]" data-tiptap-editable="services-banner">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="text-center mb-12" data-tiptap-section="banner-header">
            <h2 className="text-3xl md:text-4xl font-light text-gray-900 mb-4 tracking-tight">
              개발된 서비스들
            </h2>
            <p className="text-lg text-gray-600 font-light max-w-2xl mx-auto">
              현재 이용 가능한 서비스와 곧 출시될 새로운 기능들을 확인해보세요
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-tiptap-section="services-grid">
            {services.map((service) => (
              <div
                key={service.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden"
                data-tiptap-component="service-card"
              >
                <div className={`h-2 bg-gradient-to-r ${service.color}`}></div>
                <div className="p-6">
                  <div className="text-3xl mb-4">{service.icon}</div>
                  <h3 className="text-xl font-medium text-gray-900 mb-2" data-tiptap-field="service-title">
                    {service.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 leading-relaxed" data-tiptap-field="service-description">
                    {service.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        service.status === 'available' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {service.status === 'available' ? '이용 가능' : '출시 예정'}
                    </span>
                    
                    {service.status === 'available' ? (
                      <Link
                        to={service.href}
                        className="text-[#5787c5] hover:text-[#4a73a8] text-sm font-medium uppercase tracking-wide transition-colors"
                      >
                        이용하기 →
                      </Link>
                    ) : (
                      <span className="text-gray-400 text-sm font-medium uppercase tracking-wide">
                        준비중
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section - thedang.co.kr style */}
      <section className="py-20 bg-white" data-tiptap-editable="features-section">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="text-center mb-16" data-tiptap-section="features-header">
            <h2 className="text-3xl md:text-4xl font-light text-gray-900 mb-4 tracking-tight">
              왜 o4o-Platform을 선택해야 할까요?
            </h2>
            <p className="text-lg text-gray-600 font-light max-w-2xl mx-auto">
              통합된 플랫폼의 강력한 기능들을 경험해보세요
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8" data-tiptap-section="features-grid">
            <div className="text-center" data-tiptap-component="feature-item">
              <div className="w-16 h-16 bg-[#5787c5] bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">🔗</span>
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-4" data-tiptap-field="feature-title">
                통합 관리
              </h3>
              <p className="text-gray-600 leading-relaxed" data-tiptap-field="feature-description">
                모든 서비스를 하나의 계정으로 관리하고, 
                데이터가 자동으로 연동되어 효율성을 극대화합니다.
              </p>
            </div>

            <div className="text-center" data-tiptap-component="feature-item">
              <div className="w-16 h-16 bg-[#5787c5] bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">🚀</span>
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-4" data-tiptap-field="feature-title">
                빠른 성장
              </h3>
              <p className="text-gray-600 leading-relaxed" data-tiptap-field="feature-description">
                검증된 비즈니스 모델과 도구들로 
                더 빠르고 안전하게 비즈니스를 성장시킬 수 있습니다.
              </p>
            </div>

            <div className="text-center" data-tiptap-component="feature-item">
              <div className="w-16 h-16 bg-[#5787c5] bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">🤝</span>
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-4" data-tiptap-field="feature-title">
                파트너 생태계
              </h3>
              <p className="text-gray-600 leading-relaxed" data-tiptap-field="feature-description">
                다양한 파트너들과 함께 협력하여 
                더 많은 기회와 수익을 창출할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-16 bg-[#ecf0f3]" data-tiptap-editable="statistics-section">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center" data-tiptap-section="stats-grid">
            <div data-tiptap-component="stat-item">
              <div className="text-3xl md:text-4xl font-light text-[#5787c5] mb-2" data-tiptap-field="stat-number">
                4+
              </div>
              <div className="text-gray-600 text-sm uppercase tracking-wide" data-tiptap-field="stat-label">
                통합 서비스
              </div>
            </div>
            <div data-tiptap-component="stat-item">
              <div className="text-3xl md:text-4xl font-light text-[#5787c5] mb-2" data-tiptap-field="stat-number">
                100%
              </div>
              <div className="text-gray-600 text-sm uppercase tracking-wide" data-tiptap-field="stat-label">
                데이터 연동
              </div>
            </div>
            <div data-tiptap-component="stat-item">
              <div className="text-3xl md:text-4xl font-light text-[#5787c5] mb-2" data-tiptap-field="stat-number">
                24/7
              </div>
              <div className="text-gray-600 text-sm uppercase tracking-wide" data-tiptap-field="stat-label">
                고객 지원
              </div>
            </div>
            <div data-tiptap-component="stat-item">
              <div className="text-3xl md:text-4xl font-light text-[#5787c5] mb-2" data-tiptap-field="stat-number">
                99.9%
              </div>
              <div className="text-gray-600 text-sm uppercase tracking-wide" data-tiptap-field="stat-label">
                서비스 안정성
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white" data-tiptap-editable="cta-section">
        <div className="max-w-[1200px] mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-light text-gray-900 mb-6 tracking-tight" data-tiptap-field="cta-title">
            지금 시작해보세요
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed font-light" data-tiptap-field="cta-description">
            무료로 계정을 만들고 모든 서비스를 체험해보세요. 
            언제든지 업그레이드할 수 있습니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/auth/register" 
              className="bg-[#5787c5] text-white px-8 py-4 rounded hover:bg-[#4a73a8] transition-colors text-sm uppercase tracking-wide font-medium"
              data-tiptap-component="cta-button-primary"
            >
              무료로 시작하기
            </Link>
            <Link 
              to="/services" 
              className="border border-gray-300 text-gray-700 px-8 py-4 rounded hover:bg-gray-50 transition-colors text-sm uppercase tracking-wide font-medium"
              data-tiptap-component="cta-button-secondary"
            >
              더 알아보기
            </Link>
          </div>
        </div>
      </section>

      {/* Footer - thedang.co.kr style */}
      <footer className="bg-[#1c1b18] text-white py-12">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-medium mb-4">o4o-Platform</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                통합 비즈니스 플랫폼으로 
                더 큰 성공을 이루어보세요.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-4 text-sm uppercase tracking-wide">서비스</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/shop" className="text-gray-400 hover:text-white transition-colors">E-commerce</Link></li>
                <li><Link to="/signage" className="text-gray-400 hover:text-white transition-colors">Digital Signage</Link></li>
                <li><Link to="/crowdfunding" className="text-gray-400 hover:text-white transition-colors">Crowdfunding</Link></li>
                <li><Link to="/forum" className="text-gray-400 hover:text-white transition-colors">Community</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4 text-sm uppercase tracking-wide">회사</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/about" className="text-gray-400 hover:text-white transition-colors">회사 소개</Link></li>
                <li><Link to="/contact" className="text-gray-400 hover:text-white transition-colors">연락처</Link></li>
                <li><Link to="/careers" className="text-gray-400 hover:text-white transition-colors">채용</Link></li>
                <li><Link to="/press" className="text-gray-400 hover:text-white transition-colors">보도자료</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4 text-sm uppercase tracking-wide">지원</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/help" className="text-gray-400 hover:text-white transition-colors">도움말</Link></li>
                <li><Link to="/docs" className="text-gray-400 hover:text-white transition-colors">문서</Link></li>
                <li><Link to="/privacy" className="text-gray-400 hover:text-white transition-colors">개인정보처리방침</Link></li>
                <li><Link to="/terms" className="text-gray-400 hover:text-white transition-colors">이용약관</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-700 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400 text-sm">
                © 2025 o4o-Platform. All rights reserved.
              </p>
              <div className="flex space-x-4 mt-4 md:mt-0">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <span className="sr-only">Facebook</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M20 10C20 4.477 15.523 0 10 0S0 4.477 0 10c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V10h2.54V7.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V10h2.773l-.443 2.89h-2.33v6.988C16.343 19.128 20 14.991 20 10z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <span className="sr-only">Twitter</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.29 18.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0020 3.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.073 4.073 0 01.8 7.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 010 16.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <span className="sr-only">LinkedIn</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TheDANGStyleHome;