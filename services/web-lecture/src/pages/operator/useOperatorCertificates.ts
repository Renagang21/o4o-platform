import { useOperatorCertificates as useShared } from '@o4o/operator-core-ui/modules/lecture-operations';
import { operatorApi } from '../../api/lecture';
import { useToast } from '../../components/Toast';
export function useOperatorCertificates() {
  return useShared({ api: operatorApi, toast: useToast() });
}
