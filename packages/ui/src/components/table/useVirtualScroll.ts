/**
 * useVirtualScroll — Table Virtual Scroll Hook
 *
 * WO-O4O-TABLE-ADVANCED-FEATURES-V1 Phase 1
 *
 * 대량 데이터 렌더링 최적화.
 * 전체 데이터에서 viewport에 해당하는 slice만 반환.
 * BaseTable 수정 없이 외부에서 data를 slice하여 전달.
 *
 * 사용: containerRef를 scroll container에 연결,
 *      visibleData를 BaseTable data에 전달.
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';

export interface UseVirtualScrollOptions<T> {
  /** 전체 데이터 */
  data: T[];
  /** 행 높이 (px). 고정 행 높이 가정. */
  rowHeight: number;
  /** 뷰포트에 표시할 행 수 (overscan 제외) */
  visibleRows?: number;
  /** 뷰포트 바깥에 미리 렌더링할 행 수 (위/아래 각각) */
  overscan?: number;
}

export interface UseVirtualScrollReturn<T> {
  /** 현재 viewport에 해당하는 데이터 slice — BaseTable data에 전달 */
  visibleData: T[];
  /** scroll container에 연결할 ref */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** 전체 콘텐츠 높이 (px) — spacer 용 */
  totalHeight: number;
  /** 상단 spacer 높이 (px) */
  offsetTop: number;
  /** scroll 이벤트 핸들러 — containerRef에 자동 연결됨 */
  onScroll: () => void;
  /** 가상화 활성 여부 (data 크기가 visibleRows + overscan보다 클 때만 true) */
  isVirtualized: boolean;
}

export function useVirtualScroll<T>({
  data,
  rowHeight,
  visibleRows = 20,
  overscan = 5,
}: UseVirtualScrollOptions<T>): UseVirtualScrollReturn<T> {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = data.length * rowHeight;
  const threshold = visibleRows + overscan * 2;
  const isVirtualized = data.length > threshold;

  const { visibleData, offsetTop } = useMemo(() => {
    if (!isVirtualized) {
      return { visibleData: data, offsetTop: 0 };
    }

    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const endIndex = Math.min(
      data.length,
      Math.ceil(scrollTop / rowHeight) + visibleRows + overscan,
    );

    return {
      visibleData: data.slice(startIndex, endIndex),
      offsetTop: startIndex * rowHeight,
    };
  }, [data, scrollTop, rowHeight, visibleRows, overscan, isVirtualized]);

  const onScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isVirtualized) return;

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [onScroll, isVirtualized]);

  return {
    visibleData,
    containerRef,
    totalHeight,
    offsetTop,
    onScroll,
    isVirtualized,
  };
}
