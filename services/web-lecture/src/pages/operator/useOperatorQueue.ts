import { useOperatorQueue as useShared } from '@o4o/operator-core-ui/modules/lecture-operations';
import { useToast } from '../../components/Toast';
export function useOperatorQueue<T>(scope: string, fetch: () => Promise<{ data: T[] }>, failure: string) {
  return useShared(scope, fetch, failure, useToast());
}
