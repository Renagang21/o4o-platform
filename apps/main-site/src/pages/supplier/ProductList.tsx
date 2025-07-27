import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useProductStore } from '../../stores/productStore';
import { useAuthStore } from '../../stores/authStore';
import { Product } from '../../types/product';

export default function ProductList() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    products,
    fetchProductsBySupplier,
    updateProductStatus,
    deleteProduct,
    flatCategories,
    isLoading,
    error,
    clearError,
  } = useProductStore();

  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchProductsBySupplier(user.id);
    }
  }, [user?.id]);

  const filteredProducts = products.filter(product => {
    const matchesStatus = !statusFilter || product.status === statusFilter;
    const matchesSearch = !searchTerm || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const handleStatusChange = async (productId: string, newStatus: Product['status']) => {
    try {
      await updateProductStatus(productId, newStatus);
      toast.success('상품 상태가 변경되었습니다.');
    } catch (err) {
      toast.error('상태 변경에 실패했습니다.');
    }
  };

  const handleDelete = async (productId: string) => {
    if (confirm('정말로 이 상품을 삭제하시겠습니까?')) {
      try {
        await deleteProduct(productId);
        toast.success('상품이 삭제되었습니다.');
      } catch (err) {
        toast.error('삭제에 실패했습니다.');
      }
    }
  };

  const handleBulkStatusChange = async (newStatus: Product['status']) => {
    if (selectedProducts.length === 0) {
      toast.error('변경할 상품을 선택하세요.');
      return;
    }

    try {
      await Promise.all(
        selectedProducts.map(id => updateProductStatus(id, newStatus))
      );
      setSelectedProducts([]);
      toast.success(`${selectedProducts.length}개 상품의 상태가 변경되었습니다.`);
    } catch (err) {
      toast.error('일괄 상태 변경에 실패했습니다.');
    }
  };

  const getStatusBadge = (status: Product['status']) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      active: 'bg-blue-100 text-blue-800',
      inactive: 'bg-red-100 text-red-800',
      discontinued: 'bg-gray-100 text-gray-800',
    };

    const labels = {
      draft: '임시저장',
      pending: '승인대기',
      approved: '승인완료',
      active: '판매중',
      inactive: '판매중지',
      discontinued: '단종',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getCategoryName = (categoryId: string) => {
    const category = flatCategories.find(cat => cat.id === categoryId);
    return category?.name || '미분류';
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">상품 관리</h1>
            <button
              onClick={() => navigate('/supplier/products/new')}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              + 새 상품 등록
            </button>
          </div>
        </div>
      </header>

      {/* 필터 및 검색 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                상품명 검색
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="상품명, 브랜드로 검색"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                상태 필터
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">전체 상태</option>
                <option value="draft">임시저장</option>
                <option value="pending">승인대기</option>
                <option value="approved">승인완료</option>
                <option value="active">판매중</option>
                <option value="inactive">판매중지</option>
                <option value="discontinued">단종</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('');
                }}
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                필터 초기화
              </button>
            </div>
          </div>
        </div>

        {/* 일괄 처리 */}
        {selectedProducts.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-blue-800">
                {selectedProducts.length}개 상품 선택됨
              </span>
              <div className="space-x-2">
                <button
                  onClick={() => handleBulkStatusChange('active')}
                  className="bg-green-600 text-white px-3 py-1 text-sm rounded hover:bg-green-700"
                >
                  판매 시작
                </button>
                <button
                  onClick={() => handleBulkStatusChange('inactive')}
                  className="bg-red-600 text-white px-3 py-1 text-sm rounded hover:bg-red-700"
                >
                  판매 중지
                </button>
                <button
                  onClick={() => setSelectedProducts([])}
                  className="bg-gray-600 text-white px-3 py-1 text-sm rounded hover:bg-gray-700"
                >
                  선택 해제
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 상품 목록 */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">상품을 불러오는 중...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">상품이 없습니다</h3>
              <p className="mt-1 text-sm text-gray-500">첫 번째 상품을 등록해보세요.</p>
              <div className="mt-6">
                <button
                  onClick={() => navigate('/supplier/products/new')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  상품 등록하기
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedProducts.length === filteredProducts.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProducts(filteredProducts.map(p => p.id));
                          } else {
                            setSelectedProducts([]);
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상품 정보
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      카테고리
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      가격
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
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProducts([...selectedProducts, product.id]);
                            } else {
                              setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-16 w-16">
                            <img
                              className="h-16 w-16 rounded object-cover"
                              src={product.images[0] || '/images/placeholder.jpg'}
                              alt={product.name}
                              onError={(e) => {
                                e.currentTarget.src = '/images/placeholder.jpg';
                              }}
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {product.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {product.brand} {product.model}
                            </div>
                            <div className="text-xs text-gray-400">
                              등록: {new Date(product.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.categories.map(catId => getCategoryName(catId)).join(', ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>₩{formatPrice(product.basePrice)}</div>
                        <div className="text-xs text-gray-500">
                          Gold: ₩{formatPrice(product.pricing.gold)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className={product.stockQuantity > 0 ? 'text-green-600' : 'text-red-600'}>
                          {product.stockQuantity}개
                        </div>
                        <div className="text-xs text-gray-500">
                          최소: {product.minOrderQuantity}개
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(product.status)}
                        {product.approvalStatus === 'pending' && (
                          <div className="mt-1">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                              승인대기
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => navigate(`/supplier/products/${product.id}`)}
                          className="text-green-600 hover:text-green-900"
                        >
                          상세
                        </button>
                        <button
                          onClick={() => navigate(`/supplier/products/${product.id}/edit`)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          수정
                        </button>
                        <select
                          value={product.status}
                          onChange={(e) => handleStatusChange(product.id, e.target.value as Product['status'])}
                          className="text-sm border-gray-300 rounded"
                        >
                          <option value="draft">임시저장</option>
                          <option value="pending">승인요청</option>
                          <option value="active">판매시작</option>
                          <option value="inactive">판매중지</option>
                        </select>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
                <button
                  onClick={clearError}
                  className="mt-2 text-sm text-red-600 hover:text-red-500"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}