/**
 * StoreMainPage - 매장 메인 페이지
 *
 * WO-STORE-MAIN-PAGE-PHASE1-V1 + PHASE2-A + PHASE2-B
 *
 * 5-block Cockpit 구조:
 * 1. 매장 현황 요약 (Status Summary)
 * 2. 바로 이용 가능 (Ready to Use: OPEN + DISPLAY_ONLY + approved REQUEST_REQUIRED)
 * 3. 확장 가능 (Expand: pending/rejected REQUEST_REQUIRED + LIMITED)
 * 4. 빠른 액션 (Quick Actions)
 * 5. AI 요약 (Rule-based Stub)
 *
 * Phase 2-B:
 * - Quick Actions: actionKey 구조화, 클릭 로그 수집, 정렬 가능 구조
 * - 현황 요약 카드: 보조 설명, empty state, 클릭 이동
 * - 승인 대기/반려 메시지 톤 정리
 * - 행동 로그 수집 연동
 *
 * Phase 2-C:
 * - Quick Actions 자동 정렬 (행동 로그 기반 가중치)
 * - 자동 정렬 ON/OFF 토글 + 기본 순서 초기화
 * - 히스테리시스: 상위 2개만 교체, 임계값 이상 차이일 때만
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Info,
  XCircle,
  RefreshCw,
  FileText,
  Copy,
  RotateCcw,
} from 'lucide-react';
import { pharmacyApi } from '@/api/pharmacy';
import type { StoreAiSummaryData, ProductAiInsightData } from '@/api/pharmacy';
import { AiSummaryButton } from '@/components/ai';
import HubCopyModal from '@/components/store/HubCopyModal';
import { PRODUCT_POLICY_CONFIG, APPROVAL_STATUS_CONFIG } from '@/config/store-catalog';
import { generateStoreSummary } from '@/utils/store-ai-summary';
import { logStoreAction } from '@/utils/store-action-log';
import { sortQuickActions, isAutoSortEnabled, setAutoSortEnabled } from '@/utils/store-action-sort';
import type { StoreMainData, StoreCatalogItem, AiSummaryResult, CopyOptions } from '@/types/store-main';

// ─── Phase 2-B: Quick Action 정의 ───────────────────────────────
interface QuickActionItem {
  actionKey: string;
  label: string;
  icon: typeof Package;
  path: string;
}

const QUICK_ACTIONS: QuickActionItem[] = [
  { actionKey: 'manage_products', label: '상품 관리', icon: Package, path: '/store/products' },
  { actionKey: 'view_orders', label: '주문 확인', icon: ShoppingCart, path: '/store/orders' },
  { actionKey: 'manage_content', label: '콘텐츠 관리', icon: Tv, path: '/store/content' },
  { actionKey: 'store_settings', label: '매장 설정', icon: Settings, path: '/store/settings' },
  { actionKey: 'check_approvals', label: '승인 현황', icon: FileText, path: '/store/apply' },
  { actionKey: 'b2b_order', label: 'B2B 주문', icon: ShoppingCart, path: '/store/b2b-order' },
];

// ─── Phase 2-B: 현황 카드 정의 ──────────────────────────────────
interface SummaryCardConfig {
  key: string;
  icon: typeof Package;
  label: string;
  description: string;
  emptyText: string;
  linkTo?: string;
}

const SUMMARY_CARDS: SummaryCardConfig[] = [
  {
    key: 'activeServices',
    icon: Tv,
    label: '활성 서비스',
    description: '현재 이용 중인 서비스',
    emptyText: '아직 활성화된 서비스가 없습니다',
  },
  {
    key: 'orderableProducts',
    icon: Package,
    label: '주문 가능 상품',
    description: '지금 주문 가능한 상품',
    emptyText: '주문 가능한 상품이 없습니다',
    linkTo: '/store/products',
  },
  {
    key: 'pendingApprovals',
    icon: Clock,
    label: '승인 대기',
    description: '승인 처리가 필요한 항목',
    emptyText: '대기 중인 승인 요청이 없습니다',
    linkTo: '/store/apply',
  },
  {
    key: 'activeChannels',
    icon: Monitor,
    label: '활성 채널',
    description: '운영 중인 판매 채널',
    emptyText: '활성화된 판매 채널이 없습니다',
  },
];

export default function StoreMainPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<StoreMainData | null>(null);
  const [aiSummary, setAiSummary] = useState<AiSummaryResult | null>(null);
  const [llmSummary, setLlmSummary] = useState<StoreAiSummaryData | null>(null);
  const [llmLoading, setLlmLoading] = useState(false);
  // WO-O4O-PRODUCT-STORE-AI-INSIGHT-V1
  const [productInsight, setProductInsight] = useState<ProductAiInsightData | null>(null);
  const [productInsightLoading, setProductInsightLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresLogin, setRequiresLogin] = useState(false);
  // Phase 2-B: Copy modal state
  const [copyTarget, setCopyTarget] = useState<StoreCatalogItem | null>(null);
  const [copyLoading, setCopyLoading] = useState(false);
  // Phase 2-C: Auto-sort state
  const [autoSort, setAutoSort] = useState(isAutoSortEnabled);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await pharmacyApi.getStoreMain();
      if (res.success && res.data) {
        setData(res.data);
        setAiSummary(generateStoreSummary(res.data));

        // WO-O4O-STORE-HUB-AI-SUMMARY-V1: LLM 요약 병렬 조회
        setLlmLoading(true);
        pharmacyApi.getStoreAiSummary()
          .then((aiRes) => {
            if (aiRes.success && aiRes.data) {
              setLlmSummary(aiRes.data);
            }
          })
          .catch(() => { /* LLM 실패 시 rule-based fallback 유지 */ })
          .finally(() => setLlmLoading(false));

        // WO-O4O-PRODUCT-STORE-AI-INSIGHT-V1: 상품 AI 인사이트 병렬 조회
        setProductInsightLoading(true);
        pharmacyApi.getProductAiInsight()
          .then((piRes) => {
            if (piRes.success && piRes.data) {
              setProductInsight(piRes.data);
            }
          })
          .catch(() => { /* 상품 AI 실패 시 무시 */ })
          .finally(() => setProductInsightLoading(false));
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
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Phase 2-B: Copy handler
  const handleCopy = useCallback(async (options: CopyOptions) => {
    if (!copyTarget) return;
    setCopyLoading(true);
    try {
      await pharmacyApi.copyStoreItem(copyTarget.id, options);
      logStoreAction('copy_store_item');
      setCopyTarget(null);
      fetchData(true);
    } catch (err: any) {
      console.error('Copy failed:', err);
      alert(err.message || '복사에 실패했습니다.');
    } finally {
      setCopyLoading(false);
    }
  }, [copyTarget, fetchData]);

  // Phase 2-A: Refetch on window focus for real-time sync
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && data) {
        fetchData(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchData, data]);

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
          <div className="flex items-center gap-2">
            {refreshing && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
              title="새로고침"
            >
              <RefreshCw className="w-4 h-4 text-slate-400" />
            </button>
            <AiSummaryButton contextLabel="매장 현황" size="sm" />
          </div>
        </div>

        {/* Phase 2-B: 구조화된 현황 카드 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {SUMMARY_CARDS.map((card) => {
            const value = summary[card.key as keyof typeof summary];
            const CardIcon = card.icon;
            const isClickable = !!card.linkTo;
            const isEmpty = value === 0;

            const cardContent = (
              <>
                <div className="flex items-center justify-between mb-2">
                  <CardIcon className="w-6 h-6 text-slate-500" />
                  {card.key === 'pendingApprovals' && value > 0 && (
                    <span className="w-6 h-6 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {value}
                    </span>
                  )}
                  {isClickable && (
                    <ArrowRight className="w-4 h-4 text-slate-300" />
                  )}
                </div>
                <p className="text-2xl font-bold text-slate-800">{value}</p>
                <p className="text-sm text-slate-500">{card.label}</p>
                {/* Phase 2-B: 보조 설명 */}
                {isEmpty ? (
                  <p className="text-xs text-slate-400 mt-1">{card.emptyText}</p>
                ) : (
                  <p className="text-xs text-slate-400 mt-1">{card.description}</p>
                )}
              </>
            );

            if (isClickable) {
              return (
                <NavLink
                  key={card.key}
                  to={card.linkTo!}
                  onClick={() => logStoreAction(`summary_${card.key}`)}
                  className="p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all"
                >
                  {cardContent}
                </NavLink>
              );
            }

            return (
              <div key={card.key} className="p-4 bg-white border border-slate-200 rounded-xl">
                {cardContent}
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================= */}
      {/* Block 2: 바로 이용 가능 (Ready to Use)    */}
      {/* ========================================= */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">바로 이용 가능</h2>
          <NavLink
            to="/store/products"
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            전체보기 <ArrowRight className="w-4 h-4" />
          </NavLink>
        </div>

        {readyToUse.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {readyToUse.map((item) => (
              <CatalogItemRow key={item.id} item={item} onCopy={() => setCopyTarget(item)} />
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
              <CatalogItemRow key={item.id} item={item} showAction onCopy={() => setCopyTarget(item)} />
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
      {/* Phase 2-C: 자동 정렬 + 토글/리셋          */}
      {/* ========================================= */}
      <QuickActionsBlock autoSort={autoSort} onToggleSort={setAutoSort} />

      {/* Phase 2-B: Copy Modal */}
      <HubCopyModal
        isOpen={!!copyTarget}
        item={copyTarget}
        loading={copyLoading}
        onClose={() => setCopyTarget(null)}
        onConfirm={handleCopy}
      />

      {/* ========================================= */}
      {/* Block 5: AI 매장 요약                      */}
      {/* WO-O4O-STORE-HUB-AI-SUMMARY-V1            */}
      {/* LLM 우선 → rule-based fallback             */}
      {/* ========================================= */}
      {(llmSummary || aiSummary) && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-slate-800">AI 매장 요약</h2>
              {llmSummary && (
                <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">AI</span>
              )}
            </div>
            {llmLoading && <Loader2 className="w-4 h-4 text-primary-400 animate-spin" />}
            {!llmSummary && !llmLoading && (
              <button
                onClick={() => {
                  setLlmLoading(true);
                  pharmacyApi.createStoreAiSnapshot()
                    .then(() => pharmacyApi.getStoreAiSummary())
                    .then((res) => { if (res.success && res.data) setLlmSummary(res.data); })
                    .catch(() => {})
                    .finally(() => setLlmLoading(false));
                }}
                className="px-3 py-1.5 bg-primary-50 text-primary-700 text-xs font-medium rounded-lg hover:bg-primary-100 transition-colors"
              >
                AI 분석 요청
              </button>
            )}
          </div>

          {/* LLM Summary */}
          {llmSummary ? (
            <>
              <div className="bg-primary-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-primary-800">{llmSummary.summary}</p>
                <p className="text-xs text-primary-500 mt-2">
                  {llmSummary.model} · {new Date(llmSummary.createdAt).toLocaleString('ko-KR')}
                </p>
              </div>

              {/* Issues */}
              {llmSummary.issues.length > 0 && (
                <div className="space-y-2 mb-4">
                  {llmSummary.issues.map((issue, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm ${
                        issue.severity === 'high'
                          ? 'bg-red-50 text-red-800'
                          : issue.severity === 'medium'
                          ? 'bg-amber-50 text-amber-800'
                          : 'bg-blue-50 text-blue-800'
                      }`}
                    >
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{issue.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              {llmSummary.actions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {llmSummary.actions.map((action, idx) => (
                    <span
                      key={idx}
                      className={`px-3 py-1.5 text-sm rounded-full cursor-pointer transition-colors ${
                        action.priority === 'high'
                          ? 'bg-primary-100 text-primary-800 hover:bg-primary-200'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                      title={action.reason}
                    >
                      {action.label}
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : aiSummary ? (
            /* Rule-based Fallback */
            <>
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
            </>
          ) : null}
        </div>
      )}

      {/* ========================================= */}
      {/* Block 6: 상품 AI 분석                      */}
      {/* WO-O4O-PRODUCT-STORE-AI-INSIGHT-V1         */}
      {/* ========================================= */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-800">상품 AI 분석</h2>
            {productInsight && (
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">AI</span>
            )}
          </div>
          {productInsightLoading && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />}
          {!productInsight && !productInsightLoading && (
            <button
              onClick={() => {
                setProductInsightLoading(true);
                pharmacyApi.createProductAiSnapshot()
                  .then(() => pharmacyApi.getProductAiInsight())
                  .then((res) => { if (res.success && res.data) setProductInsight(res.data); })
                  .catch(() => {})
                  .finally(() => setProductInsightLoading(false));
              }}
              className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-lg hover:bg-indigo-100 transition-colors"
            >
              상품 AI 분석 요청
            </button>
          )}
        </div>

        {productInsight ? (
          <>
            {/* Summary */}
            <div className="bg-indigo-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-indigo-800">{productInsight.summary}</p>
              <p className="text-xs text-indigo-500 mt-2">
                {productInsight.model} · {new Date(productInsight.createdAt).toLocaleString('ko-KR')}
              </p>
            </div>

            {/* Product Highlights */}
            {productInsight.productHighlights.length > 0 && (
              <div className="space-y-2 mb-4">
                <h3 className="text-sm font-medium text-slate-600">주목할 상품</h3>
                {productInsight.productHighlights.map((ph, idx) => (
                  <div key={idx} className="flex items-start gap-3 px-3 py-2 bg-slate-50 rounded-lg">
                    <Sparkles className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{ph.productName}</p>
                      <p className="text-xs text-slate-600">{ph.highlight}</p>
                      {ph.metric && <p className="text-xs text-indigo-600 mt-0.5">{ph.metric}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Issues */}
            {productInsight.issues.length > 0 && (
              <div className="space-y-2 mb-4">
                {productInsight.issues.map((issue, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm ${
                      issue.severity === 'high'
                        ? 'bg-red-50 text-red-800'
                        : issue.severity === 'medium'
                        ? 'bg-amber-50 text-amber-800'
                        : 'bg-blue-50 text-blue-800'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      {issue.productName && <span className="font-medium">{issue.productName}: </span>}
                      <span>{issue.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            {productInsight.actions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {productInsight.actions.map((action, idx) => (
                  <span
                    key={idx}
                    className={`px-3 py-1.5 text-sm rounded-full cursor-pointer transition-colors ${
                      action.priority === 'high'
                        ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                    title={action.reason}
                  >
                    {action.label}
                  </span>
                ))}
              </div>
            )}
          </>
        ) : !productInsightLoading ? (
          <p className="text-sm text-slate-500">상품별 QR 스캔, 주문, 전환율을 AI가 분석합니다.</p>
        ) : null}
      </div>
    </div>
  );
}

/** 카탈로그 상품 행 컴포넌트 (Phase 2-A + Phase 2-B enhanced) */
function CatalogItemRow({ item, showAction, onCopy }: { item: StoreCatalogItem; showAction?: boolean; onCopy?: () => void }) {
  const [showConditions, setShowConditions] = useState(false);
  const policyConfig = PRODUCT_POLICY_CONFIG[item.policy];
  const approvalConfig = item.approvalStatus && item.approvalStatus !== 'none'
    ? APPROVAL_STATUS_CONFIG[item.approvalStatus]
    : null;

  const PolicyIcon = item.policy === 'OPEN' ? CheckCircle
    : item.policy === 'DISPLAY_ONLY' ? Eye
    : item.policy === 'LIMITED' ? Clock
    : Lock;

  return (
    <div className="py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Policy badge */}
          <span className={`inline-flex items-center gap-1 px-2 py-1 ${policyConfig.badgeColor} ${policyConfig.textColor} text-xs font-medium rounded-full whitespace-nowrap flex-shrink-0`}>
            <PolicyIcon className="w-3 h-3" />
            {policyConfig.label}
          </span>

          {/* Phase 2-A: Approval status badge + Phase 2-B: 톤 정리 */}
          {approvalConfig && (
            <span className={`inline-flex items-center gap-1 px-2 py-1 ${approvalConfig.badgeColor} ${approvalConfig.textColor} text-xs font-medium rounded-full whitespace-nowrap flex-shrink-0`}>
              {item.approvalStatus === 'pending' && <Clock className="w-3 h-3" />}
              {item.approvalStatus === 'approved' && <CheckCircle className="w-3 h-3" />}
              {item.approvalStatus === 'rejected' && <XCircle className="w-3 h-3" />}
              {approvalConfig.label}
            </span>
          )}

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

          {/* Phase 2-A: LIMITED conditions button */}
          {item.policy === 'LIMITED' && item.limitedConditions && item.limitedConditions.length > 0 && (
            <button
              onClick={() => setShowConditions(!showConditions)}
              className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-600 text-xs font-medium rounded-full hover:bg-purple-100 transition-colors"
              title="조건 보기"
            >
              <Info className="w-3 h-3" />
              조건 있음
            </button>
          )}

          {/* LIMITED badge (no conditions) */}
          {item.policy === 'LIMITED' && (!item.limitedConditions || item.limitedConditions.length === 0) && (
            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
              한정
            </span>
          )}

          {/* Phase 2-B: Copy button */}
          {onCopy && (
            <button
              onClick={() => { logStoreAction('open_copy_modal'); onCopy(); }}
              className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg hover:bg-primary-50 hover:text-primary-700 transition-colors"
            >
              <Copy className="w-3 h-3 inline mr-1" />
              추가
            </button>
          )}

          {/* Action button for REQUEST_REQUIRED (none or rejected) */}
          {showAction && item.policy === 'REQUEST_REQUIRED' && item.approvalStatus !== 'approved' && item.approvalStatus !== 'pending' && (
            <NavLink
              to="/store/apply"
              onClick={() => logStoreAction('apply_request')}
              className="px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-lg hover:bg-primary-700 transition-colors"
            >
              신청하기
            </NavLink>
          )}

          {/* Phase 2-B: Pending status — 안내 톤 */}
          {showAction && item.policy === 'REQUEST_REQUIRED' && item.approvalStatus === 'pending' && (
            <span className="px-3 py-1.5 bg-amber-50 text-amber-600 text-xs font-medium rounded-lg">
              승인 검토 중입니다
            </span>
          )}
        </div>
      </div>

      {/* Phase 2-B: Rejection reason — 안내/절차 톤 */}
      {item.approvalStatus === 'rejected' && item.rejectionReason && (
        <div className="mt-2 ml-[4.5rem] p-2 bg-red-50 border border-red-100 rounded-lg">
          <p className="text-xs text-red-600">
            <span className="font-medium">반려 안내:</span> {item.rejectionReason}
          </p>
          <p className="text-xs text-red-500 mt-1">
            내용을 수정하여 다시 신청할 수 있습니다.
          </p>
        </div>
      )}

      {/* Phase 2-A: LIMITED conditions detail (toggle) */}
      {showConditions && item.limitedConditions && (
        <div className="mt-2 ml-[4.5rem] p-3 bg-purple-50 border border-purple-100 rounded-lg">
          <p className="text-xs font-medium text-purple-700 mb-2">판매 조건</p>
          <ul className="space-y-1">
            {item.limitedConditions.map((cond, idx) => (
              <li key={idx} className="text-xs text-purple-600 flex items-start gap-1.5">
                <span className="mt-0.5 w-1 h-1 bg-purple-400 rounded-full flex-shrink-0" />
                <span><span className="font-medium">{cond.label}:</span> {cond.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Phase 2-C: Quick Actions 블록 (자동 정렬 포함) */
function QuickActionsBlock({ autoSort, onToggleSort }: { autoSort: boolean; onToggleSort: (v: boolean) => void }) {
  const DEFAULT_ORDER = QUICK_ACTIONS.map((a) => a.actionKey);

  const sortedActions = useMemo(() => {
    const sortedKeys = sortQuickActions(DEFAULT_ORDER);
    return sortedKeys
      .map((key) => QUICK_ACTIONS.find((a) => a.actionKey === key))
      .filter((a): a is QuickActionItem => !!a);
  }, [autoSort]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = () => {
    const next = !autoSort;
    setAutoSortEnabled(next);
    onToggleSort(next);
  };

  const handleReset = () => {
    setAutoSortEnabled(false);
    onToggleSort(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-800">빠른 이동</h2>
        <div className="flex items-center gap-2">
          {autoSort && (
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="기본 순서로 초기화"
            >
              <RotateCcw className="w-3 h-3" />
              초기화
            </button>
          )}
          <button
            onClick={handleToggle}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
              autoSort
                ? 'bg-primary-50 text-primary-700'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
            title={autoSort ? '자동 정렬 끄기' : '자동 정렬 켜기'}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${autoSort ? 'bg-primary-500' : 'bg-slate-400'}`} />
            자동 정렬
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {sortedActions.map((action) => {
          const ActionIcon = action.icon;
          return (
            <NavLink
              key={action.actionKey}
              to={action.path}
              onClick={() => logStoreAction(action.actionKey)}
              className="p-4 bg-slate-50 rounded-xl hover:bg-primary-50 hover:text-primary-700 transition-colors text-center group"
            >
              <ActionIcon className="w-6 h-6 mx-auto mb-2 text-slate-400 group-hover:text-primary-600" />
              <span className="text-sm font-medium">{action.label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
