import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useProductStore } from '../../stores/productStore';
import { useOrderStore } from '../../stores/orderStore';
import { useAuthStore } from '../../stores/authStore';
import ProductReviews from '../../components/ProductReviews';
import { Retailer } from '../../types/user';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    currentProduct,
    flatCategories,
    fetchProduct,
    isLoading,
    error,
    clearError,
  } = useProductStore();
  
  const { addToCart } = useOrderStore();

  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    if (id) {
      fetchProduct(id);
    }
  }, [id]);

  const getUserGrade = () => {
    if (user?.userType === 'retailer') {
      return (user as Retailer).grade || 'gold';
    }
    return 'gold';
  };

  const getGradePrice = () => {
    if (!currentProduct) return 0;
    const grade = getUserGrade();
    return currentProduct.pricing[grade as keyof typeof currentProduct.pricing];
  };

  const getGradeBadge = () => {
    const grade = getUserGrade();
    const badges = {
      gold: 'bg-yellow-100 text-yellow-800',
      premium: 'bg-purple-100 text-purple-800',
      vip: 'bg-red-100 text-red-800',
    };
    
    const labels = {
      gold: 'GOLD',
      premium: 'PREMIUM',
      vip: 'VIP',
    };

    return (
      <span className={`px-3 py-1 text-sm font-bold rounded ${badges[grade as keyof typeof badges]}`}>
        {labels[grade as keyof typeof labels]} 회원 특가
      </span>
    );
  };

  const handleAddToCart = async () => {
    if (!currentProduct) return;
    
    try {
      await addToCart(currentProduct.id, quantity);
      toast.success(`${quantity}개가 장바구니에 추가되었습니다!`);
    } catch (error) {
      toast.error('장바구니 추가에 실패했습니다.');
    }
  };

  const getCategoryName = (categoryId: string) => {
    const category = flatCategories.find(cat => cat.id === categoryId);
    return category?.name || '미분류';
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  const getDiscountRate = () => {
    if (!currentProduct) return 0;
    const basePrice = currentProduct.basePrice;
    const gradePrice = getGradePrice();
    return Math.round(((basePrice - gradePrice) / basePrice) * 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-2 text-gray-600">상품 정보를 불러오는 중...</p>
      </div>
    );
  }

  if (error || !currentProduct) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">상품을 찾을 수 없습니다</h3>
          <p className="mt-1 text-sm text-gray-500">{error || '요청하신 상품이 존재하지 않습니다.'}</p>
          <button
            onClick={() => navigate('/retailer/products')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            상품 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const gradePrice = getGradePrice();
  const discountRate = getDiscountRate();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <button
              onClick={() => navigate('/retailer/products')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              상품 목록으로 돌아가기
            </button>
            <div className="flex space-x-4">
              <button
                onClick={() => navigate('/retailer/cart')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                🛒 장바구니
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-8 lg:items-start">
          {/* 이미지 갤러리 */}
          <div className="flex flex-col-reverse">
            {/* 썸네일 이미지 */}
            <div className="hidden mt-6 w-full max-w-2xl mx-auto sm:block lg:max-w-none">
              <div className="grid grid-cols-4 gap-6">
                {currentProduct.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`relative h-24 bg-white rounded-md flex items-center justify-center text-sm font-medium uppercase text-gray-900 cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring focus:ring-opacity-50 focus:ring-offset-4 ${
                      index === selectedImage ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <span className="sr-only">이미지 {index + 1}</span>
                    <img
                      src={image}
                      alt={`${currentProduct.name} ${index + 1}`}
                      className="w-full h-full object-cover object-center rounded-md"
                      onError={(e) => {
                        e.currentTarget.src = '/images/placeholder.jpg';
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* 메인 이미지 */}
            <div className="w-full aspect-w-1 aspect-h-1">
              <img
                src={currentProduct.images[selectedImage] || '/images/placeholder.jpg'}
                alt={currentProduct.name}
                className="w-full h-96 object-cover object-center sm:rounded-lg"
                onError={(e) => {
                  e.currentTarget.src = '/images/placeholder.jpg';
                }}
              />
            </div>
          </div>

          {/* 상품 정보 */}
          <div className="mt-10 px-4 sm:px-0 sm:mt-16 lg:mt-0">
            {/* 카테고리 */}
            <div className="mb-4">
              <span className="text-sm text-gray-500">
                {currentProduct.categories.map(catId => getCategoryName(catId)).join(' > ')}
              </span>
            </div>

            {/* 상품명 */}
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
              {currentProduct.name}
            </h1>

            {/* 브랜드 및 모델 */}
            <div className="mt-3">
              <p className="text-xl text-gray-600">
                {currentProduct.brand} {currentProduct.model}
              </p>
            </div>

            {/* 평점 및 리뷰 */}
            <div className="mt-3 flex items-center">
              <div className="flex items-center">
                {[0, 1, 2, 3, 4].map((rating: any) => (
                  <svg
                    key={rating}
                    className={`${
                      currentProduct.rating > rating ? 'text-yellow-400' : 'text-gray-300'
                    } h-5 w-5 flex-shrink-0`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="ml-3 text-sm text-gray-500">
                {currentProduct.rating.toFixed(1)}점 ({currentProduct.reviewCount}개 리뷰)
              </p>
            </div>

            {/* 가격 */}
            <div className="mt-6">
              {getGradeBadge()}
              
              <div className="mt-3">
                {discountRate > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-lg text-gray-400 line-through">
                      ₩{formatPrice(currentProduct.basePrice)}
                    </span>
                    <span className="text-lg font-bold text-red-600">
                      {discountRate}% 할인
                    </span>
                  </div>
                )}
                <p className="text-3xl text-gray-900 font-bold">
                  ₩{formatPrice(gradePrice)}
                </p>
              </div>
            </div>

            {/* 재고 및 주문 수량 */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-900">재고</span>
                <span className={`text-sm ${currentProduct.stockQuantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {currentProduct.stockQuantity}개 남음
                </span>
              </div>

              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-900">최소 주문 수량</span>
                <span className="text-sm text-gray-600">
                  {currentProduct.minOrderQuantity}개
                </span>
              </div>

              {currentProduct.maxOrderQuantity && (
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-900">최대 주문 수량</span>
                  <span className="text-sm text-gray-600">
                    {currentProduct.maxOrderQuantity}개
                  </span>
                </div>
              )}
            </div>

            {/* 수량 선택 */}
            <div className="mt-6">
              <div className="flex items-center">
                <label htmlFor="quantity" className="text-sm font-medium text-gray-900 mr-4">
                  수량
                </label>
                <select
                  id="quantity"
                  value={quantity}
                  onChange={(e: any) => setQuantity(Number(e.target.value))}
                  className="max-w-full rounded-md border border-gray-300 py-1.5 text-base leading-5 font-medium text-gray-700 text-left shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  {Array.from({ length: Math.min(50, currentProduct.stockQuantity) }, (_, i) => i + 1).map((num: any) => (
                    <option key={num} value={num}>
                      {num}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 구매 버튼 */}
            <div className="mt-8 space-y-3">
              <button
                onClick={handleAddToCart}
                disabled={currentProduct.stockQuantity === 0}
                className={`w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white ${
                  currentProduct.stockQuantity === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }`}
              >
                {currentProduct.stockQuantity === 0 ? '품절' : '장바구니에 담기'}
              </button>
              
              <button
                onClick={() => {
                  handleAddToCart();
                  setTimeout(() => navigate('/retailer/cart'), 1000);
                }}
                disabled={currentProduct.stockQuantity === 0}
                className={`w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md ${
                  currentProduct.stockQuantity === 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-900 text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900'
                }`}
              >
                {currentProduct.stockQuantity === 0 ? '품절' : '바로 주문하기'}
              </button>
            </div>

            {/* 상품 설명 */}
            <div className="mt-10">
              <h3 className="text-lg font-medium text-gray-900">상품 설명</h3>
              <div className="mt-4 prose prose-sm text-gray-500">
                <p>{currentProduct.description}</p>
              </div>
            </div>

            {/* 상품 스펙 */}
            {currentProduct.specifications && Object.keys(currentProduct.specifications).length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-900">상품 사양</h3>
                <div className="mt-4">
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                    {Object.entries(currentProduct.specifications).map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-sm font-medium text-gray-500">{key}</dt>
                        <dd className="mt-1 text-sm text-gray-900">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 상품 리뷰 섹션 */}
        <div className="mt-16 bg-white rounded-lg shadow p-6">
          <ProductReviews productId={currentProduct.id} productName={currentProduct.name} />
        </div>
      </div>
    </div>
  );
}