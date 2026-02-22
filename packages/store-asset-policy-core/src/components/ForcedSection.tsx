/**
 * ForcedSection — HQ_FORCED items pinned at top with red border
 *
 * WO-O4O-STORE-HUB-CORE-EXTRACTION-V1
 */

import { ShieldAlert } from 'lucide-react';
import { AssetRow } from './AssetRow';
import type { StoreAssetItem } from '../types/snapshot';

export interface ForcedSectionProps {
  items: StoreAssetItem[];
  updatingId: string | null;
  onToggleStatus: (item: StoreAssetItem) => void;
  onEdit: (snapshotId: string) => void;
}

export function ForcedSection({ items, updatingId, onToggleStatus, onEdit }: ForcedSectionProps) {
  if (items.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <ShieldAlert className="w-4 h-4 text-red-500" />
        <h3 className="text-sm font-semibold text-red-700">필수 콘텐츠</h3>
        <span className="text-xs text-red-400">{items.length}건</span>
      </div>
      <div className="bg-white rounded-lg border-2 border-red-200 overflow-hidden">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-red-100">
            {items.map(item => (
              <AssetRow
                key={item.id}
                item={item}
                updatingId={updatingId}
                onToggleStatus={onToggleStatus}
                onEdit={onEdit}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
