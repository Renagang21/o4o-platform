import React from 'react';
import { useAuth } from '../../common/contexts/AuthContext';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">대시보드</h2>
        <p className="text-gray-600">
          안녕하세요, {user?.name}님. 관리자 패널에 오신 것을 환영합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 통계 카드 */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900">총 사용자</h3>
          <p className="mt-2 text-3xl font-bold text-blue-600">1,234</p>
          <p className="mt-1 text-sm text-gray-500">지난 30일 대비 +12%</p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900">총 주문</h3>
          <p className="mt-2 text-3xl font-bold text-green-600">567</p>
          <p className="mt-1 text-sm text-gray-500">지난 30일 대비 +8%</p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900">총 매출</h3>
          <p className="mt-2 text-3xl font-bold text-purple-600">₩12,345,678</p>
          <p className="mt-1 text-sm text-gray-500">지난 30일 대비 +15%</p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900">평균 주문 금액</h3>
          <p className="mt-2 text-3xl font-bold text-yellow-600">₩21,789</p>
          <p className="mt-1 text-sm text-gray-500">지난 30일 대비 +5%</p>
        </div>
      </div>

      {/* 최근 활동 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">최근 활동</h3>
        <div className="space-y-4">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
            <p className="text-sm text-gray-600">
              새로운 사용자가 등록했습니다. (2024-04-11)
            </p>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <p className="text-sm text-gray-600">
              새로운 주문이 생성되었습니다. (2024-04-10)
            </p>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
            <p className="text-sm text-gray-600">
              상품이 업데이트되었습니다. (2024-04-09)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 