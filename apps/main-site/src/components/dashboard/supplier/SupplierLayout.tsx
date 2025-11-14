/**
 * Supplier Layout
 * Nested layout for all supplier dashboard pages
 */

import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Layout from '../../layout/Layout';
import { RoleDashboardMenu, DashboardMenuItem } from '../RoleDashboardMenu';
import { LayoutDashboard, Package, ShoppingCart, BarChart3, Warehouse } from 'lucide-react';

type SupplierSection = 'overview' | 'products' | 'orders' | 'analytics' | 'inventory';

// Helper to determine active section from current path
const getActiveSectionFromPath = (pathname: string): SupplierSection => {
  if (pathname.includes('/products')) return 'products';
  if (pathname.includes('/orders')) return 'orders';
  if (pathname.includes('/analytics')) return 'analytics';
  if (pathname.includes('/inventory')) return 'inventory';
  return 'overview';
};

export const SupplierLayout: React.FC = () => {
  const location = useLocation();
  const activeSection = getActiveSectionFromPath(location.pathname);

  const menuItems: DashboardMenuItem<SupplierSection>[] = [
    {
      key: 'overview',
      label: '개요',
      icon: <LayoutDashboard className="w-4 h-4" />,
      type: 'route',
      href: '/dashboard/supplier'
    },
    {
      key: 'products',
      label: '제품',
      icon: <Package className="w-4 h-4" />,
      type: 'route',
      href: '/dashboard/supplier/products'
    },
    {
      key: 'orders',
      label: '주문',
      icon: <ShoppingCart className="w-4 h-4" />,
      type: 'route',
      href: '/dashboard/supplier/orders'
    },
    {
      key: 'analytics',
      label: '분석',
      icon: <BarChart3 className="w-4 h-4" />,
      type: 'route',
      href: '/dashboard/supplier/analytics'
    },
    {
      key: 'inventory',
      label: '재고',
      icon: <Warehouse className="w-4 h-4" />,
      type: 'route',
      href: '/dashboard/supplier/inventory'
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

export default SupplierLayout;
