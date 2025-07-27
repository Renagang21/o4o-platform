import { useState, useEffect, FC } from 'react';
import { Link } from 'react-router-dom';
import { Search, ShoppingCart, User, Star, Truck, Heart, Filter } from 'lucide-react';
import Navbar from '../../../components/Navbar';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  rating: number;
  reviewCount: number;
  image: string;
  category: string;
  brand: string;
  isFreeShipping: boolean;
  isRocket: boolean;
  tags: string[];
}

const ShoppingHome: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: '전체', icon: '🏪' },
    { id: 'pharmacy', name: '의약품', icon: '💊' },
    { id: 'supplements', name: '건강식품', icon: '🌿' },
    { id: 'medical', name: '의료기기', icon: '🏥' },
    { id: 'beauty', name: '뷰티', icon: '💄' },
    { id: 'baby', name: '육아용품', icon: '👶' }
  ];

  useEffect(() => {
    const mockProducts: Product[] = [
      {
        id: '1',
        name: '프리미엄 오메가3 1000mg 90캡슐',
        price: 29900,
        originalPrice: 45000,
        discount: 34,
        rating: 4.8,
        reviewCount: 2847,
        image: '/products/omega3.jpg',
        category: 'supplements',
        brand: '네이처메이드',
        isFreeShipping: true,
        isRocket: true,
        tags: ['베스트셀러', '리뷰많은']
      },
      {
        id: '2',
        name: '종합비타민 멀티비타민 60정',
        price: 19900,
        originalPrice: 25000,
        discount: 20,
        rating: 4.6,
        reviewCount: 1542,
        image: '/products/multivitamin.jpg',
        category: 'supplements',
        brand: '센트룸',
        isFreeShipping: true,
        isRocket: false,
        tags: ['할인중']
      },
      {
        id: '3',
        name: '혈압측정기 자동 전자 혈압계',
        price: 89000,
        originalPrice: 120000,
        discount: 26,
        rating: 4.7,
        reviewCount: 892,
        image: '/products/blood-pressure.jpg',
        category: 'medical',
        brand: '오므론',
        isFreeShipping: true,
        isRocket: true,
        tags: ['특가']
      },
      {
        id: '4',
        name: '프로바이오틱스 유산균 30포',
        price: 39900,
        rating: 4.9,
        reviewCount: 3241,
        image: '/products/probiotics.jpg',
        category: 'supplements',
        brand: '바이오가이아',
        isFreeShipping: true,
        isRocket: true,
        tags: ['신상품', '인기급상승']
      }
    ];
    setProducts(mockProducts);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* 상단 네비게이션 */}
      <Navbar />
      
      {/* 쿠팡 스타일 헤더 */}
      <div className="bg-white border-b-2 border-blue-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <Link to="/dropshipping" className="text-2xl font-bold text-blue-600">
              🛍️ 헬스몰
            </Link>
            
            {/* 검색바 */}
            <div className="flex-1 max-w-2xl mx-8">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="찾고 싶은 상품을 검색해보세요!"
                  className="w-full px-4 py-3 pr-12 text-lg border-2 border-blue-400 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
                <button className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 bg-blue-600 text-white rounded">
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* 우측 메뉴 */}
            <div className="flex items-center gap-6">
              <Link to="/dropshipping/cart" className="flex items-center gap-2 text-gray-700 hover:text-blue-600">
                <ShoppingCart className="w-6 h-6" />
                <span>장바구니</span>
              </Link>
              <Link to="/dropshipping/mypage" className="flex items-center gap-2 text-gray-700 hover:text-blue-600">
                <User className="w-6 h-6" />
                <span>마이페이지</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 카테고리 메뉴 */}
      <div className="bg-gray-50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8 py-4 overflow-x-auto">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-blue-50'
                }`}
              >
                <span className="text-lg">{category.icon}</span>
                <span className="font-medium">{category.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 배너 섹션 */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white p-8 mb-8">
          <h2 className="text-3xl font-bold mb-2">헬스케어 전문몰</h2>
          <p className="text-xl opacity-90">믿을 수 있는 건강 제품을 만나보세요</p>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              <span>무료배송</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              <span>전문가 큐레이션</span>
            </div>
          </div>
        </div>

        {/* 추천 상품 섹션 */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">🔥 오늘의 추천</h2>
            <Link to="/dropshipping/products" className="text-blue-600 hover:text-blue-700 font-medium">
              전체보기 →
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <Link
                key={product.id}
                to={`/dropshipping/product/${product.id}`}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="relative">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/api/placeholder/300/200';
                    }}
                  />
                  {product.isRocket && (
                    <div className="absolute top-3 left-3 bg-orange-500 text-white px-2 py-1 rounded text-xs font-bold">
                      🚀 로켓배송
                    </div>
                  )}
                  {product.discount && (
                    <div className="absolute top-3 right-3 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                      {product.discount}%
                    </div>
                  )}
                  <button className="absolute bottom-3 right-3 p-2 bg-white rounded-full shadow-md hover:bg-gray-50">
                    <Heart className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
                
                <div className="p-4">
                  <div className="text-sm text-gray-500 mb-1">{product.brand}</div>
                  <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">{product.name}</h3>
                  
                  <div className="flex items-center gap-1 mb-2">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < Math.floor(product.rating) 
                              ? 'text-yellow-400 fill-current' 
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">({product.reviewCount.toLocaleString()})</span>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    {product.originalPrice && (
                      <span className="text-sm text-gray-400 line-through">
                        {product.originalPrice.toLocaleString()}원
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-xl font-bold text-gray-900">
                      {product.price.toLocaleString()}원
                    </div>
                    {product.isFreeShipping && (
                      <div className="text-xs text-green-600 font-medium">무료배송</div>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mt-2">
                    {product.tags.map((tag) => (
                      <span key={tag} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 카테고리별 인기상품 */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">카테고리별 인기상품</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.slice(1).map((category) => (
              <Link
                key={category.id}
                to={`/dropshipping/category/${category.id}`}
                className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 hover:shadow-md transition-shadow"
              >
                <div className="text-center">
                  <div className="text-4xl mb-3">{category.icon}</div>
                  <h3 className="font-bold text-gray-900 mb-2">{category.name}</h3>
                  <p className="text-sm text-gray-600">
                    전문가가 선별한 {category.name} 제품들을 만나보세요
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 신뢰도 섹션 */}
        <div className="bg-gray-50 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">왜 헬스몰을 선택해야 할까요?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="text-3xl mb-3">🏥</div>
              <h3 className="font-bold mb-2">전문성</h3>
              <p className="text-gray-600">약사, 영양사가 직접 검증한 제품만 판매</p>
            </div>
            <div>
              <div className="text-3xl mb-3">🚚</div>
              <h3 className="font-bold mb-2">빠른 배송</h3>
              <p className="text-gray-600">로켓배송으로 당일/익일 배송 가능</p>
            </div>
            <div>
              <div className="text-3xl mb-3">🔒</div>
              <h3 className="font-bold mb-2">안전성</h3>
              <p className="text-gray-600">정품만 취급, 100% 품질 보장</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShoppingHome;
