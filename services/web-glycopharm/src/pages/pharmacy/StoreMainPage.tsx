/**
 * StoreMainPage - 매장 메인 페이지
 *
 * WO-STORE-MAIN-PAGE-PHASE1-V1
 *
 * 5-block Cockpit 구조:
 * 1. 매장 현황 요약 (Status Summary)
 * 2. 바로 이용 가능 (Ready to Use: OPEN + DISPLAY_ONLY)
 * 3. 확장 가능 (Expand: REQUEST_REQUIRED + LIMITED)
 * 4. 빠른 액션 (Quick Actions)
 * 5. AI 요약 (Rule-based Stub)
 */

import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Store,
  Package,
  ShoppingCart,
  Settings,
  Loader2,
  AlertCircle,
  LogIn,
  ArrowLeft,
  ArrowRight,
  Monitor,
  Tv,
  CheckCircle,
  Clock,
  Sparkles,
  Tag,
  Eye,
  Lock,
} from 'lucide-react';
import { pharmacyApi } from '@/api/pharmacy';
import { AiSummaryButton } from '@/components/ai';
import { PRODUCT_POLICY_CONFIG } from '@/config/store-catalog';
import { generateStoreSummary } from '@/utils/store-ai-summary';
import type { StoreMainData, StoreCatalogItem, AiSummaryResult } from '@/types/store-main';

