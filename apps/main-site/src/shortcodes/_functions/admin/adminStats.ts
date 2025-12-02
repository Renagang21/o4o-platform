import type { FunctionComponent } from '@/components/registry/function';

export const adminStats: FunctionComponent = (props, _context) => {
  const data = props.data || {};

  return {
    type: 'AdminStatsCard',
    props: {
      users: data.users || 0,
      products: data.products || 0,
      ordersToday: data.ordersToday || 0,
      revenue: data.revenue || 0,
      sellers: data.sellers || 0,
      suppliers: data.suppliers || 0,
      partners: data.partners || 0,
    },
  };
};
