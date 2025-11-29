import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, DollarSign, TrendingUp, Package, BarChart, Upload } from 'lucide-react';
import { dropshippingAPI } from '../../api/dropshipping-cpt';
import { toast } from 'react-hot-toast';
import ProductEditor from './ProductEditor';
import { useNavigate } from 'react-router-dom';

interface Product {
  id: string;
  name: string; // Changed from title
  description: string; // Changed from content
  excerpt?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  price: number; // Changed from acf.selling_price
  costPrice: number; // Changed from acf.cost_price
  sku: string; // Changed from acf.supplier_sku
  supplierId?: string; // Changed from acf.supplier
  stock: number;
  category: string;
  // Legacy acf support for UI compatibility
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
  // Computed fields
  title?: string; // For UI compatibility
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
          title: product.name, // For UI compatibility
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

  const toggleBulkSelect = (id: string) => {
    setBulkSelection(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (bulkSelection.length === products.length) {
      setBulkSelection([]);
    } else {
      setBulkSelection(products.map(p => p.id));
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
      {/* WordPress Admin Style Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-normal text-gray-900">상품</h1>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/dropshipping/products/bulk-import')}
            className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition flex items-center gap-1"
          >
            <Upload className="h-4 w-4" />
            CSV 일괄 가져오기
          </button>
          <button
            onClick={handleCreate}
            className="px-3 py-1 bg-wordpress-blue text-white text-sm rounded hover:bg-wordpress-blue-hover transition"
          >
            새로 추가
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">전체 상품</p>
              <p className="text-2xl font-bold">{products.length}</p>
            </div>
            <Package className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">평균 마진율</p>
              <p className="text-2xl font-bold">
                {products.length > 0
                  ? (products.reduce((sum, p) => sum + parseFloat(p.acf.margin_rate || '0'), 0) / products.length).toFixed(1)
                  : 0}%
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">최고 마진 상품</p>
              <p className="text-lg font-bold">
                {products.length > 0
                  ? Math.max(...products.map(p => parseFloat(p.acf.margin_rate || '0'))).toFixed(1)
                  : 0}%
              </p>
            </div>
            <BarChart className="h-8 w-8 text-purple-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">최저 마진 상품</p>
              <p className="text-lg font-bold">
                {products.length > 0
                  ? Math.min(...products.map(p => parseFloat(p.acf.margin_rate || '0'))).toFixed(1)
                  : 0}%
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-yellow-400" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-gray-300 rounded-t-lg p-3 flex justify-between items-center">
        <div className="flex gap-2">
          <select className="px-3 py-1 border border-gray-300 rounded text-sm">
            <option value="">일괄 작업</option>
            <option value="delete">삭제</option>
          </select>
          <button 
            onClick={handleBulkDelete}
            className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
          >
            적용
          </button>
        </div>
        
        <div className="flex gap-2 items-center">
          <select 
            className="px-3 py-1 border border-gray-300 rounded text-sm"
            value={filterSupplier}
            onChange={(e) => setFilterSupplier(e.target.value)}
          >
            <option value="">모든 공급자</option>
          </select>
          <select 
            className="px-3 py-1 border border-gray-300 rounded text-sm"
            value={filterMargin}
            onChange={(e) => setFilterMargin(e.target.value)}
          >
            <option value="">모든 마진율</option>
            <option value="low">낮은 마진 (&lt; 10%)</option>
            <option value="medium">보통 마진 (10-20%)</option>
            <option value="high">높은 마진 (&gt; 20%)</option>
          </select>
          <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
            필터
          </button>
        </div>
      </div>

      {/* WordPress Style Table */}
      <div className="bg-white border-x border-b border-gray-300 rounded-b-lg">
        <table className="w-full wp-list-table widefat fixed striped">
          <thead>
            <tr>
              <td className="manage-column check-column">
                <input 
                  type="checkbox" 
                  onChange={toggleSelectAll}
                  checked={bulkSelection.length === products.length && products.length !== 0}
                />
              </td>
              <th className="manage-column column-title column-primary">
                <span>상품명</span>
              </th>
              <th className="manage-column">공급가</th>
              <th className="manage-column">판매가</th>
              <th className="manage-column">마진율</th>
              <th className="manage-column">공급자 SKU</th>
              <th className="manage-column">배송</th>
              <th className="manage-column">날짜</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-4">
                    로딩중...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-4">
                    상품이 없습니다
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id}>
                    <th scope="row" className="check-column">
                      <input 
                        type="checkbox"
                        checked={bulkSelection.includes(product.id)}
                        onChange={() => toggleBulkSelect(product.id)}
                      />
                    </th>
                    <td className="title column-title column-primary page-title">
                      <strong>
                        <a 
                          href="#" 
                          onClick={(e) => { e.preventDefault(); handleEdit(product); }}
                          className="row-title"
                        >
                          {product.title}
                        </a>
                      </strong>
                      {product.excerpt && (
                        <p className="text-sm text-gray-500 mt-1">
                          {product.excerpt.substring(0, 50)}...
                        </p>
                      )}
                      <div className="row-actions">
                        <span className="edit">
                          <a href="#" onClick={(e) => { e.preventDefault(); handleEdit(product); }}>
                            편집
                          </a>
                        </span>
                        {' | '}
                        <span className="trash">
                          <a 
                            href="#" 
                            onClick={(e) => { e.preventDefault(); handleDelete(product.id); }}
                            className="submitdelete"
                          >
                            휴지통
                          </a>
                        </span>
                        {' | '}
                        <span className="view">
                          <a href="#">보기</a>
                        </span>
                      </div>
                    </td>
                    <td>
                      {formatCurrency(product.acf.cost_price || 0)}
                    </td>
                    <td>
                      {formatCurrency(product.acf.selling_price || 0)}
                    </td>
                    <td>
                      <span className={`text-sm font-medium ${getMarginColor(product.acf.margin_rate || '0')}`}>
                        {product.acf.margin_rate || '0'}%
                      </span>
                    </td>
                    <td>
                      <code className="text-sm">{product.acf.supplier_sku || '-'}</code>
                    </td>
                    <td>
                      <span className="text-sm">
                        {product.acf.shipping_days_min || 3}-{product.acf.shipping_days_max || 7}일
                        {product.acf.shipping_fee === 0 && (
                          <span className="text-green-600"> 무료</span>
                        )}
                      </span>
                    </td>
                    <td className="date column-date">
                      <abbr title={new Date(product.createdAt).toLocaleString('ko-KR')}>
                        {new Date(product.createdAt).toLocaleDateString('ko-KR')}
                      </abbr>
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

export default Products;