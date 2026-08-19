/**
 * useIsNarrowViewport — 내 매장 공통 View 의 모바일 폭 판정
 * WO-O4O-MY-STORE-FINAL-COMMONIZATION-AUDIT-AND-CLOSURE-V1 §12
 *
 * 공통 View 는 inline style 로 작성되어 media query 를 쓸 수 없어
 * 고정 폭 grid(예: '280px 1fr')가 모바일에서 가로 overflow 를 만들었다.
 * 서비스별 분기가 아니라 뷰포트 폭만 판정한다.
 */
import { useEffect, useState } from 'react';

const DEFAULT_QUERY = '(max-width: 768px)';

export function useIsNarrowViewport(query: string = DEFAULT_QUERY): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
