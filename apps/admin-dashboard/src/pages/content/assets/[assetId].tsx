/**
 * Content Asset Detail - DB Read-Only View
 *
 * WO-O4O-CONTENT-ASSETS-DB-READONLY-V1
 *
 * ⚠️ READ-ONLY 상태
 * - cms_media 테이블에서 실제 데이터를 조회합니다
 * - Content Core 타입(enum)으로 매핑하여 표시합니다
 * - 수정/삭제/재생 기능이 없습니다
 *
 * Content Core는 DB를 소유하지 않음.
 * cms_media가 유일한 Source of Truth.
 *
 * @see docs/platform/content-core/CONTENT-CORE-OVERVIEW.md
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Video,
  Image,
  FileText,
  Blocks,
  Calendar,
  User,
  Globe,
  Lock,
  Play,
  Database,
  AlertCircle,
  RefreshCw,
  File,
  HardDrive,
} from 'lucide-react';

import {
  ContentType,
  ContentStatus,
  ContentVisibility,
  ContentOwnerType,
} from '@o4o-apps/content-core';

import { contentAssetsApi, ContentAssetDetail } from '@/api/content-assets.api';

/**
 * 타입별 아이콘 매핑
 */
const TYPE_ICONS: Record<ContentType, React.ReactNode> = {
  [ContentType.VIDEO]: <Video className="w-6 h-6" />,
  [ContentType.IMAGE]: <Image className="w-6 h-6" />,
  [ContentType.DOCUMENT]: <FileText className="w-6 h-6" />,
  [ContentType.BLOCK]: <Blocks className="w-6 h-6" />,
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

/**
 * Visibility 라벨
 */
const VISIBILITY_LABELS: Record<ContentVisibility, { label: string; icon: React.ReactNode }> = {
  [ContentVisibility.PUBLIC]: { label: 'Public', icon: <Globe className="w-4 h-4" /> },
  [ContentVisibility.RESTRICTED]: { label: 'Restricted', icon: <Lock className="w-4 h-4" /> },
};

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('ko-KR');
  } catch {
    return dateStr;
  }
}

