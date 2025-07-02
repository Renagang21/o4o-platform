import React, { useState, useEffect } from 'react'
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Edit,
  Save,
  X,
  Plus,
  Minus,
  RefreshCw,
  Search,
  Filter,
  Download,
  Upload,
  History,
  Eye
} from 'lucide-react'
import { InventoryItem, StockMovement } from '@/types/ecommerce'
import { EcommerceApi } from '@/api/ecommerceApi'
import toast from 'react-hot-toast'

const StockManagement: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [showStockModal, setShowStockModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [stockUpdateData, setStockUpdateData] = useState({
    quantity: 0,
    type: 'set' as 'set' | 'increase' | 'decrease',
    note: ''
  })
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    count: 0,
    totalItems: 0
  })

  // Stats
  const [stats, setStats] = useState({
    totalProducts: 0,
    inStock: 0,
    lowStock: 0,
    outOfStock: 0,
    totalValue: 0
  })

  const pageSize = 20

  useEffect(() => {
    loadInventory()
    loadStats()
  }, [searchTerm, filterStatus])

  const loadInventory = async (page = 1) => {
    try {
      setLoading(true)
      const response = await EcommerceApi.getInventory(page, pageSize, filterStatus === 'lowStock')
      setInventory(response.data)
      setPagination(response.pagination)
    } catch (error) {
      console.error('Failed to load inventory:', error)
      toast.error('재고 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await EcommerceApi.getDashboardStats()
      setStats({
        totalProducts: response.data.totalProducts || 0,
        inStock: 0, // TODO: Add to API
        lowStock: response.data.lowStockProducts || 0,
        outOfStock: 0, // TODO: Add to API
        totalValue: 0 // TODO: Add to API
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const handleStockUpdate = async () => {
    if (!selectedItem) return

    try {
      await EcommerceApi.updateStock(
        selectedItem.productId,
        stockUpdateData.quantity,
        stockUpdateData.type,
        stockUpdateData.note
      )
      
      toast.success('재고가 업데이트되었습니다.')
      loadInventory(pagination.current)
      loadStats()
      closeStockModal()
    } catch (error) {
      console.error('Failed to update stock:', error)
      toast.error('재고 업데이트에 실패했습니다.')
    }
  }

  const openStockModal = (item: InventoryItem) => {
    setSelectedItem(item)
    setStockUpdateData({
      quantity: 0,
      type: 'set',
      note: ''
    })
    setShowStockModal(true)
  }

  const closeStockModal = () => {
    setShowStockModal(false)
    setSelectedItem(null)
    setStockUpdateData({
      quantity: 0,
      type: 'set',
      note: ''
    })
  }

  const getStockStatusBadge = (item: InventoryItem) => {
    if (!item.manageStock) {
      return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">재고 관리 안함</span>
    }

    if (item.stockStatus === 'outofstock') {
      return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">품절</span>
    }

    if (item.lowStockThreshold && item.stockQuantity <= item.lowStockThreshold) {
      return <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">재고 부족</span>
    }

    if (item.stockStatus === 'onbackorder') {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">예약주문</span>
    }

    return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">재고 있음</span>
  }

  const getStockIcon = (item: InventoryItem) => {
    if (!item.manageStock) {
      return <Package className="w-4 h-4 text-gray-400" />
    }

    if (item.stockStatus === 'outofstock') {
      return <AlertTriangle className="w-4 h-4 text-red-500" />
    }

    if (item.lowStockThreshold && item.stockQuantity <= item.lowStockThreshold) {
      return <TrendingDown className="w-4 h-4 text-orange-500" />
    }

    return <TrendingUp className="w-4 h-4 text-green-500" />
  }

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = 
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = !filterStatus || 
      (filterStatus === 'instock' && item.stockStatus === 'instock') ||
      (filterStatus === 'outofstock' && item.stockStatus === 'outofstock') ||
      (filterStatus === 'lowstock' && item.lowStockThreshold && item.stockQuantity <= item.lowStockThreshold) ||
      (filterStatus === 'onbackorder' && item.stockStatus === 'onbackorder')
    
    return matchesSearch && matchesStatus
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">재고 관리</h1>
          <p className="text-gray-600 mt-1">모든 상품의 재고를 확인하고 관리합니다</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadInventory(pagination.current)}
            className="wp-button-secondary"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </button>
          <button className="wp-button-secondary">
            <Download className="w-4 h-4 mr-2" />
            내보내기
          </button>
          <button className="wp-button-secondary">
            <Upload className="w-4 h-4 mr-2" />
            가져오기
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">전체 상품</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalProducts.toLocaleString()}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">재고 있음</p>
                <p className="text-2xl font-bold text-green-600">{stats.inStock.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
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
              <TrendingDown className="w-8 h-8 text-orange-500" />
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
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">재고 가치</p>
                <p className="text-xl font-bold text-purple-600">
                  {new Intl.NumberFormat('ko-KR', {
                    style: 'currency',
                    currency: 'KRW'
                  }).format(stats.totalValue)}
                </p>
              </div>
              <Package className="w-8 h-8 text-purple-500" />
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
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="상품명, SKU로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="wp-input pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="wp-select min-w-[120px]"
              >
                <option value="">전체 상태</option>
                <option value="instock">재고 있음</option>
                <option value="lowstock">재고 부족</option>
                <option value="outofstock">품절</option>
                <option value="onbackorder">예약주문</option>
              </select>

              <button
                onClick={() => {
                  setSearchTerm('')
                  setFilterStatus('')
                }}
                className="wp-button-secondary"
                title="필터 초기화"
              >
                <Filter className="w-4 h-4" />
                초기화
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Inventory table */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="wp-card-title">
            재고 목록 ({filteredInventory.length.toLocaleString()}개)
          </h3>
        </div>
        <div className="wp-card-body p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="loading-spinner" />
              <span className="ml-2 text-gray-600">로딩 중...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="wp-table">
                <thead>
                  <tr>
                    <th>상품</th>
                    <th>SKU</th>
                    <th>재고량</th>
                    <th>상태</th>
                    <th>임계값</th>
                    <th>최근 변동</th>
                    <th>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((item) => (
                    <tr key={item.productId}>
                      <td>
                        <div className="flex items-center gap-3">
                          {getStockIcon(item)}
                          <div>
                            <div className="font-medium text-gray-900">{item.productName}</div>
                            <div className="text-sm text-gray-500">
                              {item.manageStock ? '재고 관리됨' : '재고 관리 안함'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {item.sku}
                        </code>
                      </td>
                      <td>
                        <div className="text-center">
                          {item.manageStock ? (
                            <div>
                              <div className="text-lg font-bold text-gray-900">
                                {item.stockQuantity.toLocaleString()}
                              </div>
                              <div className="text-xs text-gray-500">
                                {item.soldIndividually ? '개별판매' : '수량제한없음'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">∞</span>
                          )}
                        </div>
                      </td>
                      <td>{getStockStatusBadge(item)}</td>
                      <td>
                        <div className="text-center">
                          {item.lowStockThreshold ? (
                            <span className="text-sm text-orange-600 font-medium">
                              {item.lowStockThreshold}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      <td>
                        {item.lastMovement ? (
                          <div className="text-sm">
                            <div className="flex items-center gap-1">
                              {item.lastMovement.type === 'sale' && <Minus className="w-3 h-3 text-red-500" />}
                              {item.lastMovement.type === 'restock' && <Plus className="w-3 h-3 text-green-500" />}
                              {item.lastMovement.type === 'adjustment' && <Edit className="w-3 h-3 text-blue-500" />}
                              {item.lastMovement.type === 'return' && <RefreshCw className="w-3 h-3 text-purple-500" />}
                              <span className="font-medium">
                                {item.lastMovement.type === 'sale' ? '-' : '+'}
                                {Math.abs(item.lastMovement.quantity)}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatDate(item.lastMovement.date)}
                            </div>
                            {item.lastMovement.note && (
                              <div className="text-xs text-gray-400 truncate max-w-32">
                                {item.lastMovement.note}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">변동 없음</span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openStockModal(item)}
                            className="text-blue-600 hover:text-blue-700"
                            title="재고 조정"
                            disabled={!item.manageStock}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          
                          <button
                            className="text-green-600 hover:text-green-700"
                            title="재고 이력"
                          >
                            <History className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredInventory.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">재고 항목이 없습니다</p>
                  <p className="text-sm">재고 관리할 상품을 추가해보세요!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stock Update Modal */}
      {showStockModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                재고 조정: {selectedItem.productName}
              </h3>
              <button
                onClick={closeStockModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">현재 재고:</span>
                  <span className="text-lg font-bold text-gray-900">
                    {selectedItem.stockQuantity.toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <label className="wp-label">조정 유형</label>
                <select
                  value={stockUpdateData.type}
                  onChange={(e) => setStockUpdateData(prev => ({ ...prev, type: e.target.value as any }))}
                  className="wp-select"
                >
                  <option value="set">재고 설정</option>
                  <option value="increase">재고 증가</option>
                  <option value="decrease">재고 감소</option>
                </select>
              </div>

              <div>
                <label className="wp-label">
                  {stockUpdateData.type === 'set' ? '새로운 재고량' : 
                   stockUpdateData.type === 'increase' ? '증가할 수량' : '감소할 수량'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={stockUpdateData.quantity}
                  onChange={(e) => setStockUpdateData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                  className="wp-input"
                  placeholder="수량을 입력하세요"
                />
                {stockUpdateData.type !== 'set' && (
                  <p className="text-xs text-gray-500 mt-1">
                    변경 후 재고: {
                      stockUpdateData.type === 'increase' 
                        ? selectedItem.stockQuantity + stockUpdateData.quantity
                        : Math.max(0, selectedItem.stockQuantity - stockUpdateData.quantity)
                    }
                  </p>
                )}
              </div>

              <div>
                <label className="wp-label">메모 (선택사항)</label>
                <textarea
                  value={stockUpdateData.note}
                  onChange={(e) => setStockUpdateData(prev => ({ ...prev, note: e.target.value }))}
                  className="wp-textarea"
                  rows={3}
                  placeholder="재고 조정 사유를 입력하세요"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={closeStockModal}
                  className="wp-button-secondary flex-1"
                >
                  취소
                </button>
                <button
                  onClick={handleStockUpdate}
                  className="wp-button-primary flex-1"
                  disabled={stockUpdateData.quantity < 0}
                >
                  <Save className="w-4 h-4 mr-2" />
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="wp-card">
          <div className="wp-card-header">
            <h3 className="wp-card-title">빠른 작업</h3>
          </div>
          <div className="wp-card-body space-y-3">
            <button className="w-full wp-button-secondary justify-start">
              <TrendingDown className="w-4 h-4 mr-2" />
              재고 부족 상품 보기
            </button>
            <button className="w-full wp-button-secondary justify-start">
              <AlertTriangle className="w-4 h-4 mr-2" />
              품절 상품 보기
            </button>
            <button className="w-full wp-button-secondary justify-start">
              <Download className="w-4 h-4 mr-2" />
              재고 리포트 다운로드
            </button>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-header">
            <h3 className="wp-card-title">재고 알림</h3>
          </div>
          <div className="wp-card-body">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-orange-500" />
                  <span className="text-sm text-orange-800">재고 부족</span>
                </div>
                <span className="font-medium text-orange-900">{stats.lowStock}개</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-800">품절</span>
                </div>
                <span className="font-medium text-red-900">{stats.outOfStock}개</span>
              </div>
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-header">
            <h3 className="wp-card-title">재고 설정</h3>
          </div>
          <div className="wp-card-body space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">자동 재고 알림</span>
              <input type="checkbox" className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">품절 상품 숨기기</span>
              <input type="checkbox" className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">예약주문 허용</span>
              <input type="checkbox" className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StockManagement