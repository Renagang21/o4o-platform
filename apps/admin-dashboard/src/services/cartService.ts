/**
 * Shopping Cart Service
 * Handles cart operations and state management
 */

import { buildAddToCartData } from '../utils/ecommerce';
import { useState, useEffect } from 'react';

interface CartItem {
  id: string;
  productId: number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  variationId?: number;
  variations?: any;
  sku?: string;
}

interface CartState {
  items: CartItem[];
  total: number;
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
}

class CartService {
  private cartKey = 'o4o_cart';
  private listeners: ((cart: CartState) => void)[] = [];

  constructor() {
    // Initialize cart from localStorage
    this.initializeCart();
  }

  private initializeCart() {
    const savedCart = this.getCartFromStorage();
    if (!savedCart) {
      this.saveCartToStorage({
        items: [],
        total: 0,
        subtotal: 0,
        discount: 0,
        tax: 0,
        shipping: 0
      });
    }
  }

  private getCartFromStorage(): CartState | null {
    try {
      const cartData = localStorage.getItem(this.cartKey);
      return cartData ? JSON.parse(cartData) : null;
    } catch (error: any) {
      console.error('Error reading cart from storage:', error);
      return null;
    }
  }

  private saveCartToStorage(cart: CartState) {
    try {
      localStorage.setItem(this.cartKey, JSON.stringify(cart));
      this.notifyListeners(cart);
    } catch (error: any) {
      console.error('Error saving cart to storage:', error);
    }
  }

  private calculateTotals(items: CartItem[]): Partial<CartState> {
    const subtotal = items.reduce((sum: any, item: any) => sum + (item.price * item.quantity), 0);
    const discount = 0; // Calculate based on coupons/discounts
    const tax = subtotal * 0.1; // 10% tax rate (configurable)
    const shipping = subtotal > 50000 ? 0 : 3000; // Free shipping over 50,000
    const total = subtotal - discount + tax + shipping;

    return {
      subtotal,
      discount,
      tax,
      shipping,
      total
    };
  }

