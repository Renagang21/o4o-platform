/**
 * SupplierOps Products Page
 *
 * WO-O4O-TABLE-DATATABLE-DEPRECATION-V1B — BaseTable 직접 사용으로 마이그레이션
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Upload } from 'lucide-react';
import PageHeader from '../../../components/common/PageHeader';
import { BaseTable, RowActionMenu } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';

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
  const navigate = useNavigate();
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

  const columns: O4OColumn<Product>[] = [
    {
      key: 'productInfo',
      header: '상품 정보',
      render: (_, row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-sm text-gray-500">{row.description}</p>
        </div>
      ),
    },
    {
      key: 'sku',
      header: 'SKU',
      render: (_, row) => <span className="text-sm text-gray-600">{row.sku}</span>,
    },
    {
      key: 'category',
      header: '카테고리',
      render: (_, row) => <span className="text-sm text-gray-600">{row.category}</span>,
    },
    {
      key: 'basePrice',
      header: '기본가',
      align: 'right',
      sortable: true,
      sortAccessor: (row) => row.basePrice,
      render: (_, row) => <span className="font-medium">{row.basePrice.toLocaleString()}원</span>,
    },
    {
      key: 'isActive',
      header: '상태',
      align: 'center',
      render: (_, row) => (
        <span className={`px-2 py-1 text-xs rounded-full ${row.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
          {row.isActive ? '활성' : '비활성'}
        </span>
      ),
    },
    {
      key: '_actions',
      header: '',
      width: 56,
      system: true,
      align: 'center',
      render: (_, row) => (
        <RowActionMenu
          actions={[
            { key: 'edit', label: '수정', icon: <Edit size={14} />, onClick: () => navigate(`/supplierops/products/${row.id}/edit`) },
            { key: 'delete', label: '삭제', icon: <Trash2 size={14} />, variant: 'danger', confirm: '이 상품을 삭제하시겠습니까?', onClick: () => {} },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="상품 관리"
        subtitle="등록된 상품(ProductMaster)을 관리하세요"
        actions={[
          { id: 'bulk-import', label: '대량 등록', icon: <Upload className="w-4 h-4" />, onClick: () => navigate('/supplierops/products/bulk-import'), variant: 'secondary' as const },
          { id: 'add-product', label: '상품 추가', icon: <Plus className="w-4 h-4" />, onClick: () => navigate('/supplierops/products/new'), variant: 'primary' as const },
        ]}
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

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="animate-pulse p-4 space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded" />)}
          </div>
        ) : (
          <BaseTable<Product>
            columns={columns}
            data={filteredProducts}
            rowKey={(row) => row.id}
            emptyMessage="등록된 상품이 없습니다"
            tableId="supplierops-products"
            columnVisibility
            persistState
          />
        )}
      </div>
    </div>
  );
};

export default Products;
