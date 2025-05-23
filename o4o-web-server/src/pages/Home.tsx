import React from 'react';
import { Link } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import ServiceCard from '../components/ServiceCard';

const services = [
  {
    title: '쇼핑몰 (일반)',
    description: '일반 사용자를 위한 yaksa 쇼핑몰',
    to: '/shop',
    icon: '🛒',
  },
  {
    title: '쇼핑몰 (약사)',
    description: '약사(기업) 전용 yaksa 쇼핑몰',
    to: '/yaksa-shop',
    icon: '💊',
  },
  {
    title: '포럼',
    description: '커뮤니티 및 정보 공유 포럼',
    to: '/forum',
    icon: '💬',
  },
  {
    title: '펀딩',
    description: 'yaksa 크라우드 펀딩',
    to: '/funding',
    icon: '💰',
  },
  {
    title: '디지털사이니지',
    description: '디지털사이니지 서비스',
    to: '/signage',
    icon: '🖥️',
  },
];

function AppFooter() {
  return (
    <footer className="mt-auto py-8 border-t bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <div className="mb-2">
            <Link to="/terms" className="hover:text-blue-600 dark:hover:text-blue-400 mx-2">이용약관</Link>
            <span className="mx-2">|</span>
            <Link to="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400 mx-2">개인정보처리방침</Link>
          </div>
          <div className="text-sm">
            (주)쓰리라이프존 | 사업자등록번호 105-86-02873
          </div>
        </div>
      </div>
    </footer>
  );
}

const Home: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <AppHeader />
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">
            yaksa.site 서비스
          </h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((svc) => (
              <ServiceCard key={svc.to} {...svc} />
            ))}
          </div>
        </div>
      </main>
      <AppFooter />
    </div>
  );
};

export default Home; 