import type { FunctionComponent } from '@/components/registry/function';

export const supplierDashboard: FunctionComponent = (props, _context) => {
  const data = props.data || {};

  return {
    type: 'DropshippingDashboard',
    props: {
      title: 'Supplier Dashboard',
      kpis: [
        {
          label: 'Pending Orders',
          value: data.pendingOrders || 0,
          icon: 'clock',
          color: 'yellow',
        },
        {
          label: 'Active Products',
          value: data.activeProducts || 0,
          icon: 'package',
          color: 'blue',
        },
        {
          label: 'Low Stock Items',
          value: data.lowStockItems || 0,
          icon: 'alert',
          color: 'red',
        },
        {
          label: 'New Requests',
          value: data.newRequests || 0,
          icon: 'inbox',
          color: 'purple',
        },
        {
          label: 'Monthly Revenue',
          value: `₩${(data.monthlyRevenue || 0).toLocaleString()}`,
          icon: 'dollar',
          color: 'green',
        },
      ],
    },
  };
};
