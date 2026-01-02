import { useState } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import {
  ArrowLeft,
  Star,
  Package,
  Minus,
  Plus,
  ShoppingCart,
  Heart,
  Share2,
  Truck,
  Shield,
  RefreshCw,
} from 'lucide-react';

// Mock product data
const mockProduct = {
  id: '1',
  name: '프리스타일 리브레2 센서',
  description: `프리스타일 리브레2는 실시간 연속혈당측정 시스템입니다.

주요 특징:
- 14일간 연속 혈당 측정
- 1분 간격 자동 혈당 측정
- 스마트폰 앱 연동
- 고/저혈당 알람 기능
- 방수 설계 (수영 가능)

구성품:
- 리브레2 센서 1개
- 센서 어플리케이터
- 사용설명서`,
  category: '연속혈당측정기',
  price: 50000,
  discountPrice: 45000,
  rating: 4.8,
  reviews: 128,
  stock: 25,
  images: [],
  supplier: 'Abbott Korea',
};

export default function StoreProductDetail() {
  const { pharmacyId } = useParams();
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');

  const product = mockProduct;

  const handleQuantityChange = (delta: number) => {
    const newQty = quantity + delta;
    if (newQty >= 1 && newQty <= product.stock) {
      setQuantity(newQty);
    }
  };

  const totalPrice = (product.discountPrice || product.price) * quantity;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <NavLink
        to={`/store/${pharmacyId}/products`}
        className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800"
      >
        <ArrowLeft className="w-4 h-4" />
        상품 목록
      </NavLink>

      {/* Product Main */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Images */}
        <div className="space-y-4">
          <div className="aspect-square bg-white rounded-2xl shadow-sm flex items-center justify-center">
            <Package className="w-24 h-24 text-slate-200" />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="aspect-square bg-white rounded-xl shadow-sm flex items-center justify-center cursor-pointer hover:ring-2 ring-primary-500"
              >
                <Package className="w-8 h-8 text-slate-200" />
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-6">
          <div>
            <span className="text-sm text-primary-600 font-medium">{product.category}</span>
            <h1 className="text-2xl font-bold text-slate-800 mt-1">{product.name}</h1>
            <p className="text-sm text-slate-500 mt-1">판매자: {product.supplier}</p>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${
                    i <= Math.floor(product.rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-slate-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-slate-600">{product.rating}</span>
            <span className="text-slate-400">({product.reviews}개 리뷰)</span>
          </div>

          {/* Price */}
          <div className="py-4 border-y">
            {product.discountPrice ? (
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-red-600 font-medium">
                    {Math.round((1 - product.discountPrice / product.price) * 100)}%
                  </span>
                  <span className="text-slate-400 line-through">
                    {product.price.toLocaleString()}원
                  </span>
                </div>
                <p className="text-3xl font-bold text-slate-800 mt-1">
                  {product.discountPrice.toLocaleString()}원
                </p>
              </div>
            ) : (
              <p className="text-3xl font-bold text-slate-800">
                {product.price.toLocaleString()}원
              </p>
            )}
          </div>

          {/* Quantity */}
          <div className="flex items-center gap-4">
            <span className="text-slate-700 font-medium">수량</span>
            <div className="flex items-center border rounded-xl">
              <button
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
                className="p-2 hover:bg-slate-100 disabled:opacity-50"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="w-12 text-center font-medium">{quantity}</span>
              <button
                onClick={() => handleQuantityChange(1)}
                disabled={quantity >= product.stock}
                className="p-2 hover:bg-slate-100 disabled:opacity-50"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <span className="text-sm text-slate-400">재고 {product.stock}개</span>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <span className="text-slate-700 font-medium">총 상품금액</span>
            <span className="text-2xl font-bold text-primary-600">
              {totalPrice.toLocaleString()}원
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button className="p-3 border rounded-xl hover:bg-slate-50">
              <Heart className="w-6 h-6 text-slate-400" />
            </button>
            <button className="p-3 border rounded-xl hover:bg-slate-50">
              <Share2 className="w-6 h-6 text-slate-400" />
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors">
              <ShoppingCart className="w-5 h-5" />
              장바구니
            </button>
            <button className="flex-1 py-3 bg-slate-800 text-white font-medium rounded-xl hover:bg-slate-900 transition-colors">
              바로구매
            </button>
          </div>

          {/* Badges */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-2 p-3 bg-white border rounded-xl">
              <Truck className="w-5 h-5 text-primary-600" />
              <div>
                <p className="text-xs font-medium text-slate-800">무료배송</p>
                <p className="text-[10px] text-slate-400">5만원 이상</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-white border rounded-xl">
              <Shield className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-xs font-medium text-slate-800">정품보장</p>
                <p className="text-[10px] text-slate-400">공식유통</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-white border rounded-xl">
              <RefreshCw className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs font-medium text-slate-800">교환/반품</p>
                <p className="text-[10px] text-slate-400">7일 이내</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="flex border-b">
          {[
            { id: 'description', label: '상품설명' },
            { id: 'reviews', label: `리뷰 (${product.reviews})` },
            { id: 'inquiry', label: '문의' },
            { id: 'shipping', label: '배송/교환/반품' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-4 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'description' && (
            <div className="prose max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-slate-700">
                {product.description}
              </pre>
            </div>
          )}
          {activeTab === 'reviews' && (
            <div className="text-center py-8">
              <p className="text-slate-500">리뷰 기능은 준비 중입니다.</p>
            </div>
          )}
          {activeTab === 'inquiry' && (
            <div className="text-center py-8">
              <p className="text-slate-500">문의 기능은 준비 중입니다.</p>
            </div>
          )}
          {activeTab === 'shipping' && (
            <div className="space-y-4 text-sm text-slate-700">
              <div>
                <h4 className="font-medium mb-2">배송 안내</h4>
                <p>- 50,000원 이상 구매 시 무료배송</p>
                <p>- 오후 2시 이전 주문 시 당일 발송</p>
                <p>- 도서산간 지역 추가 배송비 발생</p>
              </div>
              <div>
                <h4 className="font-medium mb-2">교환/반품 안내</h4>
                <p>- 상품 수령 후 7일 이내 교환/반품 가능</p>
                <p>- 단순 변심의 경우 왕복 배송비 고객 부담</p>
                <p>- 의료기기 특성상 개봉 후 교환/반품 불가</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
