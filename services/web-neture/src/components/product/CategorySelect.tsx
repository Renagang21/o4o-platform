/**
 * CategorySelect — 2단계 카테고리 선택 + 검색
 *
 * WO-NETURE-CATEGORY-SELECT-TWO-LEVEL-AND-SEARCH-REFINE-V1
 *
 * 동작:
 * - 1차(최상위) 카테고리 select + 2차(자식) 카테고리 select
 * - 검색창: 카테고리명 부분일치, "상위 > 하위" 형태 결과
 * - 검색 결과 클릭 시 자동으로 1차/2차 세팅
 * - value(categoryId)에서 parent chain 추적해 1차/2차 자동 복원
 * - depth 3+ 카테고리도 leaf 트리에 그대로 노출 (UI는 2단계 표현)
 */

import { useState, useMemo, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import type { CategoryTreeItem } from '../../lib/api';

interface CategorySelectProps {
  categories: CategoryTreeItem[];
  value: string | null;
  onChange: (categoryId: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

interface FlatEntry {
  id: string;
  name: string;
  parentId: string | null;
  depth: number;
  /** "상위 > 하위" 표시용 경로 */
  path: string;
}

/** 트리 → 평면 + 경로 */
function flattenWithPath(
  items: CategoryTreeItem[],
  parentPath = '',
): FlatEntry[] {
  const result: FlatEntry[] = [];
  for (const item of items) {
    const path = parentPath ? `${parentPath} > ${item.name}` : item.name;
    result.push({
      id: item.id,
      name: item.name,
      parentId: item.parentId,
      depth: item.depth,
      path,
    });
    if (item.children?.length) {
      result.push(...flattenWithPath(item.children, path));
    }
  }
  return result;
}

/** 특정 categoryId의 최상위 부모 id 추적 */
function findRootId(flat: FlatEntry[], targetId: string): string | null {
  let current = flat.find((c) => c.id === targetId);
  while (current && current.parentId) {
    const parent = flat.find((c) => c.id === current!.parentId);
    if (!parent) break;
    current = parent;
  }
  return current?.id ?? null;
}

export function CategorySelect({
  categories,
  value,
  onChange,
  disabled,
  placeholder = '카테고리 선택',
}: CategorySelectProps) {
  const flat = useMemo(() => flattenWithPath(categories), [categories]);
  const [parentId, setParentId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // 외부 value 변경 시 1차/2차 자동 복원
  useEffect(() => {
    if (value) {
      const root = findRootId(flat, value);
      setParentId(root);
    } else {
      setParentId(null);
    }
  }, [value, flat]);

  const rootCategories = useMemo(
    () => categories.filter((c) => c.depth === 0),
    [categories],
  );

  // 선택된 1차 카테고리의 하위(자식) 카테고리 — 모든 자손 평면화
  const childCategories = useMemo(() => {
    if (!parentId) return [];
    return flat.filter((c) => {
      // parentId 트리상에서 root가 parentId인 항목들 (자기 자신 제외)
      if (c.id === parentId) return false;
      return findRootId(flat, c.id) === parentId;
    });
  }, [parentId, flat]);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return flat
      .filter((c) => c.name.toLowerCase().includes(q) || c.path.toLowerCase().includes(q))
      .slice(0, 20);
  }, [search, flat]);

  const selectedEntry = value ? flat.find((c) => c.id === value) : null;

  const handleSearchSelect = (entry: FlatEntry) => {
    const root = findRootId(flat, entry.id);
    setParentId(root);
    onChange(entry.id);
    setSearch('');
  };

  return (
    <div className="space-y-2">
      {/* 검색 */}
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="카테고리 검색..."
          disabled={disabled}
          className="w-full pl-8 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* 검색 결과 */}
      {search && (
        <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto bg-white">
          {searchResults.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-400">검색 결과 없음</p>
          ) : (
            searchResults.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => handleSearchSelect(entry)}
                className="block w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 text-slate-700"
              >
                {entry.path}
              </button>
            ))
          )}
        </div>
      )}

      {/* 2단계 select */}
      {!search && (
        <div className="grid grid-cols-2 gap-2">
          <select
            value={parentId || ''}
            onChange={(e) => {
              const newRoot = e.target.value || null;
              setParentId(newRoot);
              // 상위 변경 시 하위 선택 초기화
              onChange(newRoot);
            }}
            disabled={disabled}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
          >
            <option value="">{placeholder}</option>
            {rootCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value || null)}
            disabled={disabled || !parentId || childCategories.length === 0}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="">{parentId && childCategories.length === 0 ? '하위 없음' : '하위 선택'}</option>
            {childCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.depth > 1 ? `${'  '.repeat(cat.depth - 1)}└ ${cat.name}` : cat.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 선택 결과 표시 */}
      {selectedEntry && (
        <p className="text-xs text-slate-500">
          선택됨: <span className="font-medium text-slate-700">{selectedEntry.path}</span>
        </p>
      )}
    </div>
  );
}
