/**
 * SellerOps Listings Page
 *
 * Refactored: PageHeader + DataTable pattern applied
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Edit2,
  Trash2,
  Power,
  PowerOff,
  Search,
  Filter,
  Settings,
} from 'lucide-react';
import PageHeader from '../../../components/common/PageHeader';
import { DataTable, Column } from '../../../components/common/DataTable';

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
    setListings(
      listings.map((l) =>
        l.id === listing.id ? { ...l, isActive: !l.isActive } : l
      )
    );
  };

  const filteredListings = listings
    .filter((l) => {
      if (filterActive === 'active') return l.isActive;
      if (filterActive === 'inactive') return !l.isActive;
      return true;
    })
    .filter((l) =>
      l.productName.toLowerCase().includes(searchQuery.toLowerCase())
    );

  // DataTable column definitions
  const columns: Column<Listing>[] = [
    {
      key: 'productInfo',
      title: '상품 정보',
      render: (_: unknown, record: Listing) => (
        <div>
          <p className="font-medium">{record.productName}</p>
          <p className="text-sm text-gray-500">SKU: {record.sku}</p>
        </div>
      ),
    },
    {
      key: 'supplyPrice',
      title: '공급가',
      dataIndex: 'supplyPrice',
      align: 'right',
      sortable: true,
      render: (value: number) => (
        <span>{value.toLocaleString()}원</span>
      ),
    },
    {
      key: 'sellingPrice',
      title: '판매가',
      dataIndex: 'sellingPrice',
      align: 'right',
      sortable: true,
      render: (value: number) => (
        <span className="font-medium">{value.toLocaleString()}원</span>
      ),
    },
    {
      key: 'margin',
      title: '마진',
      render: (_: unknown, record: Listing) => (
        <div className="text-sm">
          <span className={`font-medium ${record.margin > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {record.margin.toLocaleString()}원
          </span>
          <span className="text-gray-500 ml-1">({record.marginRate}%)</span>
        </div>
      ),
    },
    {
      key: 'stock',
      title: '재고',
      dataIndex: 'stock',
      align: 'center',
      sortable: true,
      render: (value: number) => (
        <span className={value < 10 ? 'text-red-600 font-medium' : ''}>
          {value}
        </span>
      ),
    },
    {
      key: 'isActive',
      title: '상태',
      dataIndex: 'isActive',
      align: 'center',
      render: (value: boolean) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}
        >
          {value ? '판매중' : '판매중지'}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '작업',
      align: 'center',
      render: (_: unknown, record: Listing) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleActive(record);
            }}
            className={`p-1 rounded ${
              record.isActive
                ? 'text-gray-600 hover:bg-gray-100'
                : 'text-green-600 hover:bg-green-50'
            }`}
            title={record.isActive ? '판매 중지' : '판매 시작'}
          >
            {record.isActive ? (
              <PowerOff className="w-4 h-4" />
            ) : (
              <Power className="w-4 h-4" />
            )}
          </button>
          <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
            <Edit2 className="w-4 h-4" />
          </button>
          <button className="p-1 text-red-600 hover:bg-red-50 rounded">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  // PageHeader actions
  const headerActions = [
    {
      id: 'screen-options',
      label: 'Screen Options',
      icon: <Settings className="w-4 h-4" />,
      onClick: () => {
        console.log('Screen options clicked');
      },
      variant: 'secondary' as const,
    },
    {
      id: 'add-listing',
      label: '새 리스팅 등록',
      icon: <Plus className="w-4 h-4" />,
      onClick: () => navigate('/sellerops/listings/new'),
      variant: 'primary' as const,
    },
  ];

  return (
    <div className="p-6">
      {/* PageHeader */}
      <PageHeader
        title="리스팅 관리"
        subtitle="등록한 상품 리스팅 관리"
        actions={headerActions}
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

      {/* Listings DataTable */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable<Listing>
          columns={columns}
          dataSource={filteredListings}
          rowKey="id"
          loading={loading}
          emptyText="등록된 리스팅이 없습니다"
        />
      </div>
    </div>
  );
};

export default ListingsList;
