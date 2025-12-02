import { memo } from 'react';

interface CartItemProps {
  id: string;
  productId: string;
  productTitle: string;
  productImage: string;
  price: number;
  quantity: number;
  subtotal: number;
}

// Performance: Memoize CartItem to prevent unnecessary re-renders
export const CartItem = memo(function CartItem({
  productTitle,
  productImage,
  price,
  quantity,
  subtotal,
}: CartItemProps) {
  return (
    <div className="flex gap-4 p-4 bg-white border border-gray-200 rounded-lg">
      <div className="w-20 h-20 rounded overflow-hidden bg-gray-100 flex-shrink-0">
        <img
          src={productImage}
          alt={productTitle}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="flex-1">
        <h3 className="font-semibold text-gray-900 mb-1">{productTitle}</h3>
        <div className="text-sm text-gray-600">₩{price.toLocaleString()} each</div>
      </div>

      <div className="flex flex-col items-end justify-between">
        <button className="text-gray-400 hover:text-red-600 text-sm">✕</button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 border border-gray-300 rounded">
            <button className="px-2 py-1 hover:bg-gray-100">−</button>
            <span className="px-3 text-sm">{quantity}</span>
            <button className="px-2 py-1 hover:bg-gray-100">+</button>
          </div>

          <div className="text-lg font-bold text-gray-900 w-24 text-right">
            ₩{subtotal.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
});
