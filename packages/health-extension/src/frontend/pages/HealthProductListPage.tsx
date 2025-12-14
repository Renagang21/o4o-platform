/**
 * Health Product List Page
 *
 * Health 제품 목록 페이지
 *
 * @package @o4o/health-extension
 */

import React from 'react';

export interface HealthProductListPageProps {
  sellerId?: string;
}

export const HealthProductListPage: React.FC<HealthProductListPageProps> = ({ sellerId }) => {
  return (
    <div className="health-product-list-page">
      <h1>건강기능식품 제품 목록</h1>
      <p>Health Extension - Product List Page</p>
      {sellerId && <p>Seller: {sellerId}</p>}
      {/* TODO: Implement product list with filters */}
    </div>
  );
};

export default HealthProductListPage;
