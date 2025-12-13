/**
 * AutoReorderPage
 *
 * 자동발주 추천 페이지
 * - 재고 부족 품목 자동 감지
 * - 공급사별 가격 비교
 * - 일괄 발주 기능
 *
 * @package @o4o/pharmacyops
 */

import React, { useState, useEffect, useMemo } from 'react';

// ========================================
// Types
// ========================================

interface SupplierOffer {
  supplierId: string;
  supplierName: string;
  supplierType: 'wholesaler' | 'manufacturer';
  price: number;
  stockQuantity: number;
  leadTime: number;
  hasColdChain: boolean;
  hasNarcoticsLicense: boolean;
  isPreferred: boolean;
}

interface ReorderCandidate {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  currentStock: number;
  safetyStock: number;
  suggestedQuantity: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
  daysUntilStockout: number | null;
  estimatedCost: number;
  requiresColdChain: boolean;
  isNarcotic: boolean;
  bestOffer: SupplierOffer | null;
  alternativeOffers: SupplierOffer[];
}

interface ReorderSummary {
  totalItems: number;
  criticalItems: number;
  highPriorityItems: number;
  totalAmount: number;
  supplierCount: number;
  coldChainItems: number;
  narcoticItems: number;
}

// ========================================
// Mock Data (will be replaced with API calls)
// ========================================

const mockCandidates: ReorderCandidate[] = [
  {
    id: '1',
    productId: 'prod-001',
    productName: '타이레놀 정 500mg',
    productSku: 'TYL-500-100',
    currentStock: 0,
    safetyStock: 20,
    suggestedQuantity: 50,
    urgency: 'critical',
    reason: '재고 소진 - 즉시 발주 필요',
    daysUntilStockout: 0,
    estimatedCost: 125000,
    requiresColdChain: false,
    isNarcotic: false,
    bestOffer: {
      supplierId: 'sup-001',
      supplierName: '한국도매약품',
      supplierType: 'wholesaler',
      price: 2500,
      stockQuantity: 500,
      leadTime: 2,
      hasColdChain: true,
      hasNarcoticsLicense: true,
      isPreferred: true,
    },
    alternativeOffers: [
      {
        supplierId: 'sup-002',
        supplierName: '서울의약품',
        supplierType: 'wholesaler',
        price: 2600,
        stockQuantity: 300,
        leadTime: 1,
        hasColdChain: true,
        hasNarcoticsLicense: false,
        isPreferred: false,
      },
    ],
  },
  {
    id: '2',
    productId: 'prod-002',
    productName: '리피토정 20mg',
    productSku: 'LIP-20-30',
    currentStock: 5,
    safetyStock: 15,
    suggestedQuantity: 25,
    urgency: 'high',
    reason: '3일 내 재고 소진 예상',
    daysUntilStockout: 2,
    estimatedCost: 187500,
    requiresColdChain: false,
    isNarcotic: false,
    bestOffer: {
      supplierId: 'sup-001',
      supplierName: '한국도매약품',
      supplierType: 'wholesaler',
      price: 7500,
      stockQuantity: 200,
      leadTime: 2,
      hasColdChain: true,
      hasNarcoticsLicense: true,
      isPreferred: true,
    },
    alternativeOffers: [],
  },
  {
    id: '3',
    productId: 'prod-003',
    productName: '인슐린 글라진 주',
    productSku: 'INS-GL-3ML',
    currentStock: 3,
    safetyStock: 10,
    suggestedQuantity: 15,
    urgency: 'high',
    reason: '3일 내 재고 소진 예상',
    daysUntilStockout: 3,
    estimatedCost: 450000,
    requiresColdChain: true,
    isNarcotic: false,
    bestOffer: {
      supplierId: 'sup-003',
      supplierName: '바이오팜',
      supplierType: 'manufacturer',
      price: 30000,
      stockQuantity: 100,
      leadTime: 3,
      hasColdChain: true,
      hasNarcoticsLicense: false,
      isPreferred: false,
    },
    alternativeOffers: [],
  },
];

// ========================================
// Components
// ========================================

const UrgencyBadge: React.FC<{ urgency: ReorderCandidate['urgency'] }> = ({ urgency }) => {
  const styles = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    low: 'bg-green-100 text-green-700 border-green-200',
  };

  const labels = {
    critical: '긴급',
    high: '높음',
    medium: '보통',
    low: '낮음',
  };

  return (
    <span className={`text-xs px-2 py-1 rounded border ${styles[urgency]}`}>
      {labels[urgency]}
    </span>
  );
};

const ProductBadges: React.FC<{
  requiresColdChain: boolean;
  isNarcotic: boolean;
}> = ({ requiresColdChain, isNarcotic }) => (
  <div className="flex gap-1">
    {requiresColdChain && (
      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
        ❄️ 냉장
      </span>
    )}
    {isNarcotic && (
      <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">
        ⚠️ 마약류
      </span>
    )}
  </div>
);

