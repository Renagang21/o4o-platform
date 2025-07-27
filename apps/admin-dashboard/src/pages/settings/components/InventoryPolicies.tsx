/**
 * Inventory Policies Component
 * 재고 관리 및 품질 관리 정책 컴포넌트
 */

import { useState } from 'react';
import {
  Package,
  AlertTriangle,
  Shield,
  BarChart3,
  Zap,
  Bell,
  Archive,
  RefreshCw,
  Info
} from 'lucide-react';

interface InventorySettings {
  lowStockThreshold: number;
  criticalStockThreshold: number;
  autoReorder: boolean;
}

interface InventoryPoliciesProps {
  settings: InventorySettings;
  onUpdate: (updates: Partial<InventorySettings>) => void;
}

const InventoryPolicies: FC<InventoryPoliciesProps> = ({ settings, onUpdate }) => {
  const [_selectedCategory, _setSelectedCategory] = useState<string>('all');

  // Mock inventory data for demonstration
  const inventoryStats = {
    totalProducts: 1247,
    lowStockItems: 23,
    criticalStockItems: 8,
    outOfStockItems: 3,
    autoReorderEnabled: 156,
    pendingOrders: 12,
    averageStockLevel: 67.5,
    totalValue: 450000000
  };

  const recentAlerts = [
    { id: 1, product: '오메가3 1000mg', stock: 2, threshold: 10, type: 'critical' },
    { id: 2, product: '비타민D 5000IU', stock: 7, threshold: 15, type: 'low' },
    { id: 3, product: '마그네슘 복합체', stock: 4, threshold: 10, type: 'critical' },
    { id: 4, product: '프로바이오틱스', stock: 12, threshold: 20, type: 'low' },
    { id: 5, product: '콜라겐 펩타이드', stock: 1, threshold: 5, type: 'critical' }
  ];

  const handleLowStockThresholdChange = (threshold: number) => {
    onUpdate({ lowStockThreshold: threshold });
  };

  const handleCriticalStockThresholdChange = (threshold: number) => {
    onUpdate({ criticalStockThreshold: threshold });
  };

  const handleAutoReorderToggle = () => {
    onUpdate({ autoReorder: !settings.autoReorder });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ko-KR').format(num);
  };

  const getStockStatusColor = (type: string) => {
    const colors = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      low: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      normal: 'bg-green-100 text-green-800 border-green-200'
    };
    return colors[type as keyof typeof colors] || colors.normal;
  };

  const getStockStatusText = (type: string) => {
    const texts = {
      critical: '긴급',
      low: '부족',
      normal: '정상'
    };
    return texts[type as keyof typeof texts] || texts.normal;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <Package className="w-6 h-6 mr-3 text-orange-600" />
          재고 관리 정책
        </h2>
        <p className="text-gray-600 mt-2">
          재고 부족 임계값, 자동 주문, 품질 관리 정책을 설정하고 관리합니다.
        </p>
      </div>

      {/* Current Inventory Overview */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="text-lg font-semibold flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
            현재 재고 현황
          </h3>
        </div>
        <div className="wp-card-body">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{formatNumber(inventoryStats.totalProducts)}</div>
              <div className="text-sm text-blue-800">총 상품</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{inventoryStats.lowStockItems}</div>
              <div className="text-sm text-yellow-800">재고 부족</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{inventoryStats.criticalStockItems}</div>
              <div className="text-sm text-red-800">긴급 부족</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">{inventoryStats.outOfStockItems}</div>
              <div className="text-sm text-gray-800">품절</div>
            </div>
          </div>
          
          {/* Inventory Value and Average Stock */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-lg font-semibold text-green-800">총 재고 가치</div>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(inventoryStats.totalValue)}</div>
            </div>
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="text-lg font-semibold text-purple-800">평균 재고 수준</div>
              <div className="text-2xl font-bold text-purple-600">{inventoryStats.averageStockLevel}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Threshold Settings */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="text-lg font-semibold flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-orange-600" />
            재고 임계값 설정
          </h3>
        </div>
        <div className="wp-card-body">
          <div className="space-y-6">
            {/* Low Stock Threshold */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                재고 부족 임계값 (개)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.lowStockThreshold}
                    onChange={(e: any) => handleLowStockThresholdChange(parseInt(e.target.value) || 1)}
                    className="wp-input"
                    placeholder="10"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    이 수량 이하가 되면 '재고 부족' 알림을 발송합니다.
                  </p>
                </div>
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="text-sm text-yellow-800">
                    <div className="font-medium mb-1">알림 발송 시점</div>
                    <div>재고가 {settings.lowStockThreshold}개 이하일 때</div>
                    <div className="text-xs mt-1 text-yellow-700">
                      현재 {inventoryStats.lowStockItems}개 상품이 이 상태입니다.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Critical Stock Threshold */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                긴급 부족 임계값 (개)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <input
                    type="number"
                    min="1"
                    max={settings.lowStockThreshold - 1}
                    value={settings.criticalStockThreshold}
                    onChange={(e: any) => handleCriticalStockThresholdChange(parseInt(e.target.value) || 1)}
                    className="wp-input"
                    placeholder="3"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    이 수량 이하가 되면 '긴급 부족' 알림을 발송합니다.
                  </p>
                </div>
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-sm text-red-800">
                    <div className="font-medium mb-1">긴급 알림 발송</div>
                    <div>재고가 {settings.criticalStockThreshold}개 이하일 때</div>
                    <div className="text-xs mt-1 text-red-700">
                      현재 {inventoryStats.criticalStockItems}개 상품이 이 상태입니다.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Threshold Visualization */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-700 mb-3">임계값 시각화</div>
              <div className="relative">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>0개</span>
                  <span className="text-red-600">{settings.criticalStockThreshold}개 (긴급)</span>
                  <span className="text-yellow-600">{settings.lowStockThreshold}개 (부족)</span>
                  <span>충분</span>
                </div>
                <div className="w-full bg-green-200 rounded-full h-4">
                  <div
                    className="bg-red-500 h-4 rounded-full"
                    style={{ width: `${(settings.criticalStockThreshold / 50) * 100}%` }}
                  />
                  <div
                    className="bg-yellow-500 h-4 -mt-4"
                    style={{ 
                      width: `${((settings.lowStockThreshold - settings.criticalStockThreshold) / 50) * 100}%`,
                      marginLeft: `${(settings.criticalStockThreshold / 50) * 100}%`
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span className="text-red-600">긴급</span>
                  <span className="text-yellow-600">부족</span>
                  <span className="text-green-600">정상</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Auto Reorder Settings */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="text-lg font-semibold flex items-center">
            <RefreshCw className="w-5 h-5 mr-2 text-green-600" />
            자동 주문 설정
          </h3>
        </div>
        <div className="wp-card-body">
          <div className="space-y-6">
            {/* Auto Reorder Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="font-medium text-gray-900 mb-1">자동 재주문</div>
                <div className="text-sm text-gray-600">
                  재고가 임계값 이하로 떨어지면 자동으로 재주문을 실행합니다.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoReorder}
                  onChange={handleAutoReorderToggle}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Auto Reorder Settings */}
            {settings.autoReorder && (
              <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-blue-800 mb-4">
                  <div className="font-medium mb-2">자동 주문 설정</div>
                  <p>자동 주문이 활성화되어 있습니다. 아래 설정을 확인하세요.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-1">
                      기본 주문 수량 배수
                    </label>
                    <select className="wp-input">
                      <option value="2">임계값의 2배</option>
                      <option value="3">임계값의 3배</option>
                      <option value="5">임계값의 5배</option>
                      <option value="10">임계값의 10배</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-1">
                      주문 승인 방식
                    </label>
                    <select className="wp-input">
                      <option value="auto">자동 승인</option>
                      <option value="manual">수동 승인</option>
                      <option value="conditional">조건부 승인</option>
                    </select>
                  </div>
                </div>

                <div className="text-xs text-blue-700">
                  현재 {inventoryStats.autoReorderEnabled}개 상품에 자동 주문이 설정되어 있습니다.
                </div>
              </div>
            )}

            {/* Current Auto Reorder Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-xl font-bold text-green-600">{inventoryStats.autoReorderEnabled}</div>
                <div className="text-sm text-green-800">자동 주문 설정</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-xl font-bold text-orange-600">{inventoryStats.pendingOrders}</div>
                <div className="text-sm text-orange-800">대기 중인 주문</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-xl font-bold text-blue-600">89%</div>
                <div className="text-sm text-blue-800">자동화 비율</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quality Management */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="text-lg font-semibold flex items-center">
            <Shield className="w-5 h-5 mr-2 text-purple-600" />
            품질 관리 정책
          </h3>
        </div>
        <div className="wp-card-body">
          <div className="space-y-6">
            {/* Quality Check Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">입고 시 품질 검사</div>
                    <div className="text-sm text-gray-600">신규 입고 시 자동 품질 검사 실행</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">유통기한 알림</div>
                    <div className="text-sm text-gray-600">유통기한 30일 전 자동 알림</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">온도 모니터링</div>
                    <div className="text-sm text-gray-600">냉장/냉동 제품 온도 실시간 감시</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-start">
                  <Shield className="w-5 h-5 text-purple-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="text-sm text-purple-800">
                    <div className="font-medium mb-1">품질 관리 체크리스트</div>
                    <ul className="list-disc list-inside space-y-1">
                      <li>제품 포장 상태 검사</li>
                      <li>유통기한 확인 및 분류</li>
                      <li>보관 온습도 조건 확인</li>
                      <li>배치 번호 및 추적성 확보</li>
                      <li>결함품 분리 및 처리</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Expiration Management */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">유통기한 관리</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    알림 시작 시점 (일)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    defaultValue="30"
                    className="wp-input"
                    placeholder="30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    긴급 알림 시점 (일)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    defaultValue="7"
                    className="wp-input"
                    placeholder="7"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    자동 할인 시점 (일)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="14"
                    defaultValue="3"
                    className="wp-input"
                    placeholder="3"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Stock Alerts */}
      <div className="wp-card">
        <div className="wp-card-header">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center">
              <Bell className="w-5 h-5 mr-2 text-red-600" />
              최근 재고 알림
            </h3>
            <button className="wp-button-secondary">
              <Archive className="w-4 h-4 mr-2" />
              전체 알림 보기
            </button>
          </div>
        </div>
        <div className="wp-card-body">
          <div className="space-y-3">
            {recentAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${getStockStatusColor(alert.type)}`}
              >
                <div className="flex items-center">
                  <div className="mr-3">
                    {alert.type === 'critical' ? (
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    ) : (
                      <Package className="w-5 h-5 text-yellow-600" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{alert.product}</div>
                    <div className="text-sm">
                      현재 재고: {alert.stock}개 (임계값: {alert.threshold}개)
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStockStatusColor(alert.type)}`}>
                    {getStockStatusText(alert.type)}
                  </span>
                  <button className="wp-button-primary text-xs">
                    주문하기
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="text-lg font-semibold flex items-center">
            <Zap className="w-5 h-5 mr-2 text-yellow-600" />
            알림 설정
          </h3>
        </div>
        <div className="wp-card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">즉시 알림</div>
                  <div className="text-sm text-gray-600">재고 임계값 도달 시 즉시 발송</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">일일 요약</div>
                  <div className="text-sm text-gray-600">매일 오전 9시에 재고 요약 발송</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">주간 보고서</div>
                  <div className="text-sm text-gray-600">매주 월요일에 재고 분석 보고서</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start">
                <Info className="w-5 h-5 text-orange-600 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-sm text-orange-800">
                  <div className="font-medium mb-1">알림 수신 대상</div>
                  <ul className="list-disc list-inside space-y-1">
                    <li>창고 관리자</li>
                    <li>구매 담당자</li>
                    <li>운영 매니저</li>
                    <li>품질 관리 담당자</li>
                  </ul>
                  <div className="mt-2 text-xs text-orange-700">
                    알림 대상은 사용자 관리에서 개별 설정 가능합니다.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryPolicies;