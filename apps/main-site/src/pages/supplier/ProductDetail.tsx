import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useProductStore } from '../../stores/productStore';
import { useAuthStore } from '../../stores/authStore';
import { Product } from '../../types/product';

export default function ProductDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuthStore();
  
  const {
    currentProduct,
    fetchProduct,
    updateProductStatus,
    deleteProduct,
    flatCategories,
    isLoading,
    error,
  } = useProductStore();

  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    if (id) {
      fetchProduct(id);
    }
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !currentProduct) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">상품을 찾을 수 없습니다</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <button
            onClick={() => navigate('/supplier/products')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const handleStatusChange = async (newStatus: Product['status']) => {
    try {
      await updateProductStatus(currentProduct.id, newStatus);
      toast.success('상품 상태가 변경되었습니다.');
    } catch (err) {
      toast.error('상태 변경에 실패했습니다.');
    }
  };

  const handleDelete = async () => {
    if (confirm('정말로 이 상품을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      try {
        await deleteProduct(currentProduct.id);
        toast.success('상품이 삭제되었습니다.');
        navigate('/supplier/products');
      } catch (err) {
        toast.error('삭제에 실패했습니다.');
      }
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
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${badges[status]}`}>
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
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/supplier/products')}
                className="text-gray-600 hover:text-gray-900"
              >
                ← 목록으로
              </button>
              <h1 className="text-3xl font-bold text-gray-900">상품 상세</h1>
              {getStatusBadge(currentProduct.status)}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => navigate(`/supplier/products/${currentProduct.id}/edit`)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                수정
              </button>
              <button
                onClick={handleDelete}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* 상품 이미지 */}
          <div>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="aspect-w-1 aspect-h-1">
                <img
                  src={currentProduct.images[activeImageIndex] || '/images/placeholder.jpg'}
                  alt={currentProduct.name}
                  className="w-full h-96 object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '/images/placeholder.jpg';
                  }}
                />
              </div>
              {currentProduct.images.length > 1 && (
                <div className="p-4">
                  <div className="flex space-x-2 overflow-x-auto">
                    {currentProduct.images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setActiveImageIndex(index)}
                        className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                          activeImageIndex === index ? 'border-blue-500' : 'border-gray-200'
                        }`}
                      >
                        <img
                          src={image}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '/images/placeholder.jpg';
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 상품 정보 */}
          <div className="space-y-6">
            {/* 기본 정보 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{currentProduct.name}</h2>
              
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">브랜드</dt>
                  <dd className="mt-1 text-sm text-gray-900">{currentProduct.brand || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">모델</dt>
                  <dd className="mt-1 text-sm text-gray-900">{currentProduct.model || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">카테고리</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {currentProduct.categories.map(catId => getCategoryName(catId)).join(', ')}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">등록일</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(currentProduct.createdAt).toLocaleDateString()}
                  </dd>
                </div>
              </dl>

              <div className="mt-4">
                <dt className="text-sm font-medium text-gray-500">간단 설명</dt>
                <dd className="mt-1 text-sm text-gray-900">{currentProduct.shortDescription}</dd>
              </div>
            </div>

            {/* 가격 정보 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">가격 정보</h3>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">기본가</dt>
                  <dd className="mt-1 text-lg font-semibold text-gray-900">₩{formatPrice(currentProduct.basePrice)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Gold 가격</dt>
                  <dd className="mt-1 text-lg font-semibold text-yellow-600">₩{formatPrice(currentProduct.pricing.gold)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Premium 가격</dt>
                  <dd className="mt-1 text-lg font-semibold text-purple-600">₩{formatPrice(currentProduct.pricing.premium)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">VIP 가격</dt>
                  <dd className="mt-1 text-lg font-semibold text-red-600">₩{formatPrice(currentProduct.pricing.vip)}</dd>
                </div>
              </div>
            </div>

            {/* 재고 정보 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">재고 및 주문 정보</h3>
              
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">현재 재고</dt>
                  <dd className={`mt-1 text-lg font-semibold ${
                    currentProduct.stockQuantity > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {currentProduct.stockQuantity}개
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">최소 주문 수량</dt>
                  <dd className="mt-1 text-sm text-gray-900">{currentProduct.minOrderQuantity}개</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">최대 주문 수량</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {currentProduct.maxOrderQuantity ? `${currentProduct.maxOrderQuantity}개` : '제한 없음'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">판매량</dt>
                  <dd className="mt-1 text-sm text-gray-900">{currentProduct.salesCount}개</dd>
                </div>
              </dl>
            </div>

            {/* 상태 관리 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">상태 관리</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    판매 상태 변경
                  </label>
                  <select
                    value={currentProduct.status}
                    onChange={(e: any) => handleStatusChange(e.target.value as Product['status'])}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="draft">임시저장</option>
                    <option value="pending">승인요청</option>
                    <option value="active">판매시작</option>
                    <option value="inactive">판매중지</option>
                    <option value="discontinued">단종</option>
                  </select>
                </div>

                {currentProduct.approvalStatus === 'pending' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                          관리자 승인을 기다리고 있습니다.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 상세 설명 */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">상세 설명</h3>
          <div className="prose max-w-none">
            <p className="whitespace-pre-wrap">{currentProduct.description}</p>
          </div>
        </div>

        {/* 상품 규격 */}
        {currentProduct.specifications && Object.keys(currentProduct.specifications).length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">상품 규격</h3>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Object.entries(currentProduct.specifications).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-sm font-medium text-gray-500">{key}</dt>
                  <dd className="mt-1 text-sm text-gray-900">{value}</dd>
                </div>
              ))}
              {currentProduct.weight && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">무게</dt>
                  <dd className="mt-1 text-sm text-gray-900">{currentProduct.weight}kg</dd>
                </div>
              )}
              {currentProduct.dimensions && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">크기</dt>
                  <dd className="mt-1 text-sm text-gray-900">{currentProduct.dimensions}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* 통계 정보 */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">통계 정보</h3>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">조회수</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900">{currentProduct.viewCount}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">판매량</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900">{currentProduct.salesCount}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">평점</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900">
                {currentProduct.rating > 0 ? `${currentProduct.rating}/5.0` : '-'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">리뷰 수</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900">{currentProduct.reviewCount}</dd>
            </div>
          </dl>
        </div>
      </main>
    </div>
  );
}