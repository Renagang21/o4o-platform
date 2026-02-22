/**
 * Mapping — Display labels, colors, and date formatting
 *
 * WO-O4O-STORE-HUB-CORE-EXTRACTION-V1
 */

import type { AssetPublishStatus, SnapshotType } from '../types/snapshot';

export const STATUS_CONFIG: Record<AssetPublishStatus, { label: string; bg: string; text: string }> = {
  draft: { label: '초안', bg: 'bg-slate-100', text: 'text-slate-600' },
  published: { label: '게시됨', bg: 'bg-green-50', text: 'text-green-700' },
  hidden: { label: '숨김', bg: 'bg-orange-50', text: 'text-orange-700' },
};

export const SNAPSHOT_TYPE_CONFIG: Record<SnapshotType, { label: string; bg: string; text: string }> = {
  user_copy: { label: '내 콘텐츠', bg: 'bg-slate-100', text: 'text-slate-600' },
  hq_forced: { label: '필수 콘텐츠', bg: 'bg-red-100', text: 'text-red-700' },
  campaign_push: { label: '캠페인', bg: 'bg-violet-100', text: 'text-violet-700' },
  template_seed: { label: '템플릿', bg: 'bg-slate-50', text: 'text-slate-400' },
};

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

export function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
}
