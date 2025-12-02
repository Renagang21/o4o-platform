interface OrderDetailViewProps {
  id: string;
  orderNumber: string;
  date: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: Array<{
    id: string;
    productId: string;
    productTitle: string;
    productImage: string;
    price: number;
    quantity: number;
    subtotal: number;
  }>;
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  shippingAddress: {
    name: string;
    phone: string;
    address: string;
    city: string;
    zipCode: string;
  };
  paymentMethod: string;
  trackingNumber?: string;
}

const statusConfig = {
  pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
  processing: { color: 'bg-blue-100 text-blue-800', label: 'Processing' },
  shipped: { color: 'bg-purple-100 text-purple-800', label: 'Shipped' },
  delivered: { color: 'bg-green-100 text-green-800', label: 'Delivered' },
  cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
};

export function OrderDetailView({
  orderNumber,
  date,
  status,
  items,
  subtotal,
  shipping,
  tax,
  discount,
  total,
  shippingAddress,
  paymentMethod,
  trackingNumber,
}: OrderDetailViewProps) {
  const statusStyle = statusConfig[status];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Order #{orderNumber}
            </h1>
            <div className="text-sm text-gray-600">
              Placed on {new Date(date).toLocaleDateString()}
            </div>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusStyle.color}`}>
            {statusStyle.label}
          </span>
        </div>

        {trackingNumber && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-gray-600">Tracking Number</div>
            <div className="font-mono font-semibold text-blue-600">{trackingNumber}</div>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Items</h2>
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex gap-4 pb-4 border-b last:border-b-0">
              <div className="w-20 h-20 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                <img src={item.productImage} alt={item.productTitle} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">{item.productTitle}</div>
                <div className="text-sm text-gray-600">Quantity: {item.quantity}</div>
                <div className="text-sm text-gray-600">₩{item.price.toLocaleString()} each</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-gray-900">
                  ₩{item.subtotal.toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Shipping Address */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Shipping Address</h2>
          <div className="text-sm space-y-1">
            <div className="font-medium">{shippingAddress.name}</div>
            <div className="text-gray-600">{shippingAddress.phone}</div>
            <div className="text-gray-600">{shippingAddress.address}</div>
            <div className="text-gray-600">
              {shippingAddress.city}, {shippingAddress.zipCode}
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">₩{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Shipping</span>
              <span className="font-medium">₩{shipping.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tax</span>
              <span className="font-medium">₩{tax.toLocaleString()}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span className="font-medium">-₩{discount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-bold text-blue-600">
                ₩{total.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="text-sm text-gray-600">Payment Method</div>
            <div className="font-medium">{paymentMethod}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