const SummaryCard: React.FC<{
  title: string;
  value: string | number;
  icon: string;
  color: 'blue' | 'red' | 'orange' | 'green' | 'purple';
}> = ({ title, value, icon, color }) => {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  };

  return (
    <div className={`rounded-lg border p-4 ${colors[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <span className="text-3xl opacity-50">{icon}</span>
      </div>
    </div>
  );
};

const SupplierCompareTable: React.FC<{
  bestOffer: SupplierOffer | null;
  alternatives: SupplierOffer[];
  onSelect: (offer: SupplierOffer) => void;
  selectedId?: string;
}> = ({ bestOffer, alternatives, onSelect, selectedId }) => {
  if (!bestOffer) return <p className="text-gray-500 text-sm">공급 가능한 Offer가 없습니다.</p>;

  const allOffers = [bestOffer, ...alternatives];

  return (
    <div className="mt-2 border rounded overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-3 py-2">공급자</th>
            <th className="text-right px-3 py-2">단가</th>
            <th className="text-center px-3 py-2">리드타임</th>
            <th className="text-center px-3 py-2">선택</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {allOffers.map((offer, index) => (
            <tr
              key={offer.supplierId}
              className={`${selectedId === offer.supplierId ? 'bg-blue-50' : ''} ${offer.isPreferred ? 'bg-yellow-50' : ''}`}
            >
              <td className="px-3 py-2">
                <div className="flex items-center gap-1">
                  {offer.isPreferred && <span title="선호 공급자">⭐</span>}
                  {offer.supplierName}
                  {index === 0 && (
                    <span className="text-xs bg-green-100 text-green-700 px-1 rounded ml-1">
                      최적
                    </span>
                  )}
                </div>
              </td>
              <td className="px-3 py-2 text-right font-medium">
                ₩{offer.price.toLocaleString()}
              </td>
              <td className="px-3 py-2 text-center">{offer.leadTime}일</td>
              <td className="px-3 py-2 text-center">
                <button
                  onClick={() => onSelect(offer)}
                  className={`px-2 py-1 rounded text-xs ${
                    selectedId === offer.supplierId
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {selectedId === offer.supplierId ? '선택됨' : '선택'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ========================================
// Main Page Component
// ========================================

export const AutoReorderPage: React.FC = () => {
  const [candidates, setCandidates] = useState<ReorderCandidate[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectedOffers, setSelectedOffers] = useState<Map<string, string>>(new Map());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filterUrgency, setFilterUrgency] = useState<string>('all');

  // Load data
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setCandidates(mockCandidates);
      // Auto-select all items and their best offers
      const items = new Set(mockCandidates.map((c) => c.id));
      const offers = new Map<string, string>();
      mockCandidates.forEach((c) => {
        if (c.bestOffer) {
          offers.set(c.id, c.bestOffer.supplierId);
        }
      });
      setSelectedItems(items);
      setSelectedOffers(offers);
      setLoading(false);
    }, 500);
  }, []);

  // Filtered candidates
  const filteredCandidates = useMemo(() => {
    if (filterUrgency === 'all') return candidates;
    return candidates.filter((c) => c.urgency === filterUrgency);
  }, [candidates, filterUrgency]);

  // Summary calculation
  const summary: ReorderSummary = useMemo(() => {
    const selected = candidates.filter((c) => selectedItems.has(c.id));
    return {
      totalItems: selected.length,
      criticalItems: selected.filter((c) => c.urgency === 'critical').length,
      highPriorityItems: selected.filter((c) => c.urgency === 'high').length,
      totalAmount: selected.reduce((sum, c) => sum + c.estimatedCost, 0),
      supplierCount: new Set(
        selected.map((c) => selectedOffers.get(c.id)).filter(Boolean)
      ).size,
      coldChainItems: selected.filter((c) => c.requiresColdChain).length,
      narcoticItems: selected.filter((c) => c.isNarcotic).length,
    };
  }, [candidates, selectedItems, selectedOffers]);

  // Handlers
  const toggleItemSelection = (id: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllItems = () => {
    setSelectedItems(new Set(filteredCandidates.map((c) => c.id)));
  };

  const deselectAllItems = () => {
    setSelectedItems(new Set());
  };

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleOfferSelect = (candidateId: string, offer: SupplierOffer) => {
    setSelectedOffers((prev) => {
      const next = new Map(prev);
      next.set(candidateId, offer.supplierId);
      return next;
    });
  };

  const handleConfirmOrder = () => {
    const selectedCandidates = candidates.filter((c) => selectedItems.has(c.id));
    console.log('Confirming order:', selectedCandidates);
    alert(`${selectedCandidates.length}개 품목, 총 ₩${summary.totalAmount.toLocaleString()} 발주를 진행합니다.`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">자동 발주</h1>
        <p className="text-gray-600 mt-1">
          재고 부족 품목을 자동으로 감지하고 최적의 공급자를 추천합니다.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          title="발주 대상"
          value={`${summary.totalItems}개`}
          icon="📦"
          color="blue"
        />
        <SummaryCard
          title="긴급 품목"
          value={`${summary.criticalItems}개`}
          icon="🚨"
          color="red"
        />
        <SummaryCard
          title="예상 금액"
          value={`₩${summary.totalAmount.toLocaleString()}`}
          icon="💰"
          color="green"
        />
        <SummaryCard
          title="공급자"
          value={`${summary.supplierCount}개사`}
          icon="🏭"
          color="purple"
        />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">긴급도:</label>
          <select
            value={filterUrgency}
            onChange={(e) => setFilterUrgency(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="all">전체</option>
            <option value="critical">긴급</option>
            <option value="high">높음</option>
            <option value="medium">보통</option>
            <option value="low">낮음</option>
          </select>
          <button
            onClick={selectAllItems}
            className="text-sm text-blue-600 hover:underline"
          >
            전체 선택
          </button>
          <button
            onClick={deselectAllItems}
            className="text-sm text-gray-600 hover:underline"
          >
            선택 해제
          </button>
        </div>

        <button
          onClick={handleConfirmOrder}
          disabled={selectedItems.size === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          선택 품목 발주 ({selectedItems.size}개)
        </button>
      </div>

      {/* Candidate List */}
      <div className="space-y-3">
        {filteredCandidates.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <span className="text-4xl mb-4 block">✅</span>
            <p className="text-gray-500">발주가 필요한 품목이 없습니다.</p>
          </div>
        ) : (
          filteredCandidates.map((candidate) => (
            <div
              key={candidate.id}
              className={`border rounded-lg p-4 ${
                selectedItems.has(candidate.id)
                  ? 'border-blue-300 bg-blue-50/30'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedItems.has(candidate.id)}
                  onChange={() => toggleItemSelection(candidate.id)}
                  className="mt-1 h-4 w-4 rounded border-gray-300"
                />

                {/* Main Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">
                          {candidate.productName}
                        </h3>
                        <UrgencyBadge urgency={candidate.urgency} />
                        <ProductBadges
                          requiresColdChain={candidate.requiresColdChain}
                          isNarcotic={candidate.isNarcotic}
                        />
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {candidate.productSku}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-lg">
                        ₩{candidate.estimatedCost.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        {candidate.suggestedQuantity}개 × ₩
                        {candidate.bestOffer?.price.toLocaleString() || 0}
                      </p>
                    </div>
                  </div>

                  {/* Stock Info */}
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="text-gray-600">
                      현재 재고: <strong>{candidate.currentStock}개</strong>
                    </span>
                    <span className="text-gray-600">
                      안전 재고: <strong>{candidate.safetyStock}개</strong>
                    </span>
                    <span className="text-gray-600">
                      권장 발주: <strong className="text-blue-600">{candidate.suggestedQuantity}개</strong>
                    </span>
                    {candidate.daysUntilStockout !== null && (
                      <span className={`${candidate.daysUntilStockout <= 3 ? 'text-red-600' : 'text-gray-600'}`}>
                        소진 예상: <strong>{candidate.daysUntilStockout}일</strong>
                      </span>
                    )}
                  </div>

                  {/* Reason */}
                  <p className="text-sm text-orange-600 mt-1">
                    💡 {candidate.reason}
                  </p>

                  {/* Expand/Collapse for Supplier Options */}
                  <button
                    onClick={() => toggleExpanded(candidate.id)}
                    className="text-sm text-blue-600 hover:underline mt-2"
                  >
                    {expandedItems.has(candidate.id) ? '▲ 공급자 옵션 닫기' : '▼ 공급자 비교 보기'}
                  </button>

                  {/* Supplier Compare Table */}
                  {expandedItems.has(candidate.id) && (
                    <SupplierCompareTable
                      bestOffer={candidate.bestOffer}
                      alternatives={candidate.alternativeOffers}
                      selectedId={selectedOffers.get(candidate.id)}
                      onSelect={(offer) => handleOfferSelect(candidate.id, offer)}
                    />
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Action Bar */}
      {selectedItems.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-gray-600">
                {selectedItems.size}개 품목 선택됨
              </span>
              {summary.coldChainItems > 0 && (
                <span className="text-blue-600 text-sm">
                  ❄️ 냉장 {summary.coldChainItems}개
                </span>
              )}
              {summary.narcoticItems > 0 && (
                <span className="text-red-600 text-sm">
                  ⚠️ 마약류 {summary.narcoticItems}개
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-lg font-bold">
                총 ₩{summary.totalAmount.toLocaleString()}
              </span>
              <button
                onClick={handleConfirmOrder}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                발주 진행
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoReorderPage;
