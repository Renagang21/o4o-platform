import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Rocket, Shield, TrendingUp, Users } from 'lucide-react';
import Navbar from '../../components/Navbar';

const CrowdfundingHome: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <Navbar />
      
      {/* 헤더 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              메인으로
            </Link>
            <div className="h-6 w-px bg-gray-300" />
            <h1 className="text-xl font-bold text-gray-900">🚀 크라우드펀딩</h1>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 히어로 섹션 */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-orange-100 text-orange-800 rounded-full text-sm font-medium mb-4">
            <Rocket className="w-4 h-4 mr-2" />
            투명성 기반 신뢰도 펀딩
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            투명하고 신뢰할 수 있는<br />
            크라우드펀딩 플랫폼
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            전문가 검증과 투명성 허브를 통해 안전하고 신뢰할 수 있는 펀딩 환경을 제공합니다.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 inline-block">
            <p className="text-yellow-800 font-medium">🔧 곧 출시 예정입니다!</p>
          </div>
        </div>

        {/* 특징 섹션 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">투명성 허브</h3>
            <p className="text-gray-600">모든 펀딩 과정을 투명하게 공개하여 신뢰성을 높입니다.</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">전문가 검증</h3>
            <p className="text-gray-600">각 분야 전문가들이 프로젝트를 사전 검증합니다.</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">크로스 프로모션</h3>
            <p className="text-gray-600">파트너 네트워크를 통한 효과적인 마케팅을 지원합니다.</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Rocket className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">드랍쉬핑 연동</h3>
            <p className="text-gray-600">성공한 프로젝트를 드랍쉬핑 플랫폼과 연결합니다.</p>
          </div>
        </div>

        {/* 출시 예정 알림 */}
        <div className="bg-white rounded-xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🚀</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            곧 만나보실 수 있습니다!
          </h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            투명하고 신뢰할 수 있는 크라우드펀딩 플랫폼을 준비 중입니다. 
            출시 소식을 가장 먼저 받아보세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors">
              출시 알림 받기
            </button>
            <Link
              to="/"
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              다른 서비스 보기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrowdfundingHome;
