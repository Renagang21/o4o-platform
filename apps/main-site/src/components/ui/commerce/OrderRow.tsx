import { memo } from 'react';

interface OrderRowProps {
  id: string;
  orderNumber: string;
  date: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  itemCount: number;
  thumbnail?: string;
}

const statusConfig = {
  pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
  processing: { color: 'bg-blue-100 text-blue-800', label: 'Processing' },
  shipped: { color: 'bg-purple-100 text-purple-800', label: 'Shipped' },
  delivered: { color: 'bg-green-100 text-green-800', label: 'Delivered' },
  cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
};

// Performance: Memoize OrderRow to prevent unnecessary re-renders
export const OrderRow = memo(function OrderRow({
  orderNumber,
  date,
  status,
  total,
  itemCount,
  thumbnail,
}: OrderRowProps) {
  const statusStyle = statusConfig[status];

  return (
    <div className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition">
      {thumbnail && (
        <div className="w-16 h-16 rounded overflow-hidden bg-gray-100 flex-shrink-0">
          <img src={thumbnail} alt="Order" loading="lazy" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex-1">
        <div className="font-semibold text-gray-900">#{orderNumber}</div>
        <div className="text-sm text-gray-600">{new Date(date).toLocaleDateString()}</div>
        <div className="text-sm text-gray-600">{itemCount} item(s)</div>
      </div>

      <div className="text-right">
        <div className="text-lg font-bold text-gray-900 mb-2">
          ₩{total.toLocaleString()}
        </div>
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusStyle.color}`}>
          {statusStyle.label}
        </span>
      </div>

      <button className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-sm font-medium">
        View Details
      </button>
    </div>
  );
});
