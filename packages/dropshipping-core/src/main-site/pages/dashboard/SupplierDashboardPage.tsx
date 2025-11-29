/**
 * Supplier Dashboard Main Page
 * Overview page for supplier dashboard
 */

import React from 'react';
import { SupplierDashboard } from '../../components/shortcodes/SupplierDashboard';

export const SupplierDashboardPage: React.FC = () => {
  return <SupplierDashboard defaultSection="overview" showMenu={false} />;
};

export default SupplierDashboardPage;
