
import { Product } from '@/types/ecommerce';

interface ProductCardProps {
  product: Product;
  onEdit?: (product: Product) => void;
  onDelete?: (productId: string) => void;
  onDuplicate?: (productId: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onEdit,
  onDelete,
  onDuplicate,
}) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(price);
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      published: 'bg-green-100 text-green-800',
      draft: 'bg-yellow-100 text-yellow-800',
      private: 'bg-blue-100 text-blue-800',
      trash: 'bg-red-100 text-red-800',
    };

    const statusLabels = {
      published: '게시됨',
      draft: '임시저장',
      private: '비공개',
      trash: '휴지통',
    };

    return (
      <span 
        className={`px-2 py-1 text-xs font-medium rounded-full ${
          statusClasses[status as keyof typeof statusClasses] || 'bg-wp-bg-tertiary text-wp-text-primary'
        }`}
        data-testid="product-status-badge"
      >
        {statusLabels[status as keyof typeof statusLabels] || status}
      </span>
    );
  };

  const getStockStatus = () => {
    if (!product.manageStock) {
      return <span className="text-blue-600">재고 관리 안함</span>;
    }

    if (product.stockQuantity === 0) {
      return <span className="text-red-600" data-testid="out-of-stock">품절</span>;
    }

    if (product.lowStockThreshold && product.stockQuantity <= product.lowStockThreshold) {
      return <span className="text-orange-600" data-testid="low-stock">부족</span>;
    }

    return <span className="text-green-600" data-testid="in-stock">재고 있음</span>;
  };

  return (
    <div className="wp-card" data-testid="product-card">
      <div className="wp-card-body">
        {/* 상품 이미지 */}
        <div className="mb-4">
          <img
            src={product.featuredImage || 'https://via.placeholder.com/200x150'}
            alt={product.name}
            className="w-full h-32 object-cover rounded"
            data-testid="product-image"
          />
        </div>

        {/* 상품 정보 */}
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <h3 className="font-medium text-wp-text-primary line-clamp-2" data-testid="product-name">
              {product.name}
            </h3>
            {getStatusBadge(product.status)}
          </div>

          <div className="text-sm text-wp-text-secondary" data-testid="product-sku">
            SKU: {product.sku}
          </div>

          <div className="space-y-1">
            <div className="font-semibold text-lg" data-testid="product-price">
              {formatPrice(product.retailPrice)}
            </div>
            
            {product.wholesalePrice && (
              <div className="text-sm text-wp-text-secondary" data-testid="wholesale-price">
                도매가: {formatPrice(product.wholesalePrice)}
              </div>
            )}
          </div>

          {/* 재고 정보 */}
          <div className="flex items-center justify-between text-sm">
            <span>재고:</span>
            <div className="flex items-center space-x-2">
              <span data-testid="stock-quantity">{product.stockQuantity}개</span>
              {getStockStatus()}
            </div>
          </div>

          {/* 특징 표시 */}
          <div className="flex flex-wrap gap-1">
            {product.featured && (
              <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded" data-testid="featured-badge">
                특가
              </span>
            )}
            {product.virtual && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded" data-testid="virtual-badge">
                가상상품
              </span>
            )}
            {product.downloadable && (
              <span className="px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded" data-testid="downloadable-badge">
                다운로드
              </span>
            )}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="mt-4 flex space-x-2">
          {onEdit && (
            <button
              onClick={() => onEdit(product)}
              className="flex-1 wp-button-secondary text-sm py-2"
              data-testid="edit-button"
            >
              편집
            </button>
          )}
          
          {onDuplicate && (
            <button
              onClick={() => onDuplicate(product.id)}
              className="px-3 py-2 text-sm border border-wp-border-primary rounded hover:bg-wp-bg-tertiary"
              data-testid="duplicate-button"
            >
              복제
            </button>
          )}
          
          {onDelete && (
            <button
              onClick={() => onDelete(product.id)}
              className="px-3 py-2 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50"
              data-testid="delete-button"
            >
              삭제
            </button>
          )}
        </div>
      </div>
    </div>
  );
};