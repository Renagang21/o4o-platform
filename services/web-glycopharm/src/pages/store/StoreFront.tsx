import { NavLink, useParams } from 'react-router-dom';
import { ArrowRight, Star, Package, Truck, Shield } from 'lucide-react';

// Mock products
const featuredProducts = [
  { id: '1', name: '프리스타일 리브레2 센서', price: 50000, rating: 4.8, reviews: 128, image: null },
  { id: '2', name: '덱스콤 G7 스타터킷', price: 120000, rating: 4.9, reviews: 86, image: null },
  { id: '3', name: '아큐첵 가이드 측정기', price: 35000, rating: 4.7, reviews: 204, image: null },
  { id: '4', name: '당뇨 영양바 (10개입)', price: 15000, rating: 4.5, reviews: 312, image: null },
];

const categories = [
  { name: '연속혈당측정기', count: 12, icon: '📊' },
  { name: '혈당측정기', count: 25, icon: '🩸' },
  { name: '건강기능식품', count: 45, icon: '💊' },
  { name: '당뇨식품', count: 38, icon: '🥗' },
];

export default function StoreFront() {
  const { pharmacyId } = useParams();

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-r from-primary-600 to-accent-600 rounded-3xl overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="relative px-8 py-12 md:py-16">
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-4">
            혈당관리 전문 약국에 오신 것을
            <br />환영합니다
          </h1>
          <p className="text-white/80 mb-6 max-w-lg">
            CGM, 혈당측정기, 건강기능식품까지 다양한 혈당관리 제품을 만나보세요.
          </p>
          <NavLink
            to={`/store/${pharmacyId}/products`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary-700 font-medium rounded-xl hover:bg-primary-50 transition-colors"
          >
            상품 둘러보기
            <ArrowRight className="w-4 h-4" />
          </NavLink>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="grid grid-cols-3 gap-4">
        <div className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
            <Package className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <p className="font-medium text-slate-800 text-sm">정품 보장</p>
            <p className="text-xs text-slate-500">공식 유통 제품</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <Truck className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-slate-800 text-sm">빠른 배송</p>
            <p className="text-xs text-slate-500">당일/익일 배송</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <Shield className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-slate-800 text-sm">약사 상담</p>
            <p className="text-xs text-slate-500">전문 상담 제공</p>
          </div>
        </div>
      </div>

      {/* Categories */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800">카테고리</h2>
          <NavLink
            to={`/store/${pharmacyId}/products`}
            className="text-sm text-primary-600 font-medium flex items-center gap-1"
          >
            전체보기 <ArrowRight className="w-4 h-4" />
          </NavLink>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((category) => (
            <NavLink
              key={category.name}
              to={`/store/${pharmacyId}/products?category=${encodeURIComponent(category.name)}`}
              className="p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all group"
            >
              <span className="text-3xl mb-2 block">{category.icon}</span>
              <h3 className="font-medium text-slate-800 group-hover:text-primary-600 transition-colors">
                {category.name}
              </h3>
              <p className="text-xs text-slate-400">{category.count}개 상품</p>
            </NavLink>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800">인기 상품</h2>
          <NavLink
            to={`/store/${pharmacyId}/products`}
            className="text-sm text-primary-600 font-medium flex items-center gap-1"
          >
            전체보기 <ArrowRight className="w-4 h-4" />
          </NavLink>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {featuredProducts.map((product) => (
            <NavLink
              key={product.id}
              to={`/store/${pharmacyId}/products/${product.id}`}
              className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all group"
            >
              <div className="aspect-square bg-slate-100 flex items-center justify-center">
                <Package className="w-12 h-12 text-slate-300" />
              </div>
              <div className="p-4">
                <h3 className="font-medium text-slate-800 text-sm line-clamp-2 group-hover:text-primary-600 transition-colors">
                  {product.name}
                </h3>
                <div className="flex items-center gap-1 mt-2">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm text-slate-600">{product.rating}</span>
                  <span className="text-xs text-slate-400">({product.reviews})</span>
                </div>
                <p className="text-lg font-bold text-primary-600 mt-2">
                  {product.price.toLocaleString()}원
                </p>
              </div>
            </NavLink>
          ))}
        </div>
      </section>

      {/* Info Section */}
      <section className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">약국 안내</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-slate-700 mb-2">영업시간</h3>
            <div className="space-y-1 text-sm text-slate-600">
              <p>평일: 09:00 - 21:00</p>
              <p>토요일: 09:00 - 18:00</p>
              <p>일요일/공휴일: 휴무</p>
            </div>
          </div>
          <div>
            <h3 className="font-medium text-slate-700 mb-2">배송 안내</h3>
            <div className="space-y-1 text-sm text-slate-600">
              <p>오후 2시 이전 주문 시 당일 발송</p>
              <p>50,000원 이상 구매 시 무료 배송</p>
              <p>도서산간 지역 추가 배송비 발생</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