  // Subscribe to cart changes
  subscribe(listener: (cart: CartState) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l: any) => l !== listener);
    };
  }

  private notifyListeners(cart: CartState) {
    this.listeners.forEach((listener: any) => listener(cart));
  }

  // Get current cart
  getCart(): CartState {
    return this.getCartFromStorage() || {
      items: [],
      total: 0,
      subtotal: 0,
      discount: 0,
      tax: 0,
      shipping: 0
    };
  }

  // Add item to cart
  async addToCart(product: any, quantity: number = 1, variations?: any): Promise<boolean> {
    try {
      const cart = this.getCart();
      
      // Check if item already exists
      const existingItemIndex = cart.items.findIndex(item => 
        item.productId === product.id && 
        item.variationId === variations?.variation_id
      );

      if (existingItemIndex > -1) {
        // Update quantity
        cart.items[existingItemIndex].quantity += quantity;
      } else {
        // Add new item
        const cartItem: CartItem = {
          id: `${product.id}_${variations?.variation_id || 0}_${Date.now()}`,
          productId: product.id,
          name: product.title || product.name,
          price: product.salePrice || product.price || product.regularPrice,
          quantity,
          image: product.image?.thumbnail,
          variationId: variations?.variation_id,
          variations: variations?.attributes,
          sku: product.sku
        };
        cart.items.push(cartItem);
      }

      // Recalculate totals
      const totals = this.calculateTotals(cart.items);
      const updatedCart = { ...cart, ...totals };
      
      this.saveCartToStorage(updatedCart);

      // Send to server if needed
      if (window.o4o?.ajaxUrl) {
        const data = buildAddToCartData(product, quantity, variations);
        await this.syncWithServer('add', data);
      }

      return true;
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      return false;
    }
  }

  // Update item quantity
  updateQuantity(itemId: string, quantity: number): boolean {
    try {
      const cart = this.getCart();
      const itemIndex = cart.items.findIndex(item => item.id === itemId);

      if (itemIndex === -1) return false;

      if (quantity <= 0) {
        // Remove item
        cart.items.splice(itemIndex, 1);
      } else {
        // Update quantity
        cart.items[itemIndex].quantity = quantity;
      }

      // Recalculate totals
      const totals = this.calculateTotals(cart.items);
      const updatedCart = { ...cart, ...totals };
      
      this.saveCartToStorage(updatedCart);
      return true;
    } catch (error: any) {
      console.error('Error updating quantity:', error);
      return false;
    }
  }

  // Remove item from cart
  removeItem(itemId: string): boolean {
    try {
      const cart = this.getCart();
      cart.items = cart.items.filter((item: any) => item.id !== itemId);

      // Recalculate totals
      const totals = this.calculateTotals(cart.items);
      const updatedCart = { ...cart, ...totals };
      
      this.saveCartToStorage(updatedCart);
      return true;
    } catch (error: any) {
      console.error('Error removing item:', error);
      return false;
    }
  }

  // Clear cart
  clearCart() {
    const emptyCart: CartState = {
      items: [],
      total: 0,
      subtotal: 0,
      discount: 0,
      tax: 0,
      shipping: 0
    };
    this.saveCartToStorage(emptyCart);
  }

  // Get cart count
  getItemCount(): number {
    const cart = this.getCart();
    return cart.items.reduce((sum: any, item: any) => sum + item.quantity, 0);
  }

  // Sync with server
  private async syncWithServer(action: string, data?: any) {
    try {
      const response = await fetch('/api/ecommerce/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          data
        })
      });

      if (!response.ok) {
        console.error('Cart sync failed:', await response.text());
      }
    } catch (error: any) {
      console.error('Error syncing cart with server:', error);
    }
  }

  // Apply coupon
  async applyCoupon(code: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch('/api/ecommerce/cart/coupon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code })
      });

      const result = await response.json();
      
      if (result.success) {
        const cart = this.getCart();
        cart.discount = result.discount;
        const totals = this.calculateTotals(cart.items);
        const updatedCart = { ...cart, ...totals, discount: result.discount };
        this.saveCartToStorage(updatedCart);
      }

      return result;
    } catch (error: any) {
      console.error('Error applying coupon:', error);
      return {
        success: false,
        message: 'Failed to apply coupon'
      };
    }
  }

  // Validate cart items (check stock, prices, etc.)
  async validateCart(): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const cart = this.getCart();
      const errors: string[] = [];

      // Check each item
      for (const item of cart.items) {
        // Here you would check stock, price changes, etc.
        // This is a placeholder implementation
        if (item.quantity <= 0) {
          errors.push(`Invalid quantity for ${item.name}`);
        }
      }

      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error: any) {
      console.error('Error validating cart:', error);
      return {
        valid: false,
        errors: ['Cart validation failed']
      };
    }
  }
}

// Create singleton instance
export const cartService = new CartService();

// Extend window interface for o4o property
declare global {
  interface Window {
    o4o?: {
      ajaxUrl: string;
    };
  }
}

// Export cart hook for React components
export function useCart() {
  const [cart, setCart] = useState(cartService.getCart());

  useEffect(() => {
    // Subscribe to cart changes
    const unsubscribe = cartService.subscribe(setCart);
    return unsubscribe;
  }, []);

  return {
    cart,
    addToCart: cartService.addToCart.bind(cartService),
    updateQuantity: cartService.updateQuantity.bind(cartService),
    removeItem: cartService.removeItem.bind(cartService),
    clearCart: cartService.clearCart.bind(cartService),
    getItemCount: cartService.getItemCount.bind(cartService),
    applyCoupon: cartService.applyCoupon.bind(cartService),
    validateCart: cartService.validateCart.bind(cartService)
  };
}