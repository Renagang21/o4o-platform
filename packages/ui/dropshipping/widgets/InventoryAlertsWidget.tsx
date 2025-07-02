import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Package, 
  TrendingDown, 
  Clock, 
  Plus,
  Eye,
  RefreshCw,
  Filter
} from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge';

interface InventoryItem {
  id: string;
  name: string;
  currentStock: number;
  minThreshold: number;
  maxStock: number;
  salesVelocity: number; // units per day
  category: string;
  supplier: string;
  lastRestocked: Date;
  daysUntilStockout?: number;
  priority: 'critical' | 'warning' | 'normal';
  trend: 'increasing' | 'decreasing' | 'stable';
}

interface InventoryAlertsWidgetProps {
  className?: string;
  maxItems?: number;
  autoRefresh?: boolean;
}

// Generate mock inventory data with realistic patterns
const generateInventoryData = (): InventoryItem[] => {
  const products = [
    { name: '무선 블루투스 이어폰', category: '전자기기', velocity: 8.5 },
    { name: '스마트워치 밴드', category: '액세서리', velocity: 3.2 },
    { name: 'USB-C 케이블', category: '전자기기', velocity: 12.1 },
    { name: '무선 충전 패드', category: '전자기기', velocity: 5.7 },
    { name: '스마트폰 케이스', category: '액세서리', velocity: 15.3 },
    { name: '블루투스 스피커', category: '전자기기', velocity: 4.8 },
    { name: '노트북 거치대', category: '사무용품', velocity: 2.1 },
    { name: '무선 마우스', category: '컴퓨터', velocity: 6.4 },
    { name: '키보드 커버', category: '액세서리', velocity: 3.9 },
    { name: '태블릿 펜', category: '액세서리', velocity: 7.2 }
  ];

  const suppliers = ['TechCorp', 'ElectroSupply', 'GadgetPro', 'DeviceHub', 'TechMaster'];

  return products.map((product, index) => {
    const minThreshold = Math.floor(Math.random() * 20) + 10;
    const maxStock = minThreshold * 5;
    const currentStock = Math.floor(Math.random() * (maxStock + minThreshold));
    const daysUntilStockout = product.velocity > 0 ? Math.floor(currentStock / product.velocity) : null;
    
    let priority: 'critical' | 'warning' | 'normal' = 'normal';
    if (currentStock <= minThreshold) {
      priority = 'critical';
    } else if (currentStock <= minThreshold * 2) {
      priority = 'warning';
    }

    const trend = Math.random() > 0.7 ? 'increasing' : Math.random() > 0.4 ? 'decreasing' : 'stable';

    return {
      id: `INV-${String(index + 1).padStart(3, '0')}`,
      name: product.name,
      currentStock,
      minThreshold,
      maxStock,
      salesVelocity: product.velocity,
      category: product.category,
      supplier: suppliers[Math.floor(Math.random() * suppliers.length)],
      lastRestocked: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Within last 30 days
      daysUntilStockout: daysUntilStockout || undefined,
      priority,
      trend
    };
  }).sort((a, b) => {
    // Sort by priority: critical > warning > normal
    const priorityOrder = { critical: 0, warning: 1, normal: 2 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    // Then by days until stockout (ascending)
    if (a.daysUntilStockout && b.daysUntilStockout) {
      return a.daysUntilStockout - b.daysUntilStockout;
    }
    return 0;
  });
};

export const InventoryAlertsWidget: React.FC<InventoryAlertsWidgetProps> = ({
  className = '',
  maxItems = 8,
  autoRefresh = true
}) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning'>('all');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Initialize and refresh data
  const refreshData = () => {
    setItems(generateInventoryData());
    setLastUpdated(new Date());
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Auto refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Filter items based on selected filter
  const filteredItems = items
    .filter(item => {
      if (filter === 'all') return true;
      return item.priority === filter;
    })
    .slice(0, maxItems);

  const stats = {
    critical: items.filter(item => item.priority === 'critical').length,
    warning: items.filter(item => item.priority === 'warning').length,
    normal: items.filter(item => item.priority === 'normal').length,
    totalValue: items.reduce((sum, item) => sum + (item.currentStock * 25000), 0) // Assume avg price of 25k
  };

  const getStockPercentage = (item: InventoryItem) => {
    return (item.currentStock / item.maxStock) * 100;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-red-200 bg-red-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      default: return 'border-gray-200 bg-white';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'warning': return <Clock className="w-4 h-4 text-yellow-500" />;
      default: return <Package className="w-4 h-4 text-green-500" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingDown className="w-3 h-3 text-green-500 rotate-180" />;
      case 'decreasing': return <TrendingDown className="w-3 h-3 text-red-500" />;
      default: return <div className="w-3 h-1 bg-gray-400 rounded" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getTimeAgo = (date: Date) => {
    const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return '오늘';
    if (days === 1) return '어제';
    return `${days}일 전`;
  };

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">재고 알림</h3>
              <p className="text-sm text-gray-500">스마트 재고 관리</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={refreshData}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              title="새로고침"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-500">
              {lastUpdated.toLocaleTimeString('ko-KR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })} 업데이트
            </span>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: '긴급',
              value: stats.critical,
              color: 'text-red-600',
              bgColor: 'bg-red-50'
            },
            {
              label: '주의',
              value: stats.warning,
              color: 'text-yellow-600',
              bgColor: 'bg-yellow-50'
            },
            {
              label: '정상',
              value: stats.normal,
              color: 'text-green-600',
              bgColor: 'bg-green-50'
            },
            {
              label: '재고 가치',
              value: formatCurrency(stats.totalValue),
              color: 'text-blue-600',
              bgColor: 'bg-blue-50',
              isValue: true
            }
          ].map((stat, index) => (
            <div key={index} className={`${stat.bgColor} rounded-lg p-3`}>
              <div className="text-xs text-gray-600 font-medium mb-1">{stat.label}</div>
              <div className={`text-lg font-bold ${stat.color}`}>
                {stat.isValue ? stat.value : stat.value.toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 mt-4 p-1 bg-gray-100 rounded-lg">
          {[
            { key: 'all', label: '전체', count: items.length },
            { key: 'critical', label: '긴급', count: stats.critical },
            { key: 'warning', label: '주의', count: stats.warning }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                filter === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Items List */}
      <div className="p-4 sm:p-6">
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>표시할 재고 알림이 없습니다</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-lg border transition-all hover:shadow-md cursor-pointer ${getPriorityColor(item.priority)}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getPriorityIcon(item.priority)}
                    <div>
                      <div className="font-semibold text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-600">{item.category} • {item.supplier}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <StatusBadge 
                      status={item.priority === 'critical' ? '긴급' : item.priority === 'warning' ? '주의' : '정상'} 
                      size="sm" 
                    />
                    {getTrendIcon(item.trend)}
                  </div>
                </div>

                {/* Stock Info */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">현재 재고</span>
                    <span className="font-semibold text-gray-900">
                      {item.currentStock.toLocaleString()}개
                    </span>
                  </div>

                  {/* Stock Level Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>최소: {item.minThreshold}</span>
                      <span>최대: {item.maxStock}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          item.priority === 'critical' 
                            ? 'bg-red-500' 
                            : item.priority === 'warning' 
                            ? 'bg-yellow-500' 
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(getStockPercentage(item), 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">일일 판매:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {item.salesVelocity.toFixed(1)}개
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">마지막 입고:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {getTimeAgo(item.lastRestocked)}
                      </span>
                    </div>
                  </div>

                  {/* Stockout Prediction */}
                  {item.daysUntilStockout && item.daysUntilStockout <= 14 && (
                    <div className={`p-2 rounded-md text-sm ${
                      item.daysUntilStockout <= 3 
                        ? 'bg-red-100 text-red-800' 
                        : item.daysUntilStockout <= 7 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span className="font-medium">
                          예상 품절: {item.daysUntilStockout}일 후
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2 border-t border-gray-200">
                    <button className="flex-1 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors flex items-center justify-center gap-2">
                      <Plus className="w-4 h-4" />
                      재고 추가
                    </button>
                    <button className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Action Bar */}
        {filteredItems.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex gap-2">
              <button className="flex-1 px-4 py-2 text-sm font-medium text-orange-700 bg-orange-50 rounded-md hover:bg-orange-100 transition-colors">
                전체 재고 관리
              </button>
              <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};