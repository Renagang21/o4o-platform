/**
 * TabletDisplayListPanel — 우측 현재 진열 구성(순서 이동 / 제거)
 * WO-O4O-MY-STORE-TABLET-DISPLAYS-KCOS-GP-COMMONIZATION-V1
 */

import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { TabletProductTypeBadge } from './TabletProductTypeBadge';
import type { TabletDisplayEntry } from './types';

export interface TabletDisplayListPanelProps {
  displays: TabletDisplayEntry[];
  onMove: (index: number, direction: 'up' | 'down') => void;
  onRemove: (index: number) => void;
}

export function TabletDisplayListPanel({ displays, onMove, onRemove }: TabletDisplayListPanelProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b bg-slate-50">
        <h3 className="text-sm font-bold text-slate-700">현재 진열 구성 ({displays.length})</h3>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {displays.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            진열할 상품이 없습니다. 왼쪽 상품 풀에서 추가하세요.
          </div>
        ) : (
          <div className="divide-y">
            {displays.map((entry, index) => (
              <div
                key={`${entry.productType}-${entry.productId}`}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50"
              >
                <span className="text-xs text-slate-400 w-5 text-right">{index + 1}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-slate-900 truncate block">{entry.productName}</span>
                </div>
                <TabletProductTypeBadge type={entry.productType} noShrink />
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button
                    onClick={() => onMove(index, 'up')}
                    disabled={index === 0}
                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
                    title="위로"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onMove(index, 'down')}
                    disabled={index === displays.length - 1}
                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
                    title="아래로"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onRemove(index)}
                    className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600"
                    title="제거"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
