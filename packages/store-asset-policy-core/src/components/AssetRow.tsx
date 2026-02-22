/**
 * AssetRow — Single asset table row with policy-aware controls
 *
 * WO-O4O-STORE-HUB-CORE-EXTRACTION-V1
 */

import { Lock, Loader2, AlertTriangle, Pencil } from 'lucide-react';
import { STATUS_CONFIG, formatDate, formatShortDate } from '../policy/mapping';
import { isForcedExpired, canEdit, canToggleStatus } from '../policy/policyGate';
import { isForcedExpiringSoon, daysUntil } from '../policy/expiringSoon';
import { SnapshotTypeBadge } from './SnapshotTypeBadge';
import type { StoreAssetItem } from '../types/snapshot';

export interface AssetRowProps {
  item: StoreAssetItem;
  updatingId: string | null;
  onToggleStatus: (item: StoreAssetItem) => void;
  onEdit: (snapshotId: string) => void;
}

export function AssetRow({ item, updatingId, onToggleStatus, onEdit }: AssetRowProps) {
  const statusCfg = STATUS_CONFIG[item.publishStatus] || STATUS_CONFIG.draft;
  const isUpdating = updatingId === item.id;
  const isForced = item.isForced;
  const isLocked = item.isLocked;
  const expiringSoon = isForcedExpiringSoon(item);
  const expired = isForcedExpired(item);
  const isLifecycleExpired = item.lifecycleStatus === 'expired' || expired;
  const isArchived = item.lifecycleStatus === 'archived';

  const editable = canEdit(item);
  const toggleable = canToggleStatus(item);

  return (
    <tr className={`hover:bg-slate-50 ${
      isForced && !isLifecycleExpired ? 'bg-red-50/30' : ''
    } ${isLifecycleExpired ? 'opacity-50' : ''} ${isArchived ? 'opacity-40' : ''}`}>
      {/* Snapshot type badge */}
      <td className="px-4 py-3">
        <SnapshotTypeBadge type={item.snapshotType} />
      </td>
      {/* Asset type */}
      <td className="px-4 py-3">
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
          item.assetType === 'cms' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
        }`}>
          {item.assetType === 'cms' ? 'CMS' : '사이니지'}
        </span>
      </td>
      {/* Title + forced info + lifecycle */}
      <td className="px-4 py-3">
        <div className="font-medium text-slate-900 truncate max-w-md">
          {item.title}
          {isArchived && (
            <span className="ml-2 inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-200 text-slate-500">보관됨</span>
          )}
        </div>
        {isForced && (
          <div className="flex items-center gap-2 mt-1">
            {isLifecycleExpired ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-400">
                만료됨
              </span>
            ) : (
              <>
                {expiringSoon && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700">
                    <AlertTriangle className="w-3 h-3" />
                    만료 임박
                  </span>
                )}
              </>
            )}
            {isLocked && (
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
      </td>
      {/* Publish status */}
      <td className="px-4 py-3">
        {!toggleable || isForced ? (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-not-allowed opacity-70 ${statusCfg.bg} ${statusCfg.text}`}
            title={isForced ? '관리자 필수 콘텐츠 - 변경 불가' : '이 종류의 콘텐츠는 상태를 직접 변경할 수 없습니다'}
          >
            {isForced && <Lock className="w-3 h-3 mr-1" />}
            {statusCfg.label}
          </span>
        ) : (
          <button
            onClick={() => onToggleStatus(item)}
            disabled={isUpdating}
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-50 ${statusCfg.bg} ${statusCfg.text}`}
            title="클릭하여 상태 변경"
          >
            {isUpdating && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
            {statusCfg.label}
          </button>
        )}
      </td>
      <td className="px-4 py-3">
        <ChannelDots channelMap={item.channelMap} />
      </td>
      <td className="px-4 py-3 text-slate-500">{formatDate(item.createdAt)}</td>
      <td className="px-4 py-3">
        {editable && item.assetType === 'cms' && (
          <button
            onClick={() => onEdit(item.id)}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="콘텐츠 편집"
          >
            <Pencil className="w-3.5 h-3.5" />
            편집
          </button>
        )}
      </td>
    </tr>
  );
}

/* ─── Internal helper ──────────────────── */

function ChannelDots({ channelMap }: { channelMap: Record<string, boolean> | null }) {
  if (!channelMap) return <span className="text-slate-300 text-xs">—</span>;
  const channels = [
    { key: 'home', label: '홈', color: 'bg-blue-400' },
    { key: 'signage', label: 'S', color: 'bg-purple-400' },
    { key: 'promotion', label: 'P', color: 'bg-emerald-400' },
  ];
  const active = channels.filter(ch => channelMap[ch.key]);
  if (active.length === 0) return <span className="text-slate-300 text-xs">—</span>;
  return (
    <div className="flex gap-1">
      {active.map(ch => (
        <span
          key={ch.key}
          className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[9px] font-bold ${ch.color}`}
          title={ch.label}
        >
          {ch.label.charAt(0)}
        </span>
      ))}
    </div>
  );
}
