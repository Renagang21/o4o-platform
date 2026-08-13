/**
 * TabletProductPoolPanel — 좌측 상품 풀(공급/자체 탭 + 다중 선택 + 추가)
 * WO-O4O-MY-STORE-TABLET-DISPLAYS-KCOS-GP-COMMONIZATION-V1
 */

import { Package, Plus, ShoppingBag } from 'lucide-react';
import { TabletProductTypeBadge } from './TabletProductTypeBadge';
import type { StoreTabletProductPool, TabletDisplayEntry, TabletPoolCandidate } from './types';
import { isInDisplay } from './tabletHelpers';

export interface TabletProductPoolPanelProps {
  pool: StoreTabletProductPool;
  displays: TabletDisplayEntry[];
  poolTab: 'supplier' | 'local';
  onChangeTab: (tab: 'supplier' | 'local') => void;
  poolItems: TabletPoolCandidate[];
  selectedPoolIds: Set<string>;
  onToggleItem: (id: string) => void;
  onAddSelected: () => void;
  tabActiveClass?: string;
  addButtonClass?: string;
  checkboxClass?: string;
}

export function TabletProductPoolPanel({
  pool,
  displays,
  poolTab,
  onChangeTab,
  poolItems,
  selectedPoolIds,
  onToggleItem,
  onAddSelected,
  tabActiveClass = 'bg-teal-600 text-white',
  addButtonClass = 'bg-teal-600 hover:bg-teal-700',
  checkboxClass = 'rounded border-slate-300 text-teal-600 focus:ring-teal-500',
}: TabletProductPoolPanelProps) {
  const tabClass = (active: boolean) =>
    `flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
      active ? tabActiveClass : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
    }`;

  const supplierCount = pool.supplierProducts.filter((p) => !isInDisplay(displays, 'supplier', p.id)).length;
  const localCount = pool.localProducts.filter((p) => !isInDisplay(displays, 'local', p.id)).length;

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b bg-slate-50">
        <h3 className="text-sm font-bold text-slate-700">상품 풀</h3>
        <div className="flex gap-1 mt-2">
          <button onClick={() => onChangeTab('supplier')} className={tabClass(poolTab === 'supplier')}>
            <Package className="w-3.5 h-3.5" />
            공급 상품 ({supplierCount})
          </button>
          <button onClick={() => onChangeTab('local')} className={tabClass(poolTab === 'local')}>
            <ShoppingBag className="w-3.5 h-3.5" />
            자체 상품 ({localCount})
          </button>
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {poolItems.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            {poolTab === 'supplier'
              ? '추가 가능한 공급 상품이 없습니다.'
              : '추가 가능한 자체 상품이 없습니다.'}
          </div>
        ) : (
          <div className="divide-y">
            {poolItems.map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedPoolIds.has(item.id)}
                  onChange={() => onToggleItem(item.id)}
                  className={checkboxClass}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-slate-900 truncate block">{item.name}</span>
                </div>
                <TabletProductTypeBadge type={item.type} />
              </label>
            ))}
          </div>
        )}
      </div>

      {selectedPoolIds.size > 0 && (
        <div className="px-4 py-3 border-t">
          <button
            onClick={onAddSelected}
            className={`flex items-center gap-2 w-full justify-center px-3 py-2 text-white text-sm font-medium rounded-lg ${addButtonClass}`}
          >
            <Plus className="w-4 h-4" />
            {selectedPoolIds.size}개 항목 추가
          </button>
        </div>
      )}
    </div>
  );
}
