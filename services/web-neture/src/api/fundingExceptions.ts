import { api } from '../lib/apiClient';
import { createFundingExceptionsApi } from '@o4o/operator-core-ui/modules/funding-operations';
export { FUNDING_EXCEPTION_LABELS } from '@o4o/operator-core-ui/modules/funding-operations';
export type { FundingException, FundingHistoryItem } from '@o4o/operator-core-ui/modules/funding-operations';
export const fundingExceptionsApi = createFundingExceptionsApi(api);
