import { authClient } from '@o4o/auth-client';
import { createFundingOperatorApi, createFundingExceptionsApi, FundingOperationsProvider, MarketTrialApprovalsPage, MarketTrialApprovalDetailPage } from '@o4o/operator-core-ui/modules/funding-operations';
const http = authClient.api;
const api = { ...createFundingOperatorApi(http), fundingExceptionsApi: createFundingExceptionsApi(http) };
const path = (source: string) => source.startsWith('/operator/market-trial')
  ? source.replace(/^\/operator\/market-trial/, '/operations/funding/funding')
  : /^https:\/\//.test(source) ? source : `https://funding.neture.co.kr${source}`;
export default function CentralFundingOperations({ detail = false }: { detail?: boolean }) {
  return <FundingOperationsProvider api={api} http={http} path={path}>{detail ? <MarketTrialApprovalDetailPage /> : <MarketTrialApprovalsPage />}</FundingOperationsProvider>;
}
