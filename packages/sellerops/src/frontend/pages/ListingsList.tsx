/**
 * SellerOps Listings Page
 *
 * 리스팅 목록 및 관리
 */

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Power,
  PowerOff,
  Search,
  Filter,
} from 'lucide-react';
import type { ListingDetailDto } from '../../dto/index.js';

type ListingStatusFilter = 'all' | 'active' | 'draft' | 'paused' | 'sold_out' | 'delisted';
type ProductTypeFilter = 'all' | 'general' | 'cosmetics' | 'food' | 'health' | 'electronics';

interface ListingsListProps {
  sellerId: string;
  apiBaseUrl?: string;
  onCreateNew?: () => void;
  onEdit?: (listingId: string) => void;
}

export const ListingsList: React.FC<ListingsListProps> = ({
  sellerId,
  apiBaseUrl = '/api/v1/sellerops',
  onCreateNew,
  onEdit,
}) => {
  const [listings, setListings] = useState<ListingDetailDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ListingStatusFilter>('all');
  const [productTypeFilter, setProductTypeFilter] = useState<ProductTypeFilter>('all');

  useEffect(() => {
    fetchListings();
  }, [sellerId, statusFilter, productTypeFilter]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      let url = `${apiBaseUrl}/listings?sellerId=${sellerId}`;
      if (statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }
      if (productTypeFilter !== 'all') {
        url += `&productType=${productTypeFilter}`;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch listings');
      const data = await response.json();
      setListings(data);
    } catch (err) {
      console.error('Error fetching listings:', err);
    } finally {
      setLoading(false);
    }
  };

  const isActiveStatus = (status: string) => status === 'active';

  const handleToggleActive = async (listing: ListingDetailDto) => {
    try {
      const action = isActiveStatus(listing.status) ? 'deactivate' : 'activate';
      const response = await fetch(
        `${apiBaseUrl}/listings/${listing.id}/${action}?sellerId=${sellerId}`,
        { method: 'POST' }
      );
      if (response.ok) {
        fetchListings();
      }
    } catch (err) {
      alert('상태 변경에 실패했습니다.');
    }
  };

  const handleDelete = async (listingId: string) => {
    if (!confirm('이 리스팅을 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(
        `${apiBaseUrl}/listings/${listingId}?sellerId=${sellerId}`,
        { method: 'DELETE' }
      );
      if (response.ok) {
        fetchListings();
      }
    } catch (err) {
      alert('삭제에 실패했습니다.');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      active: { bg: 'bg-green-100', text: 'text-green-800', label: '판매중' },
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: '작성중' },
      paused: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '일시중지' },
      sold_out: { bg: 'bg-red-100', text: 'text-red-800', label: '품절' },
      delisted: { bg: 'bg-gray-100', text: 'text-gray-600', label: '판매종료' },
    };
    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const filteredListings = listings.filter((l) =>
    l.offer.productMaster.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">리스팅 관리</h1>
          <p className="text-gray-600">등록한 상품 리스팅 관리</p>
        </div>
        {onCreateNew && (
          <button
            onClick={onCreateNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            새 리스팅 등록
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="상품명 검색..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              className="px-4 py-2 border rounded-lg"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ListingStatusFilter)}
            >
              <option value="all">전체 상태</option>
              <option value="active">판매중</option>
              <option value="draft">작성중</option>
              <option value="paused">일시중지</option>
              <option value="sold_out">품절</option>
              <option value="delisted">판매종료</option>
            </select>
            <select
              className="px-4 py-2 border rounded-lg"
              value={productTypeFilter}
              onChange={(e) => setProductTypeFilter(e.target.value as ProductTypeFilter)}
            >
              <option value="all">전체 상품유형</option>
              <option value="general">일반</option>
              <option value="cosmetics">화장품</option>
              <option value="food">식품</option>
              <option value="health">건강식품</option>
              <option value="electronics">전자제품</option>
            </select>
          </div>
        </div>
      </div>

      {/* Listings Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상품 정보
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                공급가
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                판매가
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                마진
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                재고
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                </td>
              </tr>
            ) : filteredListings.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-500">
                  등록된 리스팅이 없습니다
                </td>
              </tr>
            ) : (
              filteredListings.map((listing) => (
                <tr key={listing.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {listing.offer.productMaster.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        SKU: {listing.offer.productMaster.sku}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {listing.offer.supplierPrice.toLocaleString()}원
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                    {listing.sellingPrice.toLocaleString()}원
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <span
                        className={`font-medium ${listing.margin > 0 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {listing.margin.toLocaleString()}원
                      </span>
                      <span className="text-gray-500 ml-1">
                        ({listing.marginRate}%)
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={
                        listing.offer.stockQuantity < 10
                          ? 'text-red-600 font-medium'
                          : 'text-gray-900'
                      }
                    >
                      {listing.offer.stockQuantity}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(listing.status)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleActive(listing)}
                        className={`p-1 rounded ${
                          isActiveStatus(listing.status)
                            ? 'text-gray-600 hover:text-gray-900'
                            : 'text-green-600 hover:text-green-900'
                        }`}
                        title={isActiveStatus(listing.status) ? '판매 중지' : '판매 시작'}
                      >
                        {isActiveStatus(listing.status) ? (
                          <PowerOff className="w-4 h-4" />
                        ) : (
                          <Power className="w-4 h-4" />
                        )}
                      </button>
                      {onEdit && (
                        <button
                          onClick={() => onEdit(listing.id)}
                          className="p-1 text-blue-600 hover:text-blue-900"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(listing.id)}
                        className="p-1 text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ListingsList;
