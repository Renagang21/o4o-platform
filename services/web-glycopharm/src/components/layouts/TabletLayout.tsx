/**
 * Tablet Layout
 * 직원 보조 태블릿 전용 레이아웃
 * - 키오스크보다 더 많은 정보 표시
 * - 직원 보조 주문
 * - 비로그인 주문
 */

import { Outlet, useParams, NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Store,
  ShoppingCart,
  Home,
  Package,
  Search,
  Loader2,
  AlertCircle,
  Settings,
} from 'lucide-react';
import { storeApi } from '@/api/store';
import type { PharmacyStore } from '@/types/store';
import { StoreModeProvider, useStoreMode } from '@/contexts/StoreModeContext';

// 태블릿 헤더 컴포넌트
function TabletHeader({ store }: { store: PharmacyStore }) {
  const { getStorePath } = useStoreMode();
  const [cartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      {/* SEO noindex for tablet */}
      <meta name="robots" content="noindex, nofollow" />

      {/* 상단 바 */}
      <div className="bg-primary-600 text-white py-2 px-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">태블릿 주문 모드</span>
          <span className="text-sm">{store.name}</span>
        </div>
      </div>

      {/* 메인 헤더 */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between gap-6">
          {/* 로고 & 매장명 */}
          <NavLink to={getStorePath()} className="flex items-center gap-3 shrink-0">
            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
              <Store className="w-7 h-7 text-primary-600" />
            </div>
            <div>
              <h1 className="font-bold text-xl text-slate-800">{store.name}</h1>
              <p className="text-sm text-slate-500">직원 보조 주문</p>
            </div>
          </NavLink>

          {/* 검색 */}
          <div className="flex-1 max-w-lg">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="상품 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 text-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex items-center gap-3">
            {/* 장바구니 */}
            <NavLink
              to={getStorePath('cart')}
              className="relative flex items-center gap-2 px-5 py-3 bg-primary-600 text-white rounded-xl text-lg font-semibold hover:bg-primary-700 transition-colors"
            >
              <ShoppingCart className="w-6 h-6" />
              <span>장바구니</span>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-sm rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </NavLink>

            {/* 직원 메뉴 */}
            <button
              className="p-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
              title="직원 설정"
            >
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* 카테고리 네비게이션 */}
      <nav className="border-t px-6 py-3 bg-slate-50">
        <div className="flex items-center gap-3 overflow-x-auto">
          <NavLink
            to={getStorePath()}
            end
            className={({ isActive }) =>
              `flex items-center gap-2 px-5 py-2.5 rounded-xl text-base font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-primary-50 border border-slate-200'
              }`
            }
          >
            <Home className="w-5 h-5" />
            홈
          </NavLink>
          <NavLink
            to={getStorePath('products')}
            className={({ isActive }) =>
              `flex items-center gap-2 px-5 py-2.5 rounded-xl text-base font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-primary-50 border border-slate-200'
              }`
            }
          >
            <Package className="w-5 h-5" />
            전체상품
          </NavLink>
          <NavLink
            to={getStorePath('products?category=cgm')}
            className="px-5 py-2.5 rounded-xl text-base font-semibold whitespace-nowrap bg-white text-slate-700 hover:bg-primary-50 border border-slate-200 transition-colors"
          >
            연속혈당측정기
          </NavLink>
          <NavLink
            to={getStorePath('products?category=supplement')}
            className="px-5 py-2.5 rounded-xl text-base font-semibold whitespace-nowrap bg-white text-slate-700 hover:bg-primary-50 border border-slate-200 transition-colors"
          >
            건강기능식품
          </NavLink>
          <NavLink
            to={getStorePath('products?category=food')}
            className="px-5 py-2.5 rounded-xl text-base font-semibold whitespace-nowrap bg-white text-slate-700 hover:bg-primary-50 border border-slate-200 transition-colors"
          >
            당뇨식품
          </NavLink>
        </div>
      </nav>
    </header>
  );
}

// 태블릿 푸터
function TabletFooter({ store }: { store: PharmacyStore }) {
  return (
    <footer className="bg-white border-t py-4 px-6">
      <div className="flex items-center justify-between text-sm text-slate-500">
        <div className="flex items-center gap-4">
          <span>{store.name}</span>
          {store.businessNumber && (
            <span>사업자등록번호: {store.businessNumber}</span>
          )}
        </div>
        <p>본 주문은 약국에서 직접 처리합니다.</p>
      </div>
    </footer>
  );
}

// 메인 레이아웃
function TabletLayoutContent() {
  const { pharmacyId: storeSlug } = useParams<{ pharmacyId: string }>();
  const [store, setStore] = useState<PharmacyStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storeSlug) return;

    const loadStore = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await storeApi.getStoreBySlug(storeSlug);
        if (res.success && res.data) {
          if (res.data.status !== 'approved') {
            setError('현재 운영 중이 아닌 매장입니다.');
            setStore(null);
          } else {
            setStore(res.data);
          }
        } else {
          throw new Error('매장 정보를 불러올 수 없습니다.');
        }
      } catch (err: any) {
        console.error('Store load error:', err);
        setError(err.message || '매장을 찾을 수 없습니다.');
        setStore(null);
      } finally {
        setLoading(false);
      }
    };

    loadStore();
  }, [storeSlug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <AlertCircle className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            {error?.includes('운영 중이 아닌') ? '매장 준비 중' : '매장을 찾을 수 없습니다'}
          </h1>
          <p className="text-lg text-slate-500">{error || '올바른 매장 링크를 확인해주세요.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <TabletHeader store={store} />

      {/* 메인 콘텐츠 */}
      <main className="flex-1 p-6">
        <Outlet />
      </main>

      <TabletFooter store={store} />
    </div>
  );
}

// Provider로 감싸서 export
export default function TabletLayout() {
  const { pharmacyId: storeSlug } = useParams<{ pharmacyId: string }>();

  if (!storeSlug) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-slate-500">잘못된 접근입니다.</p>
      </div>
    );
  }

  return (
    <StoreModeProvider mode="tablet" storeSlug={storeSlug}>
      <TabletLayoutContent />
    </StoreModeProvider>
  );
}
