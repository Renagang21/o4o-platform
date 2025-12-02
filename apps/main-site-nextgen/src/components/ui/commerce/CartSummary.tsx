interface CartSummaryProps {
  total: number;
  itemCount: number;
  shipping: number;
  discount: number;
  finalTotal: number;
}

export function CartSummary({
  total,
  itemCount,
  shipping,
  discount,
  finalTotal,
}: CartSummaryProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Items ({itemCount})</span>
          <span className="font-medium">₩{total.toLocaleString()}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Shipping</span>
          <span className="font-medium">
            {shipping === 0 ? 'Free' : `₩${shipping.toLocaleString()}`}
          </span>
        </div>

        {discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount</span>
            <span className="font-medium">-₩{discount.toLocaleString()}</span>
          </div>
        )}
      </div>

      <div className="border-t pt-4">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">Total</span>
          <span className="text-2xl font-bold text-blue-600">
            ₩{finalTotal.toLocaleString()}
          </span>
        </div>
      </div>

      <button className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition">
        Proceed to Checkout
      </button>
    </div>
  );
}
