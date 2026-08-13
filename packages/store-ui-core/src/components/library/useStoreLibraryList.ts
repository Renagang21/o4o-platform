/**
 * useStoreLibraryList — 자료함 목록 4상태 로더(공통)
 * WO-O4O-MY-STORE-LIBRARY-RESOURCES-CONTENTS-KCOS-GP-COMMONIZATION-V1
 *
 * Resources / Contents 두 화면이 동일하게 갖고 있던 loading·loadError·reload 를 하나로 모은다.
 * 조회 실패를 empty 로 위장하지 않는 4상태 계약을 유지한다.
 */

import { useCallback, useEffect, useState } from 'react';

export function useStoreLibraryList<T>(fetcher: () => Promise<T[]>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      setItems(await fetcher());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => { reload(); }, [reload]);

  return { items, loading, loadError, reload };
}
