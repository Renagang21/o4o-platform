import { useCallback, useEffect, useRef } from 'react';

/** 새 조회 또는 화면 종료 뒤에는 이전 조회가 화면 상태를 변경할 수 없다. */
export function useLatestRequest() {
  const sequence = useRef(0);
  const invalidate = useCallback(() => { sequence.current += 1; }, []);
  const begin = useCallback(() => {
    const id = ++sequence.current;
    return () => id === sequence.current;
  }, []);
  useEffect(() => invalidate, [invalidate]);
  return { begin, invalidate };
}
