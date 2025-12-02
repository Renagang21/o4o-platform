import type { FunctionComponent } from '@/components/registry/function';

export const orderList: FunctionComponent = (props, _context) => {
  const data = props.data || {};
  const orders = data.orders || [];

  return {
    type: 'OrderListView',
    props: {
      orders: orders.map((order: any) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        date: order.date,
        status: order.status,
        total: order.total,
        itemCount: order.itemCount,
        thumbnail: order.thumbnail,
      })),
      total: data.total || 0,
      page: data.page || 1,
      pageSize: data.pageSize || 10,
    },
  };
};
