/**
 * ForcedSection — HQ_FORCED items pinned at top with red-bordered card
 *
 * WO-O4O-STORE-HUB-CORE-EXTRACTION-V1
 * WO-O4O-STORE-ASSETS-PANEL-BASETABLE-MIGRATION-V1 — raw <table> → BaseTable
 */

import { ShieldAlert } from 'lucide-react';
import { BaseTable } from '@o4o/ui';
import { getAssetColumns, assetRowClassName } from './assetColumns';
import type { StoreAssetItem } from '../types/snapshot';

export interface ForcedSectionProps {
  items: StoreAssetItem[];
  updatingId: string | null;
  onToggleStatus: (item: StoreAssetItem) => void;
  onEdit: (snapshotId: string) => void;
}

export function ForcedSection({ items, updatingId, onToggleStatus, onEdit }: ForcedSectionProps) {
  if (items.length === 0) return null;

  const columns = getAssetColumns({ updatingId, onToggleStatus, onEdit });

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <ShieldAlert className="w-4 h-4 text-red-500" />
        <h3 className="text-sm font-semibold text-red-700">필수 콘텐츠</h3>
        <span className="text-xs text-red-400">{items.length}건</span>
      </div>
      <div className="bg-white rounded-lg border-2 border-red-200 overflow-hidden">
        <BaseTable<StoreAssetItem>
          columns={columns}
          data={items}
          rowKey={(item) => item.id}
          rowClassName={assetRowClassName}
          headerClassName="bg-red-50"
          bodyClassName="bg-white divide-y divide-red-100"
          thClassName="px-4 py-2 text-xs font-medium text-red-600 uppercase tracking-wider"
        />
      </div>
    </div>
  );
}
