import type { FunctionComponent } from '@/components/registry/function';

export const adminSellerList: FunctionComponent = (props, _context) => {
  const data = props.data || {};
  const items = data.items || [];

  return {
    type: 'AdminSellerListView',
    props: {
      items: items.map((seller: any) => ({
        id: seller.id,
        name: seller.name,
        email: seller.email,
        status: seller.status,
        productsCount: seller.productsCount,
        ordersCount: seller.ordersCount,
        revenue: seller.revenue,
        joinedAt: seller.joinedAt,
      })),
      total: data.total || 0,
      page: data.page || 1,
      pageSize: data.pageSize || 20,
    },
  };
};
