/**
 * ContextAssetListPage - 관리자 Context Asset 목록 페이지
 *
 * Work Order: WO-AI-CONTEXT-ASSET-MANAGER-V1
 *
 * AI 응답에 노출되는 광고/정보/컨텐츠(Context Asset) 목록 관리
 * - 유형/서비스/목적/상태별 필터
 * - 등록/수정/비활성화
 */

import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Package,
  Eye,
  Edit,
  Archive,
  MoreVertical,
  Building2,
  FileText,
  ShoppingBag,
  Megaphone,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  type ContextAsset,
  type AssetType,
  type AssetStatus,
  type ServiceScope,
  type ContextAssetFilter,
  ASSET_TYPE_OPTIONS,
  ASSET_STATUS_OPTIONS,
  SERVICE_SCOPE_OPTIONS,
  getAssetTypeLabel,
  getAssetStatusInfo,
  getPurposeTagInfo,
} from './contextAssetTypes';

// ===== Mock 데이터 =====
const mockContextAssets: ContextAsset[] = [
  {
    id: 'ca-1',
    type: 'brand',
    title: '네처 프리미엄 브랜드 소개',
    summary: '건강한 삶을 위한 프리미엄 건강기능식품 브랜드',
    content: '<p>네처는 과학적 근거에 기반한 건강기능식품을 제공합니다...</p>',
    imageUrl: '/images/brand-neture.jpg',
    linkUrl: '/brand/neture-premium',
    serviceScope: ['neture', 'glycopharm'],
    pageTypes: ['home', 'category'],
    purposeTags: ['branding'],
    experimentTags: ['none'],
    status: 'active',
    exposureCount: 1523,
    lastExposedAt: '2026-01-17T09:30:00Z',
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-15T14:30:00Z',
    createdBy: 'admin',
  },
  {
    id: 'ca-2',
    type: 'product',
    title: '멀티비타민 골드 (30일분)',
    summary: '하루 한 알로 필수 영양소 17종 섭취',
    content: '<p>현대인에게 부족하기 쉬운 비타민과 미네랄을 한 번에...</p>',
    imageUrl: '/images/product-multivitamin.jpg',
    linkUrl: '/products/multivitamin-gold',
    serviceScope: ['all'],
    pageTypes: ['product', 'search'],
    purposeTags: ['conversion', 'information'],
    experimentTags: ['engine-a'],
    status: 'active',
    exposureCount: 3892,
    lastExposedAt: '2026-01-17T10:15:00Z',
    createdAt: '2026-01-05T11:00:00Z',
    updatedAt: '2026-01-16T16:00:00Z',
    createdBy: 'admin',
  },
  {
    id: 'ca-3',
    type: 'content',
    title: '혈당 관리 가이드 2026',
    summary: '건강한 혈당 유지를 위한 생활 습관 안내',
    content: '<p>혈당 관리는 현대인의 필수 건강 관리 요소입니다...</p>',
    imageUrl: '/images/guide-glucose.jpg',
    linkUrl: '/content/glucose-guide-2026',
    serviceScope: ['glucoseview', 'glycopharm'],
    pageTypes: ['content', 'home'],
    purposeTags: ['information', 'engagement'],
    experimentTags: ['none'],
    status: 'active',
    exposureCount: 2156,
    lastExposedAt: '2026-01-17T08:45:00Z',
    createdAt: '2026-01-03T09:00:00Z',
    updatedAt: '2026-01-14T11:30:00Z',
    createdBy: 'admin',
  },
  {
    id: 'ca-4',
    type: 'non_product',
    title: '프리미엄 오메가3 (출시 예정)',
    summary: '2026년 2월 출시 예정 - 고순도 rTG 오메가3',
    content: '<p>순도 90% 이상의 프리미엄 오메가3가 곧 출시됩니다...</p>',
    imageUrl: '/images/product-omega3-preview.jpg',
    linkUrl: '/products/omega3-premium-preview',
    serviceScope: ['neture'],
    pageTypes: ['product', 'category'],
    purposeTags: ['branding', 'engagement'],
    experimentTags: ['variant-1'],
    status: 'draft',
    exposureCount: 0,
    createdAt: '2026-01-10T14:00:00Z',
    updatedAt: '2026-01-10T14:00:00Z',
    createdBy: 'admin',
  },
  {
    id: 'ca-5',
    type: 'product',
    title: 'K-뷰티 수분크림 에디션',
    summary: '피부 깊은 곳까지 수분 공급',
    content: '<p>히알루론산 3중 복합체로 피부 보습을...</p>',
    imageUrl: '/images/product-cream.jpg',
    linkUrl: '/products/k-beauty-cream',
    serviceScope: ['k-cosmetics'],
    pageTypes: ['product', 'store', 'search'],
    purposeTags: ['conversion'],
    experimentTags: ['engine-b'],
    status: 'active',
    exposureCount: 2834,
    lastExposedAt: '2026-01-17T09:00:00Z',
    createdAt: '2026-01-02T10:00:00Z',
    updatedAt: '2026-01-16T09:00:00Z',
    createdBy: 'admin',
  },
  {
    id: 'ca-6',
    type: 'content',
    title: '약사를 위한 복약 상담 가이드',
    summary: 'KPA 인증 복약 지도 교육 자료',
    content: '<p>약사의 전문성을 높이는 복약 상담 기법...</p>',
    serviceScope: ['kpa-society'],
    pageTypes: ['content'],
    purposeTags: ['information'],
    experimentTags: ['none'],
    status: 'active',
    exposureCount: 456,
    lastExposedAt: '2026-01-16T18:00:00Z',
    createdAt: '2026-01-08T10:00:00Z',
    updatedAt: '2026-01-12T15:00:00Z',
    createdBy: 'admin',
  },
  {
    id: 'ca-7',
    type: 'brand',
    title: '글루코스뷰 서비스 소개',
    summary: 'CGM 기반 실시간 혈당 모니터링 서비스',
    content: '<p>글루코스뷰는 연속혈당측정기와 연동하여...</p>',
    imageUrl: '/images/brand-glucoseview.jpg',
    linkUrl: '/about/glucoseview',
    serviceScope: ['glucoseview'],
    pageTypes: ['home', 'content'],
    purposeTags: ['branding', 'information'],
    experimentTags: ['none'],
    status: 'inactive',
    exposureCount: 892,
    lastExposedAt: '2026-01-10T12:00:00Z',
    createdAt: '2026-01-01T09:00:00Z',
    updatedAt: '2026-01-10T12:30:00Z',
    createdBy: 'admin',
  },
];

