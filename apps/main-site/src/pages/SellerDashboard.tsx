import React from 'react';
import SidebarMenu from '../components/dashboard/SidebarMenu';
import SummaryCards from '../components/dashboard/SummaryCards';
import RecentOrders from '../components/dashboard/RecentOrders';
import RecentProducts from '../components/dashboard/RecentProducts';
import ApprovalNotice from '../components/dashboard/ApprovalNotice';

const SellerDashboard: FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* 사이드바 */}
        <SidebarMenu />

        {/* 메인 컨텐츠 */}
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {/* 승인 상태 알림 */}
            <ApprovalNotice />

            {/* 요약 카드 */}
            <div className="mb-8">
              <SummaryCards />
            </div>

            {/* 최근 주문 및 상품 */}
            <div className="grid lg:grid-cols-2 gap-8">
              <RecentOrders />
              <RecentProducts />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SellerDashboard; 