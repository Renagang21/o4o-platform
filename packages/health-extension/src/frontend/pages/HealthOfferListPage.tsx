/**
 * Health Offer List Page
 *
 * Health 제품 Offer 목록 페이지
 *
 * @package @o4o/health-extension
 */

import React from 'react';

export interface HealthOfferListPageProps {
  sellerId?: string;
}

export const HealthOfferListPage: React.FC<HealthOfferListPageProps> = ({ sellerId }) => {
  return (
    <div className="health-offer-list-page">
      <h1>건강기능식품 Offer 관리</h1>
      <p>Health Extension - Offer List Page</p>
      {sellerId && <p>Seller: {sellerId}</p>}
      {/* TODO: Implement offer list with expiration warnings */}
    </div>
  );
};

export default HealthOfferListPage;
