/**
 * StoreChannelsView — 채널 중심 진열 실행 콘솔 (공통 화면 본체)
 * WO-O4O-MY-STORE-REMAINING-VIEW-DUPLICATION-ZERO-CLEANUP-V1
 *
 * 원본 계약 유지:
 *   WO-O4O-GLYCOPHARM-STORE-HUB-ADOPTION-V1 / WO-O4O-COSMETICS-STORE-HUB-ADOPTION-V1
 *   WO-O4O-CHANNEL-UX-STEP1-GUIDE-V1 (채널 선택 가이드)
 *   WO-O4O-CHANNEL-UX-STEP2-STATE-DRIVEN-V1 (상태 기반 행동 유도)
 *
 * 구조:
 *  [A] 채널 탭 (B2C / KIOSK / TABLET / SIGNAGE)
 *  [B] 채널 KPI (상태, 노출 상품, 노출 콘텐츠, 강제노출)
 *  [C] Quick Actions + 채널 미리보기
 *  [D] 채널 제품 목록 (B2C/KIOSK만) + 제품 추가 모달 + 순서 변경
 *  [E] 노출 자산 리스트
 *
 * K-Cosmetics / GlycoPharm 사본의 실제 차이(diff 실측 67줄):
 *   1) accent — pink-* vs blue-* Tailwind 클래스   → theme(완성된 class 문자열) 주입
 *   2) 대시보드 route/라벨 — `/store` "대시보드로 이동" vs `/store/hub` "매장 HUB으로 이동"
 *   3) GP 전용 SIGNAGE Quick Action(디지털사이니지 운영) → renderExtraQuickActions slot
 *   4) 명사 2곳 (매장/약국 코드, 콘텐츠 empty 힌트) → labels
 *   5) guide serviceKey / GuideBlock / GuideEditableSection 주입 경로
 * 업무 규칙·API 계약·route 의미는 바꾸지 않는다.
 *
 * ⚠️ store-ui-core 에 새 dependency 를 만들지 않는다.
 *    GuideBlock(@o4o/shared-space-ui) · GuideEditableSection(서비스 컴포넌트) ·
 *    fetchGuidePageContent(서비스 api) 는 전부 slot/prop 주입이고,
 *    StoreAssetItem(@o4o/store-asset-policy-core) 는 구조적 부분집합 타입으로 받는다.
 *
 * ⚠️ Tailwind 는 동적 조합 클래스를 스캔하지 못한다. theme 의 모든 값은
 *    서비스 파일에 리터럴로 존재하는 **완성된 class 문자열**이어야 한다.
 */

import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  ShieldAlert,
  Lock,
  Monitor,
  Tablet,
  Globe,
  Tv,
  Plus,
  X,
  Package,
  MinusCircle,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Link2,
  AlertCircle,
  Copy,
} from 'lucide-react';

/* ─── 구조적 타입 (서비스 API 응답의 부분집합) ───────────────── */

export type StoreChannelType = 'B2C' | 'KIOSK' | 'TABLET' | 'SIGNAGE';
export type StoreChannelStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'EXPIRED' | 'TERMINATED';
export type StoreChannelAssetPublishStatus = 'draft' | 'published' | 'hidden';

export interface StoreChannelOverview {
  id: string;
  channelType: StoreChannelType;
  status: StoreChannelStatus;
  visibleProductCount: number;
  totalProductCount: number;
  updatedAt: string;
}

/** @o4o/store-asset-policy-core `StoreAssetItem` 의 이 화면이 쓰는 필드만 */
export interface StoreChannelAssetItem {
  id: string;
  title: string;
  assetType: string;
  publishStatus: StoreChannelAssetPublishStatus;
  channelMap: Record<string, boolean>;
  isForced: boolean;
  isLocked: boolean;
  forcedStartAt: string | null;
  forcedEndAt: string | null;
  createdAt: string;
}

export interface StoreChannelProduct {
  id: string;
  productName: string;
  serviceKey: string;
  retailPrice: number | null;
  isActive: boolean;
  listingActive: boolean;
}

export interface StoreChannelAvailableProduct {
  id: string;
  productName: string;
  serviceKey: string;
  retailPrice: number | null;
}

/* ─── 주입 계약 ─────────────────────────────────────────────── */

export interface StoreChannelsApi {
  /** 채널 목록 + 매장 코드 (fetchChannelOverviewWithCode) */
  fetchChannelOverviewWithCode: () => Promise<{ channels: StoreChannelOverview[]; organizationCode: string | null }>;
  /** 채널 목록만 (제품 변경 후 KPI 갱신용) */
  fetchChannelOverview: () => Promise<StoreChannelOverview[]>;
  createChannel: (channelType: StoreChannelType) => Promise<unknown>;
  listAssets: (params: { limit: number }) => Promise<StoreChannelAssetItem[]>;
  updateAssetPublishStatus: (
    snapshotId: string,
    status: StoreChannelAssetPublishStatus,
  ) => Promise<{ publishStatus: StoreChannelAssetPublishStatus }>;
  updateAssetChannelMap: (
    snapshotId: string,
    channelMap: Record<string, boolean>,
  ) => Promise<{ channelMap: Record<string, boolean> }>;
  fetchChannelProducts: (channelId: string) => Promise<StoreChannelProduct[]>;
  fetchAvailableProducts: (channelId: string) => Promise<StoreChannelAvailableProduct[]>;
  addProductToChannel: (channelId: string, productListingId: string) => Promise<unknown>;
  deactivateChannelProduct: (channelId: string, productChannelId: string) => Promise<unknown>;
  reorderChannelProducts: (channelId: string, items: { id: string; displayOrder: number }[]) => Promise<unknown>;
}

