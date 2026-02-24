/**
 * Content Assets - DB Read-Only List
 *
 * WO-O4O-CONTENT-ASSETS-DB-READONLY-V1
 *
 * ⚠️ READ-ONLY 상태
 * - cms_media 테이블에서 실제 데이터를 조회합니다
 * - Content Core 타입(enum)으로 매핑하여 표시합니다
 * - 저장/수정/삭제 기능이 없습니다
 *
 * Content Core는 DB를 소유하지 않음.
 * cms_media가 유일한 Source of Truth.
 *
 * @see docs/platform/content-core/CONTENT-CORE-OVERVIEW.md
 */

import { useState, useEffect, useCallback } from 'react';
import { Image, ArrowLeft, Video, FileText, Blocks, Eye, Filter, RefreshCw, AlertCircle, Database } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import {
  ContentType,
  ContentStatus,
  ContentVisibility,
  ContentOwnerType,
} from '@o4o-apps/content-core';

import { contentAssetsApi, ContentAssetView } from '@/api/content-assets.api';

/**
 * 타입별 아이콘 매핑
 */
const TYPE_ICONS: Record<ContentType, React.ReactNode> = {
  [ContentType.VIDEO]: <Video className="w-4 h-4" />,
  [ContentType.IMAGE]: <Image className="w-4 h-4" />,
  [ContentType.DOCUMENT]: <FileText className="w-4 h-4" />,
  [ContentType.BLOCK]: <Blocks className="w-4 h-4" />,
};

/**
 * 타입별 라벨
 */
const TYPE_LABELS: Record<ContentType, string> = {
  [ContentType.VIDEO]: 'Video',
  [ContentType.IMAGE]: 'Image',
  [ContentType.DOCUMENT]: 'Document',
  [ContentType.BLOCK]: 'Block',
};

/**
 * 상태별 스타일
 */
const STATUS_STYLES: Record<ContentStatus, { bg: string; text: string; label: string }> = {
  [ContentStatus.DRAFT]: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Draft' },
  [ContentStatus.PENDING]: { bg: 'bg-blue-100', text: 'text-blue-600', label: 'Pending' },
  [ContentStatus.PUBLISHED]: { bg: 'bg-green-100', text: 'text-green-700', label: 'Published' },
  [ContentStatus.ARCHIVED]: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Archived' },
};

/**
 * 소유자 타입 라벨
 */
const OWNER_LABELS: Record<ContentOwnerType, string> = {
  [ContentOwnerType.PLATFORM]: 'Platform',
  [ContentOwnerType.SERVICE]: 'Service',
  [ContentOwnerType.PARTNER]: 'Partner',
};

