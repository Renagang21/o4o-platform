/**
 * SellerOps Listings Page
 *
 * WO-O4O-TABLE-DATATABLE-DEPRECATION-V1B — BaseTable 직접 사용으로 마이그레이션
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Power, PowerOff, Search, Filter } from 'lucide-react';
import PageHeader from '../../../components/common/PageHeader';
import { BaseTable, RowActionMenu } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';

interface Listing {
  id: string;
  productName: string;
  sku: string;
  supplyPrice: number;
  sellingPrice: number;
  margin: number;
  marginRate: number;
  stock: number;
  isActive: boolean;
}

const ListingsList: React.FC = () => {
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    // Demo data
    setTimeout(() => {
      setListings([
        {
          id: '1',
          productName: '프리미엄 에센스 세럼',
          sku: 'SKU-001',
          supplyPrice: 25000,
          sellingPrice: 39000,
          margin: 14000,
          marginRate: 56,
          stock: 150,
          isActive: true,
        },
        {
          id: '2',
          productName: '수분 크림 50ml',
          sku: 'SKU-002',
          supplyPrice: 18000,
          sellingPrice: 28000,
          margin: 10000,
          marginRate: 55.5,
          stock: 8,
          isActive: true,
        },
        {
          id: '3',
          productName: '클렌징 폼',
          sku: 'SKU-003',
          supplyPrice: 12000,
          sellingPrice: 19000,
          margin: 7000,
          marginRate: 58.3,
          stock: 200,
          isActive: false,
        },
      ]);
      setLoading(false);
    }, 500);
  }, [filterActive]);

  const handleToggleActive = (listing: Listing) => {
    setListings(listings.map((l) => l.id === listing.id ? { ...l, isActive: !l.isActive } : l));
  };

  const filteredListings = listings
    .filter((l) => {
      if (filterActive === 'active') return l.isActive;
      if (filterActive === 'inactive') return !l.isActive;
      return true;
    })
    .filter((l) => l.productName.toLowerCase().includes(searchQuery.toLowerCase()));

  const columns: O4OColumn<Listing>[] = [
    {
      key: 'productInfo',
      header: '상품 정보',
      render: (_, row) => (
        <div>
          <p className="font-medium">{row.productName}</p>
          <p className="text-sm text-gray-500">SKU: {row.sku}</p>
        </div>
      ),
    },
    {
      key: 'supplyPrice',
      header: '공급가',
      align: 'right',
      sortable: true,
      sortAccessor: (row) => row.supplyPrice,
      render: (_, row) => <span>{row.supplyPrice.toLocaleString()}원</span>,
    },
    {
      key: 'sellingPrice',
      header: '판매가',
      align: 'right',
      sortable: true,
      sortAccessor: (row) => row.sellingPrice,
      render: (_, row) => <span className="font-medium">{row.sellingPrice.toLocaleString()}원</span>,
    },
    {
      key: 'margin',
      header: '마진',
      render: (_, row) => (
        <div className="text-sm">
          <span className={`font-medium ${row.margin > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {row.margin.toLocaleString()}원
          </span>
          <span className="text-gray-500 ml-1">({row.marginRate}%)</span>
        </div>
      ),
    },
    {
      key: 'stock',
      header: '재고',
      align: 'center',
      sortable: true,
      sortAccessor: (row) => row.stock,
      render: (_, row) => <span className={row.stock < 10 ? 'text-red-600 font-medium' : ''}>{row.stock}</span>,
    },
    {
      key: 'isActive',
      header: '상태',
      align: 'center',
      render: (_, row) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${row.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
          {row.isActive ? '판매중' : '판매중지'}
        </span>
      ),
    },
    {
      key: '_actions',
      header: '',
      width: 80,
      system: true,
      align: 'center',
      render: (_, row) => (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => handleToggleActive(row)}
            className={`p-1 rounded ${row.isActive ? 'text-gray-600 hover:bg-gray-100' : 'text-green-600 hover:bg-green-50'}`}
            title={row.isActive ? '판매 중지' : '판매 시작'}
          >
            {row.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
          </button>
          <RowActionMenu
            actions={[
              { key: 'edit', label: '수정', icon: <Edit2 size={14} />, onClick: () => navigate(`/sellerops/listings/${row.id}/edit`) },
              { key: 'delete', label: '삭제', icon: <Trash2 size={14} />, variant: 'danger', confirm: '이 리스팅을 삭제하시겠습니까?', onClick: () => {} },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="리스팅 관리"
        subtitle="등록한 상품 리스팅 관리"
        actions={[
          { id: 'add-listing', label: '새 리스팅 등록', icon: <Plus className="w-4 h-4" />, onClick: () => navigate('/sellerops/listings/new'), variant: 'primary' as const },
        ]}
      />

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
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value as 'all' | 'active' | 'inactive')}
            >
              <option value="all">전체</option>
              <option value="active">판매중</option>
              <option value="inactive">판매중지</option>
            </select>
          </div>
        </div>
      </div>

      {/* Listings Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="animate-pulse p-4 space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded" />)}
          </div>
        ) : (
          <BaseTable<Listing>
            columns={columns}
            data={filteredListings}
            rowKey={(row) => row.id}
            emptyMessage="등록된 리스팅이 없습니다"
            tableId="sellerops-listings"
            columnVisibility
            persistState
          />
        )}
      </div>
    </div>
  );
};

export default ListingsList;