/**
 * 서비스 accent — Tailwind 가 스캔할 수 있도록 **완성된 class 문자열**을 주입한다.
 * 값은 각 서비스의 기존 클래스를 그대로 옮긴 것이며 공통 기본값으로 치환하지 않는다.
 */
export interface StoreChannelsTheme {
  /** 텍스트 링크 — 'text-pink-600' */
  accentText: string;
  /** 주요 버튼 — 'text-white bg-pink-600 hover:bg-pink-700' */
  accentBtn: string;
  /** 보조(연한) 버튼 — 'text-pink-700 bg-pink-50 border-pink-200 hover:bg-pink-100' */
  accentSoftBtn: string;
  /** 흰 배경 위 보조 버튼 — 'text-pink-700 bg-white border-pink-200 hover:bg-pink-50' */
  accentOutlineBtn: string;
  /** 활성 탭 — 'border-pink-600 text-pink-600' */
  accentTab: string;
  /** 선택된 채널 카드 — 'border-pink-400 bg-pink-50' */
  accentCard: string;
  /** 선택된 채널 카드 텍스트/아이콘 — 'text-pink-700' */
  accentCardText: string;
  /** 아이콘 — 'text-pink-500' */
  accentIcon: string;
  /** 모달 아이콘 — 'text-pink-600' */
  accentModalIcon: string;
  /** 모달 목록 hover — 'hover:border-pink-300 hover:bg-pink-50/30' */
  accentRowHover: string;
}

export interface StoreChannelsRoutes {
  /** 대시보드 back-link 목적지 — KCos '/store', GP '/store/hub' */
  dashboard: string;
  /** HUB B2B 상품 목록 */
  hubB2b: string;
  /** 매장 설정 */
  storeSettings: string;
  /** 전체 자산 보기 */
  storeContent: string;
  /** 사이니지 플레이리스트 */
  signagePlaylist: string;
}

export interface StoreChannelsLabels {
  /** 대시보드 Quick Action 라벨 — KCos '대시보드로 이동', GP '매장 HUB으로 이동' */
  dashboardAction: string;
  /** 공개 주소 미설정 안내 — '매장 설정에서 {매장|약국} 코드를 등록하면 공개 URL이 생성됩니다.' */
  missingOrgCodeHint: string;
  /** 배치 콘텐츠 없음 힌트 2번째 줄 */
  emptyChannelAssetsHint: string;
}

export interface StoreChannelsViewProps {
  api: StoreChannelsApi;
  theme: StoreChannelsTheme;
  routes: StoreChannelsRoutes;
  labels: StoreChannelsLabels;
  /**
   * 운영자 편집 guide 본문 조회 (서비스 `fetchGuidePageContent(serviceKey, pageKey)` 바인딩).
   * `guideblock-page-help` 섹션의 JSON 이 있으면 GuideBlock 기본값을 덮어쓴다 — 이 해석은 Core 가 보유한다.
   */
  fetchGuideSections?: () => Promise<Record<string, string>>;
  /** GuideBlock slot — @o4o/shared-space-ui 는 store-ui-core 의존성이 아니다 */
  renderGuideBlock?: (ctx: {
    title: string;
    description: string;
    steps: string[];
  }) => ReactNode;
  /** hero 설명 slot — GuideEditableSection(서비스 컴포넌트) 주입 */
  renderHeroDescription?: (ctx: { defaultContent: string }) => ReactNode;
  /** 서비스 전용 Quick Action slot (GP: SIGNAGE 탭 '디지털사이니지 운영') */
  renderExtraQuickActions?: (ctx: { activeTab: StoreChannelType }) => ReactNode;
}

/* ─── Constants (서비스 간 동일 — 공통 본체가 보유) ──────────── */

const CHANNEL_TABS: { type: StoreChannelType; label: string; Icon: typeof Globe; assetKey: string | null }[] = [
  { type: 'B2C', label: '온라인 스토어', Icon: Globe, assetKey: 'home' },
  { type: 'KIOSK', label: '키오스크', Icon: Monitor, assetKey: null },
  { type: 'TABLET', label: '태블릿', Icon: Tablet, assetKey: null },
  { type: 'SIGNAGE', label: '사이니지', Icon: Tv, assetKey: 'signage' },
];

const PRODUCT_CHANNEL_TYPES: StoreChannelType[] = ['B2C', 'KIOSK'];

const STATUS_CONFIG: Record<StoreChannelStatus, { label: string; bg: string; color: string }> = {
  APPROVED: { label: '활성', bg: '#dcfce7', color: '#166534' },
  PENDING: { label: '대기', bg: '#fef3c7', color: '#92400e' },
  REJECTED: { label: '거부', bg: '#fecaca', color: '#991b1b' },
  SUSPENDED: { label: '정지', bg: '#f1f5f9', color: '#64748b' },
  EXPIRED: { label: '만료', bg: '#f1f5f9', color: '#64748b' },
  TERMINATED: { label: '해지', bg: '#f1f5f9', color: '#64748b' },
};