export default function ContentAssetDetailPage() {
  const { assetId } = useParams<{ assetId: string }>();

  // Data state
  const [asset, setAsset] = useState<ContentAssetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch asset data from API
  useEffect(() => {
    async function fetchAsset() {
      if (!assetId) return;

      setLoading(true);
      setError(null);

      try {
        const data = await contentAssetsApi.getById(assetId);
        setAsset(data);
        if (!data) {
          setError('Asset을 찾을 수 없습니다.');
        }
      } catch (err) {
        console.error('Failed to fetch asset:', err);
        setError('데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    }

    fetchAsset();
  }, [assetId]);

  // Loading state
  if (loading) {
    return (
      <div className="p-6 max-w-4xl">
        <div className="mb-4">
          <Link
            to="/content/assets"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Assets
          </Link>
        </div>
        <div className="animate-pulse space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-200 rounded-lg" />
            <div>
              <div className="h-6 bg-gray-200 rounded w-48 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-24" />
            </div>
          </div>
          <div className="h-48 bg-gray-200 rounded-lg" />
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 h-32 bg-gray-200 rounded-lg" />
            <div className="h-32 bg-gray-200 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  // Not found or error state
  if (!asset || error) {
    return (
      <div className="p-6 max-w-4xl">
        <div className="mb-4">
          <Link
            to="/content/assets"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Assets
          </Link>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">Asset Not Found</h2>
          <p className="text-gray-500 mb-4">
            {error || `요청한 Asset을 찾을 수 없습니다. (ID: ${assetId})`}
          </p>
          <Link
            to="/content/assets"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Assets 목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link
          to="/content/assets"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Assets
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
            {TYPE_ICONS[asset.type]}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{asset.title}</h1>
            <p className="text-sm text-gray-500">{TYPE_LABELS[asset.type]} Asset</p>
          </div>
        </div>
      </div>

      {/* Read-Only Notice - DB Connected */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Database className="w-5 h-5 text-green-600 mt-0.5" />
          <div>
            <p className="text-green-800 font-medium">DB 연결됨 - Read-Only 모드</p>
            <p className="text-green-700 text-sm mt-1">
              이 화면은 cms_media 테이블의 실제 데이터를 표시합니다.
              수정/삭제 기능은 지원되지 않습니다.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Preview Area */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-700">미리보기</h3>
            </div>
            <div className="p-8 bg-gray-100 flex flex-col items-center justify-center min-h-[200px]">
              <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                {TYPE_ICONS[asset.type]}
              </div>
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Play className="w-4 h-4" />
                <span className="text-sm">미리보기 영역</span>
              </div>
              <p className="text-xs text-gray-400 text-center max-w-xs">
                실제 콘텐츠 재생/표시는 아직 지원되지 않습니다.
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-700">설명</h3>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                {asset.description || '설명이 없습니다.'}
              </p>
            </div>
          </div>

          {/* File Info */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-700">파일 정보</h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">원본 파일명</label>
                  <span className="text-gray-700">{asset.originalFilename}</span>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">MIME Type</label>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">{asset.mimeType}</code>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">파일 크기</label>
                  <span className="inline-flex items-center gap-1.5 text-gray-700">
                    <HardDrive className="w-4 h-4 text-gray-400" />
                    {formatFileSize(asset.fileSize)}
                  </span>
                </div>
                {(asset.width || asset.height) && (
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">크기</label>
                    <span className="text-gray-700">
                      {asset.width} x {asset.height} px
                    </span>
                  </div>
                )}
                {asset.duration && (
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">재생 시간</label>
                    <span className="text-gray-700">{asset.duration} 초</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Related Files */}
          {asset.files && asset.files.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h3 className="text-sm font-medium text-gray-700">
                  파일 변형 ({asset.files.length}개)
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {asset.files.map((file) => (
                  <div key={file.id} className="p-4 flex items-center gap-4">
                    <File className="w-5 h-5 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700">{file.variant}</p>
                      <p className="text-xs text-gray-500 truncate">{file.mimeType}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">{formatFileSize(file.fileSize)}</p>
                      {file.width && file.height && (
                        <p className="text-xs text-gray-400">{file.width}x{file.height}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Meta Info */}
        <div className="space-y-6">
          {/* Status & Visibility */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-700">상태</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Status</label>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded text-sm font-medium ${STATUS_STYLES[asset.status].bg} ${STATUS_STYLES[asset.status].text}`}
                >
                  {STATUS_STYLES[asset.status].label}
                </span>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Visibility</label>
                <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                  {VISIBILITY_LABELS[asset.visibility].icon}
                  {VISIBILITY_LABELS[asset.visibility].label}
                </span>
              </div>
            </div>
          </div>

          {/* Owner & Type */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-700">분류</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Type</label>
                <span className="inline-flex items-center gap-2 text-sm text-gray-700">
                  {TYPE_ICONS[asset.type]}
                  {TYPE_LABELS[asset.type]}
                </span>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Owner</label>
                <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                  <User className="w-4 h-4 text-gray-400" />
                  {OWNER_LABELS[asset.ownerType]}
                </span>
              </div>
            </div>
          </div>

          {/* Meta Info */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-700">메타 정보</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Asset ID</label>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 break-all">
                  {asset.id}
                </code>
              </div>
              {asset.organizationId && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Organization ID</label>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 break-all">
                    {asset.organizationId}
                  </code>
                </div>
              )}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Created</label>
                <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {formatDate(asset.createdAt)}
                </span>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Updated</label>
                <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {formatDate(asset.updatedAt)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Core Mapping Info */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Content Core 매핑 값</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-500">
          <div>
            <span className="font-medium">ContentType:</span>
            <span className="ml-1">{asset.type}</span>
          </div>
          <div>
            <span className="font-medium">ContentStatus:</span>
            <span className="ml-1">{asset.status}</span>
          </div>
          <div>
            <span className="font-medium">ContentVisibility:</span>
            <span className="ml-1">{asset.visibility}</span>
          </div>
          <div>
            <span className="font-medium">ContentOwnerType:</span>
            <span className="ml-1">{asset.ownerType}</span>
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
