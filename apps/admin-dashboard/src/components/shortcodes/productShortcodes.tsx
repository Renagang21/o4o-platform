import { FC, Component, Suspense, lazy } from 'react';
import { ShortcodeDefinition, ShortcodeAttributes } from '@o4o/shortcodes';
import { useProducts, useProduct } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { formatCurrency } from '@/lib/utils';
import { ShoppingCart, Package, Star, Heart, FolderOpen } from 'lucide-react';

// Note: ProductGrid와 ProductCarousel은 미구현 상태
// Placeholder components
const ProductGrid: FC<{ products: any[]; columns: number }> = ({ products, columns }) => (
  <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-6`}>
    {products.map((product, i) => (
      <div key={i} className="border rounded-lg p-4">
        <h3>{product.name}</h3>
        <p>{product.price}</p>
      </div>
    ))}
  </div>
);

const ProductCarousel: FC<{ products: any[]; autoplay: boolean }> = ({ products }) => (
  <div className="flex overflow-x-auto gap-4">
    {products.map((product, i) => (
      <div key={i} className="min-w-[250px] border rounded-lg p-4">
        <h3>{product.name}</h3>
        <p>{product.price}</p>
      </div>
    ))}
  </div>
);

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
export const productShortcode: ShortcodeDefinition = {
  name: 'product',
  component: ({ attributes }) => {
    const productId = String(attributes.id || '');
    const showPrice = attributes.show_price !== false;
    const showCart = attributes.show_cart !== false;
    const className = String(attributes.class || '');

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
export const productGridShortcode: ShortcodeDefinition = {
  name: 'product_grid',
  component: ({ attributes }) => {
    const category = String(attributes.category || '');
    const limit = Number(attributes.limit || 12);
    const columns = Number(attributes.columns || 4);
    const featured = attributes.featured === true;
    const orderBy = String(attributes.orderby || 'created_at');
    const order = String(attributes.order || 'desc') as 'asc' | 'desc';

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
export const addToCartShortcode: ShortcodeDefinition = {
  name: 'add_to_cart',
  component: ({ attributes }) => {
    const productId = String(attributes.id || '');
    const text = String(attributes.text || '장바구니에 담기');
    const className = String(attributes.class || '');
    const showPrice = attributes.show_price !== false;

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
export const productCarouselShortcode: ShortcodeDefinition = {
  name: 'product_carousel',
  component: ({ attributes }) => {
    const category = String(attributes.category || '');
    const limit = Number(attributes.limit || 10);
    const autoplay = attributes.autoplay !== false;
    const title = String(attributes.title || '');

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
export const featuredProductsShortcode: ShortcodeDefinition = {
  name: 'featured_products',
  component: ({ attributes }) => {
    const limit = Number(attributes.limit || 4);
    const columns = Number(attributes.columns || 4);
    const title = String(attributes.title || '추천 상품');

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

// Product Categories Shortcode: [product_categories show_count="true" hide_empty="true" columns="3"]
export const productCategoriesShortcode: ShortcodeDefinition = {
  name: 'product_categories',
  component: ({ attributes }) => {
    const showCount = attributes.show_count !== false;
    const hideEmpty = attributes.hide_empty !== false;
    const columns = Number(attributes.columns || 3);

    return (
      <Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse rounded-lg" />}>
        <ProductCategoriesWrapper
          showCount={showCount}
          hideEmpty={hideEmpty}
          columns={columns}
        />
      </Suspense>
    );
  }
};

// Product Categories Wrapper
const ProductCategoriesWrapper: FC<{
  showCount: boolean;
  hideEmpty: boolean;
  columns: number;
}> = ({ showCount, hideEmpty, columns }) => {
  const { data: categoriesData, isLoading, error } = useCategories();

  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-4`}>
        {[...Array(columns * 2)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 rounded-lg h-32"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !categoriesData?.data) {
    return <div className="text-gray-500">Categories not found</div>;
  }

  // Flatten nested categories
  const flattenCategories = (categories: any[]): any[] => {
    return categories.reduce((acc, cat) => {
      acc.push(cat);
      if (cat.children && cat.children.length > 0) {
        acc.push(...flattenCategories(cat.children));
      }
      return acc;
    }, []);
  };

  let categories = flattenCategories(categoriesData.data);

  // Filter empty categories if needed
  if (hideEmpty) {
    categories = categories.filter(cat => (cat.count || 0) > 0);
  }

  if (categories.length === 0) {
    return <div className="text-gray-500">No categories found</div>;
  }

  return (
    <div className="product-categories-shortcode">
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-4`}>
        {categories.map((category) => (
          <div
            key={category.id}
            className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start flex-1">
                <FolderOpen className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">{category.name}</h3>
                  {category.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{category.description}</p>
                  )}
                </div>
              </div>
              {showCount && (
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                  {category.count || 0}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Export all shortcodes as an array
export const productShortcodes: ShortcodeDefinition[] = [
  productShortcode,
  productGridShortcode,
  addToCartShortcode,
  productCarouselShortcode,
  featuredProductsShortcode,
  productCategoriesShortcode
];