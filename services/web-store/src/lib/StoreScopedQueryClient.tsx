import { useEffect, useMemo, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUnifiedStore } from '../contexts/StoreContext';

export function createStoreQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
  });
}

/**
 * 매장마다 react-query 캐시를 따로 둔다.
 * 공용 패키지 화면(@o4o/store-products-ui 등)의 쿼리 키에는 매장 식별자가 없는 것이 있어(['my-store-channels'] 등),
 * 캐시를 하나로 쓰면 같은 탭에서 매장을 바꿨을 때 이전 매장의 결과를 그대로 쓰게 된다.
 */
export function StoreScopedQueryClient({ children }: Readonly<{ children: ReactNode }>) {
  const { organizationId } = useUnifiedStore();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- 매장이 바뀌면 새 캐시를 쓴다
  const client = useMemo(() => createStoreQueryClient(), [organizationId]);
  useEffect(() => () => client.clear(), [client]);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
