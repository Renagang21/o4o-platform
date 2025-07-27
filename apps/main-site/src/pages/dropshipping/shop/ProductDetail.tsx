import { useState, useEffect, FC } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Star, Heart, Share2, ShoppingCart, Truck, Shield, 
  RefreshCw, Award, ChevronRight, Plus, Minus,
  ThumbsUp, MessageCircle, Camera, ChevronDown
} from 'lucide-react';
import Navbar from '../../../components/Navbar';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  rating: number;
  reviewCount: number;
  images: string[];
  category: string;
  brand: string;
  isFreeShipping: boolean;
  isRocket: boolean;
  tags: string[];
  description: string;
  specifications: { [key: string]: string };
  benefits: string[];
  ingredients?: string[];
}

interface Review {
  id: string;
  userName: string;
  rating: number;
  date: string;
  content: string;
  images?: string[];
  helpful: number;
}

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [activeTab, setActiveTab] = useState('description');

  useEffect(() => {
    // 모의 상품 데이터
    const mockProduct: Product = {
      id: id || '1',
      name: '프리미엄 오메가3 1000mg 90캡슐',
      price: 29900,
      originalPrice: 45000,
      discount: 34,
      rating: 4.8,
      reviewCount: 2847,
      images: [
        '/products/omega3-1.jpg',
        '/products/omega3-2.jpg',
        '/products/omega3-3.jpg',
        '/products/omega3-4.jpg'
      ],
      category: 'supplements',
      brand: '네이처메이드',
      isFreeShipping: true,
      isRocket: true,
      tags: ['베스트셀러', '리뷰많은', '의사추천'],
      description: `고품질 오메가3 지방산으로 심혈관 건강과 두뇌 건강을 동시에 관리하세요. 
        분자증류법으로 정제된 순수한 EPA/DHA 성분이 함유되어 있어 흡수율이 뛰어납니다.`,
      specifications: {
        '용량': '90캡슐 (3개월분)',
        '복용법': '1일 1캡슐, 식후 복용',
        '주요성분': 'EPA 180mg, DHA 120mg',
        '원산지': '미국',
        '제조사': 'Nature Made',
        '유통기한': '제조일로부터 24개월'
      },
      benefits: [
        '심혈관 건강 개선',
        '두뇌 기능 향상',
        '항염 효과',
        '관절 건강 지원',
        '시력 보호'
      ],
      ingredients: [
        '정제어유(EPA, DHA)',
        '젤라틴',
        '글리세린',
        '정제수',
        '비타민E'
      ]
    };

    const mockReviews: Review[] = [
      {
        id: '1',
        userName: '김**',
        rating: 5,
        date: '2025.01.15',
        content: '의사가 추천해서 구매했는데 정말 좋네요. 3개월째 복용 중인데 혈관 건강이 좋아진 것 같아요.',
        helpful: 24
      },
      {
        id: '2',
        userName: '이**',
        rating: 4,
        date: '2025.01.10',
        content: '캡슐이 크긴 하지만 삼키기 어렵지 않고, 비린내도 거의 없어서 만족합니다.',
        helpful: 18
      },
      {
        id: '3',
        userName: '박**',
        rating: 5,
        date: '2025.01.08',
        content: '가족 모두 함께 먹고 있어요. 로켓배송으로 빨리 받아서 좋았습니다.',
        helpful: 15
      }
    ];

    setProduct(mockProduct);
    setReviews(mockReviews);
  }, [id]);

  const handleAddToCart = () => {
    // 장바구니 추가 로직
    alert(`${quantity}개가 장바구니에 추가되었습니다.`);
  };

  const handleBuyNow = () => {
    // 즉시 구매 로직
    alert('구매 페이지로 이동합니다.');
  };

  if (!product) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">상품 정보를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* 상단 네비게이션 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Link to="/dropshipping" className="hover:text-blue-600">홈</Link>
            <ChevronRight className="w-4 h-4" />
            <Link to={`/dropshipping/category/${product.category}`} className="hover:text-blue-600">
              {product.category}
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900">{product.name}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* 왼쪽: 상품 이미지 */}
          <div className="space-y-4">
            <div className="relative bg-white rounded-xl p-4">
              <img
                src={product.images[selectedImage]}
                alt={product.name}
                className="w-full h-96 object-cover rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/api/placeholder/400/400';
                }}
              />
              {product.discount && (
                <div className="absolute top-6 right-6 bg-red-500 text-white px-3 py-1 rounded-lg font-bold">
                  {product.discount}% 할인
                </div>
              )}
            </div>
            
            {/* 썸네일 이미지들 */}
            <div className="flex gap-2 overflow-x-auto">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg border-2 overflow-hidden ${
                    selectedImage === index ? 'border-blue-500' : 'border-gray-200'
                  }`}
                >
                  <img
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/api/placeholder/80/80';
                    }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* 오른쪽: 상품 정보 */}
          <div className="space-y-6">
            <div>
              <div className="text-sm text-blue-600 font-medium mb-2">{product.brand}</div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
                {product.name}
              </h1>
              
              {/* 평점 및 리뷰 */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < Math.floor(product.rating) 
                            ? 'text-yellow-400 fill-current' 
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-medium text-gray-900">{product.rating}</span>
                  <span className="text-gray-600">({product.reviewCount.toLocaleString()}개 리뷰)</span>
                </div>
              </div>

              {/* 태그들 */}
              <div className="flex flex-wrap gap-2 mb-6">
                {product.tags.map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* 가격 정보 */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="space-y-3">
                {product.originalPrice && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 line-through text-lg">
                      {product.originalPrice.toLocaleString()}원
                    </span>
                    <span className="text-red-500 font-bold text-lg">
                      {product.discount}% 할인
                    </span>
                  </div>
                )}
                
                <div className="text-3xl font-bold text-gray-900">
                  {product.price.toLocaleString()}원
                </div>
                
                <div className="flex items-center gap-4 text-sm">
                  {product.isRocket && (
                    <div className="flex items-center gap-1 text-orange-600">
                      <Truck className="w-4 h-4" />
                      <span className="font-medium">로켓배송</span>
                    </div>
                  )}
                  {product.isFreeShipping && (
                    <div className="flex items-center gap-1 text-green-600">
                      <Shield className="w-4 h-4" />
                      <span className="font-medium">무료배송</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 수량 선택 및 구매 버튼 */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">수량</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-medium">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t">
                  <span className="font-medium text-gray-900">총 금액</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {(product.price * quantity).toLocaleString()}원
                  </span>
                </div>
              </div>
            </div>

            {/* 액션 버튼들 */}
            <div className="space-y-3">
              <button
                onClick={handleBuyNow}
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors"
              >
                바로 구매하기
              </button>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleAddToCart}
                  className="flex items-center justify-center gap-2 bg-white border-2 border-blue-600 text-blue-600 py-3 rounded-xl font-medium hover:bg-blue-50 transition-colors"
                >
                  <ShoppingCart className="w-5 h-5" />
                  장바구니
                </button>
                
                <button
                  onClick={() => setIsWishlisted(!isWishlisted)}
                  className={`flex items-center justify-center gap-2 border-2 py-3 rounded-xl font-medium transition-colors ${
                    isWishlisted 
                      ? 'bg-red-50 border-red-500 text-red-500' 
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
                  찜하기
                </button>
              </div>
              
              <button className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors">
                <Share2 className="w-5 h-5" />
                공유하기
              </button>
            </div>
          </div>
        </div>

        {/* 상품 상세 정보 탭 */}
        <div className="mt-16">
          <div className="border-b border-gray-200">
            <div className="flex gap-8">
              {[
                { id: 'description', name: '상품설명' },
                { id: 'specifications', name: '상품정보' },
                { id: 'reviews', name: `리뷰 (${product.reviewCount.toLocaleString()})` },
                { id: 'qna', name: '문의' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-4 font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </div>
          </div>

          <div className="py-8">
            {activeTab === 'description' && (
              <div className="bg-white rounded-xl p-8">
                <h3 className="text-xl font-bold mb-6">상품 설명</h3>
                <div className="prose max-w-none">
                  <p className="text-gray-700 leading-relaxed mb-6">{product.description}</p>
                  
                  <h4 className="text-lg font-semibold mb-4">주요 효능</h4>
                  <ul className="space-y-2 mb-6">
                    {product.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-green-500" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                  
                  {product.ingredients && (
                    <>
                      <h4 className="text-lg font-semibold mb-4">주요 성분</h4>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p>{product.ingredients.join(', ')}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'specifications' && (
              <div className="bg-white rounded-xl p-8">
                <h3 className="text-xl font-bold mb-6">상품 정보</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-3 border-b border-gray-100">
                      <span className="font-medium text-gray-600">{key}</span>
                      <span className="text-gray-900">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold">고객 리뷰</h3>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                      리뷰 작성하기
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                    {reviews.map((review) => (
                      <div key={review.id} className="border-b border-gray-100 pb-6 last:border-b-0">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="font-medium">{review.userName}</span>
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < review.rating 
                                      ? 'text-yellow-400 fill-current' 
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-gray-500">{review.date}</span>
                          </div>
                        </div>
                        
                        <p className="text-gray-700 mb-3">{review.content}</p>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <button className="flex items-center gap-1 text-gray-600 hover:text-blue-600">
                            <ThumbsUp className="w-4 h-4" />
                            도움돼요 ({review.helpful})
                          </button>
                          <button className="flex items-center gap-1 text-gray-600 hover:text-blue-600">
                            <MessageCircle className="w-4 h-4" />
                            댓글
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'qna' && (
              <div className="bg-white rounded-xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">상품 문의</h3>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                    문의하기
                  </button>
                </div>
                
                <div className="text-center py-12 text-gray-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>아직 문의가 없습니다.</p>
                  <p className="text-sm">궁금한 점이 있으시면 언제든 문의해주세요.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;