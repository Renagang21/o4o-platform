/**
 * Format price with currency symbol
 */
export function formatPrice(price: number | string, currency: string = 'KRW'): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  if (isNaN(numPrice)) {
    return '₩0';
  }

  const formatter = new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  return formatter.format(numPrice);
}

/**
 * Calculate discount percentage
 */
export function calculateDiscountPercentage(regularPrice: number, salePrice: number): number {
  if (!regularPrice || !salePrice || regularPrice <= salePrice) {
    return 0;
  }
  
  const discount = ((regularPrice - salePrice) / regularPrice) * 100;
  return Math.round(discount);
}

/**
 * Format stock status text
 */
export function formatStockStatus(stockStatus: string, stockQuantity?: number): string {
  switch (stockStatus) {
    case 'in_stock':
      return stockQuantity ? `${stockQuantity}개 재고` : '재고 있음';
    case 'out_of_stock':
      return '품절';
    case 'on_backorder':
      return '예약주문 가능';
    default:
      return stockStatus;
  }
}

/**
 * Get product image URL
 */
export function getProductImageUrl(product: any, size: string = 'medium'): string {
  if (!product.image) {
    return '/placeholder-product.jpg';
  }

  if (typeof product.image === 'string') {
    return product.image;
  }

  return product.image[size] || product.image.full || product.image.thumbnail || '/placeholder-product.jpg';
}

/**
 * Parse product meta data
 */
export function parseProductMeta(meta: any): any {
  const parsed: any = {};

  // Price fields
  if (meta._regular_price) {
    parsed.regularPrice = parseFloat(meta._regular_price[0] || 0);
  }
  if (meta._sale_price) {
    parsed.salePrice = parseFloat(meta._sale_price[0] || 0);
  }
  if (meta._price) {
    parsed.price = parseFloat(meta._price[0] || 0);
  }

  // Stock fields
  if (meta._stock_status) {
    parsed.stockStatus = meta._stock_status[0];
  }
  if (meta._stock) {
    parsed.stockQuantity = parseInt(meta._stock[0] || 0);
  }

  // Product data
  if (meta._sku) {
    parsed.sku = meta._sku[0];
  }
  if (meta._weight) {
    parsed.weight = meta._weight[0];
  }
  if (meta._length) {
    parsed.dimensions = {
      length: meta._length[0],
      width: meta._width?.[0],
      height: meta._height?.[0]
    };
  }

  return parsed;
}

/**
 * Build add to cart data
 */
export function buildAddToCartData(product: any, quantity: number = 1, variations?: any): any {
  return {
    product_id: product.id,
    quantity: quantity,
    variation_id: variations?.variation_id || 0,
    variation: variations?.attributes || {},
    product_type: product.type || 'simple',
    return_url: window.location.href
  };
}

/**
 * Check if product is purchasable
 */
export function isProductPurchasable(product: any): boolean {
  if (!product) return false;
  
  // Check stock status
  if (product.stockStatus === 'out_of_stock' && !product.backordersAllowed) {
    return false;
  }

  // Check if product is published
  if (product.status !== 'publish') {
    return false;
  }

  // Check if product has price
  if (!product.price && !product.regularPrice) {
    return false;
  }

  return true;
}

/**
 * Get product variation options
 */
export function getProductVariations(product: any): any[] {
  if (product.type !== 'variable' || !product.variations) {
    return [];
  }

  return product.variations.map((variation: any) => ({
    id: variation.id,
    price: variation.price,
    regularPrice: variation.regular_price,
    salePrice: variation.sale_price,
    stockStatus: variation.stock_status,
    stockQuantity: variation.stock_quantity,
    attributes: variation.attributes,
    image: variation.image
  }));
}

/**
 * Calculate cart totals
 */
export function calculateCartTotals(items: any[]): any {
  const subtotal = items.reduce((total: any, item: any) => {
    const price = item.salePrice || item.price || item.regularPrice;
    return total + (price * item.quantity);
  }, 0);

  const discount = items.reduce((total: any, item: any) => {
    if (item.salePrice && item.regularPrice) {
      return total + ((item.regularPrice - item.salePrice) * item.quantity);
    }
    return total;
  }, 0);

  return {
    subtotal,
    discount,
    total: subtotal
  };
}