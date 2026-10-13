import { useCallback, useEffect, useRef, useMemo } from "react";

/** A response belongs to both its selected subject and its request revision. */
export function useLatestStoreRequest(subject = "") {
  const selected = useRef(subject);
  const revision = useRef(0);
  if (selected.current !== subject) {
    selected.current = subject;
    revision.current++;
  }
  const cancel = useCallback(() => {
    revision.current++;
  }, []);
  useEffect(() => cancel, [cancel]);
  const begin = useCallback(() => {
    const current = ++revision.current;
    const target = selected.current;
    return () => current === revision.current && target === selected.current;
  }, []);
  return useMemo(() => ({ begin, cancel, subject }), [begin, cancel, subject]);
}
