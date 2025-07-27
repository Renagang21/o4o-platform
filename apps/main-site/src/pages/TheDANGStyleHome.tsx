import { FC } from 'react';
import { Link } from 'react-router-dom';
import TestBannerGrid from '../components/home/TestBannerGrid';
import TestAccountList from '../components/home/TestAccountList';
import { testPageData } from '../config/testPageData';

const TheDANGStyleHome: FC = () => {
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
      {/* Header Navigation - thedang.co.kr style */}
      <header className="bg-white shadow-sm">
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
                to="/login" 
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

      {/* Test Environment Notice */}
      <div className="bg-red-50 border-t-4 border-red-400">
        <div className="max-w-[1200px] mx-auto px-4 py-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-red-800">
                🧪 현재 테스트 환경입니다
              </h3>
              <p className="mt-1 text-sm text-red-700">
                개발 및 테스트 목적으로만 사용하세요. 실제 거래나 결제는 이루어지지 않습니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Test Features Section */}
      <TestBannerGrid 
        banners={testPageData.banners}
        title="테스트 기능 바로가기"
        description="각 기능을 클릭하여 테스트를 시작하세요"
      />

      {/* Test Accounts Section */}
      <TestAccountList 
        accounts={testPageData.accounts}
        title="테스트 계정 정보"
        description="각 역할에 맞는 계정으로 로그인하여 기능을 테스트하세요"
      />

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
          </div>
          
          <div className="border-t border-gray-700 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400 text-sm">
                © 2025 o4o-Platform. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TheDANGStyleHome;