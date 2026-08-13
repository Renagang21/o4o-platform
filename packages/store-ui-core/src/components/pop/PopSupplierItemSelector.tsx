/**
 * PopSupplierItemSelector — Step 1 공급자 자료 선택
 * WO-O4O-MY-STORE-POP-COMPOSER-KCOS-GP-COMMONIZATION-V1
 *
 * 선택 상한 8개 판정은 상태 모델(usePopComposer)이 갖는다 — 본 컴포넌트는 표시 전용이다.
 */

import { RefreshCw } from 'lucide-react';
import { PopEmptyBlock, PopErrorBlock, PopLoadingBlock } from './PopStateBlocks';
import {
  popRefreshSmallBtnStyle,
  popSectionHeaderStyle,
  popSectionStyle,
  popSelectableStyle,
  popStepBadgeStyle,
} from './popStyles';
import { CheckSquare, Square } from 'lucide-react';
import type { PopAccentTheme, PopSupplierItem } from './types';

export interface PopSupplierItemSelectorProps {
  accent: PopAccentTheme;
  items: PopSupplierItem[];
  loading: boolean;
  error: string | null;
  selectedIds: string[];
  onToggle: (id: string) => void;
  onReload: () => void;
}

export function PopSupplierItemSelector({
  accent, items, loading, error, selectedIds, onToggle, onReload,
}: PopSupplierItemSelectorProps) {
  return (
    <section style={popSectionStyle}>
      <div style={popSectionHeaderStyle}>
        <span style={popStepBadgeStyle(accent)}>1</span>
        <span style={{ fontWeight: 600, color: '#1e293b' }}>공급자 자료 선택</span>
        <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 8 }}>
          최소 1개, 최대 8개 — {selectedIds.length}/8 선택됨
        </span>
        <button onClick={onReload} style={{ ...popRefreshSmallBtnStyle, marginLeft: 'auto' }}>
          <RefreshCw size={12} /> 새로고침
        </button>
      </div>

      {loading && <PopLoadingBlock message="자료를 불러오는 중..." />}

      {error && !loading && <PopErrorBlock message={error} onRetry={onReload} />}

      {!loading && !error && items.length === 0 && (
        <PopEmptyBlock message="사용 가능한 공급자 자료가 없습니다" />
      )}

      {!loading && !error && items.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {items.map((item) => {
            const selected = selectedIds.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => onToggle(item.id)}
                style={{
                  ...popSelectableStyle(accent, selected),
                  borderRadius: 10,
                  padding: '12px 14px',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, background-color 0.15s',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ flexShrink: 0, marginTop: 2 }}>
                  {selected
                    ? <CheckSquare size={18} color={accent.color} />
                    : <Square size={18} color="#94a3b8" />
                  }
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.title}
                  </p>
                  {item.description && (
                    <p style={{ fontSize: 12, color: '#64748b', marginTop: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {item.description}
                    </p>
                  )}
                  {item.category && (
                    <span style={{ fontSize: 11, color: '#7c3aed', backgroundColor: '#f3e8ff', padding: '2px 6px', borderRadius: 4, display: 'inline-block', marginTop: 6 }}>
                      {item.category}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
