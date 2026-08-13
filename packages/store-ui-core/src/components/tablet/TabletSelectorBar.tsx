/**
 * TabletSelectorBar — 태블릿 선택 + 변경사항 배지
 * WO-O4O-MY-STORE-TABLET-DISPLAYS-KCOS-GP-COMMONIZATION-V1
 */

import { TabletChangesBadge } from './TabletStateBlocks';
import { tabletOptionLabel } from './tabletHelpers';
import type { StoreTabletSummary } from './types';

export interface TabletSelectorBarProps {
  tablets: StoreTabletSummary[];
  selectedTabletId: string | null;
  onSelect: (id: string) => void;
  hasChanges: boolean;
  selectClass?: string;
}

export function TabletSelectorBar({
  tablets,
  selectedTabletId,
  onSelect,
  hasChanges,
  selectClass = 'focus:ring-teal-500',
}: TabletSelectorBarProps) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-slate-700">태블릿:</label>
      <select
        value={selectedTabletId || ''}
        onChange={(e) => onSelect(e.target.value)}
        className={`px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 ${selectClass}`}
      >
        {tablets.map((t) => (
          <option key={t.id} value={t.id}>
            {tabletOptionLabel(t.name, t.location)}
          </option>
        ))}
      </select>
      {hasChanges && <TabletChangesBadge />}
    </div>
  );
}
