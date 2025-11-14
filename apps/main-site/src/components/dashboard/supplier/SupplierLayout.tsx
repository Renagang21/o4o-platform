/**
 * Supplier Layout
 * Nested layout for all supplier dashboard pages
 */

import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Layout from '../../layout/Layout';
import { RoleDashboardMenu, DashboardMenuItem } from '../RoleDashboardMenu';
import { LayoutDashboard, Package, ShoppingCart, BarChart3, Warehouse, UserCheck, DollarSign } from 'lucide-react';

type SupplierSection = 'overview' | 'products' | 'product-applications' | 'orders' | 'settlements' | 'analytics' | 'inventory';

// Helper to determine active section from current path
const getActiveSectionFromPath = (pathname: string): SupplierSection => {
  if (pathname.includes('/product-applications')) return 'product-applications';
  if (pathname.includes('/products')) return 'products';
  if (pathname.includes('/orders')) return 'orders';
  if (pathname.includes('/settlements')) return 'settlements';
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
      key: 'product-applications',
      label: '판매자 신청 관리',
      icon: <UserCheck className="w-4 h-4" />,
      type: 'route',
      href: '/dashboard/supplier/product-applications'
    },
    {
      key: 'orders',
      label: '주문',
      icon: <ShoppingCart className="w-4 h-4" />,
      type: 'route',
      href: '/dashboard/supplier/orders'
    },
    {
      key: 'settlements',
      label: '정산',
      icon: <DollarSign className="w-4 h-4" />,
      type: 'route',
      href: '/dashboard/supplier/settlements'
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
