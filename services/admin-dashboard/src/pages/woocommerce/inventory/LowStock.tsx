import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  AlertTriangle, 
  TrendingDown, 
  Package,
  Edit,
  Eye,
  Mail,
  Bell,
  Settings,
  RefreshCw,
  Download,
  Plus,
  Minus,
  ArrowRight
} from 'lucide-react'
import { InventoryItem } from '@/types/ecommerce'
import { EcommerceApi } from '@/api/ecommerceApi'
import toast from 'react-hot-toast'

const LowStock: React.FC = () => {
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [showRestockModal, setShowRestockModal] = useState(false)
  const [restockData, setRestockData] = useState({
    quantity: 0,
    note: ''
  })
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)

  // Settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    threshold: 5,
    notifyDaily: true,
    autoReorder: false
  })

  useEffect(() => {
    loadLowStockItems()
  }, [])

  const loadLowStockItems = async () => {
    try {
      setLoading(true)
      const response = await EcommerceApi.getInventory(1, 100, true) // lowStock = true
      setLowStockItems(response.data)
    } catch (error) {
      console.error('Failed to load low stock items:', error)
      toast.error('재고 부족 상품을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleRestock = async () => {
    if (!selectedItem) return

    try {
      await EcommerceApi.updateStock(
        selectedItem.productId,
        restockData.quantity,
        'increase',
        restockData.note || '재고 보충'
      )
      
      toast.success('재고가 보충되었습니다.')
      loadLowStockItems()
      closeRestockModal()
    } catch (error) {
      console.error('Failed to restock item:', error)
      toast.error('재고 보충에 실패했습니다.')
    }
  }

  const openRestockModal = (item: InventoryItem) => {
    setSelectedItem(item)
    setRestockData({
      quantity: item.lowStockThreshold ? item.lowStockThreshold * 2 : 10,
      note: ''
    })
    setShowRestockModal(true)
  }

  const closeRestockModal = () => {
    setShowRestockModal(false)
    setSelectedItem(null)
    setRestockData({
      quantity: 0,
      note: ''
    })
  }

  const handleSelectItem = (productId: string) => {
    setSelectedItems(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  const handleSelectAll = (selected: boolean) => {
    setSelectedItems(selected ? lowStockItems.map(item => item.productId) : [])
  }

  const handleBulkRestock = async () => {
    // TODO: Implement bulk restock
    toast.success('일괄 재고 보충이 요청되었습니다.')
    setSelectedItems([])
  }

  const getUrgencyLevel = (item: InventoryItem) => {
    if (!item.lowStockThreshold) return 'low'
    
    const ratio = item.stockQuantity / item.lowStockThreshold
    if (ratio <= 0.2) return 'critical'
    if (ratio <= 0.5) return 'high'
    return 'medium'
  }

  const getUrgencyBadge = (urgency: string) => {
    const configs = {
      critical: { color: 'bg-red-100 text-red-800', label: '긴급', icon: AlertTriangle },
      high: { color: 'bg-orange-100 text-orange-800', label: '높음', icon: TrendingDown },
      medium: { color: 'bg-yellow-100 text-yellow-800', label: '보통', icon: TrendingDown },
      low: { color: 'bg-blue-100 text-blue-800', label: '낮음', icon: TrendingDown }
    }

    const config = configs[urgency as keyof typeof configs] || configs.low
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const allSelected = lowStockItems.length > 0 && selectedItems.length === lowStockItems.length
  const someSelected = selectedItems.length > 0 && selectedItems.length < lowStockItems.length

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">재고 부족 알림</h1>
          <p className="text-gray-600 mt-1">재고가 부족한 상품을 확인하고 관리합니다</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadLowStockItems}
            className="wp-button-secondary"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </button>
          <button className="wp-button-secondary">
            <Download className="w-4 h-4 mr-2" />
            리포트
          </button>
          <button className="wp-button-secondary">
            <Settings className="w-4 h-4 mr-2" />
            설정
          </button>
        </div>
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="wp-card border-l-4 border-l-red-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">긴급</p>
                <p className="text-2xl font-bold text-red-600">
                  {lowStockItems.filter(item => getUrgencyLevel(item) === 'critical').length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>

        <div className="wp-card border-l-4 border-l-orange-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">높음</p>
                <p className="text-2xl font-bold text-orange-600">
                  {lowStockItems.filter(item => getUrgencyLevel(item) === 'high').length}
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>

        <div className="wp-card border-l-4 border-l-yellow-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">보통</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {lowStockItems.filter(item => getUrgencyLevel(item) === 'medium').length}
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
        </div>

        <div className="wp-card border-l-4 border-l-blue-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">전체</p>
                <p className="text-2xl font-bold text-blue-600">{lowStockItems.length}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="wp-card-title flex items-center gap-2">
            <Bell className="w-5 h-5" />
            알림 설정
          </h3>
        </div>
        <div className="wp-card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-700">이메일 알림</label>
              <input 
                type="checkbox" 
                checked={notificationSettings.emailNotifications}
                onChange={(e) => setNotificationSettings(prev => ({ ...prev, emailNotifications: e.target.checked }))}
                className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue" 
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-700">일일 알림</label>
              <input 
                type="checkbox" 
                checked={notificationSettings.notifyDaily}
                onChange={(e) => setNotificationSettings(prev => ({ ...prev, notifyDaily: e.target.checked }))}
                className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue" 
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-700">자동 재주문</label>
              <input 
                type="checkbox" 
                checked={notificationSettings.autoReorder}
                onChange={(e) => setNotificationSettings(prev => ({ ...prev, autoReorder: e.target.checked }))}
                className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue" 
              />
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">기본 임계값:</label>
              <input 
                type="number" 
                min="1"
                value={notificationSettings.threshold}
                onChange={(e) => setNotificationSettings(prev => ({ ...prev, threshold: parseInt(e.target.value) || 5 }))}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bulk actions */}
      {selectedItems.length > 0 && (
        <div className="wp-card border-l-4 border-l-blue-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700">
                  {selectedItems.length}개 상품 선택됨
                </span>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBulkRestock}
                    className="wp-button-primary"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    일괄 재고 보충
                  </button>
                  <button className="wp-button-secondary">
                    <Mail className="w-4 h-4 mr-2" />
                    공급업체에 알림
                  </button>
                </div>
              </div>

              <button
                onClick={() => setSelectedItems([])}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                선택 해제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Low Stock Items */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="wp-card-title">
            재고 부족 상품 ({lowStockItems.length}개)
          </h3>
        </div>
        <div className="wp-card-body p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="loading-spinner" />
              <span className="ml-2 text-gray-600">로딩 중...</span>
            </div>
          ) : lowStockItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">재고 부족 상품이 없습니다</p>
              <p className="text-sm">모든 상품의 재고가 충분합니다!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="wp-table">
                <thead>
                  <tr>
                    <th className="w-12">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={input => {
                          if (input) input.indeterminate = someSelected
                        }}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                      />
                    </th>
                    <th>상품</th>
                    <th>긴급도</th>
                    <th>현재 재고</th>
                    <th>임계값</th>
                    <th>부족량</th>
                    <th>최근 판매</th>
                    <th>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems
                    .sort((a, b) => {
                      const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 }
                      return urgencyOrder[getUrgencyLevel(b) as keyof typeof urgencyOrder] - 
                             urgencyOrder[getUrgencyLevel(a) as keyof typeof urgencyOrder]
                    })
                    .map((item) => {
                      const urgency = getUrgencyLevel(item)
                      const shortage = item.lowStockThreshold ? Math.max(0, item.lowStockThreshold - item.stockQuantity) : 0
                      
                      return (
                        <tr key={item.productId} className={urgency === 'critical' ? 'bg-red-50' : urgency === 'high' ? 'bg-orange-50' : ''}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedItems.includes(item.productId)}
                              onChange={() => handleSelectItem(item.productId)}
                              className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                            />
                          </td>
                          <td>
                            <div className="flex items-center gap-3">
                              <AlertTriangle className={`w-4 h-4 ${
                                urgency === 'critical' ? 'text-red-500' :
                                urgency === 'high' ? 'text-orange-500' :
                                urgency === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                              }`} />
                              <div>
                                <div className="font-medium text-gray-900">{item.productName}</div>
                                <div className="text-sm text-gray-500">SKU: {item.sku}</div>
                              </div>
                            </div>
                          </td>
                          <td>{getUrgencyBadge(urgency)}</td>
                          <td>
                            <div className="text-center">
                              <div className={`text-lg font-bold ${
                                urgency === 'critical' ? 'text-red-600' :
                                urgency === 'high' ? 'text-orange-600' :
                                'text-yellow-600'
                              }`}>
                                {item.stockQuantity}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="text-center">
                              <span className="text-sm text-gray-900">
                                {item.lowStockThreshold || '-'}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="text-center">
                              <span className="text-sm font-medium text-red-600">
                                {shortage > 0 ? `${shortage}개` : '-'}
                              </span>
                            </div>
                          </td>
                          <td>
                            {item.lastMovement?.type === 'sale' ? (
                              <div className="text-sm">
                                <div className="flex items-center gap-1">
                                  <Minus className="w-3 h-3 text-red-500" />
                                  <span>{Math.abs(item.lastMovement.quantity)}</span>
                                </div>
                                <div className="text-xs text-gray-500">
                                  {formatDate(item.lastMovement.date)}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">없음</span>
                            )}
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openRestockModal(item)}
                                className="text-blue-600 hover:text-blue-700"
                                title="재고 보충"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                              
                              <Link
                                to={`/woocommerce/products/${item.productId}/edit`}
                                className="text-green-600 hover:text-green-700"
                                title="상품 편집"
                              >
                                <Edit className="w-4 h-4" />
                              </Link>

                              <Link
                                to={`/woocommerce/inventory`}
                                className="text-purple-600 hover:text-purple-700"
                                title="재고 관리"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Restock Modal */}
      {showRestockModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                재고 보충: {selectedItem.productName}
              </h3>
              <button
                onClick={closeRestockModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <AlertTriangle className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">현재 재고:</span>
                  <span className="font-medium text-red-600">{selectedItem.stockQuantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">임계값:</span>
                  <span className="font-medium">{selectedItem.lowStockThreshold || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">긴급도:</span>
                  {getUrgencyBadge(getUrgencyLevel(selectedItem))}
                </div>
              </div>

              <div>
                <label className="wp-label">보충할 수량</label>
                <input
                  type="number"
                  min="1"
                  value={restockData.quantity}
                  onChange={(e) => setRestockData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                  className="wp-input"
                  placeholder="보충할 수량을 입력하세요"
                />
                <p className="text-xs text-gray-500 mt-1">
                  보충 후 재고: {selectedItem.stockQuantity + restockData.quantity}
                </p>
              </div>

              <div>
                <label className="wp-label">메모 (선택사항)</label>
                <textarea
                  value={restockData.note}
                  onChange={(e) => setRestockData(prev => ({ ...prev, note: e.target.value }))}
                  className="wp-textarea"
                  rows={3}
                  placeholder="재고 보충 메모를 입력하세요"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={closeRestockModal}
                  className="wp-button-secondary flex-1"
                >
                  취소
                </button>
                <button
                  onClick={handleRestock}
                  className="wp-button-primary flex-1"
                  disabled={restockData.quantity <= 0}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  재고 보충
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="wp-card">
          <div className="wp-card-header">
            <h3 className="wp-card-title">빠른 작업</h3>
          </div>
          <div className="wp-card-body space-y-3">
            <Link to="/woocommerce/inventory" className="w-full wp-button-secondary justify-between">
              <span>전체 재고 관리</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button className="w-full wp-button-secondary justify-between">
              <span>공급업체에 알림</span>
              <Mail className="w-4 h-4" />
            </button>
            <button className="w-full wp-button-secondary justify-between">
              <span>재고 리포트</span>
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-header">
            <h3 className="wp-card-title">추천 작업</h3>
          </div>
          <div className="wp-card-body space-y-3">
            <div className="p-3 bg-red-50 rounded-lg">
              <div className="font-medium text-red-900">
                {lowStockItems.filter(item => getUrgencyLevel(item) === 'critical').length}개 긴급 상품
              </div>
              <div className="text-sm text-red-700">즉시 재고 보충 필요</div>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <div className="font-medium text-orange-900">
                {lowStockItems.filter(item => getUrgencyLevel(item) === 'high').length}개 높은 우선순위
              </div>
              <div className="text-sm text-orange-700">24시간 내 재고 보충 권장</div>
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-header">
            <h3 className="wp-card-title">자동화 설정</h3>
          </div>
          <div className="wp-card-body space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">자동 재주문</span>
              <input type="checkbox" className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">이메일 알림</span>
              <input type="checkbox" checked className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">슬랙 알림</span>
              <input type="checkbox" className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LowStock