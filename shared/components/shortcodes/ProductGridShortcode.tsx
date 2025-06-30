/**
 * [product-grid] 숏코드 컴포넌트
 * E-commerce API와 연동하여 상품 그리드 렌더링
 */

import React, { useState, useEffect } from 'react';
import { ShortcodeRendererProps } from '../../lib/shortcode/renderer';

interface Product {
  id: string;
  name: string;
  description: string;
  retailPrice: number;
  wholesalePrice?: number;
  affiliatePrice?: number;
  images: string[];
  category: string;
  featured: boolean;
  inStock: boolean;
  stockQuantity: number;
  sku: string;
  slug: string;
}

const ProductGridShortcode: React.FC<ShortcodeRendererProps> = ({
  shortcode,
  apiClient,
  editorMode = false
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    category = '',
    limit = 6,
    columns = 3,
    featured = false,
    orderby = 'name',
    order = 'asc',
    show_price = true,
    show_add_to_cart = true,
    show_description = false,
    className = ''
  } = shortcode.attributes;

  useEffect(() => {
    if (!apiClient) {
      setError('API client is required');
      setLoading(false);
      return;
    }

    loadProducts();
  }, [apiClient, category, limit, featured, orderby, order]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (featured) params.append('featured', 'true');
      params.append('limit', limit.toString());
      params.append('orderby', orderby);
      params.append('order', order);

      const response = await apiClient.get(`/ecommerce/products?${params.toString()}`);
      
      if (response.data.success) {
        setProducts(response.data.data);
      } else {
        setError('Failed to load products');
      }
    } catch (err) {
      console.error('Error loading products:', err);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(price);
  };

  const getGridCols = (): string => {
    const cols = Math.min(Math.max(1, Number(columns)), 6);
    const colsMap: { [key: number]: string } = {
      1: 'grid-cols-1',
      2: 'grid-cols-1 md:grid-cols-2',
      3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
      5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
      6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'
    };
    return colsMap[cols] || 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
  };

  const handleAddToCart = async (product: Product) => {
    if (!apiClient) return;

    try {
      await apiClient.post('/ecommerce/cart/items', {
        productId: product.id,
        quantity: 1
      });
      
      // Show success message or update cart UI
      console.log(`Added ${product.name} to cart`);
    } catch (err) {
      console.error('Error adding to cart:', err);
    }
  };

  if (loading) {
    const skeletonItems = Array.from({ length: Number(limit) }, (_, i) => (
      <div key={i} className="product-card-skeleton animate-pulse">
        <div className="bg-gray-200 aspect-square rounded-lg mb-3"></div>
        <div className="bg-gray-200 h-4 rounded mb-2"></div>
        <div className="bg-gray-200 h-3 rounded mb-2 w-3/4"></div>
        <div className="bg-gray-200 h-4 rounded w-1/2"></div>
      </div>
    ));

    return (
      <div className={`product-grid-shortcode loading ${className}`}>
        <div className={`grid gap-4 ${getGridCols()}`}>
          {skeletonItems}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`product-grid-shortcode error ${className}`}>
        <div className="product-grid-error bg-red-50 border border-red-200 rounded p-4 text-center">
          <svg className="w-8 h-8 text-red-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-red-600 text-sm">{error}</p>
          {editorMode && (
            <p className="text-xs text-gray-500 mt-1">Category: {category || 'All'}</p>
          )}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className={`product-grid-shortcode empty ${className}`}>
        <div className="product-grid-empty bg-gray-50 border border-gray-200 rounded p-8 text-center">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Products Found</h3>
          <p className="text-gray-500">No products match the specified criteria.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`product-grid-shortcode ${editorMode ? 'editor-mode' : ''} ${className}`}>
      <div className={`grid gap-6 ${getGridCols()}`}>
        {products.map((product) => (
          <div
            key={product.id}
            className="product-card bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200"
          >
            {/* Product Image */}
            <div className="product-image aspect-square bg-gray-100 relative">
              {product.images.length > 0 ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              
              {product.featured && (
                <div className="absolute top-2 left-2">
                  <span className="bg-yellow-400 text-yellow-900 text-xs font-medium px-2 py-1 rounded">
                    Featured
                  </span>
                </div>
              )}
              
              {!product.inStock && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <span className="bg-red-600 text-white text-sm font-medium px-3 py-1 rounded">
                    Out of Stock
                  </span>
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="product-info p-4">
              <h3 className="product-name font-medium text-gray-900 mb-2 line-clamp-2">
                {product.name}
              </h3>
              
              {show_description && product.description && (
                <p className="product-description text-sm text-gray-600 mb-2 line-clamp-2">
                  {product.description}
                </p>
              )}
              
              {show_price && (
                <div className="product-price mb-3">
                  <span className="text-lg font-bold text-gray-900">
                    {formatPrice(product.retailPrice)}
                  </span>
                  {product.wholesalePrice && product.wholesalePrice < product.retailPrice && (
                    <span className="text-sm text-gray-500 line-through ml-2">
                      {formatPrice(product.wholesalePrice)}
                    </span>
                  )}
                </div>
              )}
              
              {show_add_to_cart && (
                <button
                  onClick={() => handleAddToCart(product)}
                  disabled={!product.inStock}
                  className={`w-full py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    product.inStock
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {product.inStock ? 'Add to Cart' : 'Out of Stock'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {editorMode && (
        <div className="shortcode-editor-overlay">
          <div className="shortcode-info bg-blue-500 text-white text-xs px-2 py-1 rounded">
            Product Grid: {products.length} items ({category || 'All categories'})
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductGridShortcode;