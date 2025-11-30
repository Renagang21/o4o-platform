import { FC } from 'react';
import Layout from '@/components/layout/Layout';
import { SupplierDashboard as SupplierDashboardComponent } from '@/components/shortcodes/SupplierDashboard';

/**
 * P0 RBAC: Supplier Dashboard Page
 * - Protected by RoleGuard
 * - Displays supplier metrics and management tools
 */
const SupplierDashboard: FC = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">공급자 대시보드</h1>
          <SupplierDashboardComponent />
        </div>
      </div>
    </Layout>
  );
};

export default SupplierDashboard;
