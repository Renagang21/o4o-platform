/**
 * PharmacyProductListPage v2
 *
 * 의약품 목록 - Advanced Product Search 구현 (Task 2)
 *
 * @package @o4o/pharmacyops
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  LoadingSpinner,
  EmptyState,
  PriceDisplay,
} from '../components/index.js';
import type { PharmacyProductListItemDto } from '../../dto/index.js';

// Mock data
const mockProducts: PharmacyProductListItemDto[] = [
  {
    id: 'prod-001',
    name: '타이레놀 500mg',
    drugCode: 'DC-001234',
    permitNumber: 'PM-2020-0001234',
    insuranceCode: 'INS-A00123456',
    category: 'otc',
    therapeuticCategory: '해열진통소염제',
    manufacturer: '한국존슨앤드존슨',
    activeIngredient: '아세트아미노펜',
    dosageForm: '정제',
    unit: '정',
    packageSize: '100정/병',
    status: 'active',
    activeOfferCount: 3,
    lowestOfferPrice: 3100,
  },
  {
    id: 'prod-002',
    name: '아목시실린캡슐 500mg',
    drugCode: 'DC-002001',
    permitNumber: 'PM-2019-0002001',
    insuranceCode: 'INS-B00234567',
    category: 'etc',
    therapeuticCategory: '항생제',
    manufacturer: '종근당',
    activeIngredient: '아목시실린',
    dosageForm: '캡슐',
    unit: '캡슐',
    packageSize: '100캡슐/병',
    status: 'active',
    activeOfferCount: 2,
    lowestOfferPrice: 850,
  },
  {
    id: 'prod-003',
    name: '인슐린 노보래피드',
    drugCode: 'DC-003001',
    permitNumber: 'PM-2021-0003001',
    insuranceCode: 'INS-C00345678',
    category: 'etc',
    therapeuticCategory: '당뇨병용제',
    manufacturer: '노보노디스크',
    activeIngredient: '인슐린 아스파트',
    dosageForm: '주사제',
    unit: 'mL',
    packageSize: '3mL/펜',
    status: 'active',
    activeOfferCount: 1,
    lowestOfferPrice: 45000,
    requiresColdChain: true,
  },
  {
    id: 'prod-004',
    name: '리피토정 20mg',
    drugCode: 'DC-004001',
    permitNumber: 'PM-2018-0004001',
    insuranceCode: 'INS-D00456789',
    category: 'etc',
    therapeuticCategory: '고지혈증치료제',
    manufacturer: '한국화이자',
    activeIngredient: '아토르바스타틴',
    dosageForm: '정제',
    unit: '정',
    packageSize: '30정/병',
    status: 'active',
    activeOfferCount: 4,
    lowestOfferPrice: 15200,
  },
  {
    id: 'prod-005',
    name: '게보린정',
    drugCode: 'DC-005001',
    permitNumber: 'PM-2015-0005001',
    insuranceCode: null,
    category: 'otc',
    therapeuticCategory: '해열진통소염제',
    manufacturer: '삼진제약',
    activeIngredient: '이소프로필안티피린복합',
    dosageForm: '정제',
    unit: '정',
    packageSize: '10정/팩',
    status: 'active',
    activeOfferCount: 5,
    lowestOfferPrice: 2800,
  },
  {
    id: 'prod-006',
    name: '모르핀황산염주사',
    drugCode: 'DC-006001',
    permitNumber: 'PM-2020-0006001',
    insuranceCode: 'INS-E00567890',
    category: 'etc',
    therapeuticCategory: '마약성진통제',
    manufacturer: '명인제약',
    activeIngredient: '모르핀황산염',
    dosageForm: '주사제',
    unit: 'mL',
    packageSize: '1mL/앰플',
    status: 'active',
    activeOfferCount: 1,
    lowestOfferPrice: 3500,
    isNarcotics: true,
  },
];

// Therapeutic categories for filter
const therapeuticCategories = [
  '해열진통소염제',
  '항생제',
  '당뇨병용제',
  '고지혈증치료제',
  '마약성진통제',
  '소화기관용제',
  '순환기관용제',
  '호흡기관용제',
];

interface ProductFilters {
  searchQuery: string;
  searchType: 'name' | 'drugCode' | 'permitNumber' | 'insuranceCode' | 'ingredient';
  category: '' | 'otc' | 'etc' | 'quasi_drug';
  therapeuticCategory: string;
  manufacturer: string;
  hasOffers: boolean;
  requiresColdChain: boolean;
}

export const PharmacyProductListPage: React.FC = () => {
  const [products, setProducts] = useState<PharmacyProductListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ProductFilters>({
    searchQuery: '',
    searchType: 'name',
    category: '',
    therapeuticCategory: '',
    manufacturer: '',
    hasOffers: false,
    requiresColdChain: false,
  });

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  const loadProducts = useCallback(async () => {
    setLoading(true);
    // TODO: Replace with actual API call
    setTimeout(() => {
      let filtered = [...mockProducts];

      // Apply search filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        filtered = filtered.filter((p) => {
          switch (filters.searchType) {
            case 'name':
              return p.name.toLowerCase().includes(query);
            case 'drugCode':
              return p.drugCode?.toLowerCase().includes(query);
            case 'permitNumber':
              return p.permitNumber?.toLowerCase().includes(query);
            case 'insuranceCode':
              return p.insuranceCode?.toLowerCase().includes(query);
            case 'ingredient':
              return p.activeIngredient?.toLowerCase().includes(query);
            default:
              return p.name.toLowerCase().includes(query);
          }
        });
      }

      // Apply category filter
      if (filters.category) {
        filtered = filtered.filter((p) => p.category === filters.category);
      }

      // Apply therapeutic category filter
      if (filters.therapeuticCategory) {
        filtered = filtered.filter(
          (p) => p.therapeuticCategory === filters.therapeuticCategory
        );
      }

      // Apply manufacturer filter
      if (filters.manufacturer) {
        filtered = filtered.filter((p) =>
          p.manufacturer?.toLowerCase().includes(filters.manufacturer.toLowerCase()) ?? false
        );
      }

      // Apply has offers filter
      if (filters.hasOffers) {
        filtered = filtered.filter((p) => p.activeOfferCount > 0);
      }

      // Apply cold chain filter
      if (filters.requiresColdChain) {
        filtered = filtered.filter((p) => p.requiresColdChain);
      }

      setTotalPages(Math.ceil(filtered.length / pageSize));
      setProducts(filtered.slice((page - 1) * pageSize, page * pageSize));
      setLoading(false);
    }, 300);
  }, [filters, page]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      otc: 'bg-green-100 text-green-700',
      etc: 'bg-blue-100 text-blue-700',
      quasi_drug: 'bg-gray-100 text-gray-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="pharmacy-product-list-page p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">의약품 검색</h1>
        <p className="text-sm text-gray-500 mt-1">
          약품명, 코드, 성분명으로 검색하고 Offer를 확인하세요
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg border p-6 mb-6">
        <div className="flex gap-4 mb-4">
          <select
            value={filters.searchType}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                searchType: e.target.value as ProductFilters['searchType'],
              }))
            }
            className="px-3 py-2 border rounded-lg bg-gray-50 min-w-[140px]"
          >
            <option value="name">약품명</option>
            <option value="drugCode">약품코드</option>
            <option value="permitNumber">품목허가번호</option>
            <option value="insuranceCode">보험코드</option>
            <option value="ingredient">성분명</option>
          </select>
          <div className="flex-1 relative">
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) =>
                setFilters((f) => ({ ...f, searchQuery: e.target.value }))
              }
              placeholder={
                filters.searchType === 'name'
                  ? '약품명을 입력하세요'
                  : filters.searchType === 'drugCode'
                  ? '약품코드를 입력하세요 (예: DC-001234)'
                  : filters.searchType === 'permitNumber'
                  ? '품목허가번호를 입력하세요 (예: PM-2020-0001234)'
                  : filters.searchType === 'insuranceCode'
                  ? '보험코드를 입력하세요'
                  : '성분명을 입력하세요'
              }
              className="w-full px-4 py-2 border rounded-lg pr-10"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              🔍
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              분류
            </label>
            <select
              value={filters.category}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  category: e.target.value as ProductFilters['category'],
                }))
              }
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">전체</option>
              <option value="otc">일반의약품 (OTC)</option>
              <option value="etc">전문의약품 (ETC)</option>
              <option value="quasi_drug">의약외품</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              치료 카테고리
            </label>
            <select
              value={filters.therapeuticCategory}
              onChange={(e) =>
                setFilters((f) => ({ ...f, therapeuticCategory: e.target.value }))
              }
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">전체</option>
              {therapeuticCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              제조사
            </label>
            <input
              type="text"
              value={filters.manufacturer}
              onChange={(e) =>
                setFilters((f) => ({ ...f, manufacturer: e.target.value }))
              }
              placeholder="제조사명 검색"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.hasOffers}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, hasOffers: e.target.checked }))
                }
                className="rounded border-gray-300"
              />
              <span className="text-sm">Offer 있음만</span>
            </label>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.requiresColdChain}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, requiresColdChain: e.target.checked }))
                }
                className="rounded border-gray-300"
              />
              <span className="text-sm">❄️ 콜드체인</span>
            </label>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <LoadingSpinner />
      ) : products.length === 0 ? (
        <EmptyState
          message="검색 결과가 없습니다."
          icon="💊"
          action={{
            label: '필터 초기화',
            onClick: () =>
              setFilters({
                searchQuery: '',
                searchType: 'name',
                category: '',
                therapeuticCategory: '',
                manufacturer: '',
                hasOffers: false,
                requiresColdChain: false,
              }),
          }}
        />
      ) : (
        <>
          {/* Product Table */}
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="px-6 py-4 border-b">
              <span className="text-sm text-gray-600">
                총 <strong>{products.length}</strong>개 의약품
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                      의약품
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                      분류
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                      치료분류
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                      제조사
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                      Offer
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                      최저가
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                      액션
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{product.name}</span>
                            {product.requiresColdChain && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                ❄️
                              </span>
                            )}
                            {product.isNarcotics && (
                              <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                                ⚠️ 마약류
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            <span>코드: {product.drugCode}</span>
                            {product.insuranceCode && (
                              <>
                                <span className="mx-1">·</span>
                                <span>보험: {product.insuranceCode}</span>
                              </>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {product.activeIngredient} · {product.dosageForm} ·{' '}
                            {product.packageSize}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`text-xs px-2 py-1 rounded font-medium ${getCategoryColor(
                            product.category
                          )}`}
                        >
                          {product.category === 'otc'
                            ? 'OTC'
                            : product.category === 'etc'
                            ? 'ETC'
                            : '의약외품'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {product.therapeuticCategory}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {product.manufacturer}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {product.activeOfferCount > 0 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                            {product.activeOfferCount}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {product.lowestOfferPrice ? (
                          <PriceDisplay
                            amount={product.lowestOfferPrice}
                            size="sm"
                            color="success"
                          />
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <a
                          href={`/pharmacyops/offers?productId=${product.id}`}
                          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 inline-block"
                        >
                          Offer 보기
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t flex items-center justify-between">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  이전
                </button>
                <span className="text-sm text-gray-600">
                  {page} / {totalPages} 페이지
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  다음
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default PharmacyProductListPage;
