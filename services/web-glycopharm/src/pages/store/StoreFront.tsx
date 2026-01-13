/**
 * StoreFront - 약국 몰 메인 페이지
 * Mock 데이터 제거, API 연동 구조
 *
 * Template Store v1 지원:
 * - useTemplate=true로 FranchiseStandardTemplate 사용 가능
 * - 기본값은 기존 UI 유지 (하위 호환)
 */

import { useEffect, useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { ArrowRight, Star, Package, Truck, Shield, AlertCircle, Loader2 } from 'lucide-react';
import { storeApi } from '@/api/store';
import type { PharmacyStore, StoreProduct, StoreCategory, StoreTemplate } from '@/types/store';
import { DEFAULT_STORE_TEMPLATE } from '@/types/store';
import { FranchiseStandardTemplate } from '@/components/store/template';

interface StoreFrontProps {
  /** Template 사용 여부 (기본값: false, 기존 UI 유지) */
  useTemplate?: boolean;
  /** 사용할 Template (기본값: franchise-standard) - 추후 다중 템플릿 지원 예약 */
  template?: StoreTemplate;
}

export default function StoreFront({
  useTemplate = false,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  template: _template = DEFAULT_STORE_TEMPLATE,
}: StoreFrontProps = {}) {
  const { pharmacyId: storeSlug } = useParams<{ pharmacyId: string }>();

  const [store, setStore] = useState<PharmacyStore | null>(null);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storeSlug) return;

    const loadStoreData = async () => {
      setLoading(true);
      setError(null);

      try {
        // 병렬로 데이터 로드
        const [storeRes, categoriesRes, productsRes] = await Promise.all([
          storeApi.getStoreBySlug(storeSlug),
          storeApi.getStoreCategories(storeSlug),
          storeApi.getFeaturedProducts(storeSlug, 4),
        ]);

        if (storeRes.success && storeRes.data) {
          setStore(storeRes.data);
        } else {
          throw new Error('약국 정보를 불러올 수 없습니다.');
        }

        if (categoriesRes.success && categoriesRes.data) {
          setCategories(categoriesRes.data);
        }

        if (productsRes.success && productsRes.data) {
          setFeaturedProducts(productsRes.data);
        }
      } catch (err: any) {
        console.error('Store load error:', err);
        setError(err.message || '데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadStoreData();
  }, [storeSlug]);

  // 로딩 상태
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  // 에러 상태
  if (error || !store) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          {error || '약국을 찾을 수 없습니다'}
        </h2>
        <p className="text-slate-500">
          URL을 확인하시거나 다시 시도해주세요.
        </p>
      </div>
    );
  }

  // Template 사용 시 FranchiseStandardTemplate 렌더링
  if (useTemplate && storeSlug) {
    return (
      <FranchiseStandardTemplate
        store={store}
        storeSlug={storeSlug}
        products={featuredProducts}
        categories={categories}
      />
    );
  }

  // 기존 UI (하위 호환)
  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-r from-primary-600 to-accent-600 rounded-3xl overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="relative px-8 py-12 md:py-16">
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-4">
            {store.name}에 오신 것을
            <br />환영합니다
          </h1>
          <p className="text-white/80 mb-6 max-w-lg">
            {store.description || 'CGM, 혈당측정기, 건강기능식품까지 다양한 혈당관리 제품을 만나보세요.'}
          </p>
          {store.franchiseName && (
            <p className="text-white/60 text-sm mb-4">
              {store.franchiseName} 소속
            </p>
          )}
          <NavLink
            to={`/store/${storeSlug}/products`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary-700 font-medium rounded-xl hover:bg-primary-50 transition-colors"
          >
            상품 둘러보기
            <ArrowRight className="w-4 h-4" />
          </NavLink>
        </div>
      </div>

      {/* Trust Badges - UX Trust Rules v1: 아이콘 gray-500 통일 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
            <Package className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <p className="font-medium text-slate-800 text-sm">정품 보장</p>
            <p className="text-xs text-slate-500">공식 유통 제품</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
            <Truck className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <p className="font-medium text-slate-800 text-sm">빠른 배송</p>
            <p className="text-xs text-slate-500">
              {store.shippingInfo.freeShippingThreshold.toLocaleString()}원 이상 무료
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
            <Shield className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <p className="font-medium text-slate-800 text-sm">약사 상담</p>
            <p className="text-xs text-slate-500">전문 상담 제공</p>
          </div>
        </div>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800">카테고리</h2>
            <NavLink
              to={`/store/${storeSlug}/products`}
              className="text-sm text-primary-600 font-medium flex items-center gap-1"
            >
              전체보기 <ArrowRight className="w-4 h-4" />
            </NavLink>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((category) => (
              <NavLink
                key={category.id}
                to={`/store/${storeSlug}/products?category=${category.id}`}
                className="p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all group"
              >
                {category.icon && <span className="text-3xl mb-2 block">{category.icon}</span>}
                <h3 className="font-medium text-slate-800 group-hover:text-primary-600 transition-colors">
                  {category.name}
                </h3>
                <p className="text-xs text-slate-400">{category.productCount}개 상품</p>
              </NavLink>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800">인기 상품</h2>
            <NavLink
              to={`/store/${storeSlug}/products`}
              className="text-sm text-primary-600 font-medium flex items-center gap-1"
            >
              전체보기 <ArrowRight className="w-4 h-4" />
            </NavLink>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {featuredProducts.map((product) => (
              <NavLink
                key={product.id}
                to={`/store/${storeSlug}/products/${product.id}`}
                className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all group"
              >
                <div className="aspect-square bg-slate-100 flex items-center justify-center">
                  {product.thumbnailUrl ? (
                    <img src={product.thumbnailUrl} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-12 h-12 text-slate-300" />
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-slate-800 text-sm line-clamp-2 group-hover:text-primary-600 transition-colors">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-1 mt-2">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm text-slate-600">{product.rating.toFixed(1)}</span>
                    <span className="text-xs text-slate-400">({product.reviewCount})</span>
                  </div>
                  <div className="mt-2">
                    {product.salePrice ? (
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-red-600">
                          {product.salePrice.toLocaleString()}원
                        </span>
                        <span className="text-sm text-slate-400 line-through">
                          {product.price.toLocaleString()}원
                        </span>
                      </div>
                    ) : (
                      <span className="text-lg font-bold text-primary-600">
                        {product.price.toLocaleString()}원
                      </span>
                    )}
                  </div>
                </div>
              </NavLink>
            ))}
          </div>
        </section>
      )}

      {/* 데이터 없음 상태 */}
      {categories.length === 0 && featuredProducts.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl">
          <Package className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">등록된 상품이 없습니다</h3>
          <p className="text-slate-500">곧 다양한 상품이 준비될 예정입니다.</p>
        </div>
      )}

      {/* Info Section */}
      <section className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">약국 안내</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-slate-700 mb-2">영업시간</h3>
            <div className="space-y-1 text-sm text-slate-600">
              <p>평일: {store.operatingHours.weekday.open} - {store.operatingHours.weekday.close}</p>
              {store.operatingHours.saturday && (
                <p>토요일: {store.operatingHours.saturday.open} - {store.operatingHours.saturday.close}</p>
              )}
              {store.operatingHours.sunday ? (
                <p>일요일: {store.operatingHours.sunday.open} - {store.operatingHours.sunday.close}</p>
              ) : (
                <p>일요일/공휴일: 휴무</p>
              )}
              {store.operatingHours.note && (
                <p className="text-slate-500">{store.operatingHours.note}</p>
              )}
            </div>
          </div>
          <div>
            <h3 className="font-medium text-slate-700 mb-2">배송 안내</h3>
            <div className="space-y-1 text-sm text-slate-600">
              <p>{store.shippingInfo.deliveryNote}</p>
              <p>{store.shippingInfo.freeShippingThreshold.toLocaleString()}원 이상 구매 시 무료 배송</p>
              {store.shippingInfo.additionalFee && (
                <p>도서산간 지역 추가 배송비 발생</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 법정 고지 영역 */}
      <footer className="bg-slate-50 rounded-2xl p-6 text-xs text-slate-500 space-y-4">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-slate-700 mb-2">사업자 정보</h4>
            <p>상호: {store.businessName}</p>
            <p>대표자: {store.representativeName}</p>
            <p>사업자등록번호: {store.businessNumber}</p>
            {store.onlineSalesNumber && (
              <p>통신판매업신고: {store.onlineSalesNumber}</p>
            )}
            <p>주소: {store.address}</p>
            <p>전화: {store.phone}</p>
            {store.email && <p>이메일: {store.email}</p>}
          </div>
          <div>
            <h4 className="font-semibold text-slate-700 mb-2">관리약사</h4>
            <p>{store.pharmacistName} (면허번호: {store.pharmacistLicense})</p>

            <h4 className="font-semibold text-slate-700 mt-4 mb-2">배송/환불 책임</h4>
            <p>본 상품은 무재고 판매 방식으로, 공급자가 직접 배송합니다.</p>
            <p>교환/환불은 상품별 정책에 따릅니다.</p>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <p className="text-center">
            (사)한국당뇨협회 협력 | GlycoPharm 플랫폼
          </p>
          <div className="flex justify-center gap-4 mt-2">
            <NavLink to={`/store/${storeSlug}/terms`} className="hover:text-slate-700">이용약관</NavLink>
            <NavLink to={`/store/${storeSlug}/privacy`} className="hover:text-slate-700">개인정보처리방침</NavLink>
          </div>
        </div>
      </footer>
    </div>
  );
}
