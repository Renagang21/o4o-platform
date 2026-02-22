/**
 * PolicyFilterBar — Status + Policy + Channel filter bar with sort
 *
 * WO-O4O-STORE-HUB-CORE-EXTRACTION-V1
 */

import { Filter, ArrowUpDown } from 'lucide-react';
import type { StatusFilter, PolicyFilter, ChannelFilter, SortKey } from '../types/snapshot';

export interface PolicyFilterBarProps {
  statusFilter: StatusFilter;
  policyFilter: PolicyFilter;
  channelFilter: ChannelFilter;
  sortKey: SortKey;
  onStatusChange: (v: StatusFilter) => void;
  onPolicyChange: (v: PolicyFilter) => void;
  onChannelChange: (v: ChannelFilter) => void;
  onSortChange: (v: SortKey) => void;
}

const STATUS_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'published', label: '게시됨' },
  { key: 'draft', label: '초안' },
  { key: 'hidden', label: '숨김' },
];

const POLICY_OPTIONS: { key: PolicyFilter; label: string }[] = [
  { key: 'all', label: '전체 종류' },
  { key: 'user_copy', label: '내 콘텐츠' },
  { key: 'hq_forced', label: '필수 콘텐츠' },
  { key: 'campaign_push', label: '캠페인' },
  { key: 'expiring_soon', label: '만료 예정' },
  { key: 'expired', label: '만료됨' },
];

const CHANNEL_OPTIONS: { key: ChannelFilter; label: string }[] = [
  { key: 'all', label: '전체 채널' },
  { key: 'home', label: '홈' },
  { key: 'signage', label: '사이니지' },
  { key: 'promotion', label: '프로모션' },
];

export function PolicyFilterBar({
  statusFilter,
  policyFilter,
  channelFilter,
  sortKey,
  onStatusChange,
  onPolicyChange,
  onChannelChange,
  onSortChange,
}: PolicyFilterBarProps) {
  return (
    <div className="flex items-center justify-between mb-4 flex-wrap gap-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Status filter */}
        <div className="flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => onStatusChange(opt.key)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                statusFilter === opt.key
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-slate-200" />

        {/* Policy filter */}
        {POLICY_OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => onPolicyChange(opt.key)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              policyFilter === opt.key
                ? 'bg-violet-100 text-violet-700'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {opt.label}
          </button>
        ))}

        <div className="w-px h-5 bg-slate-200" />

        {/* Channel filter */}
        {CHANNEL_OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => onChannelChange(opt.key)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              channelFilter === opt.key
                ? 'bg-emerald-100 text-emerald-700'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="flex items-center gap-1.5">
        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
        <select
          value={sortKey}
          onChange={e => onSortChange(e.target.value as SortKey)}
          className="text-xs border border-slate-200 rounded-md px-2 py-1 text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="newest">최신순</option>
          <option value="forced-first">강제노출 우선</option>
          <option value="published-first">게시 상태 우선</option>
        </select>
      </div>
    </div>
  );
}
