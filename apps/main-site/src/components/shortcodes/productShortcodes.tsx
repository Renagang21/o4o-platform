import { FC, Component, Suspense, lazy } from 'react';
import { ShortcodeHandler, ShortcodeAttributes } from '@/utils/shortcodeParser';
import { useProducts, useProduct } from '@/hooks/useProducts';
import { formatCurrency } from '@/lib/utils';
import { ShoppingCart, Package, Star, Heart } from 'lucide-react';

// Lazy load heavier components
const ProductGrid = lazy(() => import('@/components/ecommerce/ProductGrid'));
const ProductCarousel = lazy(() => import('@/components/ecommerce/ProductCarousel'));

// Loading component
const ProductLoading = () => (
  <div className="animate-pulse">
    <div className="bg-gray-200 rounded-lg h-64 w-full"></div>
    <div className="mt-4 space-y-2">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </div>
  </div>
);

// Single Product Shortcode: [product id="123" show_price="true" show_cart="true"]
export const productShortcode: ShortcodeHandler = {
  name: 'product',
  render: (attrs: ShortcodeAttributes) => {
    const productId = String(attrs.id || '');
    const showPrice = attrs.show_price !== false;
    const showCart = attrs.show_cart !== false;
    const className = String(attrs.class || '');

    if (!productId) {
      return <div className="text-red-500">Product shortcode requires an ID</div>;
    }

    return <SingleProduct 
      productId={productId} 
      showPrice={showPrice} 
      showCart={showCart}
      className={className}
    />;
  }
};

// Single Product Component
const SingleProduct: FC<{
  productId: string;
  showPrice?: boolean;
  showCart?: boolean;
  className?: string;
}> = ({ productId, showPrice = true, showCart = true, className = '' }) => {
  const { data: productData, isLoading, error } = useProduct(productId);
  
  if (isLoading) return <ProductLoading />;
  if (error || !productData?.data) return <div className="text-gray-500">Product not found</div>;
  
  const product = productData.data;
  
  return (
    <div className={`product-shortcode ${className}`}>
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
        <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden bg-gray-200">
          {product.images && product.images[0] ? (
            <img
              src={product.images[0].url}
              alt={product.name}
              className="object-cover object-center w-full h-full"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Package className="w-12 h-12 text-gray-400" />
            </div>
          )}
        </div>
        
        <div className="p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-2">{product.name}</h3>
          
          {product.shortDescription && (
            <p className="text-sm text-gray-600 mb-3">{product.shortDescription}</p>
          )}
          
          <div className="flex items-center justify-between">
            {showPrice && (
              <div>
                <span className="text-xl font-semibold text-gray-900">
                  {formatCurrency(product.price)}
                </span>
                {product.compareAtPrice && product.compareAtPrice > product.price && (
                  <span className="text-sm text-gray-500 line-through ml-2">
                    {formatCurrency(product.compareAtPrice)}
                  </span>
                )}
              </div>
            )}
            
            {showCart && product.stockQuantity > 0 && (
              <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <ShoppingCart className="w-4 h-4 mr-2" />
                장바구니
              </button>
            )}
          </div>
          
          {product.stockQuantity === 0 && (
            <div className="mt-2 text-red-600 text-sm font-medium">품절</div>
          )}
        </div>
      </div>
    </div>
  );
};

// Product Grid Shortcode: [product_grid category="electronics" limit="8" columns="4"]
export const productGridShortcode: ShortcodeHandler = {
  name: 'product_grid',
  render: (attrs: ShortcodeAttributes) => {
    const category = String(attrs.category || '');
    const limit = Number(attrs.limit || 12);
    const columns = Number(attrs.columns || 4);
    const featured = attrs.featured === true;
    const orderBy = String(attrs.orderby || 'created_at');
    const order = String(attrs.order || 'desc') as 'asc' | 'desc';

    return (
      <Suspense fallback={<GridLoading columns={columns} />}>
        <ProductGridWrapper
          category={category}
          limit={limit}
          columns={columns}
          featured={featured}
          orderBy={orderBy}
          order={order}
        />
      </Suspense>
    );
  }
};

