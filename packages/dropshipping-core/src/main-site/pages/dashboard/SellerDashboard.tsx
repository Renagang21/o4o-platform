import { FC } from 'react';
import Layout from '../../components/layout/Layout';

/**
 * P0 RBAC: Seller Dashboard Page
 * - Protected by RoleGuard
 * - Displays seller metrics and sales tools
 */
const SellerDashboard: FC = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">판매자 대시보드</h1>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">
                판매자 대시보드가 준비 중입니다
              </h2>
              <p className="text-gray-600">
                곧 판매 통계, 주문 관리, 고객 관리 기능을 제공할 예정입니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SellerDashboard;