const PUBLISH_CONFIG: Record<StoreChannelAssetPublishStatus, { label: string; bg: string; text: string }> = {
  draft: { label: '초안', bg: 'bg-slate-100', text: 'text-slate-600' },
  published: { label: '게시됨', bg: 'bg-green-50', text: 'text-green-700' },
  hidden: { label: '숨김', bg: 'bg-orange-50', text: 'text-orange-700' },
};

const CHANNEL_DESC: Record<string, string> = {
  B2C: '고객이 온라인으로 상품을 확인하고 구매합니다',
  KIOSK: '매장 내 키오스크에서 고객이 직접 상품을 조회합니다',
  TABLET: '매장 내 태블릿에서 상품 안내 및 상담 요청을 처리합니다',
  SIGNAGE: '매장 내 디지털사이니지에 콘텐츠를 표시합니다',
};

const DEFAULT_GUIDE = {
  title: '채널별 진열을 설정합니다.',
  description: '온라인 스토어, 키오스크, 태블릿, 사이니지 채널별로 제품 진열과 콘텐츠 노출을 관리합니다.',
  steps: [
    '채널 탭을 선택하여 해당 채널의 진열 상태를 확인합니다',
    '제품 추가 버튼으로 채널에 상품을 등록합니다',
    '순서 변경으로 진열 우선순위를 조정합니다',
    '노출 자산 목록에서 채널별 콘텐츠 공개 상태를 관리합니다',
  ],
};

/* ─── Helpers ────────────────────────────────── */

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

function formatPrice(price: number | null): string {
  if (price == null) return '-';
  return price.toLocaleString('ko-KR') + '원';
}

function isForcedActive(item: StoreChannelAssetItem): boolean {
  if (!item.isForced) return false;
  const now = new Date();
  if (item.forcedStartAt && new Date(item.forcedStartAt) > now) return false;
  if (item.forcedEndAt && new Date(item.forcedEndAt) < now) return false;
  return true;
}

/* ─── AddProductModal ────────────────────────── */