export default function ContentAssetsPage() {
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<ContentType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ContentStatus | 'all'>('all');

  // Data state
  const [assets, setAssets] = useState<ContentAssetView[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from API
  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await contentAssetsApi.list({
        type: typeFilter,
        status: statusFilter,
        limit: 100,
      });

      setAssets(result.assets);
      setTotal(result.total);
    } catch (err) {
      console.error('Failed to fetch content assets:', err);
      setError('데이터를 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter]);

  // Load data on mount and filter change
  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('ko-KR');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="p-6 max-w-6xl">
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link
          to="/content"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Content
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Image className="w-8 h-8 text-gray-400" />
          <h1 className="text-2xl font-semibold text-gray-900">Content / Assets</h1>
        </div>
        <p className="text-gray-500">
          콘텐츠 자산 관리 (동영상, 이미지, 문서, 블록)
        </p>
      </div>

      {/* Read-Only Notice - DB Connected */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Database className="w-5 h-5 text-green-600 mt-0.5" />
          <div>
            <p className="text-green-800 font-medium">DB 연결됨 - Read-Only 모드</p>
            <p className="text-green-700 text-sm mt-1">
              이 화면은 cms_media 테이블의 실제 데이터를 Content Core 관점으로 표시합니다.
              데이터 조회만 가능하며, 수정/삭제는 지원되지 않습니다.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">Filter:</span>
        </div>

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as ContentType | 'all')}
          className="text-sm border border-gray-200 rounded-md px-3 py-1.5 bg-white"
          disabled={loading}
        >
          <option value="all">All Types</option>
          {Object.values(ContentType).map((type) => (
            <option key={type} value={type}>
              {TYPE_LABELS[type]}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ContentStatus | 'all')}
          className="text-sm border border-gray-200 rounded-md px-3 py-1.5 bg-white"
          disabled={loading}
        >
          <option value="all">All Status</option>
          {Object.values(ContentStatus).map((status) => (
            <option key={status} value={status}>
              {STATUS_STYLES[status].label}
            </option>
          ))}
        </select>

        {/* Refresh button */}
        <button
          onClick={fetchAssets}
          disabled={loading}
          className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-50"
          title="새로고침"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>

        <span className="text-sm text-gray-400 ml-auto">
          {loading ? '로딩중...' : `${assets.length} / ${total} items`}
        </span>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-700">{error}</p>
            <button
              onClick={fetchAssets}
              className="ml-auto text-sm text-red-600 hover:text-red-700 underline"
            >
              다시 시도
            </button>
          </div>
        </div>
      )}

      {/* Assets Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                Type
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                Title
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                Status
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                Owner
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                Updated
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              // Loading skeleton
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-48" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                </tr>
              ))
            ) : (
              assets.map((asset) => (
                <tr
                  key={asset.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/content/assets/${asset.id}`)}
                >
                  {/* Type */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-gray-600">
                      {TYPE_ICONS[asset.type]}
                      <span className="text-sm">{TYPE_LABELS[asset.type]}</span>
                    </div>
                  </td>

                  {/* Title */}
                  <td className="px-4 py-3">
                    <div>
                      <Link
                        to={`/content/assets/${asset.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-blue-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {asset.title}
                      </Link>
                      {asset.description && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">
                          {asset.description}
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[asset.status].bg} ${STATUS_STYLES[asset.status].text}`}
                    >
                      {STATUS_STYLES[asset.status].label}
                    </span>
                  </td>

                  {/* Owner */}
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">
                      {OWNER_LABELS[asset.ownerType]}
                    </span>
                  </td>

                  {/* Updated */}
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500">
                      {formatDate(asset.updatedAt)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!loading && assets.length === 0 && !error && (
          <div className="text-center py-12 text-gray-400">
            <Image className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No assets match the selected filters</p>
            <p className="text-xs mt-1">
              {typeFilter !== 'all' || statusFilter !== 'all'
                ? '필터를 변경해 보세요'
                : 'cms_media 테이블에 데이터가 없습니다'}
            </p>
          </div>
        )}
      </div>

      {/* Content Core Mapping Info */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Content Core 매핑 정보</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500">
          <div>
            <span className="font-medium">데이터 소스:</span>
            <span className="ml-1">cms_media 테이블 (READ-ONLY)</span>
          </div>
          <div>
            <span className="font-medium">타입 매핑:</span>
            <span className="ml-1">cms_media.type → ContentType</span>
          </div>
          <div>
            <span className="font-medium">상태 매핑:</span>
            <span className="ml-1">cms_media.isActive → ContentStatus</span>
          </div>
          <div>
            <span className="font-medium">소유자 매핑:</span>
            <span className="ml-1">organizationId → ContentOwnerType</span>
          </div>
        </div>
      </div>

      {/* Content Core Type Reference */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Content Core 타입</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-500">
          <div>
            <span className="font-medium">ContentType:</span>
            <span className="ml-1">{Object.values(ContentType).join(', ')}</span>
          </div>
          <div>
            <span className="font-medium">ContentStatus:</span>
            <span className="ml-1">{Object.values(ContentStatus).join(', ')}</span>
          </div>
          <div>
            <span className="font-medium">ContentVisibility:</span>
            <span className="ml-1">{Object.values(ContentVisibility).join(', ')}</span>
          </div>
          <div>
            <span className="font-medium">ContentOwnerType:</span>
            <span className="ml-1">{Object.values(ContentOwnerType).join(', ')}</span>
          </div>
        </div>
      </div>

      {/* Reference */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-400">
          Work Order: WO-O4O-CONTENT-ASSETS-DB-READONLY-V1 |
          데이터 소스: cms_media (READ-ONLY) |
          참조: docs/platform/content-core/CONTENT-CORE-OVERVIEW.md
        </p>
      </div>
    </div>
  );
}
