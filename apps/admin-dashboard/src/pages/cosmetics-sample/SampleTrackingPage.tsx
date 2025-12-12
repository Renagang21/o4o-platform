/**
 * Sample Tracking Page
 *
 * 샘플 입고/사용량 추적
 * - 재고 현황
 * - 입고/사용 기록
 * - 매장별 비교
 *
 * Phase 6-H: Cosmetics Sample & Display Extension
 */

import React, { useState, useEffect, useCallback } from 'react';
import { authClient } from '@o4o/auth-client';
import {
  Package,
  Plus,
  Minus,
  RefreshCw,
  Search,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Filter,
  ArrowDownCircle,
  ArrowUpCircle,
} from 'lucide-react';

type InventoryStatus = 'in_stock' | 'low_stock' | 'out_of_stock';
type TabType = 'inventory' | 'receive' | 'usage';

interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  sampleType: string;
  quantityReceived: number;
  quantityUsed: number;
  quantityRemaining: number;
  minimumStock: number;
  status: InventoryStatus;
  lastRefilledAt?: string;
  lastUsedAt?: string;
}

const SampleTrackingPage: React.FC = () => {
  const api = authClient.api;
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('inventory');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<InventoryStatus | 'all'>('all');
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showUseModal, setShowUseModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      // Demo data
      setInventory([
        {
          id: '1',
          productId: 'prod-1',
          productName: '하이드로 부스팅 세럼 30ml',
          sampleType: 'trial',
          quantityReceived: 100,
          quantityUsed: 75,
          quantityRemaining: 25,
          minimumStock: 20,
          status: 'in_stock',
          lastRefilledAt: '2024-12-01T00:00:00Z',
          lastUsedAt: '2024-12-12T14:30:00Z',
        },
        {
          id: '2',
          productId: 'prod-2',
          productName: '비타민C 앰플 15ml',
          sampleType: 'tester',
          quantityReceived: 50,
          quantityUsed: 45,
          quantityRemaining: 5,
          minimumStock: 10,
          status: 'low_stock',
          lastRefilledAt: '2024-11-20T00:00:00Z',
          lastUsedAt: '2024-12-12T10:00:00Z',
        },
        {
          id: '3',
          productId: 'prod-3',
          productName: '수분크림 10ml',
          sampleType: 'trial',
          quantityReceived: 80,
          quantityUsed: 80,
          quantityRemaining: 0,
          minimumStock: 15,
          status: 'out_of_stock',
          lastRefilledAt: '2024-11-15T00:00:00Z',
          lastUsedAt: '2024-12-11T16:00:00Z',
        },
        {
          id: '4',
          productId: 'prod-4',
          productName: '선스크린 SPF50+ 5ml',
          sampleType: 'trial',
          quantityReceived: 120,
          quantityUsed: 68,
          quantityRemaining: 52,
          minimumStock: 20,
          status: 'in_stock',
          lastRefilledAt: '2024-12-05T00:00:00Z',
          lastUsedAt: '2024-12-12T11:30:00Z',
        },
      ]);
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const getStatusBadge = (status: InventoryStatus) => {
    switch (status) {
      case 'in_stock':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" /> 정상
          </span>
        );
      case 'low_stock':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <AlertTriangle className="w-3 h-3" /> 부족
          </span>
        );
      case 'out_of_stock':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            품절
          </span>
        );
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredInventory = inventory.filter((item) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (searchTerm && !item.productName.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  const stats = {
    total: inventory.length,
    inStock: inventory.filter((i) => i.status === 'in_stock').length,
    lowStock: inventory.filter((i) => i.status === 'low_stock').length,
    outOfStock: inventory.filter((i) => i.status === 'out_of_stock').length,
    totalRemaining: inventory.reduce((sum, i) => sum + i.quantityRemaining, 0),
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sample Tracking</h1>
          <p className="text-gray-500 text-sm mt-1">샘플 입고/사용량 추적</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchInventory}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            title="새로고침"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowReceiveModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <ArrowDownCircle className="w-4 h-4" />
            입고
          </button>
          <button
            onClick={() => setShowUseModal(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <ArrowUpCircle className="w-4 h-4" />
            사용
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-gray-500">전체 제품</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.inStock}</p>
              <p className="text-sm text-gray-500">정상</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold text-yellow-600">{stats.lowStock}</p>
              <p className="text-sm text-gray-500">부족</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <TrendingDown className="w-8 h-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.outOfStock}</p>
              <p className="text-sm text-gray-500">품절</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="제품명으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as InventoryStatus | 'all')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">전체 상태</option>
          <option value="in_stock">정상</option>
          <option value="low_stock">부족</option>
          <option value="out_of_stock">품절</option>
        </select>
      </div>

      {/* Inventory List */}
      <div className="space-y-3">
        {filteredInventory.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>해당하는 재고가 없습니다</p>
          </div>
        ) : (
          filteredInventory.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900">{item.productName}</h3>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                      {item.sampleType}
                    </span>
                    {getStatusBadge(item.status)}
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">재고 현황</span>
                      <span className="font-medium">
                        {item.quantityRemaining} / {item.quantityReceived}
                        <span className="text-gray-400 ml-1">
                          (최소: {item.minimumStock})
                        </span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full ${
                          item.status === 'out_of_stock'
                            ? 'bg-red-500'
                            : item.status === 'low_stock'
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{
                          width: `${(item.quantityRemaining / item.quantityReceived) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="mt-3 flex gap-6 text-sm text-gray-500">
                    <span>사용량: {item.quantityUsed}개</span>
                    <span>마지막 입고: {formatDate(item.lastRefilledAt)}</span>
                    <span>마지막 사용: {formatDate(item.lastUsedAt)}</span>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => {
                      setSelectedItem(item);
                      setShowReceiveModal(true);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="입고"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedItem(item);
                      setShowUseModal(true);
                    }}
                    className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
                    title="사용"
                    disabled={item.quantityRemaining === 0}
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Receive Modal Placeholder */}
      {showReceiveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">샘플 입고</h2>
            <p className="text-gray-500 text-sm mb-4">
              {selectedItem ? selectedItem.productName : '제품 선택 후 입고 수량을 입력하세요'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowReceiveModal(false);
                  setSelectedItem(null);
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                취소
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                입고 확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Use Modal Placeholder */}
      {showUseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">샘플 사용</h2>
            <p className="text-gray-500 text-sm mb-4">
              {selectedItem ? selectedItem.productName : '제품 선택 후 사용 수량을 입력하세요'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowUseModal(false);
                  setSelectedItem(null);
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                취소
              </button>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                사용 확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SampleTrackingPage;