function AddProductModal({
  open,
  onError,
  onClose,
  channelId,
  onProductAdded,
  api,
  theme,
  routes,
}: {
  open: boolean;
  onClose: () => void;
  channelId: string;
  onProductAdded: () => void;
  onError?: (message: string) => void;
  api: StoreChannelsApi;
  theme: StoreChannelsTheme;
  routes: StoreChannelsRoutes;
}) {
  const [available, setAvailable] = useState<StoreChannelAvailableProduct[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !channelId) return;
    setLoadingList(true);
    api.fetchAvailableProducts(channelId)
      .then(setAvailable)
      .catch(() => setAvailable([]))
      .finally(() => setLoadingList(false));
    // api 는 서비스 모듈 상수라 재생성되지 않는다(원본 동작 유지).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, channelId]);

  if (!open) return null;

  const handleAdd = async (productListingId: string) => {
    setAddingId(productListingId);
    try {
      await api.addProductToChannel(channelId, productListingId);
      setAvailable(prev => prev.filter(p => p.id !== productListingId));
      onProductAdded();
    } catch {
      onError?.('제품 추가에 실패했습니다.');
    } finally {
      setAddingId(null);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-[1000]"
        onClick={onClose}
      />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl z-[1001] w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Package className={`w-5 h-5 ${theme.accentModalIcon}`} />
            <h2 className="text-lg font-semibold text-slate-900">제품 추가</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loadingList ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> 제품 목록 로딩 중...
            </div>
          ) : available.length === 0 ? (
            <div className="text-center py-10">
              <Package className="w-8 h-8 mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">추가할 수 있는 상품이 없습니다</p>
              <p className="text-xs mt-2 text-slate-400 leading-relaxed">
                모든 상품이 이미 추가되었거나,<br />
                HUB에서 신청한 상품의 승인이 아직 완료되지 않았습니다.
              </p>
              <Link
                to={routes.hubB2b}
                onClick={onClose}
                className={`inline-flex items-center gap-1 mt-4 text-xs font-medium ${theme.accentText} hover:underline`}
              >
                상품 보러가기 →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {available.map(product => (
                <div
                  key={product.id}
                  className={`flex items-center justify-between p-3 rounded-lg border border-slate-200 ${theme.accentRowHover} transition-colors`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-slate-900 truncate">
                      {product.productName}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">{product.serviceKey}</span>
                      <span className="text-xs text-slate-600">
                        {formatPrice(product.retailPrice)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAdd(product.id)}
                    disabled={addingId === product.id}
                    className={`ml-3 px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-50 flex items-center gap-1 ${theme.accentBtn}`}
                  >
                    {addingId === product.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Plus className="w-3 h-3" />
                    )}
                    추가
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
          >
            닫기
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── ChannelPublicUrlCard ───────────────────── */

function ChannelPublicUrlCard({
  channelType,
  orgCode,
  showToast,
  theme,
  routes,
  labels,
}: {
  channelType: StoreChannelType;
  orgCode: string | null;
  showToast: (type: 'success' | 'error', message: string) => void;
  theme: StoreChannelsTheme;
  routes: StoreChannelsRoutes;
  labels: StoreChannelsLabels;
}) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const getChannelUrl = (): { url: string | null; label: string; guidance: string | null; guidanceLink: string | null } => {
    if (channelType === 'B2C') {
      if (!orgCode) return { url: null, label: '온라인 스토어', guidance: null, guidanceLink: null };
      return { url: `${origin}/store/${orgCode}`, label: '온라인 스토어', guidance: null, guidanceLink: null };
    }
    if (channelType === 'TABLET') {
      if (!orgCode) return { url: null, label: '태블릿', guidance: null, guidanceLink: null };
      return { url: `${origin}/tablet/${orgCode}`, label: '태블릿 상품 안내', guidance: null, guidanceLink: null };
    }
    if (channelType === 'KIOSK') {
      return { url: null, label: '키오스크', guidance: '키오스크는 별도 공개 URL이 없습니다. B2C 스토어 또는 태블릿 채널을 통해 고객이 접근합니다.', guidanceLink: null };
    }
    return { url: null, label: '사이니지', guidance: '재생 화면은 사이니지 관리에서 플레이리스트를 선택하여 실행합니다.', guidanceLink: routes.signagePlaylist };
  };

  const { url, label, guidance, guidanceLink } = getChannelUrl();

  const handleCopy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      showToast('success', '공개 주소가 클립보드에 복사되었습니다.');
    } catch {
      showToast('error', '복사에 실패했습니다. 주소를 직접 복사해 주세요.');
    }
  };

  if ((channelType === 'B2C' || channelType === 'TABLET') && !orgCode) {
    return (
      <div className="flex items-center gap-3 p-4 mb-6 rounded-lg border border-amber-200 bg-amber-50">
        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-800">공개 주소가 아직 설정되지 않았습니다</p>
          <p className="text-xs text-amber-600 mt-0.5">{labels.missingOrgCodeHint}</p>
        </div>
        <Link to={routes.storeSettings} className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-amber-700 bg-white border border-amber-300 rounded-lg hover:bg-amber-100">
          설정으로 이동
        </Link>
      </div>
    );
  }

  if (guidance) {
    return (
      <div className="flex items-center gap-3 p-4 mb-6 rounded-lg border border-slate-200 bg-slate-50">
        <Link2 className="w-5 h-5 text-slate-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-600">{guidance}</p>
        </div>
        {guidanceLink && (
          <Link to={guidanceLink} className={`flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border rounded-lg ${theme.accentOutlineBtn}`}>
            사이니지 관리 <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-4 mb-6 rounded-lg border border-slate-200 bg-white">
      <Link2 className={`w-5 h-5 flex-shrink-0 ${theme.accentIcon}`} />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-slate-500 mb-1">{label} 공개 주소</div>
        <div className="text-[15px] font-mono font-medium text-slate-900 truncate">{url}</div>
        <div className="text-xs text-slate-400 mt-1">이 주소로 고객이 매장 화면에 접속합니다</div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button onClick={handleCopy} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200" title="주소 복사">
          <Copy className="w-3.5 h-3.5" /> 복사
        </button>
        <a href={url!} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg ${theme.accentSoftBtn}`} title="새 탭에서 열기">
          <ExternalLink className="w-3.5 h-3.5" /> 열기
        </a>
      </div>
    </div>
  );
}

/* ─── Main View ──────────────────────────────── */

export function StoreChannelsView({
  api,
  theme,
  routes,
  labels,
  fetchGuideSections,
  renderGuideBlock,
  renderHeroDescription,
  renderExtraQuickActions,
}: StoreChannelsViewProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<StoreChannelType>('B2C');
  const [channels, setChannels] = useState<StoreChannelOverview[]>([]);
  const [assets, setAssets] = useState<StoreChannelAssetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [channelProducts, setChannelProducts] = useState<StoreChannelProduct[]>([]);
  const [availableProducts, setAvailableProducts] = useState<StoreChannelAvailableProduct[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [orgCode, setOrgCode] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const [guideTitle, setGuideTitle] = useState<string | null>(null);
  const [guideDesc, setGuideDesc] = useState<string | null>(null);
  const [guideSteps, setGuideSteps] = useState<string[] | null>(null);

  useEffect(() => {
    if (!fetchGuideSections) return;
    let cancelled = false;
    fetchGuideSections()
      .then(sections => {
        if (cancelled) return;
        const raw = sections['guideblock-page-help'];
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (parsed.title) setGuideTitle(parsed.title);
          if (parsed.description) setGuideDesc(parsed.description);
          if (Array.isArray(parsed.steps)) setGuideSteps(parsed.steps);
        } catch { /* use fallback */ }
      })
      .catch(() => { /* use fallback */ });
    return () => { cancelled = true; };
    // fetchGuideSections 는 서비스 모듈 상수 바인딩이다(원본과 동일하게 1회 실행).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      api.fetchChannelOverviewWithCode().catch(() => ({ channels: [] as StoreChannelOverview[], organizationCode: null })),
      api.listAssets({ limit: 200 }).catch(() => [] as StoreChannelAssetItem[]),
    ]);
    const chResult = results[0].status === 'fulfilled'
      ? results[0].value as { channels: StoreChannelOverview[]; organizationCode: string | null }
      : { channels: [], organizationCode: null };
    setChannels(chResult.channels);
    setOrgCode(chResult.organizationCode);
    setAssets(results[1].status === 'fulfilled' ? results[1].value as StoreChannelAssetItem[] : []);
    setLastFetched(new Date());
    setLoading(false);

    if (chResult.channels.length === 0 && results[0].status === 'rejected') {
      showToast('error', '채널 정보를 불러오지 못했습니다.');
    }
    // api 는 서비스 모듈 상수라 재생성되지 않는다(원본 동작 유지).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const currentChannel = channels.find(ch => ch.channelType === activeTab);
  const currentTab = CHANNEL_TABS.find(t => t.type === activeTab)!;
  const st = currentChannel ? STATUS_CONFIG[currentChannel.status] : null;
  const isProductChannel = PRODUCT_CHANNEL_TYPES.includes(activeTab);

  const loadChannelProducts = useCallback(async (channelId: string) => {
    setProductLoading(true);
    try {
      const [products, available] = await Promise.all([
        api.fetchChannelProducts(channelId),
        api.fetchAvailableProducts(channelId),
      ]);
      setChannelProducts(products);
      setAvailableProducts(available);
    } catch {
      setChannelProducts([]);
      setAvailableProducts([]);
      showToast('error', '제품 목록을 불러오지 못했습니다.');
    } finally {
      setProductLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showToast]);

  useEffect(() => {
    if (isProductChannel && currentChannel?.id) {
      loadChannelProducts(currentChannel.id);
    } else {
      setChannelProducts([]);
      setAvailableProducts([]);
    }
  }, [isProductChannel, currentChannel?.id, loadChannelProducts]);

  const activeProducts = useMemo(
    () => channelProducts.filter(p => p.isActive),
    [channelProducts]
  );
  const inactiveProducts = useMemo(
    () => channelProducts.filter(p => !p.isActive),
    [channelProducts]
  );

  const channelAssets = useMemo(() => {
    const assetKey = currentTab.assetKey;
    if (!assetKey) return [];
    return assets.filter(a => a.channelMap?.[assetKey]);
  }, [assets, currentTab]);

  const publishedAssets = channelAssets.filter(a => a.publishStatus === 'published');
  const forcedAssets = channelAssets.filter(a => isForcedActive(a));

  const handleToggleChannelAsset = async (item: StoreChannelAssetItem) => {
    if (item.isForced || item.isLocked) return;
    const assetKey = currentTab.assetKey;
    if (!assetKey) return;
    const currentMap = item.channelMap || {};
    const newMap: Record<string, boolean> = { ...currentMap, [assetKey]: !currentMap[assetKey] };
    setUpdatingId(item.id);
    try {
      const res = await api.updateAssetChannelMap(item.id, newMap);
      setAssets(prev => prev.map(a =>
        a.id === item.id ? { ...a, channelMap: res.channelMap } : a,
      ));
    } catch {
      showToast('error', '채널 설정 변경에 실패했습니다.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleTogglePublish = async (item: StoreChannelAssetItem) => {
    if (item.isForced) return;
    const cycle: StoreChannelAssetPublishStatus[] = ['draft', 'published', 'hidden'];
    const idx = cycle.indexOf(item.publishStatus);
    const next = cycle[(idx + 1) % cycle.length];
    setUpdatingId(item.id);
    try {
      const res = await api.updateAssetPublishStatus(item.id, next);
      setAssets(prev => prev.map(a =>
        a.id === item.id ? { ...a, publishStatus: res.publishStatus } : a,
      ));
    } catch {
      showToast('error', '게시 상태 변경에 실패했습니다.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeactivateProduct = async (productChannelId: string) => {
    if (!currentChannel) return;
    setDeactivatingId(productChannelId);
    try {
      await api.deactivateChannelProduct(currentChannel.id, productChannelId);
      await loadChannelProducts(currentChannel.id);
      api.fetchChannelOverview().then(setChannels).catch(() => {});
      showToast('success', '제품이 채널에서 제거되었습니다.');
    } catch {
      showToast('error', '제품 제거에 실패했습니다.');
    } finally {
      setDeactivatingId(null);
    }
  };

  const handleProductAdded = () => {
    if (currentChannel) {
      loadChannelProducts(currentChannel.id);
      api.fetchChannelOverview().then(setChannels).catch(() => {});
      showToast('success', '제품이 채널에 추가되었습니다.');
    }
  };

  const handleMoveProduct = async (productId: string, direction: 'up' | 'down') => {
    if (!currentChannel) return;
    const idx = activeProducts.findIndex(p => p.id === productId);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= activeProducts.length) return;

    const updated = [...activeProducts];
    [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];
    const items = updated.map((p, i) => ({ id: p.id, displayOrder: i }));

    setReordering(true);
    try {
      await api.reorderChannelProducts(currentChannel.id, items);
      await loadChannelProducts(currentChannel.id);
    } catch {
      showToast('error', '순서 변경에 실패했습니다.');
      await loadChannelProducts(currentChannel.id);
    } finally {
      setReordering(false);
    }
  };

  const handleCreateChannel = async () => {
    setCreating(true);
    try {
      await api.createChannel(activeTab);
      await fetchData();
      showToast('success', `${CHANNEL_TABS.find(t => t.type === activeTab)?.label ?? activeTab} 채널이 생성되었습니다.`);
    } catch {
      showToast('error', '채널 생성에 실패했습니다.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> 채널 정보를 불러오는 중...
      </div>
    );
  }

  if (!loading && channels.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="text-sm text-slate-500 mb-1">
          <Link to={routes.dashboard} className={`${theme.accentText} hover:underline`}>&larr; 대시보드</Link>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-8">채널 관리</h1>
        <div className="text-center py-16 bg-white rounded-lg border border-slate-200">
          <Package className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-sm text-slate-500">아직 등록된 채널이 없습니다.</p>
          <p className="text-xs text-slate-400 mt-1">아래 버튼으로 첫 채널을 생성하세요.</p>
          <button
            onClick={handleCreateChannel}
            disabled={creating}
            className={`mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 ${theme.accentBtn}`}
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            B2C 채널 만들기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-sm text-slate-500 mb-1">
            <Link to={routes.dashboard} className={`${theme.accentText} hover:underline`}>&larr; 대시보드</Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">채널 관리</h1>
          <p className="text-sm text-slate-500 mt-1">
            {renderHeroDescription
              ? renderHeroDescription({ defaultContent: '각 채널의 제품 진열과 콘텐츠 노출을 관리합니다' })
              : '각 채널의 제품 진열과 콘텐츠 노출을 관리합니다'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastFetched && (
            <span className="text-xs text-slate-400">
              {lastFetched.toLocaleTimeString('ko-KR')} 조회
            </span>
          )}
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" /> 새로고침
          </button>
        </div>
      </div>

      {/* GuideBlock — 운영자 편집본이 있으면 덮어쓰고, 없으면 기본 문구 */}
      {renderGuideBlock?.({
        title: guideTitle ?? DEFAULT_GUIDE.title,
        description: guideDesc ?? DEFAULT_GUIDE.description,
        steps: guideSteps ?? DEFAULT_GUIDE.steps,
      })}

      {/* [A] Channel Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <div className="flex gap-1">
          {CHANNEL_TABS.map(tab => {
            const ch = channels.find(c => c.channelType === tab.type);
            const isActive = activeTab === tab.type;
            const chSt = ch ? STATUS_CONFIG[ch.status] : null;
            return (
              <button
                key={tab.type}
                onClick={() => setActiveTab(tab.type)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? theme.accentTab
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <tab.Icon className="w-4 h-4" />
                {tab.label}
                {chSt && (
                  <span
                    className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
                    style={{ background: chSt.bg, color: chSt.color }}
                  >
                    {chSt.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 채널 선택 가이드 (WO-O4O-CHANNEL-UX-STEP1-GUIDE-V1) ─── */}
      <div className="mb-6 p-5 rounded-xl border border-slate-200 bg-slate-50">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">상품을 어디에 보여줄지 선택하세요</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            // 메인 탭 CHANNEL_TABS 와 채널 타입별 동일 아이콘. SIGNAGE 는 가이드 문맥상 Tv.
            { type: 'B2C', Icon: Globe, label: '온라인 판매', sub: '고객이 온라인으로 구매' },
            { type: 'TABLET', Icon: Tablet, label: '매장 태블릿', sub: '매장에서 상품 안내·상담' },
            { type: 'KIOSK', Icon: Monitor, label: '키오스크', sub: '고객이 직접 탐색' },
            { type: 'SIGNAGE', Icon: Tv, label: '사이니지', sub: '화면(TV)에 콘텐츠 표시' },
          ] as const).map(item => {
            const Icon = item.Icon;
            return (
            <button
              key={item.type}
              onClick={() => setActiveTab(item.type)}
              className={`flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-colors ${
                activeTab === item.type
                  ? theme.accentCard
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <Icon size={20} className={activeTab === item.type ? theme.accentCardText : 'text-slate-500'} />
              <span className={`text-xs font-semibold ${activeTab === item.type ? theme.accentCardText : 'text-slate-700'}`}>{item.label}</span>
              <span className="text-[11px] text-slate-400 leading-tight">{item.sub}</span>
            </button>
            );
          })}
        </div>
        {CHANNEL_DESC[activeTab] && (
          <p className="mt-3 text-xs text-slate-500 border-t border-slate-200 pt-3">
            <span className="font-medium">현재 선택:</span> {CHANNEL_DESC[activeTab]}
          </p>
        )}
      </div>

      {/* ─── 공개 URL 카드 ─── */}
      {currentChannel && (
        <ChannelPublicUrlCard channelType={activeTab} orgCode={orgCode} showToast={showToast} theme={theme} routes={routes} labels={labels} />
      )}

      {/* ─── 상태 기반 행동 유도 (WO-O4O-CHANNEL-UX-STEP2-STATE-DRIVEN-V1) ─── */}
      {isProductChannel && currentChannel?.status === 'APPROVED' && !productLoading && (() => {
        if (channelProducts.length > 0) {
          return (
            <div className="flex items-start gap-4 p-5 mb-6 rounded-xl border border-green-200 bg-green-50">
              <span className="text-xl shrink-0">🟢</span>
              <div>
                <p className="text-sm font-semibold text-green-800">이 채널에서 상품이 고객에게 노출되고 있습니다</p>
                <p className="text-xs text-green-700 mt-1">상품 순서를 조정하거나 추가 상품을 등록할 수 있습니다.</p>
              </div>
            </div>
          );
        }
        if (availableProducts.length > 0) {
          return (
            <div className="flex items-start justify-between gap-4 p-5 mb-6 rounded-xl border border-amber-200 bg-amber-50">
              <div className="flex items-start gap-4">
                <span className="text-xl shrink-0">🟡</span>
                <div>
                  <p className="text-sm font-semibold text-amber-800">상품은 추가되었지만 아직 진열되지 않았습니다</p>
                  <p className="text-xs text-amber-700 mt-1">채널에 추가하면 고객에게 보여줄 수 있습니다.</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className={`shrink-0 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${theme.accentBtn}`}
              >
                이 채널에 상품 추가하기
              </button>
            </div>
          );
        }
        return (
          <div className="flex items-start justify-between gap-4 p-5 mb-6 rounded-xl border border-slate-200 bg-slate-50">
            <div className="flex items-start gap-4">
              <span className="text-xl shrink-0">⬜</span>
              <div>
                <p className="text-sm font-semibold text-slate-700">아직 추가된 상품이 없습니다</p>
                <p className="text-xs text-slate-500 mt-1">HUB에서 상품을 선택하고 내 매장에서 판매를 시작하세요.</p>
              </div>
            </div>
            <Link to={routes.hubB2b} className={`shrink-0 px-4 py-2 text-sm font-medium border rounded-lg transition-colors ${theme.accentOutlineBtn}`}>
              상품 보러가기
            </Link>
          </div>
        );
      })()}

      {/* Toast Feedback */}
      {toast && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '12px 16px', borderRadius: '8px', border: '1px solid',
          fontSize: '0.875rem', marginBottom: '16px',
          backgroundColor: toast.type === 'success' ? '#f0fdf4' : '#fef2f2',
          borderColor: toast.type === 'success' ? '#86efac' : '#fecaca',
          color: toast.type === 'success' ? '#166534' : '#991b1b',
        }}>
          <span>{toast.type === 'success' ? '✅' : '❌'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* [B] Channel KPI */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="rounded-lg border border-slate-200 p-4 bg-white">
          <div className="text-xs text-slate-500 mb-1">채널 상태</div>
          {currentChannel ? (
            <>
              <span
                className="inline-flex px-2.5 py-1 rounded text-sm font-semibold"
                style={{ background: st!.bg, color: st!.color }}
              >
                {st!.label}
              </span>
              <div className="text-[10px] text-slate-400 mt-2">
                수정: {formatDate(currentChannel.updatedAt)}
              </div>
            </>
          ) : (
            <button
              onClick={handleCreateChannel}
              disabled={creating}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-50 ${theme.accentBtn}`}
            >
              {creating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              채널 만들기
            </button>
          )}
        </div>
        <div className="rounded-lg border border-slate-200 p-4 bg-white">
          <div className="text-xs text-slate-500 mb-1">노출 상품</div>
          <div className="text-2xl font-bold text-slate-900">
            {currentChannel ? currentChannel.visibleProductCount : 0}
            <span className="text-sm font-normal text-slate-400 ml-1">
              / {currentChannel ? currentChannel.totalProductCount : 0}
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 p-4 bg-white">
          <div className="text-xs text-slate-500 mb-1">노출 콘텐츠</div>
          <div className="text-2xl font-bold text-slate-900">
            {publishedAssets.length}
            <span className="text-sm font-normal text-slate-400 ml-1">
              / {channelAssets.length}
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 p-4 bg-red-50">
          <div className="text-xs text-red-500 mb-1">강제노출</div>
          <div className="text-2xl font-bold text-red-700">{forcedAssets.length}</div>
        </div>
      </div>

      {/* [C] Quick Actions */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => navigate(routes.dashboard)}
          className={`px-3 py-1.5 text-xs font-medium border rounded-lg ${theme.accentSoftBtn}`}
        >
          {labels.dashboardAction}
        </button>
        <button
          onClick={() => navigate(routes.storeContent)}
          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100"
        >
          전체 자산 보기
        </button>
        {renderExtraQuickActions?.({ activeTab })}
        {activeTab === 'B2C' && orgCode && (
          <a
            href={`/store/${orgCode}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            스토어 미리보기
          </a>
        )}
      </div>

      {/* [D] Channel Product List (B2C/KIOSK only) */}
      {isProductChannel && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">진열 제품</h2>
            {currentChannel && currentChannel.status === 'APPROVED' && (
              <button
                onClick={() => setShowAddModal(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg ${theme.accentBtn}`}
              >
                <Plus className="w-3.5 h-3.5" /> 제품 추가
              </button>
            )}
          </div>

          {productLoading ? (
            <div className="flex items-center justify-center py-8 text-slate-400 bg-white rounded-lg border border-slate-200">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> 제품 목록 로딩 중...
            </div>
          ) : !currentChannel ? (
            <div className="text-center py-8 bg-white rounded-lg border border-slate-200">
              <p className="text-sm text-slate-400">이 채널이 아직 등록되지 않았습니다.</p>
              <button
                onClick={handleCreateChannel}
                disabled={creating}
                className={`mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg disabled:opacity-50 ${theme.accentBtn}`}
              >
                {creating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                채널 만들기
              </button>
            </div>
          ) : currentChannel.status === 'PENDING' ? (
            <div className="text-center py-8 bg-white rounded-lg border border-amber-200 bg-amber-50/50">
              <p className="text-sm text-amber-700 font-medium">채널이 신청되었습니다</p>
              <p className="text-xs text-amber-600 mt-1">승인 후 제품을 진열할 수 있습니다.</p>
            </div>
          ) : activeProducts.length === 0 && inactiveProducts.length === 0 ? (
            <div className="text-center py-8 text-slate-400 bg-white rounded-lg border border-slate-200">
              <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">이 채널에 등록된 제품이 없습니다.</p>
              <p className="text-xs mt-1">"제품 추가" 버튼으로 제품을 진열하세요.</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                    <th className="px-4 py-3 font-medium w-16">#</th>
                    <th className="px-4 py-3 font-medium">상품명</th>
                    <th className="px-4 py-3 font-medium w-20">유형</th>
                    <th className="px-4 py-3 font-medium w-28">가격</th>
                    <th className="px-4 py-3 font-medium w-20">상태</th>
                    <th className="px-4 py-3 font-medium w-16">순서</th>
                    <th className="px-4 py-3 font-medium w-20">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeProducts.map((product, idx) => (
                    <tr key={product.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 truncate max-w-sm">
                          {product.productName}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-1.5 py-0.5 bg-slate-100 rounded text-xs text-slate-600">
                          {product.serviceKey}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatPrice(product.retailPrice)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          product.listingActive
                            ? 'bg-green-50 text-green-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {product.listingActive ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => handleMoveProduct(product.id, 'up')}
                            disabled={idx === 0 || reordering}
                            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent"
                            title="위로 이동"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleMoveProduct(product.id, 'down')}
                            disabled={idx === activeProducts.length - 1 || reordering}
                            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent"
                            title="아래로 이동"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeactivateProduct(product.id)}
                          disabled={deactivatingId === product.id}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50"
                          title="채널에서 제거"
                        >
                          {deactivatingId === product.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <MinusCircle className="w-3 h-3" />
                          )}
                          제거
                        </button>
                      </td>
                    </tr>
                  ))}
                  {inactiveProducts.length > 0 && (
                    <>
                      <tr className="bg-slate-50/50">
                        <td colSpan={7} className="px-4 py-2 text-xs text-slate-400">
                          비활성 제품 ({inactiveProducts.length})
                        </td>
                      </tr>
                      {inactiveProducts.map(product => (
                        <tr key={product.id} className="opacity-50">
                          <td className="px-4 py-2 text-slate-300">-</td>
                          <td className="px-4 py-2 text-slate-400 line-through truncate max-w-sm">
                            {product.productName}
                          </td>
                          <td className="px-4 py-2">
                            <span className="px-1.5 py-0.5 bg-slate-100 rounded text-xs text-slate-400">
                              {product.serviceKey}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-slate-400">
                            {formatPrice(product.retailPrice)}
                          </td>
                          <td className="px-4 py-2">
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-400">
                              비활성
                            </span>
                          </td>
                          <td className="px-4 py-2" />
                          <td className="px-4 py-2" />
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* [E] 노출 자산 리스트 */}
      {currentTab.assetKey ? (
        channelAssets.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-sm">이 채널에 배치된 콘텐츠가 없습니다.</p>
            <p className="text-xs mt-1">{labels.emptyChannelAssetsHint}</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                  <th className="px-4 py-3 font-medium">유형</th>
                  <th className="px-4 py-3 font-medium">제목</th>
                  <th className="px-4 py-3 font-medium w-24">게시 상태</th>
                  <th className="px-4 py-3 font-medium w-24">채널 노출</th>
                  <th className="px-4 py-3 font-medium w-28">복사일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {channelAssets.map(item => {
                  const pubCfg = PUBLISH_CONFIG[item.publishStatus] || PUBLISH_CONFIG.draft;
                  const isUpdating = updatingId === item.id;
                  const forced = isForcedActive(item);
                  const assetKey = currentTab.assetKey!;
                  const isOn = item.channelMap?.[assetKey] ?? false;

                  return (
                    <tr key={item.id} className={`hover:bg-slate-50 ${forced ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.assetType === 'cms' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                        }`}>
                          {item.assetType === 'cms' ? 'CMS' : '사이니지'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 truncate max-w-md">{item.title}</div>
                        {forced && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700 mt-1">
                            <ShieldAlert className="w-3 h-3" /> 강제노출
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {forced ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 opacity-70">
                            <Lock className="w-3 h-3 mr-1" /> {pubCfg.label}
                          </span>
                        ) : (
                          <button
                            onClick={() => handleTogglePublish(item)}
                            disabled={isUpdating}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 disabled:opacity-50 ${pubCfg.bg} ${pubCfg.text}`}
                            title="클릭하여 상태 변경"
                          >
                            {isUpdating && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                            {pubCfg.label}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {forced || item.isLocked ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600">
                            <Eye className="w-3.5 h-3.5" /> ON
                          </span>
                        ) : (
                          <button
                            onClick={() => handleToggleChannelAsset(item)}
                            disabled={isUpdating}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                              isOn
                                ? 'bg-green-50 text-green-700 border border-green-300 hover:bg-green-100'
                                : 'bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100'
                            } disabled:opacity-50`}
                            title={`채널 노출 ${isOn ? 'OFF' : 'ON'}`}
                          >
                            {isOn ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            {isOn ? 'ON' : 'OFF'}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(item.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="text-center py-16 text-slate-400 bg-white rounded-lg border border-slate-200">
          <p className="text-sm">이 채널의 콘텐츠 배치 기능은 준비 중입니다.</p>
          <p className="text-xs mt-1">상품 노출은 위 KPI에서 확인할 수 있습니다.</p>
        </div>
      )}

      {/* Add Product Modal */}
      {currentChannel && (
        <AddProductModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          channelId={currentChannel.id}
          onProductAdded={handleProductAdded}
          onError={(msg) => showToast('error', msg)}
          api={api}
          theme={theme}
          routes={routes}
        />
      )}
    </div>
  );
}

export default StoreChannelsView;
