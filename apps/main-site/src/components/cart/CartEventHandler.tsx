/**
 * Cart Event Handler
 * Phase 2-B: Listens to global addToCart and buyNow CustomEvents
 * and integrates them with the Cart store
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../../stores/cartStore';
import type { CartItem } from '../../types/storefront';

export const CartEventHandler: React.FC = () => {
  const cartStore = useCartStore();
  const navigate = useNavigate();

  useEffect(() => {
    const handleAddToCart = (e: Event) => {
      const event = e as CustomEvent<CartItem>;
      const item = event.detail;

      try {
        // Validate essential fields
        if (!item.product_id || !item.product_name) {
          console.warn('[CartEventHandler] Invalid cart item:', item);
          return;
        }

        // Add to cart using the existing store
        cartStore.addItem(
          {
            product_id: item.product_id,
            product_name: item.product_name,
            seller_id: item.seller_id || '',
            seller_name: item.seller_name || 'Unknown Seller',
            price: item.price || 0,
            currency: item.currency || 'KRW',
            main_image: item.main_image,
            available_stock: item.available_stock || 99,
          },
          item.quantity || 1
        );

        // Optional: Show toast notification (if you have a toast system)
        console.log('[CartEventHandler] Added to cart:', item);
      } catch (error) {
        console.error('[CartEventHandler] Failed to add to cart:', error);
      }
    };

    const handleBuyNow = (e: Event) => {
      const event = e as CustomEvent<CartItem>;
      const item = event.detail;

      try {
        // Validate essential fields
        if (!item.product_id || !item.product_name) {
          console.warn('[CartEventHandler] Invalid cart item:', item);
          return;
        }

        // Clear cart and add single item
        cartStore.clearCart();
        cartStore.addItem(
          {
            product_id: item.product_id,
            product_name: item.product_name,
            seller_id: item.seller_id || '',
            seller_name: item.seller_name || 'Unknown Seller',
            price: item.price || 0,
            currency: item.currency || 'KRW',
            main_image: item.main_image,
            available_stock: item.available_stock || 99,
          },
          item.quantity || 1
        );

        // Navigate to checkout
        navigate('/store/checkout');
      } catch (error) {
        console.error('[CartEventHandler] Failed to process buy now:', error);
      }
    };

    // Subscribe to events
    window.addEventListener('addToCart', handleAddToCart);
    window.addEventListener('buyNow', handleBuyNow);

    // Cleanup
    return () => {
      window.removeEventListener('addToCart', handleAddToCart);
      window.removeEventListener('buyNow', handleBuyNow);
    };
  }, [cartStore, navigate]);

  // This component doesn't render anything
  return null;
};
