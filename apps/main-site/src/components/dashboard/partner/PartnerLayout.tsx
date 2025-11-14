/**
 * Partner Layout
 * Nested layout for all partner dashboard pages
 */

import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Layout from '../../layout/Layout';
import { RoleDashboardMenu, DashboardMenuItem } from '../RoleDashboardMenu';
import { LayoutDashboard, BarChart3, DollarSign, Link2, Megaphone } from 'lucide-react';

type PartnerSection = 'overview' | 'analytics' | 'settlements' | 'links' | 'marketing';

// Helper to determine active section from current path
const getActiveSectionFromPath = (pathname: string): PartnerSection => {
  if (pathname.includes('/analytics')) return 'analytics';
  if (pathname.includes('/settlements')) return 'settlements';
  if (pathname.includes('/links')) return 'links';
  if (pathname.includes('/marketing')) return 'marketing';
  return 'overview';
};

export const PartnerLayout: React.FC = () => {
  const location = useLocation();
  const activeSection = getActiveSectionFromPath(location.pathname);

  const menuItems: DashboardMenuItem<PartnerSection>[] = [
    {
      key: 'overview',
      label: '개요',
      icon: <LayoutDashboard className="w-4 h-4" />,
      type: 'route',
      href: '/dashboard/partner'
    },
    {
      key: 'analytics',
      label: '분석',
      icon: <BarChart3 className="w-4 h-4" />,
      type: 'route',
      href: '/dashboard/partner/analytics'
    },
    {
      key: 'settlements',
      label: '정산',
      icon: <DollarSign className="w-4 h-4" />,
      type: 'route',
      href: '/dashboard/partner/settlements'
    },
    {
      key: 'links',
      label: '링크 관리',
      icon: <Link2 className="w-4 h-4" />,
      type: 'route',
      href: '/dashboard/partner/links'
    },
    {
      key: 'marketing',
      label: '마케팅 자료',
      icon: <Megaphone className="w-4 h-4" />,
      type: 'route',
      href: '/dashboard/partner/marketing'
    },
  ];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Role Dashboard Menu */}
        <RoleDashboardMenu
          items={menuItems}
          active={activeSection}
          variant="tabs"
          orientation="horizontal"
        />

        {/* Child Routes */}
        <div className="mt-6">
          <Outlet />
        </div>
      </div>
    </Layout>
  );
};

export default PartnerLayout;
