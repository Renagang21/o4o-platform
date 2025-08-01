import { useState } from 'react';
import { ShoppingCart, X, Plus, Minus, Trash2 } from 'lucide-react';
import { __ } from '@wordpress/i18n';
import { useCart } from '../../services/cartService';
import { formatPrice } from '../../utils/ecommerce';

interface MiniCartProps {
  isOpen?: boolean;
  onClose?: () => void;
  position?: 'dropdown' | 'sidebar';
}

export function MiniCart({ isOpen = false, onClose, position = 'dropdown' }: MiniCartProps) {
  const { cart, updateQuantity, removeItem, clearCart } = useCart();
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    setIsUpdating(itemId);
    await updateQuantity(itemId, newQuantity);
    setIsUpdating(null);
  };

  const handleRemoveItem = async (itemId: string) => {
    setIsUpdating(itemId);
    await removeItem(itemId);
    setIsUpdating(null);
  };

  if (!isOpen && position === 'dropdown') {
    return null;
  }

  const containerClasses = position === 'sidebar'
    ? 'fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 transform transition-transform duration-300'
    : 'absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl z-50';

  return (
    <>
      {/* Backdrop for sidebar */}
      {position === 'sidebar' && isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}

      <div className={`${containerClasses} ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            {__('Shopping Cart', 'o4o')}
            {cart.items.length > 0 && (
              <span className="text-sm bg-blue-500 text-white px-2 py-0.5 rounded-full">
                {cart.items.length}
              </span>
            )}
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded"
              aria-label={__('Close cart', 'o4o')}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto max-h-96">
          {cart.items.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{__('Your cart is empty', 'o4o')}</p>
            </div>
          ) : (
            <div className="divide-y">
              {cart.items.map((item: any) => (
                <div key={item.id} className="p-4 hover:bg-gray-50">
                  <div className="flex gap-3">
                    {/* Product Image */}
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-2">{item.name}</h4>
                      {item.sku && (
                        <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                      )}
                      {item.variations && (
                        <p className="text-xs text-gray-600">
                          {Object.entries(item.variations).map(([key, value]) => 
                            `${key}: ${value}`
                          ).join(', ')}
                        </p>
                      )}
                      
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          disabled={isUpdating === item.id || item.quantity <= 1}
                          className="p-1 hover:bg-gray-200 rounded disabled:opacity-50"
                          aria-label={__('Decrease quantity', 'o4o')}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-medium w-8 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          disabled={isUpdating === item.id}
                          className="p-1 hover:bg-gray-200 rounded disabled:opacity-50"
                          aria-label={__('Increase quantity', 'o4o')}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Price & Remove */}
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatPrice(item.price)} {__('each', 'o4o')}
                      </p>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={isUpdating === item.id}
                        className="mt-2 p-1 text-red-600 hover:bg-red-50 rounded"
                        aria-label={__('Remove item', 'o4o')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {cart.items.length > 0 && (
          <div className="border-t p-4 space-y-3">
            {/* Totals */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{__('Subtotal', 'o4o')}</span>
                <span>{formatPrice(cart.subtotal)}</span>
              </div>
              {cart.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>{__('Discount', 'o4o')}</span>
                  <span>-{formatPrice(cart.discount)}</span>
                </div>
              )}
              {cart.shipping > 0 && (
                <div className="flex justify-between">
                  <span>{__('Shipping', 'o4o')}</span>
                  <span>{formatPrice(cart.shipping)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>{__('Tax', 'o4o')}</span>
                <span>{formatPrice(cart.tax)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2 border-t">
                <span>{__('Total', 'o4o')}</span>
                <span>{formatPrice(cart.total)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <a
                href="/cart"
                className="block w-full py-2 text-center bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                {__('View Cart', 'o4o')}
              </a>
              <a
                href="/checkout"
                className="block w-full py-2 text-center bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors"
              >
                {__('Checkout', 'o4o')}
              </a>
            </div>

            {/* Clear Cart */}
            <button
              onClick={() => {
                if (window.confirm(__('Are you sure you want to clear your cart?', 'o4o'))) {
                  clearCart();
                }
              }}
              className="w-full text-sm text-gray-500 hover:text-red-600 transition-colors"
            >
              {__('Clear Cart', 'o4o')}
            </button>
          </div>
        )}
      </div>
    </>
  );
}