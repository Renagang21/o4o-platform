import React from 'react'
import { Link } from 'react-router-dom'
import { Product } from '@/types/ecommerce'
import { Eye, Edit, Copy, Trash2, Package, Star, TrendingUp, AlertTriangle } from 'lucide-react'

interface ProductTableProps {
  products: Product[]
  selectedProducts: string[]
  onSelectProduct: (productId: string) => void
  onSelectAll: (selected: boolean) => void
  onDuplicate?: (productId: string) => void
  onDelete?: (productId: string) => void
  showActions?: boolean
  showBulkSelect?: boolean
}

const ProductTable: React.FC<ProductTableProps> = ({
  products,
  selectedProducts,
  onSelectProduct,
  onSelectAll,
  onDuplicate,
  onDelete,
  showActions = true,
  showBulkSelect = true
}) => {
  const getStatusBadge = (status: string) => {
    const colors = {
      published: 'bg-green-100 text-green-800',
      draft: 'bg-yellow-100 text-yellow-800',
      private: 'bg-blue-100 text-blue-800',
      trash: 'bg-red-100 text-red-800'
    }
    
    const labels = {
      published: '게시됨',
      draft: '임시저장',
      private: '비공개',
      trash: '휴지통'
    }
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  const getStockBadge = (product: Product) => {
    if (!product.manageStock) {
      return <span className="text-green-600 text-sm">재고 관리 안함</span>
    }

    if (product.stockStatus === 'outofstock') {
      return (
        <span className="flex items-center gap-1 text-red-600 text-sm">
          <AlertTriangle className="w-3 h-3" />
          품절
        </span>
      )
    }

    if (product.lowStockThreshold && product.stockQuantity <= product.lowStockThreshold) {
      return (
        <span className="flex items-center gap-1 text-orange-600 text-sm">
          <AlertTriangle className="w-3 h-3" />
          재고 부족 ({product.stockQuantity})
        </span>
      )
    }

    return (
      <span className="flex items-center gap-1 text-green-600 text-sm">
        <Package className="w-3 h-3" />
        재고 {product.stockQuantity}개
      </span>
    )
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const allSelected = products.length > 0 && selectedProducts.length === products.length
  const someSelected = selectedProducts.length > 0 && selectedProducts.length < products.length

  return (
    <div className="overflow-x-auto">
      <table className="wp-table">
        <thead>
          <tr>
            {showBulkSelect && (
              <th className="w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={input => {
                    if (input) input.indeterminate = someSelected
                  }}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                />
              </th>
            )}
            <th>상품</th>
            <th>SKU</th>
            <th>재고</th>
            <th>가격</th>
            <th>카테고리</th>
            <th>태그</th>
            <th>판매량</th>
            <th>평점</th>
            <th>상태</th>
            <th>날짜</th>
            {showActions && <th>작업</th>}
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              {showBulkSelect && (
                <td>
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(product.id)}
                    onChange={() => onSelectProduct(product.id)}
                    className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                  />
                </td>
              )}
              <td>
                <div className="flex items-center gap-3">
                  {product.featuredImage ? (
                    <img
                      src={product.featuredImage}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                      <Package className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-gray-900">
                      <Link 
                        to={`/woocommerce/products/${product.id}/edit`}
                        className="hover:text-admin-blue"
                      >
                        {product.name}
                      </Link>
                      {product.featured && (
                        <Star className="w-4 h-4 text-yellow-500 inline ml-1" fill="currentColor" />
                      )}
                    </div>
                    {product.shortDescription && (
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {product.shortDescription}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400">ID: {product.id}</span>
                      {product.type !== 'simple' && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-1 rounded">
                          {product.type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </td>
              <td>
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                  {product.sku}
                </code>
              </td>
              <td>{getStockBadge(product)}</td>
              <td>
                <div className="text-sm">
                  <div className="font-medium">{formatPrice(product.retailPrice)}</div>
                  {product.wholesalePrice && (
                    <div className="text-blue-600 text-xs">
                      도매: {formatPrice(product.wholesalePrice)}
                    </div>
                  )}
                  {product.affiliatePrice && (
                    <div className="text-purple-600 text-xs">
                      파트너: {formatPrice(product.affiliatePrice)}
                    </div>
                  )}
                </div>
              </td>
              <td>
                <div className="flex flex-wrap gap-1">
                  {product.categories.slice(0, 2).map((category) => (
                    <span
                      key={category.id}
                      className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded"
                    >
                      {category.name}
                    </span>
                  ))}
                  {product.categories.length > 2 && (
                    <span className="text-xs text-gray-500">
                      +{product.categories.length - 2}
                    </span>
                  )}
                </div>
              </td>
              <td>
                <div className="flex flex-wrap gap-1">
                  {product.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag.id}
                      className="px-1 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                    >
                      #{tag.name}
                    </span>
                  ))}
                  {product.tags.length > 3 && (
                    <span className="text-xs text-gray-500">
                      +{product.tags.length - 3}
                    </span>
                  )}
                </div>
              </td>
              <td>
                <div className="flex items-center gap-1 text-sm">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  {product.totalSales.toLocaleString()}
                </div>
              </td>
              <td>
                {product.reviewCount > 0 ? (
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="w-3 h-3 text-yellow-500" fill="currentColor" />
                    {product.averageRating.toFixed(1)} ({product.reviewCount})
                  </div>
                ) : (
                  <span className="text-gray-400 text-sm">리뷰 없음</span>
                )}
              </td>
              <td>{getStatusBadge(product.status)}</td>
              <td className="text-sm text-gray-500">
                <div>게시: {formatDate(product.createdAt)}</div>
                {product.updatedAt !== product.createdAt && (
                  <div>수정: {formatDate(product.updatedAt)}</div>
                )}
              </td>
              {showActions && (
                <td>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/shop/products/${product.slug}`}
                      target="_blank"
                      className="text-blue-600 hover:text-blue-700"
                      title="상품 보기"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    
                    <Link
                      to={`/woocommerce/products/${product.id}/edit`}
                      className="text-green-600 hover:text-green-700"
                      title="편집"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>

                    {onDuplicate && (
                      <button
                        onClick={() => onDuplicate(product.id)}
                        className="text-purple-600 hover:text-purple-700"
                        title="복제"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}

                    {onDelete && (
                      <button
                        onClick={() => onDelete(product.id)}
                        className="text-red-600 hover:text-red-700"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      
      {products.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">상품이 없습니다</p>
          <p className="text-sm">첫 번째 상품을 추가해보세요!</p>
        </div>
      )}
    </div>
  )
}

export default ProductTable