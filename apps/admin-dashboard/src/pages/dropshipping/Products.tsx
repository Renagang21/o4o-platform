/**
 * Dropshipping Products Page
 *
 * Refactored: PageHeader + DataTable pattern applied
 */

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, DollarSign, TrendingUp, Package, BarChart, Upload, Settings } from 'lucide-react';
import { dropshippingAPI } from '../../api/dropshipping-cpt';
import { toast } from 'react-hot-toast';
import ProductEditor from './ProductEditor';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import { DataTable, Column } from '../../components/common/DataTable';

interface Product {
  id: string;
  name: string;
  description: string;
  excerpt?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  price: number;
  costPrice: number;
  sku: string;
  supplierId?: string;
  stock: number;
  category: string;
  acf?: {
    cost_price?: number;
    selling_price?: number;
    margin_rate?: string;
    can_modify_price?: boolean;
    supplier?: string;
    supplier_sku?: string;
    shipping_days_min?: number;
    shipping_days_max?: number;
    shipping_fee?: number;
  };
  title?: string;
}

const Products: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [bulkSelection, setBulkSelection] = useState<string[]>([]);
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterMargin, setFilterMargin] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await dropshippingAPI.getProducts();
      if (response.success) {
        // Transform new API data to UI-compatible format
        const transformedProducts = response.data.map((product: any) => ({
          ...product,
          title: product.name,
          content: product.description,
          acf: {
            cost_price: product.costPrice,
            selling_price: product.price,
            supplier_sku: product.sku,
            supplier: product.supplierId,
            margin_rate: product.costPrice > 0
              ? (((product.price - product.costPrice) / product.costPrice) * 100).toFixed(1)
              : '0',
            shipping_days_min: 3,
            shipping_days_max: 7,
            shipping_fee: 0
          }
        }));
        setProducts(transformedProducts);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('상품 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await dropshippingAPI.deleteProduct(id);
      if (response.success) {
        toast.success('상품이 삭제되었습니다');
        fetchProducts();
      }
    } catch (error) {
      toast.error('상품 삭제에 실패했습니다');
    }
  };

  const handleBulkDelete = async () => {
    if (bulkSelection.length === 0) {
      toast.error('삭제할 항목을 선택해주세요');
      return;
    }

    if (!confirm(`${bulkSelection.length}개 상품을 삭제하시겠습니까?`)) return;

    try {
      await Promise.all(bulkSelection.map(id => dropshippingAPI.deleteProduct(id)));
      toast.success('선택한 상품이 삭제되었습니다');
      setBulkSelection([]);
      fetchProducts();
    } catch (error) {
      toast.error('일괄 삭제에 실패했습니다');
    }
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setShowEditor(true);
  };

  const handleCreate = () => {
    setSelectedProduct(null);
    setShowEditor(true);
  };

  const handleEditorClose = () => {
    setShowEditor(false);
    setSelectedProduct(null);
    fetchProducts();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  const getMarginColor = (marginRate: string) => {
    const rate = parseFloat(marginRate);
    if (rate < 10) return 'text-red-600';
    if (rate < 20) return 'text-yellow-600';
    return 'text-green-600';
  };

  // Calculate stats
  const stats = {
    total: products.length,
    avgMargin: products.length > 0
      ? (products.reduce((sum, p) => sum + parseFloat(p.acf?.margin_rate || '0'), 0) / products.length).toFixed(1)
      : '0',
    maxMargin: products.length > 0
      ? Math.max(...products.map(p => parseFloat(p.acf?.margin_rate || '0'))).toFixed(1)
      : '0',
    minMargin: products.length > 0
      ? Math.min(...products.map(p => parseFloat(p.acf?.margin_rate || '0'))).toFixed(1)
      : '0',
  };

  // DataTable column definitions
  const columns: Column<Product>[] = [
    {
      key: 'title',
      title: '상품명',
      render: (_: unknown, record: Product) => (
        <div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(record);
            }}
            className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
          >
            {record.title}
          </button>
          {record.excerpt && (
            <p className="text-sm text-gray-500 mt-1">
              {record.excerpt.substring(0, 50)}...
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'costPrice',
      title: '공급가',
      align: 'right',
      sortable: true,
      render: (_: unknown, record: Product) => (
        <span>{formatCurrency(record.acf?.cost_price || 0)}</span>
      ),
    },
    {
      key: 'sellingPrice',
      title: '판매가',
      align: 'right',
      sortable: true,
      render: (_: unknown, record: Product) => (
        <span>{formatCurrency(record.acf?.selling_price || 0)}</span>
      ),
    },
    {
      key: 'marginRate',
      title: '마진율',
      align: 'center',
      sortable: true,
      render: (_: unknown, record: Product) => (
        <span className={`text-sm font-medium ${getMarginColor(record.acf?.margin_rate || '0')}`}>
          {record.acf?.margin_rate || '0'}%
        </span>
      ),
    },
    {
      key: 'sku',
      title: '공급자 SKU',
      render: (_: unknown, record: Product) => (
        <code className="text-sm bg-gray-100 px-2 py-0.5 rounded">
          {record.acf?.supplier_sku || '-'}
        </code>
      ),
    },
    {
      key: 'shipping',
      title: '배송',
      render: (_: unknown, record: Product) => (
        <span className="text-sm">
          {record.acf?.shipping_days_min || 3}-{record.acf?.shipping_days_max || 7}일
          {record.acf?.shipping_fee === 0 && (
            <span className="text-green-600 ml-1">무료</span>
          )}
        </span>
      ),
    },
    {
      key: 'createdAt',
      title: '등록일',
      dataIndex: 'createdAt',
      sortable: true,
      render: (value: string) => (
        <span className="text-sm text-gray-500">
          {new Date(value).toLocaleDateString('ko-KR')}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '작업',
      align: 'center',
      render: (_: unknown, record: Product) => (
        <div className="flex gap-2 justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(record);
            }}
            className="text-blue-600 hover:text-blue-900 p-1"
            title="편집"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(record.id);
            }}
            className="text-red-600 hover:text-red-900 p-1"
            title="삭제"
          >
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
      id: 'bulk-import',
      label: 'CSV 일괄 가져오기',
      icon: <Upload className="w-4 h-4" />,
      onClick: () => navigate('/dropshipping/products/bulk-import'),
      variant: 'secondary' as const,
    },
    {
      id: 'add-product',
      label: '새로 추가',
      icon: <Plus className="w-4 h-4" />,
      onClick: handleCreate,
      variant: 'primary' as const,
    },
  ];

  if (showEditor) {
    return (
      <ProductEditor
        product={selectedProduct}
        onClose={handleEditorClose}
      />
    );
  }

  return (
    <div className="p-6">
      {/* PageHeader */}
      <PageHeader
        title="상품"
        subtitle="드롭쉬핑 상품 목록 관리"
        actions={headerActions}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">전체 상품</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <Package className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">평균 마진율</p>
              <p className="text-2xl font-bold">{stats.avgMargin}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">최고 마진 상품</p>
              <p className="text-lg font-bold">{stats.maxMargin}%</p>
            </div>
            <BarChart className="h-8 w-8 text-purple-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">최저 마진 상품</p>
              <p className="text-lg font-bold">{stats.minMargin}%</p>
            </div>
            <DollarSign className="h-8 w-8 text-yellow-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-2">
            <select className="px-3 py-2 border border-gray-300 rounded text-sm">
              <option value="">일괄 작업</option>
              <option value="delete">삭제</option>
            </select>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
            >
              적용
            </button>
          </div>

          <div className="flex gap-2 items-center">
            <select
              className="px-3 py-2 border border-gray-300 rounded text-sm"
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
            >
              <option value="">모든 공급자</option>
            </select>
            <select
              className="px-3 py-2 border border-gray-300 rounded text-sm"
              value={filterMargin}
              onChange={(e) => setFilterMargin(e.target.value)}
            >
              <option value="">모든 마진율</option>
              <option value="low">낮은 마진 (&lt; 10%)</option>
              <option value="medium">보통 마진 (10-20%)</option>
              <option value="high">높은 마진 (&gt; 20%)</option>
            </select>
            <button className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50">
              필터
            </button>
          </div>
        </div>
      </div>

      {/* Products DataTable */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable<Product>
          columns={columns}
          dataSource={products}
          rowKey="id"
          loading={loading}
          emptyText="상품이 없습니다"
          rowSelection={{
            selectedRowKeys: bulkSelection,
            onChange: setBulkSelection,
          }}
        />
      </div>
    </div>
  );
};

export default Products;
