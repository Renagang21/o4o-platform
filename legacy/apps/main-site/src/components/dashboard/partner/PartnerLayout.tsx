/**
 * Partner Layout
 * Nested layout for all partner dashboard pages
 *
 * H2-3-3: Integrated with HubLayout for role-aware functionality
 * H2-3-4: Uses dashboards.ts config instead of hardcoded menuItems
 */

import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import HubLayout from '../../layout/HubLayout';
import { RoleDashboardMenu, type DashboardMenuItem } from '../RoleDashboardMenu';
import { LayoutDashboard, BarChart3, DollarSign, Link2, Megaphone } from 'lucide-react';
import { getDashboardForRole } from '../../../config/roles/dashboards';

type PartnerSection = 'overview' | 'analytics' | 'settlements' | 'links' | 'marketing';

// Icon mapping for dashboard navigation
const iconMap = {
  overview: <LayoutDashboard className="w-4 h-4" />,
  analytics: <BarChart3 className="w-4 h-4" />,
  settlements: <DollarSign className="w-4 h-4" />,
  links: <Link2 className="w-4 h-4" />,
  marketing: <Megaphone className="w-4 h-4" />
};

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

  // H2-3-4: Get navigation config from dashboards.ts
  const dashboardConfig = getDashboardForRole('partner');

  // Inject actual icons into navigation items
  const menuItems: DashboardMenuItem<PartnerSection>[] = dashboardConfig.navigation.map(item => ({
    ...item,
    icon: iconMap[item.key as PartnerSection] || item.icon
  })) as DashboardMenuItem<PartnerSection>[];

  return (
    <HubLayout requiredRole="partner" showPersonalization={false}>
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
    </HubLayout>
  );
};

export default PartnerLayout;
