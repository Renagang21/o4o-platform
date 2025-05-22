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
    <footer className="mt-12 py-6 border-t text-center text-gray-500 text-sm bg-gray-50 dark:bg-gray-900 dark:text-gray-400">
      <div>yaksa.site &copy; 2024 | <Link to="/terms" className="underline">이용약관</Link> | <Link to="/privacy" className="underline">개인정보처리방침</Link></div>
      <div className="mt-1">(주)약사닷컴 | 사업자등록번호 123-45-67890</div>
    </footer>
  );
}

const Home: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <AppHeader />
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-5xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
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