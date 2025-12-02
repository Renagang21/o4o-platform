import { FC } from 'react';
import Layout from '@/components/layout/Layout';
import { PartnerDashboard as PartnerDashboardComponent } from '@/components/shortcodes/PartnerDashboard';

/**
 * P0 RBAC: Partner Dashboard Page
 * - Protected by RoleGuard
 * - Displays partner metrics and collaboration tools
 */
const PartnerDashboard: FC = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">파트너 대시보드</h1>
          <PartnerDashboardComponent />
        </div>
      </div>
    </Layout>
  );
};

export default PartnerDashboard;
