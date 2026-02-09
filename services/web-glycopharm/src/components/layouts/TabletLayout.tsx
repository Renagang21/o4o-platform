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
  Bell,
  MessageCircle,
  PackageIcon,
  ShoppingBag,
  CheckCircle,
  X,
} from 'lucide-react';
import { storeApi } from '@/api/store';
import type { PharmacyStore } from '@/types/store';
import { StoreModeProvider, useStoreMode } from '@/contexts/StoreModeContext';
import { StoreThemeProvider } from '@/contexts/StoreThemeContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

type RequestPurpose = 'consultation' | 'sample' | 'order';
type RequestDialogState = 'closed' | 'select' | 'confirm' | 'submitting' | 'done' | 'cooldown';

const PURPOSE_OPTIONS: { purpose: RequestPurpose; label: string; icon: typeof MessageCircle }[] = [
  { purpose: 'consultation', label: '상담', icon: MessageCircle },
  { purpose: 'sample', label: '샘플', icon: PackageIcon },
  { purpose: 'order', label: '주문', icon: ShoppingBag },
];

const PURPOSE_MESSAGES: Record<RequestPurpose, string> = {
  consultation: '직원에게 상담을 요청하시겠습니까?',
  sample: '샘플 신청은 직원 확인 후 진행됩니다.',
  order: '주문 요청 단계이며, 결제는 이후 진행됩니다.',
};

// 태블릿 헤더 컴포넌트
function TabletHeader({ store }: { store: PharmacyStore }) {
  const { getStorePath } = useStoreMode();
  const { pharmacyId } = useParams<{ pharmacyId: string }>();
  const [cartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // 직원 요청 다이얼로그
  const [dialogState, setDialogState] = useState<RequestDialogState>('closed');
  const [selectedPurpose, setSelectedPurpose] = useState<RequestPurpose | null>(null);

  const handlePurposeSelect = (purpose: RequestPurpose) => {
    setSelectedPurpose(purpose);
    setDialogState('confirm');
  };

  const handleSubmitRequest = async () => {
    if (!selectedPurpose || !pharmacyId) return;
    setDialogState('submitting');

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/glycopharm/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacyId,
          eventType: 'click',
          sourceType: 'tablet',
          purpose: selectedPurpose,
        }),
      });

      const data = await res.json();

      if (data.success) {
        if (data.data?.promoted) {
          setDialogState('done');
        } else {
          setDialogState('cooldown');
        }
        // 3초 후 자동 닫힘
        setTimeout(() => {
          setDialogState('closed');
          setSelectedPurpose(null);
        }, 3000);
      } else {
        throw new Error(data.error || '요청 실패');
      }
    } catch (err) {
      console.error('Request failed:', err);
      setDialogState('done');
      setTimeout(() => {
        setDialogState('closed');
        setSelectedPurpose(null);
      }, 3000);
    }
  };

  const closeDialog = () => {
    setDialogState('closed');
    setSelectedPurpose(null);
  };

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

            {/* 직원 요청 */}
            <button
              onClick={() => setDialogState('select')}
              className="flex items-center gap-2 px-4 py-3 bg-amber-500 text-white rounded-xl text-lg font-semibold hover:bg-amber-600 transition-colors"
            >
              <Bell className="w-6 h-6" />
              <span>직원 요청</span>
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

      {/* 직원 요청 다이얼로그 오버레이 */}
      {dialogState !== 'closed' && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8">
            {/* 선택 단계 */}
            {dialogState === 'select' && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-800">어떤 도움이 필요하신가요?</h2>
                  <button onClick={closeDialog} className="p-1 text-slate-400 hover:text-slate-600">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {PURPOSE_OPTIONS.map(({ purpose, label, icon: Icon }) => (
                    <button
                      key={purpose}
                      onClick={() => handlePurposeSelect(purpose)}
                      className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-slate-200 hover:border-primary-500 hover:bg-primary-50 transition-colors"
                    >
                      <Icon className="w-10 h-10 text-primary-600" />
                      <span className="text-lg font-semibold text-slate-700">{label}</span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={closeDialog}
                  className="w-full mt-6 py-3 text-slate-500 text-base hover:text-slate-700"
                >
                  닫기
                </button>
              </>
            )}

            {/* 확인 단계 */}
            {dialogState === 'confirm' && selectedPurpose && (
              <>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
                    {(() => {
                      const opt = PURPOSE_OPTIONS.find(o => o.purpose === selectedPurpose);
                      const Icon = opt?.icon || MessageCircle;
                      return <Icon className="w-8 h-8 text-primary-600" />;
                    })()}
                  </div>
                  <p className="text-lg text-slate-700">{PURPOSE_MESSAGES[selectedPurpose]}</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDialogState('select')}
                    className="flex-1 py-3 rounded-xl border border-slate-300 text-slate-600 font-semibold hover:bg-slate-50"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSubmitRequest}
                    className="flex-1 py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700"
                  >
                    요청하기
                  </button>
                </div>
              </>
            )}

            {/* 제출 중 */}
            {dialogState === 'submitting' && (
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
                <p className="text-lg text-slate-600">요청 중...</p>
              </div>
            )}

            {/* 완료 */}
            {dialogState === 'done' && (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-800 mb-2">요청이 접수되었습니다</h3>
                <p className="text-slate-500">잠시만 기다려주세요.</p>
              </div>
            )}

            {/* 쿨타임 */}
            {dialogState === 'cooldown' && (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-800 mb-2">이미 접수된 요청이 있습니다</h3>
                <p className="text-slate-500">잠시 후 다시 시도해주세요.</p>
              </div>
            )}
          </div>
        </div>
      )}
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
// Tablet 모드에서는 StoreThemeProvider에 storeMode="tablet"를 전달하여
// modern 테마가 자동 적용됨
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
    <StoreThemeProvider storeMode="tablet">
      <StoreModeProvider mode="tablet" storeSlug={storeSlug}>
        <TabletLayoutContent />
      </StoreModeProvider>
    </StoreThemeProvider>
  );
}
