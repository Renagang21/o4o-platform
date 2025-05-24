import React from 'react';
import ServiceCard from '../components/ServiceCard';
import { UserPlus, PackagePlus, Users } from 'lucide-react';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center py-16 px-4">
        <h1 className="text-3xl md:text-4xl font-bold text-center text-blue-700 dark:text-blue-300 mb-4">
          약사와 소비자를 연결하는 플랫폼
        </h1>
        <p className="text-gray-600 dark:text-gray-300 text-center mb-10">
          yaksa.site에서 다양한 서비스를 경험해보세요.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
          <ServiceCard
            title="약사 등록"
            description="약사 회원으로 등록하고 다양한 혜택을 누리세요."
            icon={<UserPlus size={32} />}
            link="/register"
          />
          <ServiceCard
            title="제품 등록"
            description="약사 전용 상품을 등록하고 관리하세요."
            icon={<PackagePlus size={32} />}
            link="/products/new"
          />
          <ServiceCard
            title="커뮤니티"
            description="소비자와 약사가 소통하는 열린 공간."
            icon={<Users size={32} />}
            link="/forum"
          />
        </div>
      </main>
    </div>
  );
};

export default Home; 