/**
 * useIsNarrowViewport — HUB 카드 그리드의 모바일 폭 판정
 * WO-O4O-MY-STORE-FINAL-COMMONIZATION-AUDIT-AND-CLOSURE-V1 §12
 *
 * HubSection 은 inline style 이라 media query 를 쓸 수 없어 3열 고정이
 * 모바일에서 가로 overflow 를 만들었다. 데스크톱 동작은 바뀌지 않는다.
 */
import { useEffect, useState } from 'react';

export function useIsNarrowViewport(query = '(max-width: 768px)'): boolean {
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
