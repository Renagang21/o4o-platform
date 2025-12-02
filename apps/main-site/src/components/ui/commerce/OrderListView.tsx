import { OrderRow } from './OrderRow';

interface OrderListViewProps {
  orders: Array<{
    id: string;
    orderNumber: string;
    date: string;
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    total: number;
    itemCount: number;
    thumbnail?: string;
  }>;
  total?: number;
  page?: number;
  pageSize?: number;
}

export function OrderListView({ orders, total }: OrderListViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
        {total && (
          <div className="text-sm text-gray-600">
            {orders.length} of {total} orders
          </div>
        )}
      </div>

      <div className="space-y-4">
        {orders.length > 0 ? (
          orders.map((order) => <OrderRow key={order.id} {...order} />)
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500">No orders found</p>
          </div>
        )}
      </div>
    </div>
  );
}
