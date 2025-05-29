import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Users, Package, MessageSquare, Shield } from 'lucide-react';

const HeroSection = () => (
  <section className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20 px-4 sm:px-6 lg:px-8">
    <div className="max-w-7xl mx-auto">
      <div className="text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6">
          약사 커뮤니티의 새로운 시작
        </h1>
        <p className="text-xl sm:text-2xl mb-8 text-blue-100">
          약사들의 전문성을 나누고, 제품을 등록하고, 커뮤니티를 형성하세요
        </p>
        <div className="space-x-4">
          <Link
            to="/register"
            className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            약사 회원가입
          </Link>
          <Link
            to="/products"
            className="inline-block bg-transparent border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors"
          >
            제품 둘러보기
          </Link>
        </div>
      </div>
    </div>
  </section>
);

const ServiceCard = ({ icon: Icon, title, description, link }: {
  icon: React.ElementType;
  title: string;
  description: string;
  link: string;
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
      <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
    </div>
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-gray-600 dark:text-gray-300 mb-4">{description}</p>
    <Link
      to={link}
      className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
    >
      자세히 보기
      <ArrowRight className="w-4 h-4 ml-2" />
    </Link>
  </div>
);

const ServiceSection = () => (
  <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
    <div className="max-w-7xl mx-auto">
      <h2 className="text-3xl font-bold text-center mb-12">주요 서비스</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <ServiceCard
          icon={Users}
          title="약사 등록"
          description="약사 자격을 인증하고 전문가로서의 활동을 시작하세요."
          link="/register"
        />
        <ServiceCard
          icon={Package}
          title="제품 등록"
          description="약사 전용 제품을 등록하고 관리하세요."
          link="/products/new"
        />
        <ServiceCard
          icon={MessageSquare}
          title="커뮤니티"
          description="동료 약사들과 소통하고 정보를 공유하세요."
          link="/community"
        />
      </div>
    </div>
  </section>
);

const TrustedBySection = () => (
  <section className="py-16 px-4 sm:px-6 lg:px-8">
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">신뢰할 수 있는 플랫폼</h2>
        <p className="text-gray-600 dark:text-gray-300">
          대한약사회 인증 및 주요 병원과의 제휴를 통해 신뢰성을 확보했습니다
        </p>
      </div>
      <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
        <div className="flex items-center space-x-2">
          <Shield className="w-8 h-8 text-blue-600" />
          <span className="font-semibold">대한약사회 인증</span>
        </div>
        <div className="text-gray-400">•</div>
        <div className="text-gray-600 dark:text-gray-300">제휴 병원 100+</div>
        <div className="text-gray-400">•</div>
        <div className="text-gray-600 dark:text-gray-300">활성 약사 1,000+</div>
      </div>
    </div>
  </section>
);

const Home: React.FC = () => {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <ServiceSection />
      <TrustedBySection />
    </div>
  );
};

export default Home; 