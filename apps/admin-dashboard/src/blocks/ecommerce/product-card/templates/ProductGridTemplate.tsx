import { ShoppingCart, Package } from 'lucide-react';
import { __ } from '@wordpress/i18n';
// import { formatPrice } from '../../../../utils/ecommerce';
const formatPrice = (price: number, symbol: string = '$') => `${symbol}${price.toFixed(2)}`;

interface ProductGridTemplateProps {
  products: any[];
  attributes: any;
  isLoading: boolean;
  error?: string;
}

export function ProductGridTemplate({ products, attributes, isLoading, error }: ProductGridTemplateProps) {
  const {
    columns = 4,
    showImage = true,
    imageSize = 'medium',
    showTitle = true,
    showPrice = true,
    showAddToCart = true,
    imageAspectRatio = 'square',
    priceColor,
    buttonColor: _buttonColor,
    buttonTextColor: _buttonTextColor
  } = attributes;

  if (isLoading) {
    return (
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {[...Array(columns * 2)].map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="bg-gray-200 rounded" style={{ paddingBottom: '100%' }}></div>
            <div className="mt-2 space-y-1">
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !products || products.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>{error || __('No products found', 'o4o')}</p>
      </div>
    );
  }

  const getAspectRatioStyle = () => {
    const ratios = {
      square: 'pb-[100%]',
      portrait: 'pb-[133%]',
      landscape: 'pb-[75%]',
      wide: 'pb-[56.25%]'
    };
    return (ratios as any)[imageAspectRatio] || ratios.square;
  };

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {products.map((product: any) => (
        <article key={product.id} className="group">
          {showImage && (
            <div className="relative overflow-hidden bg-gray-100 rounded mb-2">
              <div className={`relative ${getAspectRatioStyle()}`}>
                <img
                  src={product.image?.[imageSize] || product.image?.full || '/placeholder-product.jpg'}
                  alt={product.title}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                
                {/* Quick Add to Cart Overlay */}
                {showAddToCart && product.stockStatus === 'in_stock' && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors duration-300 flex items-center justify-center">
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white text-gray-900 px-4 py-2 rounded-md font-medium hover:bg-gray-100 flex items-center gap-2"
                      data-product-id={product.id}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      {__('Quick Add', 'o4o')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-1">
            {showTitle && (
              <h3 className="text-sm font-medium text-gray-900 line-clamp-1">
                <a href={product.link} className="hover:text-blue-600 transition-colors">
                  {product.title}
                </a>
              </h3>
            )}

            {showPrice && (
              <p 
                className="text-sm font-semibold"
                style={{ color: priceColor || '#111827' }}
              >
                {formatPrice(product.salePrice || product.price || product.regularPrice, product.currency)}
              </p>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}