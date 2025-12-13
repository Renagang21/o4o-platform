/**
 * PharmacyOfferListPage v2
 *
 * 도매 Offer 목록 - Multi-Supplier 가격 비교 기능 구현 (Task 3)
 *
 * @package @o4o/pharmacyops
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  LoadingSpinner,
  EmptyState,
  StatusBadge,
  PriceDisplay,
  PriceComparisonTable,
  type SupplierOfferDisplay,
} from '../components/index.js';
import type { PharmacyOfferListItemDto } from '../../dto/index.js';

// Mock data
const mockOffers: PharmacyOfferListItemDto[] = [
  {
    id: 'offer-001',
    productId: 'prod-001',
    productName: '타이레놀 500mg',
    productDrugCode: 'DC-001234',
    supplierName: '대한도매',
    supplierType: 'wholesaler',
    supplierPrice: 3200,
    stockQuantity: 500,
    minOrderQuantity: 10,
    leadTimeDays: 1,
    hasColdChain: false,
    status: 'active',
  },
  {
    id: 'offer-002',
    productId: 'prod-001',
    productName: '타이레놀 500mg',
    productDrugCode: 'DC-001234',
    supplierName: '서울제약도매',
    supplierType: 'wholesaler',
    supplierPrice: 3350,
    stockQuantity: 300,
    minOrderQuantity: 20,
    leadTimeDays: 2,
    hasColdChain: false,
    status: 'active',
  },
  {
    id: 'offer-003',
    productId: 'prod-001',
    productName: '타이레놀 500mg',
    productDrugCode: 'DC-001234',
    supplierName: '한국존슨앤드존슨',
    supplierType: 'manufacturer',
    supplierPrice: 3100,
    stockQuantity: 1000,
    minOrderQuantity: 50,
    leadTimeDays: 3,
    hasColdChain: false,
    status: 'active',
  },
  {
    id: 'offer-004',
    productId: 'prod-002',
    productName: '아목시실린캡슐 500mg',
    productDrugCode: 'DC-002001',
    supplierName: '종근당',
    supplierType: 'manufacturer',
    supplierPrice: 850,
    stockQuantity: 2000,
    minOrderQuantity: 100,
    leadTimeDays: 2,
    hasColdChain: false,
    status: 'active',
  },
  {
    id: 'offer-005',
    productId: 'prod-003',
    productName: '인슐린 노보래피드',
    productDrugCode: 'DC-003001',
    supplierName: '노보노디스크',
    supplierType: 'manufacturer',
    supplierPrice: 45000,
    stockQuantity: 50,
    minOrderQuantity: 5,
    leadTimeDays: 1,
    hasColdChain: true,
    status: 'active',
  },
];

interface OfferFilters {
  productId?: string;
  supplierType: '' | 'wholesaler' | 'manufacturer';
  inStockOnly: boolean;
  hasColdChain: boolean;
  maxLeadTime: number;
}

export const PharmacyOfferListPage: React.FC = () => {
  const [offers, setOffers] = useState<PharmacyOfferListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<OfferFilters>({
    productId: undefined,
    supplierType: '',
    inStockOnly: false,
    hasColdChain: false,
    maxLeadTime: 7,
  });

  // Price comparison mode
  const [compareMode, setCompareMode] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  // Preferred suppliers (from user settings)
  const [preferredSuppliers] = useState<string[]>(['대한도매']);

  const loadOffers = useCallback(async () => {
    setLoading(true);
    // TODO: Replace with actual API call
    setTimeout(() => {
      let filtered = [...mockOffers];

      // Apply filters
      if (filters.productId) {
        filtered = filtered.filter((o) => o.productId === filters.productId);
      }
      if (filters.supplierType) {
        filtered = filtered.filter((o) => o.supplierType === filters.supplierType);
      }
      if (filters.inStockOnly) {
        filtered = filtered.filter((o) => o.stockQuantity > 0);
      }
      if (filters.hasColdChain) {
        filtered = filtered.filter((o) => o.hasColdChain);
      }
      if (filters.maxLeadTime < 7) {
        filtered = filtered.filter((o) => o.leadTimeDays <= filters.maxLeadTime);
      }

      // Sort by price (lowest first)
      filtered.sort((a, b) => a.supplierPrice - b.supplierPrice);

      setOffers(filtered);
      setLoading(false);
    }, 300);
  }, [filters]);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  // Parse URL params for productId filter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('productId');
    if (productId) {
      setFilters((f) => ({ ...f, productId }));
      setCompareMode(true);
      setSelectedProduct(productId);
    }
  }, []);

  const handleSelectOffer = (offer: SupplierOfferDisplay) => {
    // Navigate to order creation with pre-selected offer
    window.location.href = `/pharmacyops/orders/create?offerId=${offer.supplierId}`;
  };

  const getProductOffers = (productId: string): SupplierOfferDisplay[] => {
    return offers
      .filter((o) => o.productId === productId)
      .map((o) => ({
        supplierId: o.id,
        supplierName: o.supplierName,
        supplierType: o.supplierType,
        price: o.supplierPrice,
        stock: o.stockQuantity,
        leadTime: o.leadTimeDays,
        hasColdChain: o.hasColdChain,
        isPreferred: preferredSuppliers.includes(o.supplierName),
      }));
  };

  // Group offers by product for comparison view
  const groupedOffers = offers.reduce((acc, offer) => {
    if (!acc[offer.productId]) {
      acc[offer.productId] = {
        productId: offer.productId,
        productName: offer.productName,
        productDrugCode: offer.productDrugCode,
        offers: [],
        lowestPrice: offer.supplierPrice,
        offerCount: 0,
      };
    }
    acc[offer.productId].offers.push(offer);
    acc[offer.productId].offerCount++;
    if (offer.supplierPrice < acc[offer.productId].lowestPrice) {
      acc[offer.productId].lowestPrice = offer.supplierPrice;
    }
    return acc;
  }, {} as Record<string, any>);

  return (
    <div className="pharmacy-offer-list-page p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">도매 Offer</h1>
        <p className="text-sm text-gray-500 mt-1">
          공급자별 가격을 비교하고 최적의 Offer를 선택하세요
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              공급자 유형
            </label>
            <select
              value={filters.supplierType}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  supplierType: e.target.value as OfferFilters['supplierType'],
                }))
              }
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">전체</option>
              <option value="wholesaler">도매상</option>
              <option value="manufacturer">제조사</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              배송 소요일
            </label>
            <select
              value={filters.maxLeadTime}
              onChange={(e) =>
                setFilters((f) => ({ ...f, maxLeadTime: Number(e.target.value) }))
              }
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value={7}>전체</option>
              <option value={1}>당일/익일</option>
              <option value={2}>2일 이내</option>
              <option value={3}>3일 이내</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.inStockOnly}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, inStockOnly: e.target.checked }))
                }
                className="rounded border-gray-300"
              />
              <span className="text-sm">재고 있음만</span>
            </label>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.hasColdChain}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, hasColdChain: e.target.checked }))
                }
                className="rounded border-gray-300"
              />
              <span className="text-sm">❄️ 콜드체인</span>
            </label>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setCompareMode(!compareMode)}
              className={`px-4 py-2 rounded-lg font-medium ${
                compareMode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {compareMode ? '📊 비교 모드 ON' : '📊 비교 모드'}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <LoadingSpinner />
      ) : offers.length === 0 ? (
        <EmptyState
          message="조건에 맞는 Offer가 없습니다."
          icon="🔍"
          action={{
            label: '필터 초기화',
            onClick: () =>
              setFilters({
                productId: undefined,
                supplierType: '',
                inStockOnly: false,
                hasColdChain: false,
                maxLeadTime: 7,
              }),
          }}
        />
      ) : compareMode ? (
        /* Price Comparison View */
        <div className="space-y-6">
          {Object.values(groupedOffers).map((group: any) => (
            <div key={group.productId} className="bg-white rounded-lg border">
              <div className="px-6 py-4 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg">{group.productName}</h3>
                    <p className="text-sm text-gray-500">
                      코드: {group.productDrugCode} · {group.offerCount}개 공급자
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">최저가</p>
                    <PriceDisplay
                      amount={group.lowestPrice}
                      size="lg"
                      color="success"
                    />
                  </div>
                </div>
              </div>
              <PriceComparisonTable
                offers={getProductOffers(group.productId)}
                onSelect={handleSelectOffer}
              />
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-lg border">
          <div className="px-6 py-4 border-b">
            <span className="text-sm text-gray-600">
              총 <strong>{offers.length}</strong>개 Offer
            </span>
          </div>
          <div className="divide-y">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900">
                        {offer.productName}
                      </h3>
                      {offer.hasColdChain && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          ❄️ 콜드체인
                        </span>
                      )}
                      {preferredSuppliers.includes(offer.supplierName) && (
                        <span title="선호 공급자">⭐</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      <span>
                        {offer.supplierType === 'wholesaler' ? '🏪 도매' : '🏭 제조'}{' '}
                        {offer.supplierName}
                      </span>
                      <span className="mx-2">·</span>
                      <span>재고 {offer.stockQuantity}개</span>
                      <span className="mx-2">·</span>
                      <span>최소 {offer.minOrderQuantity}개</span>
                      <span className="mx-2">·</span>
                      <span>{offer.leadTimeDays}일 배송</span>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-4">
                    <div>
                      <PriceDisplay amount={offer.supplierPrice} color="primary" />
                      <p className="text-xs text-gray-500 mt-1">
                        코드: {offer.productDrugCode}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        (window.location.href = `/pharmacyops/orders/create?offerId=${offer.id}`)
                      }
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      주문하기
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PharmacyOfferListPage;
