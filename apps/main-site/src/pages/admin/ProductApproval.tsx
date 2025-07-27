import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useProductStore } from '../../stores/productStore';
import { useAuthStore } from '../../stores/authStore';
import { Product } from '../../types/product';

export default function ProductApproval() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    products,
    flatCategories,
    fetchProducts,
    updateApprovalStatus,
    isLoading,
    error,
    clearError,
  } = useProductStore();

  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | ''>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (!user || user.userType !== 'admin') {
      navigate('/login');
      return;
    }

    // 승인 대기 상품들을 기본으로 로드
    fetchProducts({
      approvalStatus: statusFilter || undefined,
    });
  }, [user, statusFilter]);

  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchTerm || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const handleApprove = async (productId: string) => {
    try {
      await updateApprovalStatus(productId, 'approved');
      toast.success('상품이 승인되었습니다.');
      setSelectedProducts(prev => prev.filter(id => id !== productId));
    } catch (error) {
      toast.error('승인 처리에 실패했습니다.');
    }
  };

  const handleReject = async (productId: string) => {
    const reason = prompt('반려 사유를 입력해주세요:');
    if (!reason) return;

    try {
      await updateApprovalStatus(productId, 'rejected');
      toast.success('상품이 반려되었습니다.');
      setSelectedProducts(prev => prev.filter(id => id !== productId));
    } catch (error) {
      toast.error('반려 처리에 실패했습니다.');
    }
  };

  const handleBulkApprove = async () => {
    if (selectedProducts.length === 0) {
      toast.error('승인할 상품을 선택하세요.');
      return;
    }

    try {
      await Promise.all(
        selectedProducts.map(id => updateApprovalStatus(id, 'approved'))
      );
      toast.success(`${selectedProducts.length}개 상품이 승인되었습니다.`);
      setSelectedProducts([]);
    } catch (error) {
      toast.error('일괄 승인에 실패했습니다.');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(filteredProducts.map(p => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleProductSelect = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts(prev => [...prev, productId]);
    } else {
      setSelectedProducts(prev => prev.filter(id => id !== productId));
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };

    const labels = {
      pending: '승인 대기',
      approved: '승인 완료',
      rejected: '반려',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="flex items-center text-gray-600 hover:text-gray-900 mb-2"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                대시보드로 돌아가기
              </button>
              <h1 className="text-3xl font-bold text-gray-900">상품 승인 관리</h1>
              <p className="mt-2 text-sm text-gray-600">공급업체에서 등록한 상품들을 검토하고 승인하세요</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">관리자: {user?.name}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 필터 및 검색 */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                승인 상태
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">전체 상태</option>
                <option value="pending">승인 대기</option>
                <option value="approved">승인 완료</option>
                <option value="rejected">반려</option>
              </select>
            </div>

            <div className="md:col-span-2">
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

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('pending');
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
                  onClick={handleBulkApprove}
                  className="bg-green-600 text-white px-4 py-2 text-sm rounded hover:bg-green-700"
                >
                  일괄 승인
                </button>
                <button
                  onClick={() => setSelectedProducts([])}
                  className="bg-gray-600 text-white px-4 py-2 text-sm rounded hover:bg-gray-700"
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
              <h3 className="mt-2 text-sm font-medium text-gray-900">해당 조건의 상품이 없습니다</h3>
              <p className="mt-1 text-sm text-gray-500">다른 필터 조건을 사용해보세요.</p>
            </div>
          ) : (
            <>
              {/* 테이블 헤더 */}
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedProducts.length === filteredProducts.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-900">
                    전체 선택 ({selectedProducts.length}/{filteredProducts.length})
                  </span>
                </div>
              </div>

              {/* 상품 목록 */}
              <div className="divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-start space-x-4">
                      {/* 체크박스 */}
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={(e) => handleProductSelect(product.id, e.target.checked)}
                        className="mt-4 rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />

                      {/* 상품 이미지 */}
                      <div className="flex-shrink-0">
                        <img
                          src={product.images[0] || '/images/placeholder.jpg'}
                          alt={product.name}
                          className="h-20 w-20 rounded object-cover cursor-pointer"
                          onClick={() => setViewingProduct(product)}
                          onError={(e) => {
                            e.currentTarget.src = '/images/placeholder.jpg';
                          }}
                        />
                      </div>

                      {/* 상품 정보 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="pr-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-1">
                              {product.name}
                            </h3>
                            <p className="text-sm text-gray-500 mb-2">
                              {product.brand} {product.model}
                            </p>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <span>카테고리: {product.categories.map(catId => getCategoryName(catId)).join(', ')}</span>
                              <span>•</span>
                              <span>공급업체 ID: {product.supplierId}</span>
                              <span>•</span>
                              <span>등록일: {formatDate(product.createdAt)}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            {getStatusBadge(product.approvalStatus)}
                            <div className="mt-2 text-lg font-bold text-gray-900">
                              ₩{formatPrice(product.basePrice)}
                            </div>
                            <div className="text-sm text-gray-500">
                              재고: {product.stockQuantity}개
                            </div>
                          </div>
                        </div>

                        {/* 상품 설명 */}
                        <div className="mt-3">
                          <p className="text-sm text-gray-700 line-clamp-2">
                            {product.shortDescription || product.description}
                          </p>
                        </div>

                        {/* 가격 정보 */}
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <h4 className="text-sm font-medium text-gray-900 mb-2">등급별 가격</h4>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Gold: </span>
                              <span className="font-medium">₩{formatPrice(product.pricing.gold)}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Premium: </span>
                              <span className="font-medium">₩{formatPrice(product.pricing.premium)}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">VIP: </span>
                              <span className="font-medium">₩{formatPrice(product.pricing.vip)}</span>
                            </div>
                          </div>
                        </div>

                        {/* 액션 버튼들 */}
                        <div className="mt-4 flex items-center space-x-3">
                          <button
                            onClick={() => setViewingProduct(product)}
                            className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                          >
                            상세 보기
                          </button>

                          {product.approvalStatus === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(product.id)}
                                className="bg-green-600 text-white px-4 py-2 text-sm rounded hover:bg-green-700"
                              >
                                ✅ 승인
                              </button>
                              <button
                                onClick={() => handleReject(product.id)}
                                className="bg-red-600 text-white px-4 py-2 text-sm rounded hover:bg-red-700"
                              >
                                ❌ 반려
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
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

      {/* 상품 상세 모달 */}
      {viewingProduct && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">상품 상세 정보</h3>
                <button
                  onClick={() => setViewingProduct(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* 상품 이미지 */}
                <div className="grid grid-cols-4 gap-2">
                  {viewingProduct.images.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`${viewingProduct.name} ${index + 1}`}
                      className="w-full h-20 object-cover rounded"
                      onError={(e) => {
                        e.currentTarget.src = '/images/placeholder.jpg';
                      }}
                    />
                  ))}
                </div>

                {/* 상품 정보 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">상품명</label>
                    <p className="mt-1 text-sm text-gray-900">{viewingProduct.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">브랜드</label>
                    <p className="mt-1 text-sm text-gray-900">{viewingProduct.brand}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">카테고리</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {viewingProduct.categories.map(catId => getCategoryName(catId)).join(', ')}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">재고</label>
                    <p className="mt-1 text-sm text-gray-900">{viewingProduct.stockQuantity}개</p>
                  </div>
                </div>

                {/* 상품 설명 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">상품 설명</label>
                  <p className="mt-1 text-sm text-gray-900">{viewingProduct.description}</p>
                </div>

                {/* 스펙 정보 */}
                {viewingProduct.specifications && Object.keys(viewingProduct.specifications).length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">상품 사양</label>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <dl className="grid grid-cols-2 gap-2">
                        {Object.entries(viewingProduct.specifications).map(([key, value]) => (
                          <div key={key}>
                            <dt className="text-xs font-medium text-gray-500">{key}</dt>
                            <dd className="text-sm text-gray-900">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </div>
                )}

                {/* 액션 버튼 */}
                {viewingProduct.approvalStatus === 'pending' && (
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      onClick={() => {
                        handleReject(viewingProduct.id);
                        setViewingProduct(null);
                      }}
                      className="bg-red-600 text-white px-4 py-2 text-sm rounded hover:bg-red-700"
                    >
                      반려
                    </button>
                    <button
                      onClick={() => {
                        handleApprove(viewingProduct.id);
                        setViewingProduct(null);
                      }}
                      className="bg-green-600 text-white px-4 py-2 text-sm rounded hover:bg-green-700"
                    >
                      승인
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}