import type { ReactNode } from 'react';
import { LectureOperationsProvider } from '@o4o/operator-core-ui/modules/lecture-operations';
import { operatorApi } from '../../api/lecture';
import { useToast } from '../../components/Toast';
export function LectureBindings({ children }: { children: ReactNode }) {
  return <LectureOperationsProvider api={operatorApi} toast={useToast()}>{children}</LectureOperationsProvider>;
}
