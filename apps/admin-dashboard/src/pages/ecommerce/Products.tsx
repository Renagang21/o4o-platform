import { FC, FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  Grid, 
  List, 
  Edit, 
  Trash2, 
  Copy,
  Package,
  MoreVertical,
  Download,
  Upload
} from 'lucide-react';
import { useProducts, useDeleteProduct, useDuplicateProduct } from '@/hooks/useProducts';
import { Product, ProductFilters } from '@/types/ecommerce';
import { formatCurrency } from '@/lib/utils';

const Products: FC = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  // API Hooks
  const { data: productsData, isLoading } = useProducts(page, 20, {
    ...filters,
    search: searchTerm
  });
  const deleteProduct = useDeleteProduct();
  const duplicateProduct = useDuplicateProduct();

  const products = productsData?.data || [];
  const totalPages = Math.ceil((productsData?.total || 0) / 20);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleDelete = async (productId: string) => {
    if (window.confirm('정말로 이 상품을 삭제하시겠습니까?')) {
      await deleteProduct.mutateAsync(productId);
    }
  };

  const handleDuplicate = async (productId: string) => {
    await duplicateProduct.mutateAsync(productId);
  };

  const ProductCard = ({ product }: { product: Product }) => (
    <div className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
      <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-t-lg bg-gray-200">
        {product.images && product.images[0] ? (
          <img
            src={product.images[0].url}
            alt={product.name}
            className="object-cover object-center"
          />
        ) : (
          <div className="flex items-center justify-center h-48">
            <Package className="w-12 h-12 text-gray-400" />
          </div>
        )}
      </div>
      
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2">
            {product.name}
          </h3>
          <div className="relative group">
            <button className="p-1 hover:bg-gray-100 rounded">
              <MoreVertical className="w-4 h-4" />
            </button>
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => navigate(`/products/${product.id}/edit`)}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
              >
                <Edit className="w-4 h-4 inline mr-2" />
                편집
              </button>
              <button
                onClick={() => handleDuplicate(product.id)}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
              >
                <Copy className="w-4 h-4 inline mr-2" />
                복제
              </button>
              <hr className="my-1" />
              <button
                onClick={() => handleDelete(product.id)}
                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 inline mr-2" />
                삭제
              </button>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-500 mb-2">SKU: {product.sku}</p>

        <div className="flex items-center justify-between mb-2">
          <span className="text-lg font-semibold">
            {formatCurrency(product.retailPrice || 0)}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full ${
            product.stockQuantity > 0 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {product.stockQuantity > 0 
              ? `재고: ${product.stockQuantity}` 
              : '품절'}
          </span>
        </div>

        <div className="flex gap-2 mt-3">
          <span className={`text-xs px-2 py-1 rounded ${
            product.status === 'active' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {product.status === 'active' ? '판매중' : product.status === 'draft' ? '임시저장' : '비공개'}
          </span>
          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
            {product.type === 'simple' ? '단순상품' : product.type === 'variable' ? '가변상품' : '기타'}
          </span>
        </div>
      </div>
    </div>
  );

  const ProductRow = ({ product }: { product: Product }) => (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <input
          type="checkbox"
          checked={selectedProducts.includes(product.id)}
          onChange={(e: any) => {
            if (e.target.checked) {
              setSelectedProducts([...selectedProducts, product.id]);
            } else {
              setSelectedProducts(selectedProducts.filter(id => id !== product.id));
            }
          }}
          className="rounded"
        />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="h-10 w-10 flex-shrink-0">
            {product.images && product.images[0] ? (
              <img
                className="h-10 w-10 rounded object-cover"
                src={product.images[0].url}
                alt={product.name}
              />
            ) : (
              <div className="h-10 w-10 rounded bg-gray-200 flex items-center justify-center">
                <Package className="w-5 h-5 text-gray-400" />
              </div>
            )}
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{product.name}</div>
            <div className="text-sm text-gray-500">SKU: {product.sku}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
          product.status === 'active' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {product.status === 'active' ? '판매중' : product.status === 'draft' ? '임시저장' : '비공개'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {formatCurrency(product.retailPrice || 0)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {product.stockQuantity}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {product.categories?.[0]?.name || '-'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button
          onClick={() => navigate(`/products/${product.id}/edit`)}
          className="text-indigo-600 hover:text-indigo-900 mr-3"
        >
          편집
        </button>
        <button
          onClick={() => handleDelete(product.id)}
          className="text-red-600 hover:text-red-900"
        >
          삭제
        </button>
      </td>
    </tr>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">상품 관리</h1>
          <p className="text-gray-600 mt-1">
            총 {productsData?.total || 0}개의 상품이 등록되어 있습니다
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center px-4 py-2 border rounded-lg hover:bg-gray-50">
            <Upload className="w-4 h-4 mr-2" />
            가져오기
          </button>
          <button className="flex items-center px-4 py-2 border rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4 mr-2" />
            내보내기
          </button>
          <button
            onClick={() => navigate('/products/new')}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            상품 추가
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center mb-4">
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e: any) => setSearchTerm(e.target.value)}
                placeholder="상품명, SKU로 검색..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </form>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              <Filter className="w-4 h-4 mr-2" />
              필터
            </button>
            
            <div className="flex border rounded-lg">
              <button
                onClick={() => setView('grid')}
                className={`p-2 ${view === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('list')}
                className={`p-2 ${view === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="border-t pt-4 grid grid-cols-4 gap-4">
            <select
              value={filters.status || ''}
              onChange={(e: any) => setFilters({ ...filters, status: e.target.value || undefined })}
              className="border rounded-lg px-3 py-2"
            >
              <option value="">모든 상태</option>
              <option value="active">판매중</option>
              <option value="inactive">판매중지</option>
            </select>
            
            <select
              value={filters.type || ''}
              onChange={(e: any) => setFilters({ ...filters, type: e.target.value || undefined })}
              className="border rounded-lg px-3 py-2"
            >
              <option value="">모든 유형</option>
              <option value="physical">실물</option>
              <option value="digital">디지털</option>
              <option value="service">서비스</option>
            </select>
            
            <select
              value={filters.category || ''}
              onChange={(e: any) => setFilters({ ...filters, category: e.target.value })}
              className="border rounded-lg px-3 py-2"
            >
              <option value="">모든 카테고리</option>
              {/* TODO: 카테고리 목록 */}
            </select>
            
            <select
              value={filters.stockStatus || ''}
              onChange={(e: any) => setFilters({ ...filters, stockStatus: e.target.value || undefined })}
              className="border rounded-lg px-3 py-2"
            >
              <option value="">재고 상태</option>
              <option value="in_stock">재고 있음</option>
              <option value="out_of_stock">품절</option>
              <option value="low_stock">재고 부족</option>
            </select>
          </div>
        )}
      </div>

      {/* Products Display */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">상품이 없습니다</h3>
          <p className="text-gray-500 mb-4">첫 번째 상품을 등록해보세요</p>
          <button
            onClick={() => navigate('/products/new')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            상품 추가
          </button>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    onChange={(e: any) => {
                      if (e.target.checked) {
                        setSelectedProducts(products.map(p => p.id));
                      } else {
                        setSelectedProducts([]);
                      }
                    }}
                    className="rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상품
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  가격
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  재고
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  카테고리
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">작업</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product: any) => (
                <ProductRow key={product.id} product={product} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <nav className="flex space-x-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              이전
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p: any) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-3 py-2 border rounded-lg ${
                  page === p ? 'bg-blue-600 text-white' : 'hover:bg-gray-50'
                }`}
              >
                {p}
              </button>
            ))}
            
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              다음
            </button>
          </nav>
        </div>
      )}
    </div>
  );
};

export default Products;