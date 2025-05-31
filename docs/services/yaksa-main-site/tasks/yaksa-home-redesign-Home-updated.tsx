import React from "react";
import { UserPlus, PackagePlus, Users } from "lucide-react";
import { Link } from "react-router-dom";

const Home: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-100 to-blue-300 dark:from-blue-900 dark:to-blue-700 py-20 text-center">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-gray-900 dark:text-white">
            약사와 소비자를 연결하는<br />전문 의약품 플랫폼
          </h1>
          <p className="text-lg md:text-xl mb-8 text-gray-700 dark:text-gray-200">
            약사사이트는 약사와 소비자가 함께 안전하고 신뢰할 수 있는 의약품 거래 플랫폼입니다. 
            전문적인 약사 커뮤니티와 함께 의약품 정보를 공유하고 거래하세요.
          </p>
          <Link to="/register" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition">
            시작하려면 회원가입
          </Link>
        </div>
      </section>

      {/* Service Features */}
      <section className="py-16 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-12">약사사이트의 주요 서비스</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow hover:shadow-lg transition">
              <div className="flex items-center justify-center mb-4 text-blue-600 dark:text-blue-300">
                <UserPlus size={40} />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-center">약사 등록</h3>
              <p className="text-gray-600 dark:text-gray-300 text-center">
                전문 약사를 등록하여 의약품 정보를 공유하고 거래하세요.
              </p>
              <div className="text-center mt-4">
                <Link to="/register" className="text-blue-600 hover:underline">자세히 보기 →</Link>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow hover:shadow-lg transition">
              <div className="flex items-center justify-center mb-4 text-blue-600 dark:text-blue-300">
                <PackagePlus size={40} />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-center">제품 등록</h3>
              <p className="text-gray-600 dark:text-gray-300 text-center">
                의약품을 등록하고 관리하여 효율적인 거래를 시작하세요.
              </p>
              <div className="text-center mt-4">
                <Link to="/products/new" className="text-blue-600 hover:underline">자세히 보기 →</Link>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow hover:shadow-lg transition">
              <div className="flex items-center justify-center mb-4 text-blue-600 dark:text-blue-300">
                <Users size={40} />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-center">커뮤니티</h3>
              <p className="text-gray-600 dark:text-gray-300 text-center">
                약사들과 함께 의약품 정보를 공유하고 소통하세요.
              </p>
              <div className="text-center mt-4">
                <Link to="/forum" className="text-blue-600 hover:underline">자세히 보기 →</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 text-center bg-white dark:bg-gray-900">
        <h3 className="text-2xl font-bold mb-4">지금 바로 시작하세요</h3>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          약사사이트와 함께 의약품 거래의 새로운 패러다임을 만들어가세요.
        </p>
        <Link to="/register" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition">
          무료로 시작하기
        </Link>
      </section>
    </div>
  );
};

export default Home;
