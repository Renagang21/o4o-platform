/**
 * Seller Dashboard Main Page
 * Overview page for seller dashboard
 */

import React from 'react';
import { SellerDashboard } from '@/components/shortcodes/SellerDashboard';

export const SellerDashboardPage: React.FC = () => {
  return <SellerDashboard defaultSection="overview" showMenu={false} />;
};

export default SellerDashboardPage;
