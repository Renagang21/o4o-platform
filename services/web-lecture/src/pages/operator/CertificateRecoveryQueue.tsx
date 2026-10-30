import type { ComponentProps } from 'react';
import { CertificateRecoveryQueue as Shared, LectureOperationsProvider } from '@o4o/operator-core-ui/modules/lecture-operations';
import { operatorApi } from '../../api/lecture';
const unusedToast = { success: (_message: string) => undefined, error: (_message: string) => undefined };
export function CertificateRecoveryQueue(props: ComponentProps<typeof Shared>) {
  return <LectureOperationsProvider api={operatorApi} toast={unusedToast}><Shared {...props} /></LectureOperationsProvider>;
}
