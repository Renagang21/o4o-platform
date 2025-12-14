/**
 * Health Settlement List Page
 *
 * Health 제품 정산 내역 페이지
 *
 * @package @o4o/health-extension
 */

import React from 'react';

export interface HealthSettlementListPageProps {
  sellerId?: string;
  supplierId?: string;
}

export const HealthSettlementListPage: React.FC<HealthSettlementListPageProps> = ({
  sellerId,
  supplierId,
}) => {
  return (
    <div className="health-settlement-list-page">
      <h1>건강기능식품 정산 내역</h1>
      <p>Health Extension - Settlement List Page</p>
      {sellerId && <p>Seller: {sellerId}</p>}
      {supplierId && <p>Supplier: {supplierId}</p>}
      {/* TODO: Implement settlement list with summary */}
    </div>
  );
};

export default HealthSettlementListPage;
