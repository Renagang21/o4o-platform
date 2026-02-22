/**
 * LifecycleStatusPill — Visual indicator for lifecycle_status
 *
 * Only renders for non-active states (expired, archived).
 *
 * WO-O4O-STORE-HUB-CORE-EXTRACTION-V1
 */

import type { LifecycleStatus } from '../types/snapshot';

export function LifecycleStatusPill({ status }: { status: LifecycleStatus }) {
  if (status === 'active') return null;

  if (status === 'archived') {
    return (
      <span className="ml-2 inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-200 text-slate-500">
        보관됨
      </span>
    );
  }

  return (
    <span className="ml-2 inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-400">
      만료됨
    </span>
  );
}
