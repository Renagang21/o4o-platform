/**
 * Seller Layout
 * Nested layout for all seller dashboard pages
 */

import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Layout from '../../layout/Layout';
import { RoleDashboardMenu, DashboardMenuItem } from '../RoleDashboardMenu';
import { LayoutDashboard, Package, ShoppingCart, BarChart3, Warehouse, DollarSign } from 'lucide-react';

type SellerSection = 'overview' | 'products' | 'orders' | 'analytics' | 'inventory' | 'settlements';

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

  const menuItems: DashboardMenuItem<SellerSection>[] = [
    {
      key: 'overview',
      label: '개요',
      icon: <LayoutDashboard className="w-4 h-4" />,
      type: 'route',
      href: '/dashboard/seller'
    },
    {
      key: 'products',
      label: '상품',
      icon: <Package className="w-4 h-4" />,
      type: 'route',
      href: '/dashboard/seller/products'
    },
    {
      key: 'orders',
      label: '주문',
      icon: <ShoppingCart className="w-4 h-4" />,
      type: 'route',
      href: '/dashboard/seller/orders'
    },
    {
      key: 'analytics',
      label: '분석',
      icon: <BarChart3 className="w-4 h-4" />,
      type: 'route',
      href: '/dashboard/seller/analytics'
    },
    {
      key: 'inventory',
      label: '재고',
      icon: <Warehouse className="w-4 h-4" />,
      type: 'route',
      href: '/dashboard/seller/inventory'
    },
    {
      key: 'settlements',
      label: '정산',
      icon: <DollarSign className="w-4 h-4" />,
      type: 'route',
      href: '/dashboard/seller/settlements'
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

export default SellerLayout;