// ===== 유틸 함수 =====
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
  });
};

const formatNumber = (num: number) => num.toLocaleString('ko-KR');

const getAssetTypeIcon = (type: AssetType) => {
  const icons = {
    brand: Building2,
    product: ShoppingBag,
    non_product: Package,
    content: FileText,
  };
  return icons[type] || Package;
};

// ===== 컴포넌트 =====

// Asset 카드
function AssetCard({
  asset,
  onEdit,
  onToggleStatus,
}: {
  asset: ContextAsset;
  onEdit: (id: string) => void;
  onToggleStatus: (id: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const TypeIcon = getAssetTypeIcon(asset.type);
  const statusInfo = getAssetStatusInfo(asset.status);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <TypeIcon className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <span className="text-xs text-gray-500">{getAssetTypeLabel(asset.type)}</span>
              <span
                className={`ml-2 px-1.5 py-0.5 text-xs font-medium rounded ${statusInfo?.color}`}
              >
                {statusInfo?.label}
              </span>
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-6 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10 w-32">
                <button
                  onClick={() => {
                    onEdit(asset.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  수정
                </button>
                <button
                  onClick={() => {
                    onToggleStatus(asset.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  {asset.status === 'active' ? (
                    <>
                      <XCircle className="w-4 h-4" />
                      비활성화
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      활성화
                    </>
                  )}
                </button>
                <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600">
                  <Archive className="w-4 h-4" />
                  보관
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Title & Summary */}
        <h3 className="font-medium text-gray-900 mb-1 line-clamp-1">{asset.title}</h3>
        <p className="text-sm text-gray-500 line-clamp-2 mb-3">{asset.summary}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {asset.purposeTags.map((tag) => {
            const tagInfo = getPurposeTagInfo(tag);
            return (
              <span
                key={tag}
                className={`px-1.5 py-0.5 text-xs font-medium rounded ${tagInfo?.color}`}
              >
                {tagInfo?.label}
              </span>
            );
          })}
          {asset.experimentTags[0] !== 'none' && (
            <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-indigo-100 text-indigo-700">
              {asset.experimentTags[0]}
            </span>
          )}
        </div>

        {/* Service Scope */}
        <div className="text-xs text-gray-400 mb-3">
          적용:{' '}
          {asset.serviceScope.includes('all')
            ? '전체 서비스'
            : asset.serviceScope
                .map((s) => SERVICE_SCOPE_OPTIONS.find((opt) => opt.value === s)?.label)
                .join(', ')}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Eye className="w-3.5 h-3.5" />
            <span>{formatNumber(asset.exposureCount)} 노출</span>
          </div>
          {asset.lastExposedAt && (
            <span className="text-xs text-gray-400">
              최근: {formatDate(asset.lastExposedAt)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== 메인 컴포넌트 =====
export default function ContextAssetListPage() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<ContextAsset[]>(mockContextAssets);
  const [filter, setFilter] = useState<ContextAssetFilter>({});
  const [searchQuery, setSearchQuery] = useState('');

  // 필터링된 Asset 목록
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      if (filter.type && asset.type !== filter.type) return false;
      if (filter.status && asset.status !== filter.status) return false;
      if (filter.serviceScope && !asset.serviceScope.includes(filter.serviceScope)) return false;
      if (filter.purposeTag && !asset.purposeTags.includes(filter.purposeTag)) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          asset.title.toLowerCase().includes(query) ||
          asset.summary.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [assets, filter, searchQuery]);

  // 통계
  const stats = useMemo(() => {
    return {
      total: assets.length,
      active: assets.filter((a) => a.status === 'active').length,
      totalExposure: assets.reduce((sum, a) => sum + a.exposureCount, 0),
      byType: {
        brand: assets.filter((a) => a.type === 'brand').length,
        product: assets.filter((a) => a.type === 'product').length,
        non_product: assets.filter((a) => a.type === 'non_product').length,
        content: assets.filter((a) => a.type === 'content').length,
      },
    };
  }, [assets]);

  const handleEdit = (id: string) => {
    navigate(`/admin/ai/context-assets/${id}/edit`);
  };

  const handleToggleStatus = (id: string) => {
    setAssets((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, status: a.status === 'active' ? 'inactive' : 'active' }
          : a
      )
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-xl font-bold text-primary-600">
                Neture
              </Link>
              <span className="text-gray-300">|</span>
              <span className="text-sm font-medium text-gray-600">AI 관리</span>
            </div>
            <Link to="/admin" className="text-sm text-gray-500 hover:text-gray-700">
              대시보드
            </Link>
          </div>
        </div>
      </header>

      {/* Sub Navigation */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-6">
            <Link
              to="/admin/ai"
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm"
            >
              대시보드
            </Link>
            <Link
              to="/admin/ai/engines"
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm"
            >
              엔진 설정
            </Link>
            <Link
              to="/admin/ai/policy"
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm"
            >
              사용 기준 설정
            </Link>
            <Link
              to="/admin/ai/asset-quality"
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm"
            >
              품질 관리
            </Link>
            <Link
              to="/admin/ai/cost"
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm"
            >
              비용 현황
            </Link>
            <Link
              to="/admin/ai/context-assets"
              className="py-4 px-1 border-b-2 border-primary-600 text-primary-600 font-medium text-sm"
            >
              Context Asset
            </Link>
            <Link
              to="/admin/ai/composition-rules"
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm"
            >
              응답 규칙
            </Link>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Context Asset 관리</h1>
            <p className="text-gray-500 mt-1">
              AI 응답에 노출되는 광고/정보/컨텐츠를 등록하고 관리합니다.
            </p>
          </div>
          <Link
            to="/admin/ai/context-assets/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Asset 등록
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500">전체 Asset</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500">활성</div>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500">총 노출</div>
            <div className="text-2xl font-bold text-gray-900">
              {formatNumber(stats.totalExposure)}
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500">유형별</div>
            <div className="text-xs text-gray-600 mt-1">
              브랜드 {stats.byType.brand} / 상품 {stats.byType.product} / 비상품{' '}
              {stats.byType.non_product} / 콘텐츠 {stats.byType.content}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px] max-w-md relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="제목, 요약으로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Type Filter */}
            <select
              value={filter.type || ''}
              onChange={(e) =>
                setFilter((prev) => ({
                  ...prev,
                  type: e.target.value as AssetType | undefined || undefined,
                }))
              }
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">전체 유형</option>
              {ASSET_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filter.status || ''}
              onChange={(e) =>
                setFilter((prev) => ({
                  ...prev,
                  status: e.target.value as AssetStatus | undefined || undefined,
                }))
              }
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">전체 상태</option>
              {ASSET_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Service Filter */}
            <select
              value={filter.serviceScope || ''}
              onChange={(e) =>
                setFilter((prev) => ({
                  ...prev,
                  serviceScope: e.target.value as ServiceScope | undefined || undefined,
                }))
              }
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">전체 서비스</option>
              {SERVICE_SCOPE_OPTIONS.filter((s) => s.value !== 'all').map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Clear Filters */}
            {(filter.type || filter.status || filter.serviceScope || searchQuery) && (
              <button
                onClick={() => {
                  setFilter({});
                  setSearchQuery('');
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                필터 초기화
              </button>
            )}
          </div>
        </div>

        {/* Asset Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.length > 0 ? (
            filteredAssets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onEdit={handleEdit}
                onToggleStatus={handleToggleStatus}
              />
            ))
          ) : (
            <div className="col-span-full bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <div className="text-gray-500 mb-4">조건에 맞는 Asset이 없습니다.</div>
              <Link
                to="/admin/ai/context-assets/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
                새 Asset 등록
              </Link>
            </div>
          )}
        </div>

        {/* Info Banner */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <Megaphone className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <strong>Context Asset이란?</strong> AI 응답 중 질문과 맥락에 맞추어 함께 노출될 수 있는
            모든 정보성·광고성·설명성 자산입니다. 상품 여부와 무관하게 AI가 사용자에게 전달할 수 있는
            모든 콘텐츠를 등록합니다.
          </div>
        </div>
      </main>
    </div>
  );
}