// Grid Loading Component
const GridLoading: FC<{ columns: number }> = ({ columns }) => (
  <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-6`}>
    {[...Array(columns * 2)].map((_, i) => (
      <ProductLoading key={i} />
    ))}
  </div>
);

// Product Grid Wrapper
const ProductGridWrapper: FC<{
  category?: string;
  limit: number;
  columns: number;
  featured?: boolean;
  orderBy: string;
  order: 'asc' | 'desc';
}> = ({ category, limit, columns, featured, orderBy, order }) => {
  const filters = {
    category,
    featured,
    status: 'active' as const
  };

  const { data: productsData, isLoading, error } = useProducts(1, limit, filters);
  
  if (isLoading) return <GridLoading columns={columns} />;
  if (error || !productsData?.data) return <div className="text-gray-500">Products not found</div>;
  
  // Sort products based on orderBy and order
  let products = [...productsData.data];
  products.sort((a, b) => {
    let aVal, bVal;
    
    switch (orderBy) {
      case 'price':
        aVal = a.price;
        bVal = b.price;
        break;
      case 'name':
        aVal = a.name;
        bVal = b.name;
        break;
      case 'created_at':
      default:
        aVal = new Date(a.createdAt).getTime();
        bVal = new Date(b.createdAt).getTime();
        break;
    }
    
    if (order === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });
  
  return <ProductGrid products={products} columns={columns} />;
};

// Add to Cart Button Shortcode: [add_to_cart id="123" text="구매하기" class="custom-class"]
export const addToCartShortcode: ShortcodeHandler = {
  name: 'add_to_cart',
  render: (attrs: ShortcodeAttributes) => {
    const productId = String(attrs.id || '');
    const text = String(attrs.text || '장바구니에 담기');
    const className = String(attrs.class || '');
    const showPrice = attrs.show_price !== false;

    if (!productId) {
      return <div className="text-red-500">Add to cart shortcode requires a product ID</div>;
    }

    return <AddToCartButton 
      productId={productId} 
      text={text} 
      className={className}
      showPrice={showPrice}
    />;
  }
};

// Add to Cart Button Component
const AddToCartButton: FC<{
  productId: string;
  text: string;
  className?: string;
  showPrice?: boolean;
}> = ({ productId, text, className = '', showPrice = true }) => {
  const { data: productData, isLoading } = useProduct(productId);
  
  if (isLoading) {
    return (
      <button className="px-4 py-2 bg-gray-200 rounded-lg animate-pulse" disabled>
        Loading...
      </button>
    );
  }
  
  if (!productData?.data) return null;
  
  const product = productData.data;
  const isOutOfStock = product.stockQuantity === 0;
  
  return (
    <div className={`add-to-cart-shortcode inline-block ${className}`}>
      <button
        className={`flex items-center px-6 py-3 rounded-lg font-medium transition-colors ${
          isOutOfStock
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
        disabled={isOutOfStock}
      >
        <ShoppingCart className="w-5 h-5 mr-2" />
        {isOutOfStock ? '품절' : text}
        {showPrice && !isOutOfStock && (
          <span className="ml-2 font-semibold">{formatCurrency(product.price)}</span>
        )}
      </button>
    </div>
  );
};

// Product Carousel Shortcode: [product_carousel category="new-arrivals" limit="10" autoplay="true"]
export const productCarouselShortcode: ShortcodeHandler = {
  name: 'product_carousel',
  render: (attrs: ShortcodeAttributes) => {
    const category = String(attrs.category || '');
    const limit = Number(attrs.limit || 10);
    const autoplay = attrs.autoplay !== false;
    const title = String(attrs.title || '');

    return (
      <Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse rounded-lg" />}>
        <ProductCarouselWrapper
          category={category}
          limit={limit}
          autoplay={autoplay}
          title={title}
        />
      </Suspense>
    );
  }
};

// Product Carousel Wrapper
const ProductCarouselWrapper: FC<{
  category?: string;
  limit: number;
  autoplay: boolean;
  title?: string;
}> = ({ category, limit, autoplay, title }) => {
  const filters = {
    category,
    status: 'active' as const
  };

  const { data: productsData, isLoading, error } = useProducts(1, limit, filters);
  
  if (isLoading) return <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />;
  if (error || !productsData?.data || productsData.data.length === 0) {
    return <div className="text-gray-500">No products found for carousel</div>;
  }
  
  return (
    <div className="product-carousel-shortcode">
      {title && <h2 className="text-2xl font-bold mb-6">{title}</h2>}
      <ProductCarousel products={productsData.data} autoplay={autoplay} />
    </div>
  );
};

// Featured Products Shortcode: [featured_products limit="4" columns="4"]
export const featuredProductsShortcode: ShortcodeHandler = {
  name: 'featured_products',
  render: (attrs: ShortcodeAttributes) => {
    const limit = Number(attrs.limit || 4);
    const columns = Number(attrs.columns || 4);
    const title = String(attrs.title || '추천 상품');

    return (
      <div className="featured-products-shortcode">
        <h2 className="text-2xl font-bold mb-6">{title}</h2>
        <Suspense fallback={<GridLoading columns={columns} />}>
          <ProductGridWrapper
            featured={true}
            limit={limit}
            columns={columns}
            orderBy="created_at"
            order="desc"
          />
        </Suspense>
      </div>
    );
  }
};

// Product Categories Shortcode: [product_categories show_count="true" hide_empty="true"]
export const productCategoriesShortcode: ShortcodeHandler = {
  name: 'product_categories',
  render: (attrs: ShortcodeAttributes) => {
    const showCount = attrs.show_count !== false;
    const hideEmpty = attrs.hide_empty !== false;
    const columns = Number(attrs.columns || 3);

    // TODO: Implement when categories API is ready
    return (
      <div className="product-categories-shortcode">
        <div className="text-gray-500 p-4 border rounded">
          Product categories will be displayed here
        </div>
      </div>
    );
  }
};

// Export all shortcodes as an array
export const productShortcodes: ShortcodeHandler[] = [
  productShortcode,
  productGridShortcode,
  addToCartShortcode,
  productCarouselShortcode,
  featuredProductsShortcode,
  productCategoriesShortcode
];