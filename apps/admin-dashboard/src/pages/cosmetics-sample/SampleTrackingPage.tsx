/**
 * Sample Tracking Page
 *
 * 샘플 입고/사용량 추적
 * - 재고 현황
 * - 입고/사용 기록
 * - 매장별 비교
 *
 * Phase 7-G: Cosmetics Sample & Display UI Redesign (AG Design System)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { authClient } from '@o4o/auth-client';
import {
  AGPageHeader,
  AGSection,
  AGKPIBlock,
  AGKPIGrid,
  AGCard,
  AGButton,
  AGTable,
  AGTablePagination,
  AGTag,
  AGModal,
  AGInput,
  AGSelect,
} from '@o4o/ui';
import type { AGTableColumn } from '@o4o/ui';
import {
  Package,
  Plus,
  Minus,
  RefreshCw,
  Search,
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  ArrowDownCircle,
  ArrowUpCircle,
} from 'lucide-react';

type InventoryStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<InventoryStatus | 'all'>('all');
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showUseModal, setShowUseModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [receiveQuantity, setReceiveQuantity] = useState<number>(0);
  const [useQuantity, setUseQuantity] = useState<number>(0);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
        {
          id: '5',
          productId: 'prod-5',
          productName: '클렌징 오일 20ml',
          sampleType: 'tester',
          quantityReceived: 60,
          quantityUsed: 55,
          quantityRemaining: 5,
          minimumStock: 10,
          status: 'low_stock',
          lastRefilledAt: '2024-11-25T00:00:00Z',
          lastUsedAt: '2024-12-12T09:00:00Z',
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

  const getStatusTag = (status: InventoryStatus) => {
    switch (status) {
      case 'in_stock':
        return <AGTag color="green" size="sm"><CheckCircle className="w-3 h-3 mr-1" /> 정상</AGTag>;
      case 'low_stock':
        return <AGTag color="yellow" size="sm"><AlertTriangle className="w-3 h-3 mr-1" /> 부족</AGTag>;
      case 'out_of_stock':
        return <AGTag color="red" size="sm">품절</AGTag>;
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

  // Pagination
  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
  const paginatedInventory = filteredInventory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const stats = {
    total: inventory.length,
    inStock: inventory.filter((i) => i.status === 'in_stock').length,
    lowStock: inventory.filter((i) => i.status === 'low_stock').length,
    outOfStock: inventory.filter((i) => i.status === 'out_of_stock').length,
    totalRemaining: inventory.reduce((sum, i) => sum + i.quantityRemaining, 0),
  };

  // Table columns
  const columns: AGTableColumn<InventoryItem>[] = [
    {
      key: 'productName',
      header: '제품명',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-xs text-gray-500">{row.sampleType}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: '상태',
      align: 'center',
      render: (_, row) => getStatusTag(row.status),
    },
    {
      key: 'quantityRemaining',
      header: '재고',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium">{value} / {row.quantityReceived}</div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
            <div
              className={`h-1.5 rounded-full ${
                row.status === 'out_of_stock'
                  ? 'bg-red-500'
                  : row.status === 'low_stock'
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${(value / row.quantityReceived) * 100}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'quantityUsed',
      header: '사용량',
      align: 'center',
      sortable: true,
      render: (value) => <span className="text-gray-600">{value}개</span>,
    },
    {
      key: 'lastUsedAt',
      header: '마지막 사용',
      render: (value) => <span className="text-sm text-gray-500">{formatDate(value)}</span>,
    },
    {
      key: 'actions',
      header: '작업',
      align: 'center',
      render: (_, row) => (
        <div className="flex justify-center gap-1">
          <AGButton
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedItem(row);
              setReceiveQuantity(10);
              setShowReceiveModal(true);
            }}
            iconLeft={<Plus className="w-4 h-4" />}
          >
            입고
          </AGButton>
          <AGButton
            variant="ghost"
            size="sm"
            disabled={row.quantityRemaining === 0}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedItem(row);
              setUseQuantity(1);
              setShowUseModal(true);
            }}
            iconLeft={<Minus className="w-4 h-4" />}
          >
            사용
          </AGButton>
        </div>
      ),
    },
  ];

  const handleReceive = () => {
    if (!selectedItem || receiveQuantity <= 0) return;
    // TODO: API call to receive inventory
    setShowReceiveModal(false);
    setSelectedItem(null);
    setReceiveQuantity(0);
    fetchInventory();
  };

  const handleUse = () => {
    if (!selectedItem || useQuantity <= 0) return;
    // TODO: API call to use inventory
    setShowUseModal(false);
    setSelectedItem(null);
    setUseQuantity(0);
    fetchInventory();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <AGPageHeader
        title="Sample Tracking"
        description="샘플 입고/사용량 추적"
        icon={<Package className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <AGButton
              variant="ghost"
              size="sm"
              onClick={fetchInventory}
              iconLeft={<RefreshCw className="w-4 h-4" />}
            >
              새로고침
            </AGButton>
            <AGButton
              variant="primary"
              size="sm"
              onClick={() => {
                setSelectedItem(null);
                setReceiveQuantity(10);
                setShowReceiveModal(true);
              }}
              iconLeft={<ArrowDownCircle className="w-4 h-4" />}
            >
              입고
            </AGButton>
            <AGButton
              variant="secondary"
              size="sm"
              onClick={() => {
                setSelectedItem(null);
                setUseQuantity(1);
                setShowUseModal(true);
              }}
              iconLeft={<ArrowUpCircle className="w-4 h-4" />}
            >
              사용
            </AGButton>
          </div>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Stats */}
        <AGSection>
          <AGKPIGrid columns={4}>
            <AGKPIBlock
              title="전체 제품"
              value={stats.total}
              colorMode="info"
              icon={<Package className="w-5 h-5 text-blue-500" />}
            />
            <AGKPIBlock
              title="정상"
              value={stats.inStock}
              colorMode="positive"
              icon={<CheckCircle className="w-5 h-5 text-green-500" />}
            />
            <AGKPIBlock
              title="부족"
              value={stats.lowStock}
              colorMode="neutral"
              icon={<AlertTriangle className="w-5 h-5 text-yellow-500" />}
            />
            <AGKPIBlock
              title="품절"
              value={stats.outOfStock}
              colorMode="negative"
              icon={<TrendingDown className="w-5 h-5 text-red-500" />}
            />
          </AGKPIGrid>
        </AGSection>

        {/* Filters */}
        <AGSection>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <AGInput
                type="text"
                placeholder="제품명으로 검색..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
            <AGSelect
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as InventoryStatus | 'all');
                setCurrentPage(1);
              }}
              className="w-full sm:w-40"
            >
              <option value="all">전체 상태</option>
              <option value="in_stock">정상</option>
              <option value="low_stock">부족</option>
              <option value="out_of_stock">품절</option>
            </AGSelect>
          </div>
        </AGSection>

        {/* Inventory Table */}
        <AGSection>
          <AGCard padding="none">
            <AGTable
              columns={columns}
              data={paginatedInventory}
              loading={loading}
              emptyMessage="해당하는 재고가 없습니다"
              emptyIcon={<Package className="w-12 h-12 text-gray-300" />}
            />
            {filteredInventory.length > itemsPerPage && (
              <AGTablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredInventory.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            )}
          </AGCard>
        </AGSection>
      </div>

      {/* Receive Modal */}
      <AGModal
        open={showReceiveModal}
        onClose={() => {
          setShowReceiveModal(false);
          setSelectedItem(null);
        }}
        title="샘플 입고"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <AGButton
              variant="outline"
              onClick={() => {
                setShowReceiveModal(false);
                setSelectedItem(null);
              }}
            >
              취소
            </AGButton>
            <AGButton
              variant="primary"
              onClick={handleReceive}
              iconLeft={<ArrowDownCircle className="w-4 h-4" />}
            >
              입고 확인
            </AGButton>
          </div>
        }
      >
        <div className="space-y-4">
          {selectedItem ? (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium">{selectedItem.productName}</p>
              <p className="text-sm text-gray-500">현재 재고: {selectedItem.quantityRemaining}개</p>
            </div>
          ) : (
            <AGSelect className="w-full">
              <option value="">제품을 선택하세요</option>
              {inventory.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.productName}
                </option>
              ))}
            </AGSelect>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">입고 수량</label>
            <AGInput
              type="number"
              min={1}
              value={receiveQuantity}
              onChange={(e) => setReceiveQuantity(parseInt(e.target.value) || 0)}
            />
          </div>
        </div>
      </AGModal>

      {/* Use Modal */}
      <AGModal
        open={showUseModal}
        onClose={() => {
          setShowUseModal(false);
          setSelectedItem(null);
        }}
        title="샘플 사용"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <AGButton
              variant="outline"
              onClick={() => {
                setShowUseModal(false);
                setSelectedItem(null);
              }}
            >
              취소
            </AGButton>
            <AGButton
              variant="primary"
              onClick={handleUse}
              iconLeft={<ArrowUpCircle className="w-4 h-4" />}
            >
              사용 확인
            </AGButton>
          </div>
        }
      >
        <div className="space-y-4">
          {selectedItem ? (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium">{selectedItem.productName}</p>
              <p className="text-sm text-gray-500">현재 재고: {selectedItem.quantityRemaining}개</p>
            </div>
          ) : (
            <AGSelect className="w-full">
              <option value="">제품을 선택하세요</option>
              {inventory.filter(i => i.quantityRemaining > 0).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.productName} (재고: {item.quantityRemaining})
                </option>
              ))}
            </AGSelect>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">사용 수량</label>
            <AGInput
              type="number"
              min={1}
              max={selectedItem?.quantityRemaining || 100}
              value={useQuantity}
              onChange={(e) => setUseQuantity(parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="resultedInPurchase"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="resultedInPurchase" className="text-sm text-gray-700">
              구매로 이어짐
            </label>
          </div>
        </div>
      </AGModal>
    </div>
  );
};

export default SampleTrackingPage;
