/**
 * Health Order List Page
 *
 * Health 제품 주문 목록 페이지
 *
 * @package @o4o/health-extension
 */

import React from 'react';

export interface HealthOrderListPageProps {
  sellerId?: string;
  buyerId?: string;
}

export const HealthOrderListPage: React.FC<HealthOrderListPageProps> = ({ sellerId, buyerId }) => {
  return (
    <div className="health-order-list-page">
      <h1>건강기능식품 주문 관리</h1>
      <p>Health Extension - Order List Page</p>
      {sellerId && <p>Seller: {sellerId}</p>}
      {buyerId && <p>Buyer: {buyerId}</p>}
      {/* TODO: Implement order list with health info */}
    </div>
  );
};

export default HealthOrderListPage;
