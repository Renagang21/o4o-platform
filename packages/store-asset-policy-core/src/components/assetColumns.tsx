/**
 * assetColumns — Shared BaseTable column definitions for asset listing
 *
 * Used by both StoreAssetsPanel (regular section) and ForcedSection,
 * so the two sections render identical cell content with section-specific
 * outer container styling only.
 *
 * WO-O4O-STORE-ASSETS-PANEL-BASETABLE-MIGRATION-V1
 */

import { Lock, Loader2, AlertTriangle, Pencil } from 'lucide-react';
import type { O4OColumn } from '@o4o/ui';
import { STATUS_CONFIG, formatDate, formatShortDate } from '../policy/mapping';
import { isForcedExpired, canEdit, canToggleStatus } from '../policy/policyGate';
import { isForcedExpiringSoon, daysUntil } from '../policy/expiringSoon';
import { SnapshotTypeBadge } from './SnapshotTypeBadge';
import type { StoreAssetItem } from '../types/snapshot';

export interface AssetColumnsCallbacks {
  updatingId: string | null;
  onToggleStatus: (item: StoreAssetItem) => void;
  onEdit: (snapshotId: string) => void;
}

/**
 * BaseTable column set for asset listing — shared between forced/regular sections.
 *
 * Note: The previous raw <table> markup declared a "채널" header (w-20) with no
 * matching body cell. That orphan header is intentionally not reproduced here —
 * it was a layout drift, never rendered any data.
 */
export function getAssetColumns({
  updatingId,
  onToggleStatus,
  onEdit,
}: AssetColumnsCallbacks): O4OColumn<StoreAssetItem>[] {
  return [
    {
      key: 'snapshotType',
      header: '종류',
      render: (_v, item) => <SnapshotTypeBadge type={item.snapshotType} />,
    },
    {
      key: 'assetType',
      header: '유형',
      render: (_v, item) => (
        <span
          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
            item.assetType === 'cms'
              ? 'bg-blue-50 text-blue-700'
              : 'bg-purple-50 text-purple-700'
          }`}
        >
          {item.assetType === 'cms' ? 'CMS' : '사이니지'}
        </span>
      ),
    },
    {
      key: 'title',
      header: '제목',
      render: (_v, item) => <TitleCell item={item} />,
    },
    {
      key: 'publishStatus',
      header: '상태',
      width: '6rem',
      render: (_v, item) => (
        <PublishStatusCell
          item={item}
          isUpdating={updatingId === item.id}
          onToggleStatus={onToggleStatus}
        />
      ),
    },
    {
      key: 'createdAt',
      header: '복사일',
      width: '7rem',
      render: (_v, item) => (
        <span className="text-slate-500">{formatDate(item.createdAt)}</span>
      ),
    },
    {
      key: '_action',
      header: '',
      width: '4rem',
      system: 'last',
      render: (_v, item) => {
        if (!canEdit(item) || item.assetType !== 'cms') return null;
        return (
          <button
            onClick={() => onEdit(item.id)}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="콘텐츠 편집"
          >
            <Pencil className="w-3.5 h-3.5" />
            편집
          </button>
        );
      },
    },
  ];
}

/**
 * Shared row class — preserves the bg-red-50/30 forced highlight and
 * opacity dimming for expired/archived items.
 */
export function assetRowClassName(item: StoreAssetItem): string {
  const expired = isForcedExpired(item);
  const isLifecycleExpired = item.lifecycleStatus === 'expired' || expired;
  const isArchived = item.lifecycleStatus === 'archived';
  const forcedHighlight = item.isForced && !isLifecycleExpired ? 'bg-red-50/30' : '';
  const expiredDim = isLifecycleExpired ? 'opacity-50' : '';
  const archivedDim = isArchived ? 'opacity-40' : '';
  return `hover:bg-slate-50 ${forcedHighlight} ${expiredDim} ${archivedDim}`.trim();
}

/* ─── Cell sub-components ────────────────── */

function TitleCell({ item }: { item: StoreAssetItem }) {
  const expiringSoon = isForcedExpiringSoon(item);
  const expired = isForcedExpired(item);
  const isLifecycleExpired = item.lifecycleStatus === 'expired' || expired;
  const isArchived = item.lifecycleStatus === 'archived';

  return (
    <div className="whitespace-normal">
      <div className="font-medium text-slate-900 truncate max-w-md">
        {item.title}
        {isArchived && (
          <span className="ml-2 inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-200 text-slate-500">
            보관됨
          </span>
        )}
      </div>
      {item.isForced && (
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {isLifecycleExpired ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-400">
              만료됨
            </span>
          ) : (
            expiringSoon && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700">
                <AlertTriangle className="w-3 h-3" />
                만료 임박
              </span>
            )
          )}
          {item.isLocked && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400">
              <Lock className="w-3 h-3" />
            </span>
          )}
          {(item.forcedStartAt || item.forcedEndAt) && (
            <span className="text-[10px] text-slate-400">
              {formatShortDate(item.forcedStartAt)} ~ {formatShortDate(item.forcedEndAt)}
              {expiringSoon && item.forcedEndAt && (
                <span className="ml-1 text-amber-600 font-medium">
                  (D-{daysUntil(item.forcedEndAt)})
                </span>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function PublishStatusCell({
  item,
  isUpdating,
  onToggleStatus,
}: {
  item: StoreAssetItem;
  isUpdating: boolean;
  onToggleStatus: (item: StoreAssetItem) => void;
}) {
  const statusCfg = STATUS_CONFIG[item.publishStatus] || STATUS_CONFIG.draft;
  const toggleable = canToggleStatus(item);
  const isForced = item.isForced;

  if (!toggleable || isForced) {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-not-allowed opacity-70 ${statusCfg.bg} ${statusCfg.text}`}
        title={
          isForced
            ? '관리자 필수 콘텐츠 - 변경 불가'
            : '이 종류의 콘텐츠는 상태를 직접 변경할 수 없습니다'
        }
      >
        {isForced && <Lock className="w-3 h-3 mr-1" />}
        {statusCfg.label}
      </span>
    );
  }

  return (
    <button
      onClick={() => onToggleStatus(item)}
      disabled={isUpdating}
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-50 ${statusCfg.bg} ${statusCfg.text}`}
      title="클릭하여 상태 변경"
    >
      {isUpdating && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
      {statusCfg.label}
    </button>
  );
}
