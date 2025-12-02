import type { FunctionComponent } from '@/components/registry/function';

export const adminSupplierList: FunctionComponent = (props, _context) => {
  const data = props.data || {};
  const items = data.items || [];

  return {
    type: 'AdminSupplierListView',
    props: {
      items: items.map((supplier: any) => ({
        id: supplier.id,
        name: supplier.name,
        email: supplier.email,
        status: supplier.status,
        productsCount: supplier.productsCount,
        ordersCount: supplier.ordersCount,
        joinedAt: supplier.joinedAt,
      })),
      total: data.total || 0,
      page: data.page || 1,
      pageSize: data.pageSize || 20,
    },
  };
};
