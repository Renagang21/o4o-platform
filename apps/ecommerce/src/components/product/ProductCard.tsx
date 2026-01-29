import { FC } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Package, Star, Edit, Copy, Trash2 } from 'lucide-react';
import { Product } from '@o4o/types';
import { formatCurrency } from '@o4o/utils';
import { cn } from '@o4o/utils';

interface ProductCardProps {
  product: Product;
  mode?: 'customer' | 'admin';
  onEdit?: (product: Product) => void;
  onDelete?: (productId: string) => void;
  onDuplicate?: (productId: string) => void;
  onAddToCart?: (productId: string) => void;
  className?: string;
}

export const ProductCard: FC<ProductCardProps> = ({
  product,
  mode = 'customer',
  onEdit,
  onDelete,
  onDuplicate,
  onAddToCart,
  className
}) => {
  const customerPrice = product.pricing?.customer || 0;
  const compareAtPrice = (product as any).compareAtPrice || 0;
  const discount = compareAtPrice > customerPrice
    ? Math.round(((compareAtPrice - customerPrice) / compareAtPrice) * 100)
    : 0;

  const getStockStatus = () => {
    if (!product.inventory?.manageStock) {
      return { label: '재고 관리 안함', className: 'text-blue-600' };
    }
    if (!product.inventory?.stockQuantity || product.inventory.stockQuantity === 0) {
      return { label: '품절', className: 'text-red-600' };
    }
    if (product.inventory?.lowStockThreshold && product.inventory.stockQuantity <= product.inventory.lowStockThreshold) {
      return { label: '재고 부족', className: 'text-orange-600' };
    }
    return { label: '재고 있음', className: 'text-green-600' };
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      published: { label: '게시됨', className: 'bg-green-100 text-green-800' },
      draft: { label: '임시저장', className: 'bg-yellow-100 text-yellow-800' },
      private: { label: '비공개', className: 'bg-blue-100 text-blue-800' },
      trash: { label: '휴지통', className: 'bg-red-100 text-red-800' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { label: status, className: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={cn('px-2 py-1 text-xs font-medium rounded-full', config.className)}>
        {config.label}
      </span>
    );
  };

  const cardContent = (
    <>
      {/* Image */}
      <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden bg-gray-200 relative">
        {product.images && product.images[0] ? (
          <img
            src={product.images[0].url}
            alt={product.name}
            className="object-cover object-center w-full h-full group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Package className="w-12 h-12 text-gray-400" />
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-2 left-2 space-y-1">
          {mode === 'admin' && getStatusBadge(product.status)}
          {product.isFeatured && (
            <span className="block px-2 py-1 text-xs font-medium bg-yellow-400 text-yellow-900 rounded">
              추천
            </span>
          )}
          {discount > 0 && (
            <span className="block px-2 py-1 text-xs font-medium bg-red-500 text-white rounded">
              {discount}% 할인
            </span>
          )}
          {product.inventory?.stockQuantity === 0 && (
            <span className="block px-2 py-1 text-xs font-medium bg-gray-500 text-white rounded">
              품절
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
          {product.name}
        </h3>

        {/* Subtitle */}
        {product.subtitle && (
          <p className="text-xs text-gray-600 line-clamp-1 mb-2">
            {product.subtitle}
          </p>
        )}

        {/* SKU for admin mode */}
        {mode === 'admin' && product.sku && (
          <p className="text-xs text-gray-500 mb-2">SKU: {product.sku}</p>
        )}

        {/* Supplier Info */}
        {mode === 'customer' && product.supplierName && (
          <p className="text-xs text-gray-600 mb-2">
            판매자: {product.supplierName}
          </p>
        )}

        {/* Rating */}
        {mode === 'customer' && product.rating && (
          <div className="flex items-center mb-2">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    'w-4 h-4',
                    i < Math.floor(product.rating!)
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-300'
                  )}
                />
              ))}
            </div>
            <span className="text-xs text-gray-500 ml-1">
              ({product.reviewCount || 0})
            </span>
          </div>
        )}

        {/* Stock info for admin */}
        {mode === 'admin' && (
          <div className="flex items-center justify-between text-sm mb-2">
            <span>재고:</span>
            <div className="flex items-center space-x-2">
              <span>{product.inventory?.stockQuantity || 0}개</span>
              <span className={getStockStatus().className}>
                {getStockStatus().label}
              </span>
            </div>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-lg font-semibold text-gray-900">
              {formatCurrency(customerPrice)}
            </span>
            {compareAtPrice > customerPrice && (
              <span className="text-sm text-gray-500 line-through ml-2">
                {formatCurrency(compareAtPrice)}
              </span>
            )}
          </div>

          {/* Quick Add to Cart for customer mode */}
          {mode === 'customer' && product.inventory?.stockQuantity && product.inventory.stockQuantity > 0 && onAddToCart && (
            <button
              onClick={(e: any) => {
                e.preventDefault();
                onAddToCart(product.id);
              }}
              className="p-2 bg-primary text-primary-foreground rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              title="장바구니에 담기"
            >
              <ShoppingCart className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Features for admin */}
        {mode === 'admin' && (
          <div className="flex flex-wrap gap-1 mt-2">
            {product.isVirtual && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                가상상품
              </span>
            )}
            {product.isDownloadable && (
              <span className="px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded">
                다운로드
              </span>
            )}
          </div>
        )}
      </div>

      {/* Admin Actions */}
      {mode === 'admin' && (
        <div className="p-4 pt-0 flex space-x-2">
          {onEdit && (
            <button
              onClick={() => onEdit(product)}
              className="flex-1 px-3 py-2 text-sm border rounded hover:bg-gray-50"
            >
              <Edit className="w-4 h-4 inline mr-1" />
              편집
            </button>
          )}
          {onDuplicate && (
            <button
              onClick={() => onDuplicate(product.id)}
              className="px-3 py-2 text-sm border rounded hover:bg-gray-50"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(product.id)}
              className="px-3 py-2 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </>
  );

  const cardWrapper = (
    <div className={cn(
      'group relative bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-all duration-200',
      className
    )}>
      {cardContent}
    </div>
  );

  // Wrap in Link for customer mode
  if (mode === 'customer') {
    return (
      <Link to={`/products/${product.slug || product.id}`} className="block">
        {cardWrapper}
      </Link>
    );
  }

  return cardWrapper;
};