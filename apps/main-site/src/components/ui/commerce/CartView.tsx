import { CartItem } from './CartItem';
import { CartSummary } from './CartSummary';

interface CartViewProps {
  items: Array<{
    id: string;
    productId: string;
    productTitle: string;
    productImage: string;
    price: number;
    quantity: number;
    subtotal: number;
  }>;
  summary: {
    total: number;
    itemCount: number;
    shipping: number;
    discount: number;
    finalTotal: number;
  };
}

export function CartView({ items, summary }: CartViewProps) {
  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {items.length > 0 ? (
            items.map((item) => <CartItem key={item.id} {...item} />)
          ) : (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <p className="text-gray-500">Your cart is empty</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <CartSummary {...summary} />
        </div>
      </div>
    </div>
  );
}
