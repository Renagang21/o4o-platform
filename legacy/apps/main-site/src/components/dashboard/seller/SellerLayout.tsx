/**
 * Seller Layout
 * Nested layout for all seller dashboard pages
 *
 * H2-3-3: Integrated with HubLayout for role-aware functionality
 * H2-3-4: Uses dashboards.ts config instead of hardcoded menuItems
 */

import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import HubLayout from '../../layout/HubLayout';
import { RoleDashboardMenu, type DashboardMenuItem } from '../RoleDashboardMenu';
import { LayoutDashboard, Package, ShoppingCart, BarChart3, Warehouse, DollarSign } from 'lucide-react';
import { getDashboardForRole } from '../../../config/roles/dashboards';

type SellerSection = 'overview' | 'products' | 'orders' | 'analytics' | 'inventory' | 'settlements';

// Icon mapping for dashboard navigation
const iconMap = {
  overview: <LayoutDashboard className="w-4 h-4" />,
  products: <Package className="w-4 h-4" />,
  orders: <ShoppingCart className="w-4 h-4" />,
  analytics: <BarChart3 className="w-4 h-4" />,
  inventory: <Warehouse className="w-4 h-4" />,
  settlements: <DollarSign className="w-4 h-4" />
};

// Helper to determine active section from current path
const getActiveSectionFromPath = (pathname: string): SellerSection => {
  if (pathname.includes('/products')) return 'products';
  if (pathname.includes('/orders')) return 'orders';
  if (pathname.includes('/analytics')) return 'analytics';
  if (pathname.includes('/inventory')) return 'inventory';
  if (pathname.includes('/settlements')) return 'settlements';
  return 'overview';
};

export const SellerLayout: React.FC = () => {
  const location = useLocation();
  const activeSection = getActiveSectionFromPath(location.pathname);

  // H2-3-4: Get navigation config from dashboards.ts
  const dashboardConfig = getDashboardForRole('seller');

  // Inject actual icons into navigation items
  const menuItems: DashboardMenuItem<SellerSection>[] = dashboardConfig.navigation.map(item => ({
    ...item,
    icon: iconMap[item.key as SellerSection] || item.icon
  })) as DashboardMenuItem<SellerSection>[];

  return (
    <HubLayout requiredRole="seller" showPersonalization={false}>
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

export default SellerLayout;