export default function StoreMainPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<StoreMainData | null>(null);
  const [aiSummary, setAiSummary] = useState<AiSummaryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiresLogin, setRequiresLogin] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await pharmacyApi.getStoreMain();
        if (res.success && res.data) {
          setData(res.data);
          setAiSummary(generateStoreSummary(res.data));
        }
      } catch (err: any) {
        console.error('Store main load error:', err);
        if (err.status === 401) {
          setRequiresLogin(true);
        } else {
          const errorMessage = typeof err.message === 'string'
            ? err.message
            : (err.message?.message || '데이터를 불러오는데 실패했습니다.');
          setError(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (requiresLogin) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-sm">
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-8 h-8 text-primary-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">로그인이 필요합니다</h2>
          <p className="text-slate-500 mb-6">매장 메인을 이용하시려면 먼저 로그인해 주세요.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              이전 화면으로
            </button>
            <NavLink
              to="/login"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/25"
            >
              <LogIn className="w-5 h-5" />
              로그인하기
            </NavLink>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">오류가 발생했습니다</h2>
        <p className="text-slate-500">{error}</p>
      </div>
    );
  }

  const summary = data?.summary ?? { activeServices: 0, orderableProducts: 0, pendingApprovals: 0, activeChannels: 0 };
  const readyToUse = data?.readyToUse ?? [];
  const expandable = data?.expandable ?? [];

  return (
    <div className="space-y-6">
      {/* ========================================= */}
      {/* Block 1: 매장 현황 요약 (Status Summary) */}
      {/* ========================================= */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
              <Store className="w-5 h-5 text-primary-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800">매장 현황</h2>
          </div>
          <AiSummaryButton contextLabel="매장 현황" size="sm" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <Tv className="w-6 h-6 text-slate-500" />
            </div>
            <p className="text-2xl font-bold text-slate-800">{summary.activeServices}</p>
            <p className="text-sm text-slate-500">활성 서비스</p>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <Package className="w-6 h-6 text-slate-500" />
            </div>
            <p className="text-2xl font-bold text-slate-800">{summary.orderableProducts}</p>
            <p className="text-sm text-slate-500">주문 가능 상품</p>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-6 h-6 text-slate-500" />
              {summary.pendingApprovals > 0 && (
                <span className="w-6 h-6 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {summary.pendingApprovals}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-slate-800">{summary.pendingApprovals}</p>
            <p className="text-sm text-slate-500">승인 대기</p>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <Monitor className="w-6 h-6 text-slate-500" />
            </div>
            <p className="text-2xl font-bold text-slate-800">{summary.activeChannels}</p>
            <p className="text-sm text-slate-500">활성 채널</p>
          </div>
        </div>
      </div>

      {/* ========================================= */}
      {/* Block 2: 바로 이용 가능 (Ready to Use)    */}
      {/* ========================================= */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">바로 이용 가능</h2>
          <NavLink
            to="/pharmacy/products"
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            전체보기 <ArrowRight className="w-4 h-4" />
          </NavLink>
        </div>

        {readyToUse.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {readyToUse.map((item) => (
              <CatalogItemRow key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-slate-50 rounded-xl">
            <Package className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500">바로 이용 가능한 상품이 없습니다</p>
          </div>
        )}
      </div>

      {/* ========================================= */}
      {/* Block 3: 확장 가능 (Expand)               */}
      {/* ========================================= */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">확장 가능</h2>
          <span className="text-xs text-slate-400">신청 또는 한정 상품</span>
        </div>

        {expandable.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {expandable.map((item) => (
              <CatalogItemRow key={item.id} item={item} showAction />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-slate-50 rounded-xl">
            <Tag className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500">확장 가능한 상품이 없습니다</p>
          </div>
        )}
      </div>

      {/* ========================================= */}
      {/* Block 4: 빠른 액션 (Quick Actions)        */}
      {/* ========================================= */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">빠른 이동</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <NavLink
            to="/pharmacy/products"
            className="p-4 bg-slate-50 rounded-xl hover:bg-primary-50 hover:text-primary-700 transition-colors text-center group"
          >
            <Package className="w-6 h-6 mx-auto mb-2 text-slate-400 group-hover:text-primary-600" />
            <span className="text-sm font-medium">상품 관리</span>
          </NavLink>
          <NavLink
            to="/pharmacy/orders"
            className="p-4 bg-slate-50 rounded-xl hover:bg-primary-50 hover:text-primary-700 transition-colors text-center group"
          >
            <ShoppingCart className="w-6 h-6 mx-auto mb-2 text-slate-400 group-hover:text-primary-600" />
            <span className="text-sm font-medium">주문 확인</span>
          </NavLink>
          <NavLink
            to="/pharmacy/signage/content"
            className="p-4 bg-slate-50 rounded-xl hover:bg-primary-50 hover:text-primary-700 transition-colors text-center group"
          >
            <Tv className="w-6 h-6 mx-auto mb-2 text-slate-400 group-hover:text-primary-600" />
            <span className="text-sm font-medium">콘텐츠 관리</span>
          </NavLink>
          <NavLink
            to="/pharmacy/settings"
            className="p-4 bg-slate-50 rounded-xl hover:bg-primary-50 hover:text-primary-700 transition-colors text-center group"
          >
            <Settings className="w-6 h-6 mx-auto mb-2 text-slate-400 group-hover:text-primary-600" />
            <span className="text-sm font-medium">매장 설정</span>
          </NavLink>
        </div>
      </div>

      {/* ========================================= */}
      {/* Block 5: AI 요약 (Rule-based Stub)        */}
      {/* ========================================= */}
      {aiSummary && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-slate-800">AI 매장 요약</h2>
          </div>

          <div className="bg-primary-50 rounded-xl p-4 mb-4">
            <p className="text-sm text-primary-800">{aiSummary.message}</p>
          </div>

          {aiSummary.suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {aiSummary.suggestions.map((suggestion, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 text-sm rounded-full hover:bg-slate-200 cursor-pointer transition-colors"
                >
                  {suggestion}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** 카탈로그 상품 행 컴포넌트 */
function CatalogItemRow({ item, showAction }: { item: StoreCatalogItem; showAction?: boolean }) {
  const policyConfig = PRODUCT_POLICY_CONFIG[item.policy];

  const PolicyIcon = item.policy === 'OPEN' ? CheckCircle
    : item.policy === 'DISPLAY_ONLY' ? Eye
    : item.policy === 'LIMITED' ? Clock
    : Lock;

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Policy badge */}
        <span className={`inline-flex items-center gap-1 px-2 py-1 ${policyConfig.badgeColor} ${policyConfig.textColor} text-xs font-medium rounded-full whitespace-nowrap flex-shrink-0`}>
          <PolicyIcon className="w-3 h-3" />
          {policyConfig.label}
        </span>

        {/* Product info */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
          <p className="text-xs text-slate-400">{item.categoryName}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Price */}
        {item.price != null && (
          <span className="text-sm font-medium text-slate-700">
            {item.price.toLocaleString()}원
          </span>
        )}

        {/* Action button for REQUEST_REQUIRED */}
        {showAction && item.policy === 'REQUEST_REQUIRED' && (
          <NavLink
            to="/pharmacy/store-apply"
            className="px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            신청하기
          </NavLink>
        )}

        {/* Limited badge */}
        {item.policy === 'LIMITED' && (
          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
            한정
          </span>
        )}
      </div>
    </div>
  );
}
