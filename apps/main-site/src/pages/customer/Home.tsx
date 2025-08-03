import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProductStore } from '../../stores/productStore';
import { useOrderStore } from '../../stores/orderStore';
import { useAuthStore } from '../../stores/authStore';
import { Product } from '../../types/product';
import { toast } from 'react-hot-toast';

export default function CustomerHome() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    products,
    categories,
    categoryGroups,
    fetchProducts,
    isLoading,
  } = useProductStore();
  
  const { addToCart } = useOrderStore();

  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [newProducts, setNewProducts] = useState([]);
  const [popularProducts, setPopularProducts] = useState([]);

  useEffect(() => {
    // 활성화된 상품들만 가져오기
    fetchProducts({
      status: 'active',
      approvalStatus: 'approved',
    });
  }, []);

  useEffect(() => {
    if (products.length > 0) {
      // 추천 상품 (평점 높은 순)
      const featured = [...products]
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 8);
      setFeaturedProducts(featured);

      // 신상품 (최신 등록순)
      const newItems = [...products]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8);
      setNewProducts(newItems);

      // 인기상품 (판매량 높은 순)
      const popular = [...products]
        .sort((a, b) => b.salesCount - a.salesCount)
        .slice(0, 8);
      setPopularProducts(popular);
    }
  }, [products]);

  const handleAddToCart = async (productId: string) => {
    if (!user) {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    try {
      await addToCart(productId, 1);
      toast.success('장바구니에 추가되었습니다!');
    } catch (error) {
      toast.error('장바구니 추가에 실패했습니다.');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  const ProductCard = ({ product }: { product: Product }) => (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-t-lg bg-gray-200">
        <img
          src={product.images[0] || '/images/placeholder.jpg'}
          alt={product.name}
          className="h-48 w-full object-cover object-center hover:opacity-75 cursor-pointer"
          onClick={() => navigate(`/customer/products/${product.id}`)}
          onError={(e) => {
            e.currentTarget.src = '/images/placeholder.jpg';
          }}
        />
      </div>
      
      <div className="p-4">
        <h3 
          className="text-sm font-medium text-gray-900 mb-1 cursor-pointer hover:text-blue-600"
          onClick={() => navigate(`/customer/products/${product.id}`)}
        >
          {product.name}
        </h3>
        
        {product.brand && (
          <p className="text-xs text-gray-500 mb-2">{product.brand}</p>
        )}
        
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-bold text-gray-900">
            ₩{formatPrice(product.basePrice)}
          </div>
          
          <div className="flex items-center">
            <span className="text-yellow-400">★</span>
            <span className="text-xs text-gray-600 ml-1">
              {product.rating.toFixed(1)}
            </span>
          </div>
        </div>
        
        <button
          onClick={() => handleAddToCart(product.id)}
          disabled={product.stockQuantity === 0}
          className={`w-full px-3 py-2 text-sm rounded-md ${
            product.stockQuantity === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {product.stockQuantity === 0 ? '품절' : '장바구니 담기'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤로 섹션 */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              O4O 플랫폼에 오신 것을 환영합니다
            </h1>
            <p className="text-xl md:text-2xl mb-8 opacity-90">
              B2B와 B2C를 연결하는 통합 전자상거래 플랫폼
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/customer/products')}
                className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                상품 둘러보기
              </button>
              {!user && (
                <button
                  onClick={() => navigate('/register')}
                  className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
                >
                  회원가입
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 카테고리 섹션 */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            카테고리별 쇼핑
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {categoryGroups.slice(0, 6).map((group: any) => (
              <div
                key={group.id}
                onClick={() => navigate(`/customer/products?category=${group.id}`)}
                className="bg-white rounded-lg p-6 text-center shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl">📦</span>
                </div>
                <h3 className="font-medium text-gray-900">{group.name}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 추천 상품 섹션 */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900">✨ 추천 상품</h2>
            <button
              onClick={() => navigate('/customer/products?sort=rating')}
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              더보기 →
            </button>
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, index) => (
                <div key={index} className="bg-gray-200 rounded-lg h-80 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 신상품 섹션 */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900">🆕 신상품</h2>
            <button
              onClick={() => navigate('/customer/products?sort=newest')}
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              더보기 →
            </button>
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, index) => (
                <div key={index} className="bg-gray-200 rounded-lg h-80 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {newProducts.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 인기상품 섹션 */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900">🔥 인기상품</h2>
            <button
              onClick={() => navigate('/customer/products?sort=popular')}
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              더보기 →
            </button>
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, index) => (
                <div key={index} className="bg-gray-200 rounded-lg h-80 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {popularProducts.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 혜택 안내 섹션 */}
      <section className="py-16 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">🎁 특별 혜택</h2>
            <p className="text-xl opacity-90">O4O 플랫폼만의 특별한 혜택을 누려보세요</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">🚚</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">무료배송</h3>
              <p className="opacity-90">5만원 이상 구매시 전국 무료배송</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">💯</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">품질보장</h3>
              <p className="opacity-90">엄선된 공급업체의 검증된 상품만 판매</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">안전결제</h3>
              <p className="opacity-90">다양한 결제수단과 안전한 결제 시스템</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA 섹션 */}
      {!user && (
        <section className="py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              지금 가입하고 특별 혜택을 받아보세요!
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              회원가입 시 즉시 사용 가능한 쿠폰과 다양한 혜택을 드립니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/register')}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                회원가입하기
              </button>
              <button
                onClick={() => navigate('/login')}
                className="border-2 border-blue-600 text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-600 hover:text-white transition-colors"
              >
                로그인
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}