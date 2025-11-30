/**
 * Partner Dashboard Main Page
 * Overview page for partner dashboard
 */

import React from 'react';
import { PartnerDashboard } from '@/components/shortcodes/PartnerDashboard';

export const PartnerDashboardPage: React.FC = () => {
  return <PartnerDashboard defaultSection="overview" showMenu={false} />;
};

export default PartnerDashboardPage;
