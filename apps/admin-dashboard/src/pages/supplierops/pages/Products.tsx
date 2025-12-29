/**
 * SupplierOps Products Page
 *
 * Refactored: PageHeader + DataTable pattern applied
 */

import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Settings } from 'lucide-react';
import PageHeader from '../../../components/common/PageHeader';
import { DataTable, Column } from '../../../components/common/DataTable';

interface Product {
  id: string;
  name: string;
  sku: string;
  description: string;
  basePrice: number;
  category: string;
  isActive: boolean;
}

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Demo data
    setTimeout(() => {
      setProducts([
        {
          id: '1',
          name: '프리미엄 에센스 세럼',
          sku: 'SKU-001',
          description: '고농축 에센스 세럼',
          basePrice: 35000,
          category: 'skincare',
          isActive: true,
        },
        {
          id: '2',
          name: '수분 크림',
          sku: 'SKU-002',
          description: '24시간 보습 크림',
          basePrice: 28000,
          category: 'skincare',
          isActive: true,
        },
        {
          id: '3',
          name: '클렌징 폼',
          sku: 'SKU-003',
          description: '저자극 클렌징 폼',
          basePrice: 15000,
          category: 'cleansing',
          isActive: true,
        },
        {
          id: '4',
          name: '선크림 SPF50+',
          sku: 'SKU-004',
          description: '자외선 차단 크림',
          basePrice: 22000,
          category: 'suncare',
          isActive: false,
        },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // DataTable column definitions
  const columns: Column<Product>[] = [
    {
      key: 'productInfo',
      title: '상품 정보',
      render: (_: unknown, record: Product) => (
        <div>
          <p className="font-medium">{record.name}</p>
          <p className="text-sm text-gray-500">{record.description}</p>
        </div>
      ),
    },
    {
      key: 'sku',
      title: 'SKU',
      dataIndex: 'sku',
      render: (value: string) => (
        <span className="text-sm text-gray-600">{value}</span>
      ),
    },
    {
      key: 'category',
      title: '카테고리',
      dataIndex: 'category',
      render: (value: string) => (
        <span className="text-sm text-gray-600">{value}</span>
      ),
    },
    {
      key: 'basePrice',
      title: '기본가',
      dataIndex: 'basePrice',
      align: 'right',
      sortable: true,
      render: (value: number) => (
        <span className="font-medium">{value.toLocaleString()}원</span>
      ),
    },
    {
      key: 'isActive',
      title: '상태',
      dataIndex: 'isActive',
      align: 'center',
      render: (value: boolean) => (
        <span
          className={`px-2 py-1 text-xs rounded-full ${
            value
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {value ? '활성' : '비활성'}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '관리',
      align: 'center',
      render: () => (
        <div className="flex items-center justify-center gap-2">
          <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
            <Edit className="w-4 h-4" />
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
        // TODO: Implement screen options
      },
      variant: 'secondary' as const,
    },
    {
      id: 'add-product',
      label: '상품 추가',
      icon: <Plus className="w-4 h-4" />,
      onClick: () => {
        navigate('/supplierops/products/new');
      },
      variant: 'primary' as const,
    },
  ];

  return (
    <div className="p-6">
      {/* PageHeader */}
      <PageHeader
        title="상품 관리"
        subtitle="등록된 상품(ProductMaster)을 관리하세요"
        actions={headerActions}
      />

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="상품명 검색..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Products DataTable */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable<Product>
          columns={columns}
          dataSource={filteredProducts}
          rowKey="id"
          loading={loading}
          emptyText="등록된 상품이 없습니다"
        />
      </div>
    </div>
  );
};

export default Products;
