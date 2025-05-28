import { Link } from 'react-router-dom';
import { ShoppingBag, Users, MessageSquare } from 'lucide-react';

const ServiceCard = ({ 
  title, 
  description, 
  icon: Icon, 
  link 
}: { 
  title: string; 
  description: string; 
  icon: any; 
  link: string;
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
    <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg mb-4">
      <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
    </div>
    <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{title}</h3>
    <p className="text-gray-600 dark:text-gray-300 mb-4">{description}</p>
    <Link 
      to={link}
      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
    >
      자세히 보기 →
    </Link>
  </div>
);

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              약사와 소비자를 연결하는<br />
              <span className="text-blue-600 dark:text-blue-400">전문 의약품 플랫폼</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              야크사는 약사와 소비자를 위한 안전하고 신뢰할 수 있는 의약품 거래 플랫폼입니다.
              전문적인 약사 커뮤니티와 함께 의약품 정보를 공유하고 거래하세요.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300"
              >
                시작하기
              </Link>
              <Link
                to="/products"
                className="px-8 py-3 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors duration-300"
              >
                둘러보기
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Service Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            야크사의 주요 서비스
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <ServiceCard
              title="약사 등록"
              description="전문 약사로 등록하여 의약품 정보를 공유하고 거래하세요."
              icon={Users}
              link="/register"
            />
            <ServiceCard
              title="제품 등록"
              description="의약품을 등록하고 관리하여 효율적인 거래를 시작하세요."
              icon={ShoppingBag}
              link="/products/new"
            />
            <ServiceCard
              title="커뮤니티"
              description="약사들과 함께 의약품 정보를 공유하고 소통하세요."
              icon={MessageSquare}
              link="/forum"
            />
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            지금 바로 시작하세요
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            야크사와 함께 의약품 거래의 새로운 패러다임을 만들어가세요.
          </p>
          <Link
            to="/register"
            className="inline-block px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300"
          >
            무료로 시작하기
          </Link>
        </div>
      </section>
    </div>
  );
} 