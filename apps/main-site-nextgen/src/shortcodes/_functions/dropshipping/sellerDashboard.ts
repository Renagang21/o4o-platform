import type { FunctionComponent } from '@/components/registry/function';

export const sellerDashboard: FunctionComponent = (props, context) => {
  const data = props.data || {};

  return {
    type: 'DropshippingDashboard',
    props: {
      title: 'Seller Dashboard',
      kpis: [
        {
          label: 'Pending Approval',
          value: data.pending || 0,
          icon: 'clock',
          color: 'yellow',
        },
        {
          label: 'New Opportunities',
          value: data.available || 0,
          icon: 'star',
          color: 'blue',
        },
        {
          label: 'Training Required',
          value: data.incompleteCourses || 0,
          icon: 'book',
          color: 'orange',
        },
        {
          label: 'Orders Today',
          value: data.ordersToday || 0,
          icon: 'shopping-cart',
          color: 'green',
        },
        {
          label: 'Active Products',
          value: data.activeProducts || 0,
          icon: 'package',
          color: 'purple',
        },
        {
          label: 'Revenue',
          value: `₩${(data.revenue || 0).toLocaleString()}`,
          icon: 'dollar',
          color: 'green',
        },
      ],
    },
  };
};
