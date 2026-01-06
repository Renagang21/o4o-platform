/**
 * Kiosk Layout
 * 매장 내 키오스크 전용 레이아웃
 * - 대형 버튼/폰트
 * - 상품 제한 표시
 * - 비로그인 주문
 * - 자동 리셋
 */

import { Outlet, useParams, NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Store,
  ShoppingCart,
  RotateCcw,
  Loader2,
  AlertCircle,
  Home,
} from 'lucide-react';
import { storeApi } from '@/api/store';
import type { PharmacyStore } from '@/types/store';
import { StoreModeProvider, useStoreMode } from '@/contexts/StoreModeContext';
import { StoreThemeProvider } from '@/contexts/StoreThemeContext';

// 키오스크 헤더 컴포넌트
function KioskHeader({ store }: { store: PharmacyStore }) {
  const { resetTimer, resetKiosk, getStorePath } = useStoreMode();
  const [cartCount] = useState(0);

  // 리셋 타이머 경고 (30초 이하)
  const showTimerWarning = resetTimer <= 30 && resetTimer > 0;

  return (
    <header className="bg-white shadow-lg sticky top-0 z-50">
      {/* SEO noindex for kiosk */}
      <meta name="robots" content="noindex, nofollow" />

      {/* 타이머 경고 배너 */}
      {showTimerWarning && (
        <div className="bg-yellow-400 text-yellow-900 py-3 px-6 text-center">
          <p className="text-xl font-bold">
            {resetTimer}초 후 화면이 초기화됩니다. 화면을 터치하세요.
          </p>
        </div>
      )}

      {/* 메인 헤더 */}
      <div className="px-8 py-6">
        <div className="flex items-center justify-between">
          {/* 로고 & 매장명 */}
          <NavLink to={getStorePath()} className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center">
              <Store className="w-10 h-10 text-primary-600" />
            </div>
            <div>
              <h1 className="font-bold text-3xl text-slate-800">{store.name}</h1>
              <p className="text-lg text-slate-500">키오스크 주문</p>
            </div>
          </NavLink>

          {/* 액션 버튼 */}
          <div className="flex items-center gap-4">
            {/* 장바구니 */}
            <NavLink
              to={getStorePath('cart')}
              className="relative flex items-center gap-3 px-6 py-4 bg-primary-600 text-white rounded-2xl text-xl font-bold hover:bg-primary-700 transition-colors"
            >
              <ShoppingCart className="w-8 h-8" />
              <span>장바구니</span>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white text-lg rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </NavLink>

            {/* 처음으로 */}
            <button
              onClick={resetKiosk}
              className="flex items-center gap-3 px-6 py-4 bg-slate-100 text-slate-700 rounded-2xl text-xl font-bold hover:bg-slate-200 transition-colors"
            >
              <RotateCcw className="w-8 h-8" />
              <span>처음으로</span>
            </button>
          </div>
        </div>
      </div>

      {/* 카테고리 네비게이션 - 대형 버튼 */}
      <nav className="border-t bg-slate-50 px-8 py-4">
        <div className="flex items-center gap-4 overflow-x-auto">
          <NavLink
            to={getStorePath()}
            end
            className={({ isActive }) =>
              `flex items-center gap-2 px-8 py-4 rounded-2xl text-xl font-bold whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-primary-50'
              }`
            }
          >
            <Home className="w-6 h-6" />
            홈
          </NavLink>
          <NavLink
            to={getStorePath('products')}
            className={({ isActive }) =>
              `px-8 py-4 rounded-2xl text-xl font-bold whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-primary-50'
              }`
            }
          >
            전체상품
          </NavLink>
          <NavLink
            to={getStorePath('products?category=cgm')}
            className="px-8 py-4 rounded-2xl text-xl font-bold whitespace-nowrap bg-white text-slate-700 hover:bg-primary-50 transition-colors"
          >
            연속혈당측정기
          </NavLink>
          <NavLink
            to={getStorePath('products?category=supplement')}
            className="px-8 py-4 rounded-2xl text-xl font-bold whitespace-nowrap bg-white text-slate-700 hover:bg-primary-50 transition-colors"
          >
            건강기능식품
          </NavLink>
        </div>
      </nav>
    </header>
  );
}

// 키오스크 푸터 - 최소화
function KioskFooter({ store }: { store: PharmacyStore }) {
  return (
    <footer className="bg-slate-100 border-t py-4 px-8">
      <div className="flex items-center justify-between text-slate-500">
        <p className="text-lg">{store.name}</p>
        <p className="text-sm">
          본 주문은 약국 직원의 확인 후 처리됩니다.
        </p>
      </div>
    </footer>
  );
}

// 메인 레이아웃
function KioskLayoutContent() {
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
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Loader2 className="w-16 h-16 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <AlertCircle className="w-24 h-24 text-yellow-400 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-slate-800 mb-4">
            {error?.includes('운영 중이 아닌') ? '매장 준비 중' : '매장을 찾을 수 없습니다'}
          </h1>
          <p className="text-xl text-slate-500">{error || '올바른 매장 링크를 확인해주세요.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <KioskHeader store={store} />

      {/* 메인 콘텐츠 - 키오스크는 더 큰 여백 */}
      <main className="flex-1 p-8">
        <Outlet />
      </main>

      <KioskFooter store={store} />
    </div>
  );
}

// Provider로 감싸서 export
// Kiosk 모드에서는 StoreThemeProvider에 storeMode="kiosk"를 전달하여
// modern 테마가 자동 적용됨
export default function KioskLayout() {
  const { pharmacyId: storeSlug } = useParams<{ pharmacyId: string }>();

  if (!storeSlug) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-slate-500">잘못된 접근입니다.</p>
      </div>
    );
  }

  return (
    <StoreThemeProvider storeMode="kiosk">
      <StoreModeProvider mode="kiosk" storeSlug={storeSlug}>
        <KioskLayoutContent />
      </StoreModeProvider>
    </StoreThemeProvider>
  );
}
