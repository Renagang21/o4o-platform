import React from 'react';

// Placeholder component for missing components
const PlaceholderComponent: React.FC<{ name: string }> = ({ name }) => (
  <div className="p-6 bg-gray-50 rounded-lg">
    <h2 className="text-xl font-semibold mb-4">{name}</h2>
    <p className="text-gray-600">이 컴포넌트는 개발 중입니다.</p>
  </div>
);

// Seller Components
export const SellerInventoryPage = () => <PlaceholderComponent name="재고 관리" />;
export const SellerOrderManagementPage = () => <PlaceholderComponent name="주문 관리" />;
export const SellerPricingRulesPage = () => <PlaceholderComponent name="가격 정책" />;
export const SellerSuppliersPage = () => <PlaceholderComponent name="공급자 관리" />;
export const SellerReportsPage = () => <PlaceholderComponent name="판매 리포트" />;

// Supplier Components
export const SupplierDashboard = () => <PlaceholderComponent name="공급자 대시보드" />;
export const SupplierProductManagementPage = () => <PlaceholderComponent name="상품 관리" />;
export const SupplierOrdersPage = () => <PlaceholderComponent name="주문 처리" />;
export const SupplierShippingPage = () => <PlaceholderComponent name="배송 관리" />;
export const SupplierSettlementPage = () => <PlaceholderComponent name="정산 관리" />;
export const SupplierReportsPage = () => <PlaceholderComponent name="공급자 리포트" />;

// Admin Components  
export const AdminDashboard = () => <PlaceholderComponent name="관리자 대시보드" />;
export const UserManagementPage = () => <PlaceholderComponent name="사용자 관리" />;
export const SystemMonitoringPage = () => <PlaceholderComponent name="시스템 모니터링" />;
export const PlatformReportsPage = () => <PlaceholderComponent name="플랫폼 리포트" />;
export const SettingsPage = () => <PlaceholderComponent name="설정" />;