/**
 * useListSelection — 목록 화면의 체크 선택 상태
 *
 * WO-O4O-STANDARD-LIST-WORKSPACE-CONTRACT-V1
 *
 * scopeKey 는 선택이 유효한 범위다(매장 · 계정 · 권한 · 검색어 · 필터 · 탭 · 페이지).
 * scopeKey 가 바뀐 렌더부터 선택은 비어 있다. effect 로 지우지 않으므로
 * 오래된 선택이 한 프레임도 화면이나 ActionBar 에 남지 않는다.
 */

import { useCallback, useMemo, useState } from 'react';

const EMPTY_SELECTION: ReadonlySet<string> = new Set<string>();

interface SelectionState {
  scope: string;
  keys: ReadonlySet<string>;
}

export interface UseListSelectionReturn {
  /** BaseTable.selectedKeys 에 그대로 넘길 수 있는 현재 선택 */
  selectedKeys: Set<string>;
  selectedCount: number;
  isSelected: (key: string) => boolean;
  toggle: (key: string, checked: boolean) => void;
  /** 현재 페이지의 전체 선택 · 해제. 다른 키의 선택은 유지한다. */
  setMany: (keys: readonly string[], checked: boolean) => void;
  /** BaseTable.onSelectionChange 용 전체 교체 */
  replace: (keys: Iterable<string>) => void;
  clear: () => void;
  /** 목록 갱신 후 더 이상 보이지 않는 항목을 선택에서 뺀다. */
  retain: (keys: readonly string[]) => void;
}

export function useListSelection(scopeKey: string): UseListSelectionReturn {
  const [state, setState] = useState<SelectionState>({ scope: scopeKey, keys: EMPTY_SELECTION });
  const keys = state.scope === scopeKey ? state.keys : EMPTY_SELECTION;

  const update = useCallback(
    (next: (current: ReadonlySet<string>) => ReadonlySet<string>) => {
      setState((current) => ({
        scope: scopeKey,
        keys: next(current.scope === scopeKey ? current.keys : EMPTY_SELECTION),
      }));
    },
    [scopeKey],
  );

  const toggle = useCallback(
    (key: string, checked: boolean) => {
      update((current) => {
        if (current.has(key) === checked) return current;
        const next = new Set(current);
        if (checked) next.add(key);
        else next.delete(key);
        return next;
      });
    },
    [update],
  );

  const setMany = useCallback(
    (targets: readonly string[], checked: boolean) => {
      update((current) => {
        const next = new Set(current);
        for (const key of targets) {
          if (checked) next.add(key);
          else next.delete(key);
        }
        return next;
      });
    },
    [update],
  );

  const replace = useCallback(
    (next: Iterable<string>) => {
      update(() => new Set(next));
    },
    [update],
  );

  const clear = useCallback(() => {
    update(() => EMPTY_SELECTION);
  }, [update]);

  const retain = useCallback(
    (targets: readonly string[]) => {
      update((current) => {
        const allowed = new Set(targets);
        const next = [...current].filter((key) => allowed.has(key));
        return next.length === current.size ? current : new Set(next);
      });
    },
    [update],
  );

  return useMemo(
    () => ({
      selectedKeys: keys as Set<string>,
      selectedCount: keys.size,
      isSelected: (key: string) => keys.has(key),
      toggle,
      setMany,
      replace,
      clear,
      retain,
    }),
    [keys, toggle, setMany, replace, clear, retain],
  );
}
