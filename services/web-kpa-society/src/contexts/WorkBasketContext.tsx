/**
 * WorkBasketContext — 세션형 작업바구니
 * WO-KPA-RESOURCE-LIBRARY-AI-WORKFLOW-V1
 *
 * 자료실에서 선택한 자료를 담아두는 세션 상태.
 * sessionStorage 기반 — 브라우저 탭 닫으면 자동 초기화.
 * 서버 저장 없음.
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface WorkItem {
  id: string;
  title: string;
  content?: string | null;
  file_url?: string | null;
  external_url?: string | null;
  role?: string | null;
  memo?: string | null;
}

interface WorkBasketContextValue {
  items: WorkItem[];
  add: (item: WorkItem) => void;
  addMany: (items: WorkItem[]) => void;
  remove: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
}

const SESSION_KEY = 'kpa_work_basket';

function loadFromSession(): WorkItem[] {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToSession(items: WorkItem[]): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(items));
  } catch {
    // sessionStorage 용량 초과 등 무시
  }
}

const WorkBasketContext = createContext<WorkBasketContextValue | null>(null);

export function WorkBasketProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WorkItem[]>(loadFromSession);

  const add = useCallback((item: WorkItem) => {
    setItems(prev => {
      if (prev.some(i => i.id === item.id)) return prev;
      const next = [...prev, item];
      saveToSession(next);
      return next;
    });
  }, []);

  const addMany = useCallback((newItems: WorkItem[]) => {
    setItems(prev => {
      const existingIds = new Set(prev.map(i => i.id));
      const toAdd = newItems.filter(i => !existingIds.has(i.id));
      if (toAdd.length === 0) return prev;
      const next = [...prev, ...toAdd];
      saveToSession(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setItems(prev => {
      const next = prev.filter(i => i.id !== id);
      saveToSession(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  const has = useCallback((id: string) => items.some(i => i.id === id), [items]);

  return (
    <WorkBasketContext.Provider value={{ items, add, addMany, remove, clear, has }}>
      {children}
    </WorkBasketContext.Provider>
  );
}

export function useWorkBasket(): WorkBasketContextValue {
  const ctx = useContext(WorkBasketContext);
  if (!ctx) throw new Error('useWorkBasket must be used inside WorkBasketProvider');
  return ctx;
}
