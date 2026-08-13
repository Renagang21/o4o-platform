/**
 * TabletIdlePlaylistSection — Idle 재생 목록 섹션 껍데기
 * WO-O4O-MY-STORE-TABLET-DISPLAYS-KCOS-GP-COMMONIZATION-V1
 *
 * 편집기 본체(@o4o/tablet-kiosk-core 의 IdlePlaylistEditor)는 서비스가 slot 으로 주입한다.
 * Core 가 kiosk-core 를 직접 의존하지 않으므로 tablet-kiosk-core 계약은 그대로다.
 */

import { Loader2, Save, Tv } from 'lucide-react';
import type { ReactNode } from 'react';
import { TabletChangesBadge } from './TabletStateBlocks';

export interface TabletIdlePlaylistSectionProps {
  description: string;
  hasChanges: boolean;
  saving: boolean;
  onSave: () => void;
  saveButtonClass?: string;
  /** IdlePlaylistEditor 주입 slot */
  children: ReactNode;
}

export function TabletIdlePlaylistSection({
  description,
  hasChanges,
  saving,
  onSave,
  saveButtonClass = 'bg-teal-600 hover:bg-teal-700',
  children,
}: TabletIdlePlaylistSectionProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tv className="w-4 h-4 text-slate-600" />
          <h3 className="text-sm font-bold text-slate-700">Idle 재생 목록</h3>
          {hasChanges && <TabletChangesBadge small />}
        </div>
        <button
          onClick={onSave}
          disabled={!hasChanges || saving}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${saveButtonClass}`}
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Idle 저장
        </button>
      </div>
      <div className="p-4">
        <p className="text-xs text-slate-500 mb-3">{description}</p>
        {children}
      </div>
    </div>
  );
}
