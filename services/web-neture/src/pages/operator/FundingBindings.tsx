import type { ReactNode } from 'react';
import { FundingOperationsProvider } from '@o4o/operator-core-ui/modules/funding-operations';
import * as trial from '../../api/trial';
import { fundingExceptionsApi } from '../../api/fundingExceptions';
import { api as http } from '../../lib/apiClient';
const api = { ...trial, fundingExceptionsApi };
export function FundingBindings({ children }: { children: ReactNode }) {
  return <FundingOperationsProvider api={api} http={http}>{children}</FundingOperationsProvider>;
}
