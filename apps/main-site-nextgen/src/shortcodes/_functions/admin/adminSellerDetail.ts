import type { FunctionComponent } from '@/components/registry/function';

export const adminSellerDetail: FunctionComponent = (props, _context) => {
  const data = props.data || {};

  return {
    type: 'AdminSellerDetailView',
    props: {
      id: data.id,
      name: data.name || '',
      email: data.email || '',
      phone: data.phone || '',
      status: data.status || 'pending',
      businessInfo: data.businessInfo || {},
      productsCount: data.productsCount || 0,
      ordersCount: data.ordersCount || 0,
      revenue: data.revenue || 0,
      joinedAt: data.joinedAt || '',
      lastActive: data.lastActive || '',
      notes: data.notes,
    },
  };
};
