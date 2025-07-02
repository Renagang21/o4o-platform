import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Package, TrendingDown, AlertTriangle, Eye, Filter, Download } from 'lucide-react'
import { Product, ProductFilters as IProductFilters, BulkProductAction } from '@/types/ecommerce'
import { EcommerceApi } from '@/api/ecommerceApi'
import ProductTable from '../components/ProductTable'
import toast from 'react-hot-toast'

const AllProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [filters, setFilters] = useState<IProductFilters>({})
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    count: 0,
    totalItems: 0
  })

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0,
    lowStock: 0,
    outOfStock: 0
  })

  const pageSize = 20

  const loadProducts = async (page = 1) => {
    try {
      setLoading(true)
      const response = await EcommerceApi.getProducts(page, pageSize, filters)
      setProducts(response.data)
      setPagination(response.pagination)
    } catch (error) {
      console.error('Failed to load products:', error)
      toast.error('상품 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await EcommerceApi.getDashboardStats()
      setStats({
        total: response.data.totalProducts,
        published: 0, // TODO: Add to API
        draft: 0, // TODO: Add to API
        lowStock: response.data.lowStockProducts,
        outOfStock: 0 // TODO: Add to API
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [filters])

  useEffect(() => {
    loadStats()
  }, [])

  const handleSelectProduct = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  const handleSelectAll = (selected: boolean) => {
    setSelectedProducts(selected ? products.map(p => p.id) : [])
  }

  const handleBulkAction = async (action: BulkProductAction) => {
    try {
      await EcommerceApi.bulkProductAction({
        ...action,
        productIds: selectedProducts
      })
      toast.success('일괄 작업이 완료되었습니다.')
      setSelectedProducts([])
      loadProducts(pagination.current)
      loadStats()
    } catch (error) {
      console.error('Bulk action failed:', error)
      toast.error('일괄 작업에 실패했습니다.')
    }
  }

  const handleDuplicate = async (productId: string) => {
    try {
      await EcommerceApi.duplicateProduct(productId)
      toast.success('상품이 복제되었습니다.')
      loadProducts(pagination.current)
    } catch (error) {
      console.error('Failed to duplicate product:', error)
      toast.error('상품 복제에 실패했습니다.')
    }
  }

  const handleDelete = async (productId: string) => {
    if (!confirm('정말 이 상품을 삭제하시겠습니까?')) return

    try {
      await EcommerceApi.deleteProduct(productId)
      toast.success('상품이 삭제되었습니다.')
      loadProducts(pagination.current)
      loadStats()
    } catch (error) {
      console.error('Failed to delete product:', error)
      toast.error('상품 삭제에 실패했습니다.')
    }
  }

  const handleExport = async () => {
    try {
      const blob = await EcommerceApi.exportProducts(filters)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `products_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('상품 목록이 내보내졌습니다.')
    } catch (error) {
      console.error('Failed to export products:', error)
      toast.error('내보내기에 실패했습니다.')
    }
  }

  const handlePageChange = (page: number) => {
    loadProducts(page)
  }

  const updateFilter = (key: keyof IProductFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value
    }))
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">상품</h1>
          <p className="text-gray-600 mt-1">스토어의 모든 상품을 관리합니다</p>
        </div>
        <Link to="/woocommerce/products/add" className="wp-button-primary">
          <Plus className="w-4 h-4 mr-2" />
          상품 추가
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">전체 상품</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total.toLocaleString()}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">게시됨</p>
                <p className="text-2xl font-bold text-green-600">{stats.published.toLocaleString()}</p>
              </div>
              <Eye className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">임시저장</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.draft.toLocaleString()}</p>
              </div>
              <Package className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">재고 부족</p>
                <p className="text-2xl font-bold text-orange-600">{stats.lowStock.toLocaleString()}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">품절</p>
                <p className="text-2xl font-bold text-red-600">{stats.outOfStock.toLocaleString()}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="wp-card">
        <div className="wp-card-body">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="상품명, SKU로 검색..."
                value={filters.search || ''}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="wp-input"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <select
                value={filters.status || ''}
                onChange={(e) => updateFilter('status', e.target.value)}
                className="wp-select min-w-[120px]"
              >
                <option value="">전체 상태</option>
                <option value="published">게시됨</option>
                <option value="draft">임시저장</option>
                <option value="private">비공개</option>
                <option value="trash">휴지통</option>
              </select>

              <select
                value={filters.stockStatus || ''}
                onChange={(e) => updateFilter('stockStatus', e.target.value)}
                className="wp-select min-w-[120px]"
              >
                <option value="">전체 재고</option>
                <option value="instock">재고있음</option>
                <option value="outofstock">품절</option>
                <option value="onbackorder">예약주문</option>
              </select>

              <select
                value={filters.type || ''}
                onChange={(e) => updateFilter('type', e.target.value)}
                className="wp-select min-w-[120px]"
              >
                <option value="">전체 유형</option>
                <option value="simple">단순상품</option>
                <option value="variable">변수상품</option>
                <option value="grouped">그룹상품</option>
                <option value="external">외부상품</option>
              </select>

              <button
                onClick={() => setFilters({})}
                className="wp-button-secondary"
                title="필터 초기화"
              >
                <Filter className="w-4 h-4" />
                초기화
              </button>

              <button
                onClick={handleExport}
                className="wp-button-secondary"
                title="내보내기"
              >
                <Download className="w-4 h-4" />
                내보내기
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk actions */}
      {selectedProducts.length > 0 && (
        <div className="wp-card border-l-4 border-l-blue-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700">
                  {selectedProducts.length}개 상품 선택됨
                </span>
                
                <div className="flex items-center gap-2">
                  <select className="wp-select">
                    <option value="">일괄 작업 선택</option>
                    <option value="publish">게시하기</option>
                    <option value="draft">임시저장으로</option>
                    <option value="private">비공개로</option>
                    <option value="delete">삭제하기</option>
                  </select>
                  <button className="wp-button-primary">적용</button>
                </div>
              </div>

              <button
                onClick={() => setSelectedProducts([])}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                선택 해제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products table */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="wp-card-title">
            상품 목록 ({pagination.totalItems.toLocaleString()}개)
          </h3>
        </div>
        <div className="wp-card-body p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="loading-spinner" />
              <span className="ml-2 text-gray-600">로딩 중...</span>
            </div>
          ) : (
            <ProductTable
              products={products}
              selectedProducts={selectedProducts}
              onSelectProduct={handleSelectProduct}
              onSelectAll={handleSelectAll}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              showActions={true}
              showBulkSelect={true}
            />
          )}
        </div>
      </div>

      {/* Pagination */}
      {pagination.total > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-700">
            전체 <span className="font-medium">{pagination.totalItems}</span>개 중{' '}
            <span className="font-medium">
              {((pagination.current - 1) * pageSize) + 1}-{Math.min(pagination.current * pageSize, pagination.totalItems)}
            </span>개 표시
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(pagination.current - 1)}
              disabled={pagination.current === 1}
              className="wp-button-secondary"
            >
              이전
            </button>
            
            {Array.from({ length: Math.min(5, pagination.total) }, (_, i) => {
              const page = i + Math.max(1, pagination.current - 2)
              if (page > pagination.total) return null
              
              return (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={page === pagination.current ? 'wp-button-primary' : 'wp-button-secondary'}
                >
                  {page}
                </button>
              )
            })}
            
            <button
              onClick={() => handlePageChange(pagination.current + 1)}
              disabled={pagination.current === pagination.total}
              className="wp-button-secondary"
            >
              다음
            </button>
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="wp-card">
        <div className="wp-card-body">
          <h4 className="font-medium text-gray-900 mb-3">빠른 작업</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/woocommerce/products/categories" className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
              <Package className="w-5 h-5 text-blue-600" />
              <span className="text-blue-800 font-medium">카테고리 관리</span>
            </Link>
            
            <Link to="/woocommerce/products/tags" className="flex items-center gap-2 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
              <Package className="w-5 h-5 text-green-600" />
              <span className="text-green-800 font-medium">태그 관리</span>
            </Link>
            
            <Link to="/woocommerce/inventory/low-stock" className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <span className="text-orange-800 font-medium">재고 부족 알림</span>
            </Link>
            
            <Link to="/woocommerce/products/reviews" className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
              <Package className="w-5 h-5 text-purple-600" />
              <span className="text-purple-800 font-medium">리뷰 관리</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AllProducts