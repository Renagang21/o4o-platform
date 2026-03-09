/**
 * Cart Service — KPA Storefront
 *
 * WO-O4O-KPA-CUSTOMER-COMMERCE-LOOP-V1
 *
 * localStorage 기반 매장별 독립 카트.
 * 서버 동기화 없음 (Phase 1).
 */

export interface CartItem {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string;
}

export interface Cart {
  items: CartItem[];
  updatedAt: string;
}

function getStorageKey(slug: string): string {
  return `o4o_kpa_cart_${slug}`;
}

function loadCart(slug: string): Cart {
  try {
    const raw = localStorage.getItem(getStorageKey(slug));
    if (!raw) return { items: [], updatedAt: new Date().toISOString() };
    return JSON.parse(raw);
  } catch {
    return { items: [], updatedAt: new Date().toISOString() };
  }
}

function saveCart(slug: string, cart: Cart): void {
  cart.updatedAt = new Date().toISOString();
  localStorage.setItem(getStorageKey(slug), JSON.stringify(cart));
}

export function getCart(slug: string): Cart {
  return loadCart(slug);
}

export function addItem(slug: string, item: Omit<CartItem, 'quantity'>, quantity = 1): Cart {
  const cart = loadCart(slug);
  const existing = cart.items.find((i) => i.productId === item.productId);

  if (existing) {
    existing.quantity += quantity;
    existing.unitPrice = item.unitPrice;
    if (item.imageUrl) existing.imageUrl = item.imageUrl;
  } else {
    cart.items.push({ ...item, quantity });
  }

  saveCart(slug, cart);
  return cart;
}

export function updateQuantity(slug: string, productId: string, quantity: number): Cart {
  const cart = loadCart(slug);
  const item = cart.items.find((i) => i.productId === productId);
  if (item) {
    if (quantity <= 0) {
      cart.items = cart.items.filter((i) => i.productId !== productId);
    } else {
      item.quantity = quantity;
    }
  }
  saveCart(slug, cart);
  return cart;
}

export function removeItem(slug: string, productId: string): Cart {
  const cart = loadCart(slug);
  cart.items = cart.items.filter((i) => i.productId !== productId);
  saveCart(slug, cart);
  return cart;
}

export function clearCart(slug: string): void {
  localStorage.removeItem(getStorageKey(slug));
}

export function getCartItemCount(slug: string): number {
  const cart = loadCart(slug);
  return cart.items.reduce((sum, i) => sum + i.quantity, 0);
}

export function getCartTotal(slug: string): number {
  const cart = loadCart(slug);
  return cart.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
}
